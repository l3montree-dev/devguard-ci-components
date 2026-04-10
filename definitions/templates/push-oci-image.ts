import { defineInputs, defineJob, JobWithSpec } from "@l3montree/programmatic-ci-components"
import { Inputs } from "./inputs"
import { build } from "bun"

export const PushOciImageJobInputs = defineInputs({
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
            default: 'none' as any,
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
            default: "image.tar" as const,
        },
        image_tag: Inputs.image_tag,

        supplyChainId: Inputs.supplyChainId,
});

export const PushOciImageTemplate = defineJob(PushOciImageJobInputs, (inputValues) => ({
    name: `devguard:push_oci_image${inputValues.job_suffix}`,
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
            name: "registry.gitlab.com/l3montree/devguard/osscontainertools-kaniko-crane:kaniko-v1.26.3-devguard-scanner-v1.0.0-rc.4-customized-busybox-jq",
            entrypoint: [""],
        },
        script: [
            `/crane auth login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}`,
            `echo "Image: ${inputValues.image}"`,
            `echo "Image Tag: ${inputValues.image_tag}"`,
            `/crane push ${inputValues.image} ${inputValues.image_tag}`,
            `/devguard-scanner intoto run --step=deploy --materials="${inputValues.image}" --products="" --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" --supplyChainId="${inputValues.supplyChainId}" --supplyChainOutputDigest="$\{DIGEST\}"`
        ],
    }
}));
