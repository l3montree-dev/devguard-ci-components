import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { InputGroups, Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_UPLOAD_ARTIFACT } from "../actions-versions";
import { GitHubReusableSteps } from "../github-resusable-steps";
import { resolvePushedImageScript } from "./push-oci-image";

// The signed provenance the provenance job hands over to the attest job
export const PROVENANCE_FILE = "provenance.dsse.json";
export const SLSA_PROVENANCE_PREDICATE_TYPE = "https://slsa.dev/provenance/v1";

// Generates and signs SLSA build provenance for one image. Runs in the devguard-scanner image (busybox sh, crane, jq).
// The job never runs code of the built project (SLSA Build L3 on GitHub, L2 on GitLab).
// Attaching the signed provenance to the image is left to the attest job - the signature protects it on the way.
//
// The provenance names the image the sign job signs, given by the same reference: a reference with a digest names that
// digest - which has to be in the registry - a tag the image it points to in the registry.
//
// Expects in the environment:
//   IMAGE_TAG           the image reference the sign job signs - repository:tag or repository:tag@digest
//   PROVENANCE_INPUTS   newline separated key=value pairs the build was configured with
//   DEVGUARD_ID_TOKEN   the OIDC token of this job, issued for the audience DEVGUARD_API_URL
//   DEVGUARD_API_URL, REGISTRY, REGISTRY_USER, REGISTRY_PASSWORD
export const provenanceScript = `set -eu

# like the push job: lowercase the reference, the subject is named after the repository
IMAGE_REF=$(echo "$IMAGE_TAG" | tr '[:upper:]' '[:lower:]')
IMAGE_NAME="\${IMAGE_REF%@*}"
IMAGE_NAME="\${IMAGE_NAME%:*}"

crane auth login -u "$REGISTRY_USER" -p "$REGISTRY_PASSWORD" "$REGISTRY"

# like signing: a reference with a digest names that digest, a tag the image it points to
case "$IMAGE_REF" in
  *@*)
    DIGEST="\${IMAGE_REF#*@}"
    # the digest comes from the build - provenance is only signed for an image which got pushed
    if ! crane manifest "$IMAGE_NAME@$DIGEST" > /dev/null; then
      echo "$IMAGE_NAME@$DIGEST is not in the registry - the image which got pushed has another digest" >&2
      exit 1
    fi
    ;;
  *)
    DIGEST=$(crane digest "$IMAGE_REF")
    ;;
esac

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
// tag resolves to, which is the index. Run by the job which created the index, after it pushed and signed it. Like the
// per image provenance job it never runs code of the built project.
//
// Like signing the index, the provenance names the index each tag points to in the registry - but only if that index
// references exactly the built per-arch images, so a tag repushed in the meantime gets no provenance.
//
// Expects in the environment:
//   MANIFEST_TAGS       space separated tags of the pushed index
//   EXPECTED_DIGESTS    space separated digests of the built per-arch images (GitHub: image-digest.txt, GitLab: the
//                       digests the push jobs wrote). Unset skips the check with a warning - on GitLab when the push
//                       jobs are of an older version or did not run
//   DEVGUARD_ID_TOKEN   the OIDC token of this job, issued for the audience DEVGUARD_API_URL
//   DEVGUARD_API_URL, REGISTRY, REGISTRY_USER, REGISTRY_PASSWORD
export const indexProvenanceScript = `set -eu

crane auth login -u "$REGISTRY_USER" -p "$REGISTRY_PASSWORD" "$REGISTRY"

sorted() {
  printf '%s\\n' "$@" | sort | tr '\\n' ' '
}
EXPECTED_DIGESTS="\${EXPECTED_DIGESTS:-}"
if [ -z "$EXPECTED_DIGESTS" ]; then
  echo "WARNING: EXPECTED_DIGESTS is not set - not checking that the index references exactly the built images" >&2
fi
EXPECTED=$(sorted $EXPECTED_DIGESTS)

INDEX_REFS=""
for TAG in $MANIFEST_TAGS; do
  IMAGE_REF=$(echo "$TAG" | tr '[:upper:]' '[:lower:]')
  IMAGE_NAME="\${IMAGE_REF%@*}"
  IMAGE_NAME="\${IMAGE_NAME%:*}"
  # like signing: the index the tag points to
  INDEX_REF="$IMAGE_NAME@$(crane digest "$IMAGE_REF")"

  if [ -n "$EXPECTED_DIGESTS" ]; then
    LISTED=$(sorted $(crane manifest "$INDEX_REF" | jq -r '.manifests[].digest'))
    if [ "$LISTED" != "$EXPECTED" ]; then
      echo "$TAG references the images $LISTED but the build produced $EXPECTED" >&2
      exit 1
    fi
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
        GitHubReusableSteps.DownloadImageTag(inputValues.image_suffix),
        GitHubReusableSteps.DownloadImageDigest(inputValues.image_suffix),
        {
          name: "Generate and sign build provenance",
          env: {
            DEVGUARD_API_URL: inputValues.devguard_api_url,
            REGISTRY: inputValues.registry,
            REGISTRY_USER: inputValues.registry_user,
            PROVENANCE_INPUTS: Object.entries(options.recordedInputs ?? {})
              .map(([key, value]) => `${key}=${value}`)
              .join("\n"),
          } as Record<string, string>,
          run: `# the reference the sign job signs
IMAGE_TAG="$(cat image-tag.txt)@$(cat image-digest.txt)"
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
  -e IMAGE_TAG -e PROVENANCE_INPUTS \\
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
  image_tag: {
    ...Inputs.image_tag,
    description:
      "The image the sign job signs - a tag (the provenance names the image it points to) or a tag with digest" as const,
    default: "$IMAGE_TAG" as const,
  },
  pushed_digest_file: Inputs.pushed_digest_file,
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
${resolvePushedImageScript(inputValues.image_tag, inputValues.pushed_digest_file)}
IMAGE_TAG="$IMAGE_REF"
PROVENANCE_INPUTS="${inputValues.provenance_inputs}"
${provenanceScript}`,
    ],
    artifacts: {
      paths: [PROVENANCE_FILE],
      expire_in: "1 week",
    },
  },
}));
