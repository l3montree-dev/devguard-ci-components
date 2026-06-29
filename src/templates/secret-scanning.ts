
import { Inputs, Secrets } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { GitHubReusableSteps } from "../github-resusable-steps";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";

const config = {
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_web_ui: Inputs.devguard_web_ui,

  job_suffix: Inputs.job_suffix,

  allow_failure: {
    ...Inputs.allow_failure,
    description: "Whether the job should be marked as failed or successful when open code risks are detected. (default: false, meaning the job will fail if any open code risk is found)" as const,
  },

  path: Inputs.path,
  default_ref: Inputs.default_ref,
  commit_ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,
};

export const SecretScanningJobInputsGitLab = defineInputsGitLab({
  ...config,
  devguard_token: Inputs.devguard_token,
  stage: Inputs.stage,
  runner_tags: Inputs.runner_tags,
  pull_policy: Inputs.pull_policy,
  needs: {
    ...Inputs.needs,
    description: "List of jobs this scan depends on" as const,
  },
  git_strategy: {
    ...Inputs.git_strategy,
    default: "clone" as const,
  },
  dependencies: Inputs.dependencies,
});
export const SecretScanningTemplateGitLab = defineJobGitLab(SecretScanningJobInputsGitLab, (inputValues) => ({
  name: `devguard:secret_scanning${inputValues.job_suffix}`,
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
      entrypoint: [""],
    },
    script: [
      `echo "Running DevGuard Secret Scanning (using gitleaks git)..."`,
      `devguard-scanner secret-scanning --assetName="${inputValues.devguard_asset_name}" --apiUrl="${inputValues.devguard_api_url}" --token="${inputValues.devguard_token}" --path="${inputValues.path}" --defaultRef="${inputValues.default_ref}" --ref="${inputValues.commit_ref}" --isTag="${inputValues.is_tag}" --webUI=${inputValues.devguard_web_ui}`,
    ],
  },
}));

export const SecretScanningJobInputsGitHub = defineInputsGitHub({
  ...config,
});

export const SecretScanningTemplateGitHub = defineJobGitHub(SecretScanningJobInputsGitHub, (inputValues) => ({
  name: `devguard:secret-scanning${inputValues.job_suffix}`,
  secrets: {
    "devguard-token": Secrets["devguard-token"],
  },
  job: {
    "runs-on": "ubuntu-latest",
    steps: [
      GitHubReusableSteps.CheckoutCode,
      {
        name: "Run DevGuard Secret Scanning",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        "continue-on-error": inputValues["allow_failure"] as boolean,
        with: {
          args: `devguard-scanner secret-scanning --assetName="${inputValues.devguard_asset_name}" --apiUrl="${inputValues.devguard_api_url}" --token="\${{ secrets.devguard-token }}" --path="${inputValues.path}" --defaultRef="${inputValues.default_ref}" --ref="${inputValues.commit_ref}" --isTag="${inputValues.is_tag}" --webUI=${inputValues.devguard_web_ui}`,
        },
      },
    ],
  },
}));
