import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";

const SCAConfig = {
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_artifact_name: {
    ...Inputs.devguard_artifact_name,
    default: "source" as const,
  },
  devguard_web_ui: Inputs.devguard_web_ui,
  devguard_origin: Inputs.devguard_origin,

  allow_failure: Inputs.allow_failure,

  path: Inputs.path,
  default_ref: Inputs.default_ref,
  commit_ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,

  fail_on_risk: Inputs.fail_on_risk,
  fail_on_cvss: Inputs.fail_on_cvss,
  ignore_external_references: Inputs.ignore_external_references,
};

export const SCAJobInputs = defineInputsGitLab({
  ...SCAConfig,
  devguard_token: Inputs.devguard_token,

  runner_tags: Inputs.runner_tags,
  stage: Inputs.stage,
  job_suffix: Inputs.job_suffix,
  git_strategy: {
    ...Inputs.git_strategy,
    default: "fetch" as const,
  },
  pull_policy: Inputs.pull_policy,
  needs: {
    ...Inputs.needs,
    description: " The jobs that this job depends on" as const,
  },
  dependencies: Inputs.dependencies,
});

export const SCAJobInputsGitHub = defineInputsGitHub({
  ...SCAConfig,
});

export const SoftwareCompositionAnalysisTemplateGitHub = defineJobGitHub(SCAJobInputsGitHub, (inputValues) => ({
  name: "devguard:software-composition-analysis",
  secrets: {
    "devguard-token": {
      description: "DevGuard API token",
      required: true,
    },
  },
  job: {
    "runs-on": "ubuntu-latest",
    steps: [
      {
        name: "Checkout code",
        uses: "actions/checkout@v4",
        with: {
          submodules: "recursive",
          "fetch-depth": 0,
          "persist-credentials": true,
        },
      },
      {
        name: "DevGuard SCA",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        "continue-on-error": inputValues.allow_failure as boolean,
        with: {
          args: `devguard-scanner sca --origin="${inputValues.devguard_origin}" --assetName="${inputValues.devguard_asset_name}" --apiUrl="${inputValues.devguard_api_url}" --token="\${{ secrets.devguard-token }}" --path="${inputValues.path}" --defaultRef="${inputValues.default_ref}" --ref="${inputValues.commit_ref}" --isTag="${inputValues.is_tag}" --webUI=${inputValues.devguard_web_ui} --artifactName=${inputValues.devguard_artifact_name} --failOnRisk=${inputValues.fail_on_risk} --failOnCVSS=${inputValues.fail_on_cvss} --ignoreExternalReferences=${inputValues.ignore_external_references}`,
        },
      },
    ],
  },
}));

export const SoftwareCompositionAnalysisTemplate = defineJobGitLab(SCAJobInputs, (inputValues) => ({
  name: `devguard:software_composition_analysis${inputValues.job_suffix}`,
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
      `echo "Running DevGuard SCA (based on the Trivy Project)..."`,
      `devguard-scanner sca --origin="${inputValues.devguard_origin}" --assetName="${inputValues.devguard_asset_name}" --apiUrl="${inputValues.devguard_api_url}" --token="${inputValues.devguard_token}" --path="${inputValues.path}" --defaultRef="${inputValues.default_ref}" --ref="${inputValues.commit_ref}" --isTag="${inputValues.is_tag}" --webUI=${inputValues.devguard_web_ui} --artifactName=${inputValues.devguard_artifact_name} --failOnRisk=${inputValues.fail_on_risk} --failOnCVSS=${inputValues.fail_on_cvss} --ignoreExternalReferences=${inputValues.ignore_external_references}`,
    ],
  },
}));
