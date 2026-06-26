import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_DOWNLOAD_ARTIFACT, DOCKER_LOGIN_ACTION } from "../actions-versions";

export const CreateManifestMultiArchJobInputs = defineInputsGitLab({
  stage: {
    ...Inputs.stage,
    default: "oci-image" as const,
  },
  needs: Inputs.needs,
  dependencies: Inputs.dependencies,
  job_suffix: Inputs.job_suffix,
  upstream_version: Inputs.upstream_version,
  create_root_manifest: Inputs.create_root_manifest,
  artifacts_subdirectory: Inputs.artifacts_subdirectory,
});

export const CreateManifestMultiArchJobInputsGitHub = defineInputsGitHub({
  upstream_version: Inputs.upstream_version,
  create_root_manifest: Inputs.create_root_manifest,
  image_suffix: Inputs.image_suffix,
  registry: Inputs.registry,
  registry_user: Inputs.registry_user,
});

export const CreateManifestMultiArchTemplateGitHub = defineJobGitHub(CreateManifestMultiArchJobInputsGitHub, (inputValues) => ({
  name: "devguard:create-manifest-multi-arch",
  secrets: {
    "registry-password": {
        description: "Registry password for pulling the image.",
        required: true,
        default: "${{ github.token }}",
    },
  },
  job: {
    "runs-on": "ubuntu-latest",
    permissions: {
      packages: "write",
    },
    steps: [
      {
        name: "Download amd64 image-tag",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `image-tag${ inputValues.image_suffix }-amd64`,
          path: "amd64",
        },
      },
      {
        name: "Download arm64 image-tag",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `image-tag${ inputValues.image_suffix }-arm64`,
          path: "arm64",
        },
      },
      {
        name: "Log in to ghcr.io",
        uses: DOCKER_LOGIN_ACTION,
        with: {
          registry: inputValues.registry,
          username: `${inputValues.registry_user}`,
          password:  `\${{ secrets.registry-password }}`,
        },
      },
      {
        name: "Create and push multi-arch manifest",
        env: {
          CREATE_ROOT_MANIFEST: `${ inputValues.create_root_manifest }`,
        },
        run: `AMD64_TAG=$(cat amd64/image-tag.txt)
ARM64_TAG=$(cat arm64/image-tag.txt)

if [ -z "$AMD64_TAG" ] || [ -z "$ARM64_TAG" ]; then
  echo "ERROR: Could not read arch-specific IMAGE_TAG from image-tag artifacts"
  exit 1
fi

echo "amd64: $AMD64_TAG"
echo "arm64: $ARM64_TAG"

BASE_TAG="\${AMD64_TAG%-amd64}"

echo "Creating manifest: $BASE_TAG -> $AMD64_TAG + $ARM64_TAG"
docker manifest create "$BASE_TAG" "$AMD64_TAG" "$ARM64_TAG"
docker manifest push "$BASE_TAG"

if [ "$CREATE_ROOT_MANIFEST" = "true" ]; then
  ROOT_TAG=$(echo "$BASE_TAG" | sed "s/-\${GITHUB_REF_NAME}//")
  if [ "$ROOT_TAG" != "$BASE_TAG" ]; then
    echo "Creating root manifest: $ROOT_TAG"
    docker manifest create "$ROOT_TAG" "$AMD64_TAG" "$ARM64_TAG"
    docker manifest push "$ROOT_TAG"
  fi
fi`,
      },
    ],
  },
}));

export const CreateManifestMultiArchTemplate = defineJobGitLab(CreateManifestMultiArchJobInputs, (inputValues) => ({
  name: `devguard:create_manifest_multi_arch${inputValues.job_suffix}`,
  job: {
    stage: inputValues.stage,
    image: ContainerImages.DOCKER,
    needs: inputValues.needs,
    dependencies: inputValues.dependencies,
    before_script: [
      `apk add --no-cache bash`,
      `mkdir -p ~/.docker`,
      `echo '{"experimental":"enabled"}' > ~/.docker/config.json`,
    ],
    script: [
      `docker login $CI_REGISTRY -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD\n\nAMD64_TAG=$(grep '^IMAGE_TAG=' ${inputValues.artifacts_subdirectory}/generate_tag_${inputValues.upstream_version}_amd64.env | cut -d'=' -f2)\nARM64_TAG=$(grep '^IMAGE_TAG=' ${inputValues.artifacts_subdirectory}/generate_tag_${inputValues.upstream_version}_arm64.env | cut -d'=' -f2)\n\nif [ -z "$AMD64_TAG" ] || [ -z "$ARM64_TAG" ]; then\n  echo "ERROR: Could not read arch-specific IMAGE_TAG from generate_tag env files"\n  exit 1\nfi\n\necho "amd64: $AMD64_TAG"\necho "arm64: $ARM64_TAG"\n\n# Strip the -amd64 suffix to get the base tag\nBASE_TAG="\${AMD64_TAG%-amd64}"\n\necho "Creating manifest: $BASE_TAG -> $AMD64_TAG + $ARM64_TAG"\ndocker manifest create "$BASE_TAG" "$AMD64_TAG" "$ARM64_TAG"\ndocker manifest push "$BASE_TAG"\n\necho "MANIFEST_IMAGE_TAG=$BASE_TAG" > manifest_image_tag.env\n\nif [ "${inputValues.create_root_manifest}" = "true" ]; then\n  ROOT_TAG=$(echo "$BASE_TAG" | sed "s/-\${CI_COMMIT_REF_NAME}//")\n  if [ "$ROOT_TAG" != "$BASE_TAG" ]; then\n    echo "Creating root manifest: $ROOT_TAG"\n    docker manifest create "$ROOT_TAG" "$AMD64_TAG" "$ARM64_TAG"\n    docker manifest push "$ROOT_TAG"\n    echo "MANIFEST_WITHOUT_REF_TAG=$ROOT_TAG" >> manifest_image_tag.env\n  fi\nfi`,
    ],
    artifacts: {
      reports: {
        dotenv: `manifest_image_tag.env`,
      },
      expire_in: `1 week`,
    },
  },
}));
