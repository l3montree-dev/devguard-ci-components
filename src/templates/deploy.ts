import { defineInputsGitHub, defineJobGitHub, githubInputEquals } from "../lib/JobBuilderGitHub";
import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { InputGroups, Inputs, Secrets } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_CHECKOUT, ACTIONS_DOWNLOAD_ARTIFACT } from "../actions-versions";
import { GitHubReusableSteps } from "../github-resusable-steps";

// Pushes the image tarball to imageRef and fails if crane computes another digest than the build did (image-digest.txt).
// Sign, attest and provenance name the build's digest - on a mismatch they would name a different image.
// crane push prints the pushed reference with the digest it computed locally (repository@sha256:...) as its only output on stdout.
export const pushImageTarballScript = (imageRef: string, tarball = "image.tar") => `PUSHED=$(crane push ${tarball} ${imageRef})
echo "Pushed $PUSHED"
if [ "\${PUSHED#*@}" != "$(cat image-digest.txt)" ]; then
  echo "::error::crane computed \${PUSHED#*@} for the pushed image, but the build computed $(cat image-digest.txt) - signatures and attestations would name a different image. Build and push have to use the same crane (CRANE_VERSION)."
  exit 1
fi`;

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
      `crane auth login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}`,
      `crane push ${inputValues.image} ${inputValues.image_tag}`,
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
      // the crane the build job computed image-digest.txt with - pushing with another one can produce another digest
      GitHubReusableSteps.SetupCrane,
      {
        name: "Push oci image to GitHub image Registry",
        run: pushImageTarballScript(`"$(cat image-tag.txt)"`),
        if: githubInputEquals(inputValues.image_already_in_registry, "false"),
      },
    ],
  },
}));
