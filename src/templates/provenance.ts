import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { InputGroups, Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_DOWNLOAD_ARTIFACT } from "../actions-versions";
import { GitHubReusableSteps } from "../github-resusable-steps";

// Generates, signs and attaches SLSA build provenance. Runs in the devguard-scanner image (busybox sh, crane, jq).
// The job never runs code of the built project: it only reads the image tarballs the build produced, so a
// compromised build can not influence what gets signed (SLSA Build L3 on GitHub, L2 on GitLab).
//
// Expects in the environment:
//   IMAGE_TARS          space separated image tarballs the build produced
//   IMAGE_TAG           any tag of the image repository - the subjects are named after the repository
//   MANIFEST_TAGS       space separated multi-arch manifest tags pointing to the built images, may be empty
//   PROVENANCE_INPUTS   newline separated key=value pairs the build was configured with
//   DEVGUARD_ID_TOKEN   the OIDC token of this job, issued for the audience DEVGUARD_API_URL
//   DEVGUARD_API_URL, REGISTRY, REGISTRY_USER, REGISTRY_PASSWORD
export const provenanceScript = `set -eu

# like the push job: drop a digest suffix and the tag, and lowercase the repository
IMAGE_NAME="\${IMAGE_TAG%@*}"
IMAGE_NAME=$(echo "\${IMAGE_NAME%:*}" | tr '[:upper:]' '[:lower:]')

crane auth login -u "$REGISTRY_USER" -p "$REGISTRY_PASSWORD" "$REGISTRY"

# images are matched by their config digest. The tarballs hold uncompressed layers which get compressed on push, and
# different crane versions compress differently - so the manifest digest of a tarball is not necessarily the pushed one.
# The config lists the uncompressed layer digests, which identifies the image independent of the compression.
tarball_config_digest() {
  CONFIG=$(tar -xOf "$1" manifest.json | jq -r '.[0].Config')
  echo "sha256:$(tar -xOf "$1" "$CONFIG" | sha256sum | cut -d' ' -f1)"
}
config_digest() {
  crane manifest "$1" | jq -r '.config.digest'
}
sorted() {
  printf '%s\\n' "$@" | sort | tr '\\n' ' '
}
SUBJECT_DIGESTS=""
add_subject() {
  case " $SUBJECT_DIGESTS " in
    *" $1 "*) ;;
    *) SUBJECT_DIGESTS="$SUBJECT_DIGESTS $1" ;;
  esac
}

# computed from the tarballs - nothing the build job wrote about its images is trusted
BUILT_CONFIGS=""
for TAR in $IMAGE_TARS; do
  if [ -f "$TAR" ]; then
    BUILT_CONFIGS="$BUILT_CONFIGS $(tarball_config_digest "$TAR")"
  else
    # builds which push directly to the registry publish no tarball - the build job decided what was pushed
    echo "WARNING: $TAR not found, attesting the image the build pushed to $IMAGE_TAG instead" >&2
    BUILT_CONFIGS="$BUILT_CONFIGS $(config_digest "$IMAGE_TAG")"
  fi
done
EXPECTED_CONFIGS=$(sorted $BUILT_CONFIGS)

if [ -z "$(echo $MANIFEST_TAGS)" ]; then
  # single-arch: the tag has to point to the built image
  PUSHED_CONFIGS=$(sorted "$(config_digest "$IMAGE_TAG")")
  if [ "$PUSHED_CONFIGS" != "$EXPECTED_CONFIGS" ]; then
    echo "$IMAGE_TAG has the config $PUSHED_CONFIGS but the build produced $EXPECTED_CONFIGS" >&2
    exit 1
  fi
  add_subject "$(crane digest "$IMAGE_TAG")"
fi

# a multi-arch manifest is only attested if it references exactly the built images
for TAG in $MANIFEST_TAGS; do
  PLATFORM_DIGESTS=$(crane manifest "$TAG" | jq -r '.manifests[].digest')
  LISTED_CONFIGS=""
  for DIGEST in $PLATFORM_DIGESTS; do
    LISTED_CONFIGS="$LISTED_CONFIGS $(config_digest "$IMAGE_NAME@$DIGEST")"
  done
  LISTED_CONFIGS=$(sorted $LISTED_CONFIGS)
  if [ "$LISTED_CONFIGS" != "$EXPECTED_CONFIGS" ]; then
    echo "manifest $TAG references images with the configs $LISTED_CONFIGS but the build produced $EXPECTED_CONFIGS" >&2
    exit 1
  fi
  for DIGEST in $PLATFORM_DIGESTS; do
    add_subject "$DIGEST"
  done
  add_subject "$(crane digest "$TAG")"
done

SUBJECT_IMAGES=""
for DIGEST in $SUBJECT_DIGESTS; do
  SUBJECT_IMAGES="$SUBJECT_IMAGES,$IMAGE_NAME@$DIGEST"
done
set -- --image "\${SUBJECT_IMAGES#,}"
OLD_IFS="$IFS"
IFS='
'
for INPUT in $PROVENANCE_INPUTS; do
  set -- "$@" --input "$INPUT"
done
IFS="$OLD_IFS"

devguard-scanner provenance generate "$@" --output provenance.json
devguard-scanner provenance sign provenance.json --apiUrl "$DEVGUARD_API_URL" --output provenance.dsse.json

for DIGEST in $SUBJECT_DIGESTS; do
  echo "Attaching build provenance to $IMAGE_NAME@$DIGEST"
  devguard-scanner attest provenance.dsse.json "$IMAGE_NAME@$DIGEST" --predicateType=https://slsa.dev/provenance/v1 -u "$REGISTRY_USER" -r "$REGISTRY" -p "$REGISTRY_PASSWORD" --offline
done`;

