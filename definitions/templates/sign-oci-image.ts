import { defineInputs, defineJob, JobWithSpec } from "@l3montree/programmatic-ci-components"
import { Inputs } from "./inputs"
import { build } from "bun"

export const SignOciImageJobInputs = defineInputs({
devguard_api_url: Inputs.devguard_api_url,
        devguard_asset_name: Inputs.devguard_asset_name,
        devguard_token: Inputs.devguard_token,

        runner_tags: Inputs.runner_tags,
        stage: {
            ...Inputs.stage,
            default: "oci-image"
        },
        job_suffix: Inputs.job_suffix,
        git_strategy: {
            ...Inputs.git_strategy,
            default: 'fetch' as any,
        },
        pull_policy: Inputs.pull_policy,
        allow_failure: Inputs.allow_failure,
        needs: Inputs.needs,
        dependencies: Inputs.dependencies,

        registry: Inputs.registry,
        registry_user: Inputs.registry_user,
        registry_password: Inputs.registry_password,

        image: {
            ...Inputs.image,
            default: "$CI_REGISTRY_IMAGE:latest" as const,
        },
    });
    
    
export const SignOciImageTemplate = defineJob(SignOciImageJobInputs, (inputValues) => ({
    name: `devguard:sign_oci_image${inputValues.job_suffix}`,
    job: {
        tags: `${inputValues.runner_tags}` as any,
        stage: `${inputValues.stage}`,
        allow_failure: `${inputValues.allow_failure}` as any,
        needs: `${inputValues.needs}` as any,
        dependencies: `${inputValues.dependencies}` as any,
        variables: {
            GIT_STRATEGY: `${inputValues.git_strategy}`,
        },
        image: {
            name: "ghcr.io/l3montree-dev/devguard/scanner:main",
            pull_policy: `${inputValues.pull_policy}` as any,
            entrypoint: [""],
        },
        script: [
            `devguard-scanner login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}`,
            `devguard-scanner sign --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" "${inputValues.image}"`
        ],
    }
}));
