import { defineInputs, defineJob } from "@l3montree/programmatic-ci-components"
import { Inputs } from "./inputs"


export const VexUploadJobInputs = defineInputs({
    devguard_api_url: Inputs.devguard_api_url,
    devguard_asset_name: Inputs.devguard_asset_name,
    devguard_token: Inputs.devguard_token,
    devguard_artifact_name: {
        ...Inputs.devguard_artifact_name,
        default: "source" as const,
    },
    devguard_origin: Inputs.devguard_origin,

    runner_tags: Inputs.runner_tags,
    stage: Inputs.stage,
    job_suffix: Inputs.job_suffix,
    git_strategy: {
        ...Inputs.git_strategy,
        default: "fetch" as const,
    },
    pull_policy: Inputs.pull_policy,
    allow_failure: Inputs.allow_failure,
    needs: Inputs.needs,
    dependencies: Inputs.dependencies,

    default_ref: Inputs.default_ref,
    commit_ref: Inputs.commit_ref,
    is_tag: Inputs.is_tag,
    ignore_external_references: Inputs.ignore_external_references,

    vex_file: Inputs.vex_file,
});

export const VexUploadTemplate = defineJob(VexUploadJobInputs, (inputValues) => ({
    name: `devguard:vex_upload${inputValues.job_suffix}`,
    job: {
        tags: inputValues.runner_tags as any,
        stage: inputValues.stage,
        allow_failure: inputValues.allow_failure as any,
        needs: inputValues.needs as any,
        dependencies: inputValues.dependencies as any,
        variables: {
            GIT_STRATEGY: inputValues.git_strategy,
        },
        image: {
            name: "ghcr.io/l3montree-dev/devguard/scanner:main",
            pull_policy: inputValues.pull_policy as any,
        },
        script: [
            `echo "Running DevGuard VeX Upload..."`,
            `devguard-scanner vex ${inputValues.vex_file} --origin="${inputValues.devguard_origin}" --assetName="${inputValues.devguard_asset_name}" --apiUrl="${inputValues.devguard_api_url}" --token="${inputValues.devguard_token}" --defaultRef="${inputValues.default_ref}" --ref="${inputValues.commit_ref}" --isTag="${inputValues.is_tag}" --artifactName="${inputValues.devguard_artifact_name}" --ignoreExternalReferences=${inputValues.ignore_external_references}`,
        ],
    }
}));
