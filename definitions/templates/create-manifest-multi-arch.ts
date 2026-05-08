import { defineInputs, defineJob } from "@l3montree/programmatic-ci-components"
import { Inputs } from "./inputs"
import { ContainerImages } from "../container-image-versions";


export const CreateManifestMultiArchJobInputs = defineInputs({
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

export const CreateManifestMultiArchTemplate = defineJob(CreateManifestMultiArchJobInputs, (inputValues) => ({
    name: `devguard:create_manifest_multi_arch${inputValues.job_suffix}`,
    job: {
        stage: inputValues.stage,
        image: ContainerImages.DOCKER,
        needs: inputValues.needs as any,
        dependencies: inputValues.dependencies as any,
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
        }
    }
}));
