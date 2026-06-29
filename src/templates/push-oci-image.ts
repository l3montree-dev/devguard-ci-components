
import { Inputs, Secrets } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_CHECKOUT, ACTIONS_DOWNLOAD_ARTIFACT } from "../actions-versions";
import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";

export const PushOciImageJobInputs = defineInputsGitLab({
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_token: Inputs.devguard_token,

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

  supply_chain_id: Inputs.supply_chain_id,

  default_ref: Inputs.default_ref,
  ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,

  disable_job: Inputs.disable_job,
});

export const PushOciImageJobInputsGitHub = defineInputsGitHub({
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  image_suffix: Inputs.image_suffix,
  supply_chain_id: Inputs.supply_chain_id,
  commit_ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,
  default_ref: Inputs.default_ref,
  should_deploy: {
    description: "Should the push job run",
    default: true,
    type: "boolean" as const,
  },
});

export const PushOciImageTemplateGitHub = defineJobGitHub(PushOciImageJobInputsGitHub, (inputValues) => ({
  name: "devguard:push-oci-image",
  secrets: {
    "devguard-token": Secrets["devguard-token"],
  },
  job: {
    "runs-on": "ubuntu-latest",
    if: "inputs.should_deploy",
    steps: [
      {
        name: "Checkout code",
        uses: ACTIONS_CHECKOUT,
        with: {
          "fetch-depth": 0,
          "persist-credentials": true,
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
      {
        name: "In-Toto Provenance run",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `devguard-scanner intoto run --step=deploy --materials=image-tag.txt --products=image-tag.txt --products=image-digest.txt --token=\${{ secrets.devguard-token }} --apiUrl=${inputValues.devguard_api_url} --assetName=${inputValues.devguard_asset_name} --supplyChainId=${inputValues.supply_chain_id} --supplyChainOutputDigest="$(cat image-digest.txt)" --defaultRef=${inputValues.default_ref} --isTag=${inputValues.is_tag} --ref=${inputValues.commit_ref}`,
        },
        "continue-on-error": true,
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

/devguard-scanner intoto run --step=deploy --materials="${inputValues.image}" --products="" --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" --supplyChainId="${inputValues.supply_chain_id}" --supplyChainOutputDigest="\${DIGEST}" --defaultRef="${inputValues.default_ref}" --ref="${inputValues.ref}" --isTag="${inputValues.is_tag}"
`,
  },
}));
