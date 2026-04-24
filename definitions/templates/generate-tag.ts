import { defineInputs, defineJob } from "@l3montree/programmatic-ci-components"
import { Inputs } from "./inputs"


export const GenerateTagJobInputs = defineInputs({
    devguard_artifact_name: {
        ...Inputs.devguard_artifact_name,
        description: "The name of the artifact you are building. This is useful when a single pipeline builds more than a single artifact like a container with a shell inside and one without. If not provided, will use the generated PURL from the built image" as const,
    },

    runner_tags: Inputs.runner_tags,
    stage: {
        ...Inputs.stage,
        default: "oci-image" as const, // TODO..? (different from full??)
    },
    job_suffix: Inputs.job_suffix,
    git_strategy: {
        ...Inputs.git_strategy,
        default: 'fetch' as const,
    },
    pull_policy: Inputs.pull_policy,
    allow_failure: Inputs.allow_failure,
    needs: Inputs.needs,
    dependencies: Inputs.dependencies,

    image_suffix: Inputs.image_suffix,
    image_variant: Inputs.image_variant,
    architecture: Inputs.architecture,
    image_path: Inputs.image_path,
    upstream_version: Inputs.upstream_version,
});

export const GenerateTagTemplate = defineJob(GenerateTagJobInputs, (inputValues) => ({
    name: `devguard:generate_tag${inputValues.job_suffix}`,
    job: {
        tags: inputValues.runner_tags as any,
        stage: inputValues.stage,
        allow_failure: inputValues.allow_failure as any,
        needs: inputValues.needs as any,
        dependencies: inputValues.dependencies as any,
        variables: {
            GIT_STRATEGY: inputValues.git_strategy as any,
            IMAGE_SUFFIX: inputValues.image_suffix,
            DEVGUARD_ARTIFACT_NAME: inputValues.devguard_artifact_name,
        },
        image: {
            name: "ghcr.io/l3montree-dev/devguard/scanner:main",
            pull_policy: inputValues.pull_policy as any,
        },
        script: `echo "Running generate-tag job..."
devguard-scanner generate-tag --imageSuffix "$IMAGE_SUFFIX" --imageVariant "${inputValues.image_variant}" --architecture "${inputValues.architecture}" --imagePath "${inputValues.image_path}" --ref "$CI_COMMIT_REF_NAME" --upstreamVersion "${inputValues.upstream_version}" >> generate_tag_${inputValues.upstream_version}_${inputValues.architecture}.env
echo "Tag generation completed. Generated tags:"
cat generate_tag_${inputValues.upstream_version}_${inputValues.architecture}.env
echo 'Filename: generate_tag_${inputValues.upstream_version}_${inputValues.architecture}.env'
` as any,
        artifacts: {
            reports: {
                dotenv: `generate_tag_${inputValues.upstream_version}_${inputValues.architecture}.env`
            },
            paths: [
                `generate_tag_${inputValues.upstream_version}_${inputValues.architecture}.env`
            ]
        }
    }
}));





