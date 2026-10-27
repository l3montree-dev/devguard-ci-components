import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { InputGroups, Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_DOWNLOAD_ARTIFACT, ACTIONS_UPLOAD_ARTIFACT } from "../actions-versions";
import { GitHubReusableSteps } from "../github-resusable-steps";

// The signed provenance the provenance job hands over to the attest job
export const PROVENANCE_FILE = "provenance.dsse.json";
export const SLSA_PROVENANCE_PREDICATE_TYPE = "https://slsa.dev/provenance/v1";

// Generates and signs SLSA build provenance for one image. Runs in the devguard-scanner image (busybox sh, crane, jq).
// The job never runs code of the built project: it only reads the image tarball the build produced, so a
// compromised build can not influence what gets signed (SLSA Build L3 on GitHub, L2 on GitLab).
// Attaching the signed provenance to the image is left to the attest job - the signature protects it on the way.
//
// Expects in the environment:
//   IMAGE_TAR           the image tarball the build produced
//   IMAGE_TAG           the tag the image got pushed to
//   PROVENANCE_INPUTS   newline separated key=value pairs the build was configured with
//   DEVGUARD_ID_TOKEN   the OIDC token of this job, issued for the audience DEVGUARD_API_URL
//   DEVGUARD_API_URL, REGISTRY, REGISTRY_USER, REGISTRY_PASSWORD
export const provenanceScript = `set -eu

# like the push job: lowercase the reference, the subject is named after the repository
IMAGE_REF=$(echo "$IMAGE_TAG" | tr '[:upper:]' '[:lower:]')
IMAGE_NAME="\${IMAGE_REF%@*}"
IMAGE_NAME="\${IMAGE_NAME%:*}"

crane auth login -u "$REGISTRY_USER" -p "$REGISTRY_PASSWORD" "$REGISTRY"

# resolved once - everything below refers to the digest, so the tag moving in between does not matter
DIGEST=$(crane digest "$IMAGE_REF")

if [ -f "$IMAGE_TAR" ]; then
  # the pushed image is matched by its config digest. The tarball holds uncompressed layers which get compressed on
  # push, and different crane versions compress differently - so the manifest digest of the tarball is not necessarily
  # the pushed one. The config lists the uncompressed layer digests, which identifies the image independent of that.
  CONFIG=$(tar -xOf "$IMAGE_TAR" manifest.json | jq -r '.[0].Config')
  BUILT_CONFIG="sha256:$(tar -xOf "$IMAGE_TAR" "$CONFIG" | sha256sum | cut -d' ' -f1)"
  PUSHED_CONFIG=$(crane manifest "$IMAGE_NAME@$DIGEST" | jq -r '.config.digest')
  if [ "$PUSHED_CONFIG" != "$BUILT_CONFIG" ]; then
    echo "$IMAGE_REF has the config $PUSHED_CONFIG but the build produced $BUILT_CONFIG" >&2
    exit 1
  fi
else
  # builds which push directly to the registry publish no tarball - the build job decided what was pushed
  echo "WARNING: $IMAGE_TAR not found, recording the image the build pushed to $IMAGE_REF instead" >&2
fi

set -- --image "$IMAGE_NAME@$DIGEST"
OLD_IFS="$IFS"
IFS='
'
for INPUT in $PROVENANCE_INPUTS; do
  set -- "$@" --input "$INPUT"
done
IFS="$OLD_IFS"

devguard-scanner provenance generate "$@" --output provenance.json
devguard-scanner provenance sign provenance.json --apiUrl "$DEVGUARD_API_URL" --output ${PROVENANCE_FILE}`;

