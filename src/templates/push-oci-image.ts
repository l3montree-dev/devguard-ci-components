
import { Inputs, Secrets } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_CHECKOUT, ACTIONS_DOWNLOAD_ARTIFACT } from "../actions-versions";
import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { GitHubReusableSteps } from "../github-resusable-steps";
import { pushImageTarballScript } from "./deploy";

// The digest the GitLab push job pushed, named like the env file of generate-tag - read by the multi-arch manifest job
// and, through resolvePushedImageScript, by the sign, attest and provenance jobs
export const pushedDigestFile = (upstreamVersion: string, architecture: string) =>
  `image_digest_${upstreamVersion}_${architecture}.txt`;

// Sets IMAGE_REF to the image a GitLab sign, attest or provenance job works on: the image this pipeline pushed, not
// whatever a tag points to by now. A reference with a digest stays - the build computed it and the push job checked
// it. A tag gets the digest of pushedDigestFile; without that file this pipeline pushed nothing (merge request
// pipelines) and the job ends without doing anything. An empty pushedDigestFile keeps the image as given.
export const resolvePushedImageScript = (image: string, digestFile: string) => `IMAGE_REF="${image}"
PUSHED_DIGEST_FILE="${digestFile}"
if [ -n "$PUSHED_DIGEST_FILE" ]; then
  case "$IMAGE_REF" in
    *@*) ;;
    *)
      if [ ! -f "$PUSHED_DIGEST_FILE" ]; then
        echo "$PUSHED_DIGEST_FILE not found - this pipeline pushed no image (e.g. a merge request pipeline), nothing to do"
        exit 0
      fi
      IMAGE_REF="$IMAGE_REF@$(cat "$PUSHED_DIGEST_FILE")"
      ;;
  esac
fi
echo "Image: $IMAGE_REF"`;

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
  // name the pushed digest like generate-tag names its env file - the multi-arch manifest job reads both per architecture
  architecture: Inputs.architecture,
  upstream_version: Inputs.upstream_version,

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
      GitHubReusableSteps.SetupCrane,
      {
        name: "Push OCI image",
        run: pushImageTarballScript(`"$(cat image-tag.txt | tr '[:upper:]' '[:lower:]')"`),
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
    script: `crane auth login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}

# Strip any "@sha256:..." digest suffix: the build job exports IMAGE_TAG as
# "repo:tag@digest", and "crane push" against a tag+digest reference pushes by
# digest only, never creating the tag that downstream jobs (manifest/sign/attest) need.
IMAGE_REF="${inputValues.image_tag}"
BUILT_DIGEST=""
case "$IMAGE_REF" in
  *@*) BUILT_DIGEST="\${IMAGE_REF#*@}" ;;
esac
IMAGE_REF=$(echo "\${IMAGE_REF%@*}" | tr '[:upper:]' '[:lower:]')

echo "Image: ${inputValues.image}"
echo "Image Tag: \${IMAGE_REF}"

# crane push prints the pushed reference with the digest it computed locally (repository@sha256:...) on stdout
PUSHED=$(crane push ${inputValues.image} "\${IMAGE_REF}")
echo "Pushed \${PUSHED}"

# sign, attest and provenance name the digest the build computed (IMAGE_TAG=repository:tag@digest)
if [ -n "$BUILT_DIGEST" ] && [ "\${PUSHED#*@}" != "$BUILT_DIGEST" ]; then
  echo "ERROR: crane computed \${PUSHED#*@} for the pushed image, but the build computed $BUILT_DIGEST - signatures and attestations would name a different image."
  exit 1
fi

# the multi-arch manifest job references the pushed image by this digest
echo "\${PUSHED#*@}" > ${pushedDigestFile(inputValues.upstream_version, inputValues.architecture)}
`,
    artifacts: {
      paths: [pushedDigestFile(inputValues.upstream_version, inputValues.architecture)],
    },
  },
}));
