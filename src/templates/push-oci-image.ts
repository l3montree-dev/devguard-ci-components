
import { Inputs, Secrets } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_CHECKOUT, ACTIONS_DOWNLOAD_ARTIFACT } from "../actions-versions";
import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { GitHubReusableSteps } from "../github-resusable-steps";

export const PushOciImageJobInputs = defineInputsGitLab({
  runner_tags: Inputs.runner_tags,
  stage: {
    ...Inputs.stage,
    default: "oci-image",
  },
  job_suffix: Inputs.job_suffix,
  git_strategy: {
    ...Inputs.git_strategy,
    default: "none",
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
    description: "The image file to build (e.g. image.tar)" as const,
    default: "image.tar" as const,
  },
  image_tag: {
    ...Inputs.image_tag,
    description:
      "The tag to use for the built image. Leave empty to use the generated tag from the 'generate-tag' component." as const,
  },

  disable_job: Inputs.disable_job,
});

export const PushOciImageJobInputsGitHub = defineInputsGitHub({
  image_suffix: Inputs.image_suffix,
  should_deploy: {
    description: "Should the push job run",
    default: true,
    type: "boolean" as const,
  },
});

export const PushOciImageTemplateGitHub = defineJobGitHub(PushOciImageJobInputsGitHub, (inputValues) => ({
  name: "devguard:push-oci-image",
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
          "fetch-depth": 0,
          "persist-credentials": true,
          submodules: "recursive",
        },
      },
      {
        name: "Download oci-image artifact",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `oci-image${ inputValues.image_suffix }`,
          path: ".",
        },
      },
      {
        name: "Download image-tag artifact",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `image-tag${ inputValues.image_suffix }`,
          path: ".",
        },
      },
      {
        name: "Download image-digest artifact",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `image-digest${ inputValues.image_suffix }`,
          path: ".",
        },
      },
      {
        name: "Log in to ghcr.io",
        run: `mkdir -p \${HOME}/.docker
sudo chown -R 53111:53111 \${HOME}/.docker || true
sudo chmod 700 \${HOME}/.docker || true
docker run --rm \\
  --user 53111:53111 \\
  -v "\${HOME}/.docker:/tmp/.docker" \\
  ${ContainerImages.DEVGUARD_SCANNER} \\
  crane auth login ghcr.io -u $GITHUB_ACTOR -p $GITHUB_TOKEN`,
      },
      {
        name: "Push OCI image",
        run: `docker run --rm \\
  -v "$GITHUB_WORKSPACE:/workspace" \\
  -w /workspace \\
  -v "\${HOME}/.docker:/tmp/.docker:ro" \\
  ${ContainerImages.DEVGUARD_SCANNER} \\
  crane push image.tar "$(cat image-tag.txt | tr '[:upper:]' '[:lower:]')"`,
      },
    ],
  },
}));

export const PushOciImageTemplate = defineJobGitLab(PushOciImageJobInputs, (inputValues) => ({
  name: `devguard:push_oci_image${inputValues.job_suffix}`,
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
    script: `/crane auth login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}

# Strip any "@sha256:..." digest suffix: the build job exports IMAGE_TAG as
# "repo:tag@digest", and "crane push" against a tag+digest reference pushes by
# digest only, never creating the tag that downstream jobs (manifest/sign/attest) need.
IMAGE_REF="${inputValues.image_tag}"
IMAGE_REF="\${IMAGE_REF%@*}"
IMAGE_REF=$(echo "\${IMAGE_REF}" | tr '[:upper:]' '[:lower:]')

echo "Image: ${inputValues.image}"
echo "Image Tag: \${IMAGE_REF}"

/crane push ${inputValues.image} "\${IMAGE_REF}"
`,
  },
}));
