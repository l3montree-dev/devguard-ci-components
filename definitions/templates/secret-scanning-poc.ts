/**
 * Secret Scanning Template (PoC - Platform-Agnostic)
 *
 * This is a proof-of-concept demonstrating a direct class-based job definition
 * for one template without introducing extra builder abstractions.
 */

import {
  BaseWorkflowJob,
  defineInputsGitLab,
  GitLabJobWithSpec,
  InputValuesGitLab,
  resolveInputValue,
} from "@l3montree/programmatic-ci-components";
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";

export const SecretScanningJobInputsPoc = defineInputsGitLab({
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_token: Inputs.devguard_token,
  devguard_web_ui: Inputs.devguard_web_ui,

  runner_tags: Inputs.runner_tags,
  stage: Inputs.stage,
  job_suffix: Inputs.job_suffix,
  git_strategy: {
    ...Inputs.git_strategy,
    default: "clone" as const,
  },
  pull_policy: Inputs.pull_policy,
  allow_failure: Inputs.allow_failure,
  needs: {
    ...Inputs.needs,
    description: "List of jobs this scan depends on" as const,
  },
  dependencies: Inputs.dependencies,

  path: Inputs.path,
  default_ref: Inputs.default_ref,
  commit_ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,
});

type SecretScanningInputValues = InputValuesGitLab<typeof SecretScanningJobInputsPoc>;

const resolveInput = <T extends keyof SecretScanningInputValues>(
  inputValues: Partial<SecretScanningInputValues>,
  key: T,
): SecretScanningInputValues[T] => {
  return resolveInputValue(
    String(key),
    inputValues[key],
  ) as SecretScanningInputValues[T];
};

export class SecretScanningJob extends BaseWorkflowJob {
  constructor(inputValues: Partial<SecretScanningInputValues> = {}) {
    const jobSuffix = String(resolveInput(inputValues, "job_suffix"));
    const runnerTags = Array.isArray(inputValues.runner_tags)
      ? (inputValues.runner_tags as any)
      : undefined;
    const needs = Array.isArray(inputValues.needs)
      ? (inputValues.needs as any)
      : undefined;
    const allowFailure =
      inputValues.allow_failure === undefined
        ? undefined
        : Boolean(inputValues.allow_failure);

    super({
      name: `devguard:secret_scanning${jobSuffix}`,
      description: "DevGuard Secret Scanning",
      image: ContainerImages.DEVGUARD_SCANNER,
      allowFailure,
      needs,
      scripts: [
        `echo "Running DevGuard Secret Scanning (using gitleaks git)..."`,
        `devguard-scanner secret-scanning --assetName="${String(resolveInput(inputValues, "devguard_asset_name"))}" --apiUrl="${String(resolveInput(inputValues, "devguard_api_url"))}" --token="${String(resolveInput(inputValues, "devguard_token"))}" --path="${String(resolveInput(inputValues, "path"))}" --defaultRef="${String(resolveInput(inputValues, "default_ref"))}" --ref="${String(resolveInput(inputValues, "commit_ref"))}" --isTag="${String(resolveInput(inputValues, "is_tag"))}" --webUI=${String(resolveInput(inputValues, "devguard_web_ui"))}`,
      ],
      gitlab: {
        tags: runnerTags,
        stage: String(resolveInput(inputValues, "stage")),
        pull_policy: String(resolveInput(inputValues, "pull_policy")),
        git_strategy: String(resolveInput(inputValues, "git_strategy")),
      },
      github: {
        runsOn: "ubuntu-latest",
      },
    });
  }
}

export const SecretScanningTemplatePoc = (
  inputValues: Partial<SecretScanningInputValues> = {},
): GitLabJobWithSpec => ({
  name: `devguard:secret_scanning${String(resolveInput(inputValues, "job_suffix"))}`,
  inputs: SecretScanningJobInputsPoc,
  job: new SecretScanningJob(inputValues),
});
