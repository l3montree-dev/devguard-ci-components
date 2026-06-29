import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { Inputs, Secrets } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_CHECKOUT } from "../actions-versions";

const SASTConfig = {
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_web_ui: Inputs.devguard_web_ui,

  allow_failure: Inputs.allow_failure,

  path: Inputs.path,
  default_ref: Inputs.default_ref,
  commit_ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,
};

export const SASTJobInputs = defineInputsGitLab({
  ...SASTConfig,
  devguard_token: Inputs.devguard_token,

  runner_tags: Inputs.runner_tags,
  stage: Inputs.stage,
  job_suffix: Inputs.job_suffix,
  git_strategy: {
    ...Inputs.git_strategy,
    default: "fetch" as const,
  },
  pull_policy: Inputs.pull_policy,
  needs: Inputs.needs,
  dependencies: Inputs.dependencies,
});

export const SASTJobInputsGitHub = defineInputsGitHub({
  ...SASTConfig,
});

export const StaticApplicationSecurityTestingTemplateGitHub = defineJobGitHub(SASTJobInputsGitHub, (inputValues) => ({
  name: "devguard:static-application-security-testing",
  secrets: {
    "devguard-token": Secrets["devguard-token"],
  },
  job: {
    "runs-on": "ubuntu-latest",
    steps: [
      {
        name: "Checkout code",
        uses: ACTIONS_CHECKOUT,
        with: {
          submodules: "recursive",
          "fetch-depth": 0,
          "persist-credentials": false,
        },
      },
      {
        name: "DevGuard Static application security testing",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        "continue-on-error": inputValues.allow_failure as boolean,
        with: {
          args: `devguard-scanner sast --assetName="${inputValues.devguard_asset_name}" --apiUrl="${inputValues.devguard_api_url}" --token="\${{ secrets.devguard-token }}" --path="${inputValues.path}" --defaultRef="${inputValues.default_ref}" --ref="${inputValues.commit_ref}" --isTag="${inputValues.is_tag}" --webUI=${inputValues.devguard_web_ui}`,
        },
      },
    ],
  },
}));

export const StaticApplicationSecurityTestingTemplate = defineJobGitLab(SASTJobInputs, (inputValues) => ({
  name: `devguard:static-application-security-testing${inputValues.job_suffix}`,
  job: {
    tags: inputValues.runner_tags,
    stage: inputValues.stage,
    allow_failure: inputValues.allow_failure,
    needs: inputValues.needs,
    dependencies: inputValues.dependencies,
    variables: {
      GIT_STRATEGY: inputValues.git_strategy,
    },
    image: {
      name: ContainerImages.DEVGUARD_SCANNER,
      pull_policy: inputValues.pull_policy,
    },
    script: [
      `echo "Running DevGuard SAST..."`,
      `devguard-scanner sast --assetName="${inputValues.devguard_asset_name}" --apiUrl="${inputValues.devguard_api_url}" --token="${inputValues.devguard_token}" --path="${inputValues.path}" --defaultRef="${inputValues.default_ref}" --ref="${inputValues.commit_ref}" --isTag="${inputValues.is_tag}" --webUI=${inputValues.devguard_web_ui}`,
    ],
  },
}));