export const ProvenanceJobInputsGitHub = defineInputsGitHub({
  devguard_api_url: Inputs.devguard_api_url,
  ...InputGroups.registry,
  image_suffix: Inputs.image_suffix,
  manifest_tags: {
    description: "Space separated multi-arch manifest tags pointing to the built images. Leave empty for single-arch builds." as const,
    default: "" as const,
    type: "string" as const,
  },
  should_deploy: {
    description: "Should the provenance job run",
    default: true as const,
    type: "boolean" as const,
  },
});

export type ProvenanceOptionsGitHub = {
  // the suffixes the build jobs uploaded their oci-image and image-tag artifacts with. Defaults to the image_suffix input
  imageSuffixes?: string[];
  // the job which created the multi-arch manifest and exposes its tags as manifest-tags output. Defaults to the manifest_tags input
  manifestJobId?: string;
  // recorded at predicate.buildDefinition.externalParameters.inputs
  recordedInputs?: Record<string, string>;
};

export const ProvenanceTemplateGitHub = (options: ProvenanceOptionsGitHub = {}) => {
  // every declared input has to be used - inputs the options replace are not declared
  const { image_suffix, manifest_tags, ...commonInputs } = ProvenanceJobInputsGitHub;
  const inputs = defineInputsGitHub({
    ...commonInputs,
    ...(options.imageSuffixes ? {} : { image_suffix }),
    ...(options.manifestJobId ? {} : { manifest_tags }),
  });
  return defineJobGitHub(inputs, (resolvedInputs) => {
    const inputValues = resolvedInputs as typeof resolvedInputs & { image_suffix: string; manifest_tags: string };
    const imageSuffixes = options.imageSuffixes ?? [inputValues.image_suffix];
    return {
    name: "devguard:provenance",
    secrets: {
      "registry-password": {
        description: "Registry password for pushing the provenance. Defaults to the github token.",
        required: false,
      },
    },
    job: {
      "runs-on": "ubuntu-latest",
      if: "inputs.should_deploy",
      // the only job with an id-token - it never runs code of the built project
      permissions: {
        "id-token": "write",
        packages: "write",
      },
      steps: [
        GitHubReusableSteps.ResolveRegistryPassword,
        ...imageSuffixes.flatMap((imageSuffix, i) => [
          {
            name: `Download oci-image${imageSuffix}`,
            uses: ACTIONS_DOWNLOAD_ARTIFACT,
            with: { name: `oci-image${imageSuffix}`, path: `build-${i}` },
            // builds which push directly to the registry upload no image - the script falls back to the pushed tag
            "continue-on-error": true,
          },
          {
            name: `Download image-tag${imageSuffix}`,
            uses: ACTIONS_DOWNLOAD_ARTIFACT,
            with: { name: `image-tag${imageSuffix}`, path: `build-${i}` },
          },
        ]),
        {
          name: "Generate, sign and attach build provenance",
          env: {
            DEVGUARD_API_URL: inputValues.devguard_api_url,
            REGISTRY: inputValues.registry,
            REGISTRY_USER: inputValues.registry_user,
            IMAGE_TARS: imageSuffixes.map((_, i) => `build-${i}/image.tar`).join(" "),
            MANIFEST_TAGS: options.manifestJobId
              ? `\${{ needs.${options.manifestJobId}.outputs.manifest-tags }}`
              : inputValues.manifest_tags,
            PROVENANCE_INPUTS: Object.entries(options.recordedInputs ?? {})
              .map(([key, value]) => `${key}=${value}`)
              .join("\n"),
          } as Record<string, string>,
          run: `IMAGE_TAG=$(cat build-0/image-tag.txt)
export IMAGE_TAG

AUDIENCE=$(jq -rn --arg audience "$DEVGUARD_API_URL" '$audience | @uri')
DEVGUARD_ID_TOKEN=$(curl -sSf -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=$AUDIENCE" | jq -r .value)
echo "::add-mask::$DEVGUARD_ID_TOKEN"
export DEVGUARD_ID_TOKEN

cat > provenance.sh << 'PROVENANCE_SCRIPT'
${provenanceScript}
PROVENANCE_SCRIPT

docker run --rm -v "$PWD:/work" -w /work \\
  -e IMAGE_TARS -e IMAGE_TAG -e MANIFEST_TAGS -e PROVENANCE_INPUTS \\
  -e DEVGUARD_ID_TOKEN -e DEVGUARD_API_URL -e REGISTRY -e REGISTRY_USER -e REGISTRY_PASSWORD \\
  --entrypoint sh ${ContainerImages.DEVGUARD_SCANNER} provenance.sh`,
        },
      ],
    },
    };
  });
};

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
  image_tars: {
    description: "Space separated image tarballs the build produced (e.g. image-amd64.tar image-arm64.tar)" as const,
    default: "image.tar" as const,
  },
  image_tag: {
    ...Inputs.image_tag,
    description: "Any tag of the image repository - the provenance subjects are named after the repository" as const,
    default: "$IMAGE_TAG" as const,
  },
  manifest_tags: {
    description: "Space separated multi-arch manifest tags pointing to the built images. Leave empty for single-arch builds." as const,
    default: "" as const,
  },
  provenance_inputs: {
    description: "Newline separated key=value pairs the build was configured with. Recorded in the provenance." as const,
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
      DEVGUARD_API_URL: inputValues.devguard_api_url,
      REGISTRY: inputValues.registry,
      REGISTRY_USER: inputValues.registry_user,
      REGISTRY_PASSWORD: inputValues.registry_password,
      IMAGE_TARS: inputValues.image_tars,
      IMAGE_TAG: inputValues.image_tag,
      MANIFEST_TAGS: inputValues.manifest_tags,
      PROVENANCE_INPUTS: inputValues.provenance_inputs,
    },
    script: [provenanceScript],
  },
}));
