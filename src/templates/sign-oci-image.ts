import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_CHECKOUT, ACTIONS_DOWNLOAD_ARTIFACT } from "../actions-versions";

const SignOciImageConfig = {
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_artifact_name: Inputs.devguard_artifact_name,
  registry: Inputs.registry,
  registry_user: Inputs.registry_user,

  image: {
    ...Inputs.image,
    description: "The container image to sign (e.g., registry.example.com/project/image:tag)" as const,
    default: "$CI_REGISTRY_IMAGE:latest" as const,
  },
  image_suffix: Inputs.image_suffix,
};

export const SignOciImageJobInputs = defineInputsGitLab({
  ...SignOciImageConfig,
  devguard_token: Inputs.devguard_token,

  runner_tags: Inputs.runner_tags,
  stage: {
    ...Inputs.stage,
    default: "attestation",
  },
  job_suffix: Inputs.job_suffix,
  git_strategy: {
    ...Inputs.git_strategy,
    default: "fetch",
  },
  pull_policy: Inputs.pull_policy,
  allow_failure: Inputs.allow_failure,
  needs: {
    ...Inputs.needs,
    description: "List of jobs this scan depends on" as const,
  },
  dependencies: Inputs.dependencies,

  registry: Inputs.registry,
  registry_user: Inputs.registry_user,
  registry_password: Inputs.registry_password,
});

export const SignOciImageTemplate = defineJobGitLab(SignOciImageJobInputs, (inputValues) => ({
  name: `devguard:sign_oci_image${inputValues.job_suffix}`,
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
      `devguard-scanner login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}`,
      `devguard-scanner sign --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" "${inputValues.image}"`,
    ],
  },
}));

export const SignJobInputsGitHub = defineInputsGitHub({
  ...SignOciImageConfig,
  should_deploy: {
    description: "Should the signing job run",
    default: true,
    type: "boolean" as const,
  },
});

export const SignTemplateGitHub = defineJobGitHub(SignJobInputsGitHub, (inputValues) => ({
  name: "devguard:sign",
  secrets: {
    "devguard-token": {
      description: "DevGuard API token",
      required: true,
    },
    "registry-password": {
      description: "Registry password for pulling the image.",
      required: true,
      default: "${{ github.token }}",
    },
  },
  job: {
    "runs-on": "ubuntu-latest",
    if: "inputs.should_deploy",
    steps: [
      {
        name: "Checkout code",
        uses: ACTIONS_CHECKOUT,
        with: {
          submodules: "recursive",
          "fetch-depth": 0,
          "persist-credentials": true,
        },
      },
      {
        name: "Download image-tag artifact (can be created by build-image)",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `image-tag${ inputValues.image_suffix }`,
          path: ".",
        },
      },
      {
        name: "Download image-digest artifact (can be created by build-image)",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `image-digest${ inputValues.image_suffix }`,
          path: ".",
        },
      },
      {
        name: "Set Image to be signed",
        run: `echo "IMAGE_TAG_AND_DIGEST=$(cat image-tag.txt)@$(cat image-digest.txt)" >> $GITHUB_ENV`,
      },
      {
        name: "DevGuard Image-Signing",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `devguard-scanner sign -u ${inputValues.registry_user} -r ${inputValues.registry} -p \${{ secrets.registry-password }} --token="\${{ secrets.devguard-token }}" \${{ env.IMAGE_TAG_AND_DIGEST }} --apiUrl=${inputValues.devguard_api_url} --assetName=${inputValues.devguard_asset_name}`,
        },
      },
    ],
  },
}));
