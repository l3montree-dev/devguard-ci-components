import { defineInputs, defineJob } from "@l3montree/programmatic-ci-components";
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";

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
  assets_links: {
    ...Inputs.assets_links,
    description:
      "List of assets links to attach to the release. Each item should have (name) the name of the link and (url) the URL to download the asset from and could have (filepath) the The redirect link to the url. Must start with a slash (/) and (link_type) the content kind of what users can download with url." as const,
  },
});

export const ReleaseTemplate = defineJob(ReleaseJobInputs, (inputValues) => ({
  name: `devguard:release${inputValues.job_suffix}`,
  job: {
    tags: inputValues.runner_tags,
    stage: inputValues.stage,
    allow_failure: inputValues.allow_failure,
    needs: inputValues.needs,
    dependencies: inputValues.dependencies,
    variables: {
      GIT_STRATEGY: inputValues.git_strategy,
    },
    rules: inputValues.rules,
    image: ContainerImages.GITLAB_RELEASE_CLI,
    script: [`echo "Creating release for tag $CI_COMMIT_TAG"`],
    release: {
      tag_name: inputValues.release_tag,
      name: inputValues.release_name,
      description: inputValues.release_description,
      assets: {
        links: inputValues.assets_links,
      },
    },
  },
}));
