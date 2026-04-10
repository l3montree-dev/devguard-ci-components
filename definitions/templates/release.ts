import { defineInputs, defineJob } from "@l3montree/programmatic-ci-components"
import { Inputs } from "./inputs"


export const ReleaseJobInputs = defineInputs({
    runner_tags: Inputs.runner_tags,
    stage: Inputs.stage,
    job_suffix: Inputs.job_suffix,
    git_strategy: Inputs.git_strategy,
    pull_policy: Inputs.pull_policy,
    allow_failure: Inputs.allow_failure,
    needs: Inputs.needs,
    dependencies: Inputs.dependencies,

    release_tag: Inputs.release_tag,
    release_name: Inputs.release_name,
    release_description: Inputs.release_description,
    rules: Inputs.rules,
    assets_links: Inputs.assets_links,
});

export const ReleaseTemplate = defineJob(ReleaseJobInputs, (inputValues) => ({
    name: `devguard:release${inputValues.job_suffix}`,
    job: {
        tags: inputValues.runner_tags as any,
        stage: inputValues.stage,
        allow_failure: inputValues.allow_failure as any,
        needs: inputValues.needs as any,
        dependencies: inputValues.dependencies as any,
        variables: {
            GIT_STRATEGY: inputValues.git_strategy,
        },
        rules: inputValues.rules as any,
        image: `registry.gitlab.com/gitlab-org/release-cli:latest`,
        script: [
            `echo "Creating release for tag $CI_COMMIT_TAG"`,
        ],
        release: {
            tag_name: inputValues.release_tag,
            name: inputValues.release_name,
            description: inputValues.release_description,
            assets: {
                links: inputValues.assets_links as any,
            },
        } as any,
    }
}));
