import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { Inputs } from "./inputs";
import { ContainerImages, ACTIONS_CHECKOUT } from "../container-image-versions";

export const DeployJobInputsGitHub = defineInputsGitHub({
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  image_suffix: {
    description:
      "The name of the artifact you are building. This is useful when a single pipeline builds more than a single artifact like a container with a shell inside and one without. If you build a single artifact - leave it empty.",
    default: "container",
    type: "string" as const,
  },
  should_deploy: {
    description: "Should the deploy job run",
    default: true,
    type: "boolean" as const,
  },
  image_already_in_registry: {
    description: "If set to true, the image wont be pushed again",
    default: false,
    type: "boolean" as const,
  },
  artifact_suffix: {
    description: "Suffix used to look up build artifacts by name. Defaults to image-suffix when not set.",
    default: "",
    type: "string" as const,
  },
});

export const DeployJobInputsGitLab = defineInputsGitLab({
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_token: Inputs.devguard_token,

  runner_tags: Inputs.runner_tags,
  stage: {
    ...Inputs.stage,
    default: "deploy" as const,
  },
  job_suffix: Inputs.job_suffix,
  git_strategy: {
    ...Inputs.git_strategy,
    default: "none" as const,
  },
  pull_policy: Inputs.pull_policy,
  allow_failure: Inputs.allow_failure,
  needs: Inputs.needs,
  dependencies: Inputs.dependencies,

  registry: Inputs.registry,
  registry_user: Inputs.registry_user,
  registry_password: Inputs.registry_password,

  image: {
    ...Inputs.image,
    description: "The image tar file to push (e.g. image.tar)" as const,
    default: "image.tar" as const,
  },
  image_tag: Inputs.image_tag,
  supplyChainId: Inputs.supplyChainId,

  default_ref: Inputs.default_ref,
  commit_ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,
  disable_job: Inputs.disable_job,
});

export const DeployTemplateGitLab = defineJobGitLab(DeployJobInputsGitLab, (inputValues) => ({
  name: `devguard:deploy${inputValues.job_suffix}`,
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
    rules: [
      {
        if: `$CI_PIPELINE_SOURCE == "merge_request_event"`,
        when: "never",
      },
      {
        if: `${inputValues.disable_job} == "true"`,
        when: "never",
      },
      {
        when: "on_success",
      },
    ],
    script: [
      `/crane auth login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}`,
      `/crane push ${inputValues.image} ${inputValues.image_tag}`,
      `/devguard-scanner intoto run --step=deploy --materials="${inputValues.image}" --products="" --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" --supplyChainId="${inputValues.supplyChainId}" --supplyChainOutputDigest="\${DIGEST}" --defaultRef="${inputValues.default_ref}" --ref="${inputValues.commit_ref}" --isTag="${inputValues.is_tag}"`,
    ],
  },
}));

export const DeployTemplateGitHub = defineJobGitHub(DeployJobInputsGitHub, (inputValues) => ({
  name: "devguard:deploy",
  secrets: {
    "devguard-token": {
      description: "DevGuard API token",
      required: true,
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
        name: "Download oci-image artifact (can be created by build-image)",
        uses: "actions/download-artifact@v4",
        with: {
          name: `oci-image\${{ inputs.image_suffix }}`,
          path: ".",
        },
        if: "inputs.image_already_in_registry == false",
      },
      {
        name: "Download image-tag artifact (can be created by build-image)",
        uses: "actions/download-artifact@v4",
        with: {
          name: `image-tag\${{ inputs.image_suffix }}`,
          path: ".",
        },
      },
      {
        name: "Download image-digest artifact (can be created by build-image)",
        uses: "actions/download-artifact@v4",
        with: {
          name: `image-digest\${{ inputs.image_suffix }}`,
          path: ".",
        },
      },
      {
        name: "Read image-digest.txt",
        id: "read-digest",
        run: "echo \"DIGEST=$(cat image-digest.txt)\" >> $GITHUB_ENV",
      },
      {
        name: "In-Toto Provenance run",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `devguard-scanner intoto run --step=deploy --materials=image-tag.txt --products=image-tag.txt --products=image-digest.txt --token=\${{ secrets.devguard-token }} --apiUrl=${inputValues.devguard_api_url} --assetName=${inputValues.devguard_asset_name} --supplyChainId=\${{ github.sha }} --supplyChainOutputDigest="\${{ env.DIGEST }}" --defaultRef=\${{ github.event.repository.default_branch }} --isTag=\${{ github.ref_type == 'tag' }} --ref=\${{ github.ref_name }}`,
        },
        "continue-on-error": true,
      },
      {
        name: "Setup crane",
        uses: "imjasonh/setup-crane@v0.1",
      },
      {
        name: "Push oci image to GitHub image Registry",
        run: "crane push image.tar $(cat image-tag.txt)",
        if: "inputs.image_already_in_registry == false",
      },
    ],
  },
}));