// Generates, signs and attaches SLSA build provenance for multi-arch indexes - admission controllers verify the digest a
// tag resolves to, which is the index. Run by the job which created the index, after it pushed it. Like the per image
// provenance job it never runs code of the built project and trusts nothing but the image tarballs the build produced.
//
// Expects in the environment:
//   IMAGE_TARS          space separated image tarballs the build produced, one per architecture
//   MANIFEST_TAGS       space separated tags of the pushed index
//   DEVGUARD_ID_TOKEN   the OIDC token of this job, issued for the audience DEVGUARD_API_URL
//   DEVGUARD_API_URL, REGISTRY, REGISTRY_USER, REGISTRY_PASSWORD
export const indexProvenanceScript = `set -eu

crane auth login -u "$REGISTRY_USER" -p "$REGISTRY_PASSWORD" "$REGISTRY"

# images are matched by their config digest - see the provenance job
tarball_config_digest() {
  CONFIG=$(tar -xOf "$1" manifest.json | jq -r '.[0].Config')
  echo "sha256:$(tar -xOf "$1" "$CONFIG" | sha256sum | cut -d' ' -f1)"
}
sorted() {
  printf '%s\\n' "$@" | sort | tr '\\n' ' '
}

BUILT_CONFIGS=""
for TAR in $IMAGE_TARS; do
  BUILT_CONFIGS="$BUILT_CONFIGS $(tarball_config_digest "$TAR")"
done
EXPECTED_CONFIGS=$(sorted $BUILT_CONFIGS)

INDEX_REFS=""
for TAG in $MANIFEST_TAGS; do
  IMAGE_REF=$(echo "$TAG" | tr '[:upper:]' '[:lower:]')
  IMAGE_NAME="\${IMAGE_REF%@*}"
  IMAGE_NAME="\${IMAGE_NAME%:*}"
  # resolved once - everything below refers to the digest
  INDEX_REF="$IMAGE_NAME@$(crane digest "$IMAGE_REF")"

  # the index is only attested if it references exactly the built images
  LISTED_CONFIGS=""
  for DIGEST in $(crane manifest "$INDEX_REF" | jq -r '.manifests[].digest'); do
    LISTED_CONFIGS="$LISTED_CONFIGS $(crane manifest "$IMAGE_NAME@$DIGEST" | jq -r '.config.digest')"
  done
  LISTED_CONFIGS=$(sorted $LISTED_CONFIGS)
  if [ "$LISTED_CONFIGS" != "$EXPECTED_CONFIGS" ]; then
    echo "$TAG references images with the configs $LISTED_CONFIGS but the build produced $EXPECTED_CONFIGS" >&2
    exit 1
  fi

  # the root tag points to the same index - attest it once
  case " $INDEX_REFS " in
    *" $INDEX_REF "*) ;;
    *) INDEX_REFS="$INDEX_REFS $INDEX_REF" ;;
  esac
done

for INDEX_REF in $INDEX_REFS; do
  devguard-scanner provenance generate --image "$INDEX_REF" --output index-provenance.json
  devguard-scanner provenance sign index-provenance.json --apiUrl "$DEVGUARD_API_URL" --output index-${PROVENANCE_FILE}
  echo "Attaching build provenance to $INDEX_REF"
  devguard-scanner attest index-${PROVENANCE_FILE} "$INDEX_REF" --predicateType=${SLSA_PROVENANCE_PREDICATE_TYPE} -u "$REGISTRY_USER" -r "$REGISTRY" -p "$REGISTRY_PASSWORD" --offline
done`;

export const ProvenanceJobInputsGitHub = defineInputsGitHub({
  devguard_api_url: Inputs.devguard_api_url,
  ...InputGroups.registry,
  image_suffix: Inputs.image_suffix,
  should_deploy: {
    description: "Should the provenance job run",
    default: true as const,
    type: "boolean" as const,
  },
});

export type ProvenanceOptionsGitHub = {
  // recorded at predicate.buildDefinition.externalParameters.inputs
  recordedInputs?: Record<string, string>;
};

