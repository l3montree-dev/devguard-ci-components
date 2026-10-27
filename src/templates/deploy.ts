import { defineInputsGitHub, defineJobGitHub, githubInputEquals } from "../lib/JobBuilderGitHub";
import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { InputGroups, Inputs, Secrets } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_CHECKOUT, ACTIONS_DOWNLOAD_ARTIFACT, IMJASONH_SETUP_CRANE } from "../actions-versions";
import { GitHubReusableSteps } from "../github-resusable-steps";

export const DeployJobInputsGitHub = defineInputsGitHub({
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
});

export const DeployJobInputsGitLab = defineInputsGitLab({
  stage: {
    ...Inputs.stage,
    default: "deploy" as const,
  },
  job_suffix: Inputs.job_suffix,
  git_strategy: {
    ...Inputs.git_strategy,
    default: "none" as const,
  },
  ...InputGroups.jobControl,

  ...InputGroups.registry,
  registry_password: Inputs.registry_password,

  image: {
    ...Inputs.image,
    description: "The image tar file to push (e.g. image.tar)" as const,
    default: "image.tar" as const,
  },
  image_tag: Inputs.image_tag,
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
      name: ContainerImages.KANIKO,
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
    ],
  },
}));

export const DeployTemplateGitHub = defineJobGitHub(DeployJobInputsGitHub, (inputValues) => ({
  name: "devguard:deploy",
  secrets: {
    "submodule-ssh-key": Secrets["submodule-ssh-key"],
  },
  job: {
    "runs-on": "ubuntu-latest",
    if: "inputs.should_deploy",
    steps: [
      GitHubReusableSteps.SetupSubmoduleSsh,
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
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `oci-image${ inputValues.image_suffix }`,
          path: ".",
        },
        if: githubInputEquals(inputValues.image_already_in_registry, "false"),
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
        name: "Setup crane",
        uses: IMJASONH_SETUP_CRANE,
      },
      {
        name: "Push oci image to GitHub image Registry",
        run: 'crane push image.tar "$(cat image-tag.txt)"',
        if: githubInputEquals(inputValues.image_already_in_registry, "false"),
      },
    ],
  },
}));
