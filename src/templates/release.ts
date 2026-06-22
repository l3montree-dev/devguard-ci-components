import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTION_GH_RELEASE, ACTIONS_CHECKOUT } from "../actions-versions";

export const ReleaseJobInputs = defineInputsGitLab({
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

export const ReleaseJobInputsGitHub = defineInputsGitHub({
  release_tag: Inputs.release_tag,
  release_name: Inputs.release_name,
  release_description: Inputs.release_description,
  allow_failure: Inputs.allow_failure,
});

export const ReleaseTemplateGitHub = defineJobGitHub(ReleaseJobInputsGitHub, (inputValues) => ({
  name: "devguard:release",
  job: {
    "runs-on": "ubuntu-latest",
    permissions: {
      contents: "write",
    },
    steps: [
      {
        name: "Checkout code",
        uses: ACTIONS_CHECKOUT,
        with: {
          "fetch-depth": 0,
          "persist-credentials": true,
        },
      },
      {
        name: "Create GitHub Release",
        "continue-on-error": inputValues.allow_failure as boolean,
        env: {
          RELEASE_TAG: inputValues.release_tag || `\${{ github.ref_name }}`,
          RELEASE_NAME: inputValues.release_name || `\${{ github.ref_name }}`,
          RELEASE_DESCRIPTION: inputValues.release_description,
        } as Record<string, string>,
        run: `gh release create "$RELEASE_TAG" --title "$RELEASE_NAME" --notes "$RELEASE_DESCRIPTION"`,
      },
    ],
  },
}));

export const ReleaseTemplate = defineJobGitLab(ReleaseJobInputs, (inputValues) => ({
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
