import { defineInputsGitLab, defineJobGitLab } from "@l3montree/programmatic-ci-components";
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";

export const SbomUploadJobInputs = defineInputsGitLab({
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_token: Inputs.devguard_token,
  devguard_web_ui: Inputs.devguard_web_ui,
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
  fail_on_risk: Inputs.fail_on_risk,
  fail_on_cvss: Inputs.fail_on_cvss,
  ignore_external_references: Inputs.ignore_external_references,

  sbom_file: Inputs.sbom_file,
});

export const SbomUploadTemplate = defineJobGitLab(
  SbomUploadJobInputs,
  (inputValues) => ({
    name: `devguard:sbom_upload${inputValues.job_suffix}`,
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
        `echo "Running DevGuard SBOM Upload..."`,
        `devguard-scanner sbom ${inputValues.sbom_file} --origin="${inputValues.devguard_origin}" --assetName="${inputValues.devguard_asset_name}" --apiUrl="${inputValues.devguard_api_url}" --token="${inputValues.devguard_token}" --defaultRef="${inputValues.default_ref}" --ref="${inputValues.commit_ref}" --isTag="${inputValues.is_tag}" --artifactName="${inputValues.devguard_artifact_name}" --webUI=${inputValues.devguard_web_ui} --failOnRisk=${inputValues.fail_on_risk} --failOnCVSS=${inputValues.fail_on_cvss} --ignoreExternalReferences=${inputValues.ignore_external_references}`,
      ],
    },
  }),
);
