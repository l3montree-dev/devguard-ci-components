import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";

export const VexUploadJobInputs = defineInputsGitLab({
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

export const VexUploadJobInputsGitHub = defineInputsGitHub({
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_artifact_name: {
    ...Inputs.devguard_artifact_name,
    default: "source" as const,
  },
  devguard_origin: Inputs.devguard_origin,

  allow_failure: Inputs.allow_failure,

  default_ref: Inputs.default_ref,
  commit_ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,
  ignore_external_references: Inputs.ignore_external_references,

  vex_file: Inputs.vex_file,
});

export const VexUploadTemplateGitHub = defineJobGitHub(VexUploadJobInputsGitHub, (inputValues) => ({
  name: "devguard:vex-upload",
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
          "fetch-depth": 0,
          "persist-credentials": false,
        },
      },
      {
        name: "DevGuard VeX Upload",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        "continue-on-error": inputValues.allow_failure as boolean,
        with: {
          args: `devguard-scanner vex \${{ inputs.vex_file }} --origin="${inputValues.devguard_origin}" --assetName="${inputValues.devguard_asset_name}" --apiUrl="${inputValues.devguard_api_url}" --token="\${{ secrets.devguard-token }}" --defaultRef="${inputValues.default_ref}" --ref="${inputValues.commit_ref}" --isTag="${inputValues.is_tag}" --artifactName="${inputValues.devguard_artifact_name}" --ignoreExternalReferences=${inputValues.ignore_external_references}`,
        },
      },
    ],
  },
}));

export const VexUploadTemplate = defineJobGitLab(VexUploadJobInputs, (inputValues) => ({
  name: `devguard:vex_upload${inputValues.job_suffix}`,
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
      pull_policy: inputValues.pull_policy as "always" | "never" | "if-not-present",
    },
    script: [
      `echo "Running DevGuard VeX Upload..."`,
      `devguard-scanner vex ${inputValues.vex_file} --origin="${inputValues.devguard_origin}" --assetName="${inputValues.devguard_asset_name}" --apiUrl="${inputValues.devguard_api_url}" --token="${inputValues.devguard_token}" --defaultRef="${inputValues.default_ref}" --ref="${inputValues.commit_ref}" --isTag="${inputValues.is_tag}" --artifactName="${inputValues.devguard_artifact_name}" --ignoreExternalReferences=${inputValues.ignore_external_references}`,
    ],
  },
}));