export const ProvenanceTemplateGitHub = (options: ProvenanceOptionsGitHub = {}) =>
  defineJobGitHub(ProvenanceJobInputsGitHub, (inputValues) => ({
    name: "devguard:provenance",
    secrets: {
      "registry-password": {
        description: "Registry password for reading the pushed image. Defaults to the github token.",
        required: false,
      },
    },
    job: {
      "runs-on": "ubuntu-latest",
      if: "inputs.should_deploy",
      // the only job with an id-token - it never runs code of the built project
      permissions: {
        "id-token": "write",
        packages: "read",
      },
      steps: [
        GitHubReusableSteps.ResolveRegistryPassword,
        {
          name: "Download oci-image",
          uses: ACTIONS_DOWNLOAD_ARTIFACT,
          with: { name: `oci-image${inputValues.image_suffix}` },
          // builds which push directly to the registry upload no image - the script falls back to the pushed tag
          "continue-on-error": true,
        },
        GitHubReusableSteps.DownloadImageTag(inputValues.image_suffix),
        {
          name: "Generate and sign build provenance",
          env: {
            DEVGUARD_API_URL: inputValues.devguard_api_url,
            REGISTRY: inputValues.registry,
            REGISTRY_USER: inputValues.registry_user,
            IMAGE_TAR: "image.tar",
            PROVENANCE_INPUTS: Object.entries(options.recordedInputs ?? {})
              .map(([key, value]) => `${key}=${value}`)
              .join("\n"),
          } as Record<string, string>,
          run: `IMAGE_TAG=$(cat image-tag.txt)
export IMAGE_TAG

AUDIENCE=$(jq -rn --arg audience "$DEVGUARD_API_URL" '$audience | @uri')
DEVGUARD_ID_TOKEN=$(curl -sSf -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=$AUDIENCE" | jq -r .value)
echo "::add-mask::$DEVGUARD_ID_TOKEN"
export DEVGUARD_ID_TOKEN

cat > provenance.sh << 'PROVENANCE_SCRIPT'
${provenanceScript}
PROVENANCE_SCRIPT

# run as the runner user - the scanner image user can not write to the workspace
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD:/work" -w /work \\
  -e IMAGE_TAR -e IMAGE_TAG -e PROVENANCE_INPUTS \\
  -e DEVGUARD_ID_TOKEN -e DEVGUARD_API_URL -e REGISTRY -e REGISTRY_USER -e REGISTRY_PASSWORD \\
  --entrypoint sh ${ContainerImages.DEVGUARD_SCANNER} provenance.sh`,
        },
        {
          name: "Upload build provenance",
          uses: ACTIONS_UPLOAD_ARTIFACT,
          with: {
            name: `provenance${inputValues.image_suffix}`,
            path: PROVENANCE_FILE,
          },
        },
      ],
    },
  }));

export const ProvenanceJobInputsGitLab = defineInputsGitLab({
  devguard_api_url: Inputs.devguard_api_url,
  stage: {
    ...Inputs.stage,
    default: "attestation" as const,
  },
  job_suffix: Inputs.job_suffix,
  ...InputGroups.jobControl,
  ...InputGroups.registry,
  registry_password: Inputs.registry_password,
  image_tar: {
    description: "The image tarball the build produced" as const,
    default: "image.tar" as const,
  },
  image_tag: {
    ...Inputs.image_tag,
    description: "The tag the image got pushed to" as const,
    default: "$IMAGE_TAG" as const,
  },
  provenance_inputs: {
    description:
      "Newline separated key=value pairs the build was configured with. Recorded in the provenance." as const,
    default: "" as const,
  },
});

export const ProvenanceTemplateGitLab = defineJobGitLab(ProvenanceJobInputsGitLab, (inputValues) => ({
  name: `devguard:provenance${inputValues.job_suffix}`,
  job: {
    tags: inputValues.runner_tags,
    stage: inputValues.stage,
    allow_failure: inputValues.allow_failure,
    needs: inputValues.needs,
    dependencies: inputValues.dependencies,
    image: {
      name: ContainerImages.DEVGUARD_SCANNER,
      pull_policy: inputValues.pull_policy,
      entrypoint: [""],
    },
    id_tokens: {
      DEVGUARD_ID_TOKEN: {
        aud: inputValues.devguard_api_url,
      },
    },
    variables: {
      GIT_STRATEGY: "none",
    },
    // assigned in the script, not as job variables: inputs are usually variables of the same name
    // (devguard_api_url: $DEVGUARD_API_URL) and gitlab does not expand a job variable that references itself
    script: [
      `set -eu
DEVGUARD_API_URL="${inputValues.devguard_api_url}"
REGISTRY="${inputValues.registry}"
REGISTRY_USER="${inputValues.registry_user}"
REGISTRY_PASSWORD="${inputValues.registry_password}"
IMAGE_TAR="${inputValues.image_tar}"
IMAGE_TAG="${inputValues.image_tag}"
PROVENANCE_INPUTS="${inputValues.provenance_inputs}"
${provenanceScript}`,
    ],
    artifacts: {
      paths: [PROVENANCE_FILE],
      expire_in: "1 week",
    },
  },
}));
