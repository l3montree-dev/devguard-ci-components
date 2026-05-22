import { defineInputsGitLab, defineJobGitLab } from "@l3montree/programmatic-ci-components";
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";

export const IaCJobInputs = defineInputsGitLab({
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_token: Inputs.devguard_token,
  devguard_web_ui: Inputs.devguard_web_ui,

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

  path: Inputs.path,
  default_ref: Inputs.default_ref,
  commit_ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,
});

export const InfrastructureAsCodeScanningTemplate = defineJobGitLab(IaCJobInputs, (inputValues) => ({
  name: `devguard:infrastructure_as_code_scanning${inputValues.job_suffix}`,
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
      `echo "Running DevGuard IaC Scanning..."`,
      `devguard-scanner iac --assetName="${inputValues.devguard_asset_name}" --apiUrl="${inputValues.devguard_api_url}" --token="${inputValues.devguard_token}" --path="${inputValues.path}" --defaultRef="${inputValues.default_ref}" --ref="${inputValues.commit_ref}" --isTag="${inputValues.is_tag}" --webUI=${inputValues.devguard_web_ui}`,
    ],
  },
}));
