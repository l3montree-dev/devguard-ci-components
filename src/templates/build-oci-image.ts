
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_CHECKOUT, ACTIONS_UPLOAD_ARTIFACT } from "../actions-versions";
import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";

const BuildOciImageConfig = {
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_artifact_name: Inputs.devguard_artifact_name,

  image: {
    ...Inputs.image,
    description: "The image file to build (e.g. image.tar)" as const,
    default: "image.tar" as const,
  },
  image_suffix: Inputs.image_suffix,
  fetch_depth: Inputs.fetch_depth,
};

export const BuildOciImageJobInputs = defineInputsGitLab({
  ...BuildOciImageConfig,
  devguard_token: Inputs.devguard_token,

  runner_tags: Inputs.runner_tags,
  stage: {
    ...Inputs.stage,
    default: "oci-image" as const,
  },
  job_suffix: Inputs.job_suffix,
  job_prefix: Inputs.job_prefix,
  git_strategy: {
    ...Inputs.git_strategy,
    default: "fetch" as const,
  },
  pull_policy: Inputs.pull_policy,
  allow_failure: Inputs.allow_failure,
  needs: Inputs.needs,
  dependencies: Inputs.dependencies,

  registry: Inputs.registry,
  registry_user: Inputs.registry_user,
  registry_password: Inputs.registry_password,

  image_tag: Inputs.image_tag,
  build_args: Inputs.build_args,
  push_image: Inputs.push_image,

  supplyChainId: Inputs.supplyChainId,

  default_ref: Inputs.default_ref,
  ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,
});

export const BuildOciImageTemplate = defineJobGitLab(BuildOciImageJobInputs, (inputValues) => ({
  name: `${inputValues.job_prefix}devguard:build_oci_image${inputValues.job_suffix}`,
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
    before_script: [
      `echo "Uses Kaniko to build Docker images securely without requiring privileged access (docker in docker needs privileged access).\\n The artifacts are not pushed to the registry until they have undergone security scanning to ensure vulnerabilities are addressed before deployment - therefore they are stored as artifacts rather than pushed to the registry."`,
      `/devguard-scanner intoto start --step=build --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" --supplyChainId="${inputValues.supplyChainId}"`,
    ],
    script: [
      `/crane auth login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}`,
      `/kaniko/executor ${inputValues.build_args} --ignore-path=/devguard-scanner --ignore-path=/crane --pre-cleanup --cleanup --preserve-context --destination ${inputValues.image_tag} $( [ "${inputValues.push_image}" = "false" ] && echo "--no-push --tarPath ${inputValues.image}" )`,

      // kaniko might remove all files after building - thus a second login is necessary.
      `/crane auth login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}`,
      `/crane digest $([[ "${inputValues.push_image}" == "false" ]] && echo "--tarball=${inputValues.image}" || echo "${inputValues.image_tag}" ) > image-digest.txt`,

      `echo "Running DevGuard Intoto Build...stopping..."`,
      `/devguard-scanner intoto stop --step=build --products=image-digest.txt --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" --supplyChainId="${inputValues.supplyChainId}" --generateSlsaProvenance --defaultRef="${inputValues.default_ref}" --ref="${inputValues.ref}" --isTag="${inputValues.is_tag}"`,

      `echo "IMAGE_TAG=${inputValues.image_tag}@$(cat image-digest.txt)" > variables.env`,
    ],
    artifacts: {
      paths: [inputValues.image, "image-digest.txt", "build.provenance.json", "variables.env"],
      reports: {
        dotenv: "variables.env",
      },
      when: "on_success",
    },
  },
}));

export const BuildOciImageJobInputsGitHub = defineInputsGitHub({
  ...BuildOciImageConfig,
  image_destination_path: {
    description: "Destination of the image.tar file",
    default: "image.tar",
    type: "string" as const,
  },
  disable_artifact_registry_as_image_store: {
    description:
      "If the artifact size is too big for your github usage quota, set this to true. This will push the image directly to the registry instead of uploading it as artifact.",
    default: false,
    type: "boolean" as const,
  },
});

export const BuildOciImageTemplateGitHub = defineJobGitHub(BuildOciImageJobInputsGitHub, (inputValues) => ({
  name: "devguard:build-oci-image",
  secrets: {
    "devguard-token": {
      description: "DevGuard API token",
      required: true,
    },
    "build-args": {
      description: "Build arguments. Useful to overwrite context and dockerfile. Maybe even add additional build args.",
      required: false,
    },
  },
  job: {
    "runs-on": "ubuntu-latest",
    steps: [
      {
        name: "Set BUILD_ARGS",
        run: `if [ -z "\${{ secrets.build-args }}" ]; then
  BUILD_ARGS="--context=. --dockerfile=Dockerfile"
else
  BUILD_ARGS="\${{ secrets.build-args }}"
fi

echo "BUILD_ARGS=$BUILD_ARGS --no-push --tarPath /github/workspace/tmp-image.tar" >> $GITHUB_ENV`,
      },
      {
        name: "Checkout code",
        uses: ACTIONS_CHECKOUT,
        with: {
          submodules: "recursive",
          "persist-credentials": false,
          "fetch-depth": inputValues.fetch_depth as unknown as number,
        },
      },
      {
        name: "In-Toto permission fix",
        run: `mkdir -p \${HOME}/.docker
# Ensure the .docker directory is owned by the container user (UID 53111)
sudo chown -R 53111:53111 \${HOME}/.docker || true
sudo chmod 700 \${HOME}/.docker || true
# Make the workspace writable by the in-toto/container user (UID 53111)
sudo chown -R 53111:53111 $GITHUB_WORKSPACE || true
sudo chmod -R u+rwX $GITHUB_WORKSPACE || true`,
      },
      {
        name: "In-Toto Provenance record start",
        id: "in-toto-start",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `devguard-scanner intoto start --step=build --token=\${{ secrets.devguard-token }} --apiUrl=${inputValues.devguard_api_url} --assetName=${inputValues.devguard_asset_name} --supplyChainId=\${{ github.sha }}`,
        },
        "continue-on-error": true,
      },
      {
        name: "Build Docker image with Kaniko",
        id: "build_image",
        uses: "docker://ghcr.io/osscontainertools/kaniko:v1.27.3-debug@sha256:a7e2df20e8ee98874f9856a04622de6a76e93609f7e5cba5949eb5436959720c",
        with: {
          args: "${{ env.BUILD_ARGS }}",
        },
      },
      {
        name: "Move the image.tar to the destination path",
        run: `if [ -f tmp-image.tar ]; then
  sudo chown $(id -u):$(id -g) tmp-image.tar || true
  sudo chmod 644 tmp-image.tar || true
  sudo mv tmp-image.tar "\${IMAGE_DESTINATION_PATH}"
else
  echo "tmp-image.tar not found"
  exit 1
fi`,
        env: {
          IMAGE_DESTINATION_PATH: `\${{ inputs.image_destination_path }}`,
        } as Record<string, string>,
      },
      {
        name: "Fix workspace permissions",
        run: `# Keep 53111 as owner but make it world-writable for runner to write output files
sudo chmod -R 777 $GITHUB_WORKSPACE || true`,
        "continue-on-error": true,
      },
      {
        name: "Use crane to get the digest",
        run: `docker run --rm \\
  -v "$GITHUB_WORKSPACE:/workspace" \\
  -w /workspace \\
  ${ContainerImages.DEVGUARD_SCANNER} \\
  crane digest --tarball="\${IMAGE_DESTINATION_PATH}" > image-digest.txt`,
        env: {
          IMAGE_DESTINATION_PATH: `\${{ inputs.image_destination_path }}`,
        },
      },
      {
        name: "Upload artifact",
        uses: ACTIONS_UPLOAD_ARTIFACT,
        with: {
          name: `oci-image\${{ inputs.image_suffix }}`,
          path: `\${{ inputs.image_destination_path }}`,
        },
        if: "inputs.disable_artifact_registry_as_image_store == false",
      },
      {
        name: "Set image tag",
        id: "set-image-tag",
        env: {
          IMAGE_SUFFIX: `\${{ inputs.image_suffix }}`,
          IMAGE: `\${{ inputs.image }}`,
        },
        run: `if [ -n "$IMAGE" ]; then
  IMAGE_TAG="$IMAGE"
  echo "$IMAGE_TAG" > image-tag.txt
  echo "IMAGE_TAG=$IMAGE_TAG" >> "$GITHUB_ENV"
else
  if [ -n "$IMAGE_SUFFIX" ]; then
    IMAGE_PATH="ghcr.io/\${GITHUB_REPOSITORY}/\${IMAGE_SUFFIX}"
  else
    IMAGE_PATH="ghcr.io/\${GITHUB_REPOSITORY}"
  fi
  docker run --rm \\
    -e IMAGE_PATH \\
    -e GITHUB_REF_NAME \\
    ${ContainerImages.DEVGUARD_SCANNER} \\
    devguard-scanner generate-tag \\
      --imagePath="$IMAGE_PATH" \\
      --ref="$GITHUB_REF_NAME" \\
  >> image-tag-env.txt
  IMAGE_TAG=$(grep '^IMAGE_TAG=' image-tag-env.txt | cut -d= -f2-)
  ARTIFACT_NAME=$(grep '^ARTIFACT_NAME=' image-tag-env.txt | cut -d= -f2-)
  ARTIFACT_URL_ENCODED=$(grep '^ARTIFACT_URL_ENCODED=' image-tag-env.txt | cut -d= -f2-)
  echo "$IMAGE_TAG" > image-tag.txt
  echo "IMAGE_TAG=$IMAGE_TAG" >> "$GITHUB_ENV"
  echo "ARTIFACT_NAME=$ARTIFACT_NAME" >> "$GITHUB_ENV"
  echo "ARTIFACT_URL_ENCODED=$ARTIFACT_URL_ENCODED" >> "$GITHUB_ENV"
fi`,
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
  crane auth login ghcr.io -u \${{ github.actor }} -p \${{ github.token }}`,
        if: "inputs.disable_artifact_registry_as_image_store == true",
      },
      {
        name: "Upload to container registry",
        run: `docker run --rm \\
  -v "$GITHUB_WORKSPACE:/workspace" \\
  -w /workspace \\
  -v "\${HOME}/.docker:/tmp/.docker:ro" \\
  ${ContainerImages.DEVGUARD_SCANNER} \\
  crane push "\${IMAGE_DESTINATION_PATH}" "$(cat image-tag.txt)"`,
        env: {
          IMAGE_DESTINATION_PATH: `\${{ inputs.image_destination_path }}`,
        } as Record<string, string>,
        if: "inputs.disable_artifact_registry_as_image_store == true",
      },
      {
        name: "Upload digest",
        uses: ACTIONS_UPLOAD_ARTIFACT,
        with: {
          name: `image-digest\${{ inputs.image_suffix }}`,
          path: "image-digest.txt",
        },
      },
      {
        name: "Set artifact PURL",
        run: `if [ -n "$ARTIFACT_NAME_INPUT" ]; then
  PURL="$ARTIFACT_NAME_INPUT"
  SAFE_PURL=$(echo -n "$PURL" | jq -s -R -r @uri)
else
  PURL="$ARTIFACT_NAME"
  SAFE_PURL="$ARTIFACT_URL_ENCODED"
fi
echo "$PURL" > artifact-purl.txt
echo "$SAFE_PURL" > artifact-purl-safe.txt
echo "PURL=$PURL" >> $GITHUB_ENV
echo "Using artifact name: $PURL"`,
        env: {
          ARTIFACT_NAME_INPUT: `\${{ inputs.devguard_artifact_name }}`,
        } as Record<string, string>,
      },
      {
        name: "Upload artifact purl",
        uses: ACTIONS_UPLOAD_ARTIFACT,
        with: {
          name: `artifact-purl\${{ inputs.image_suffix }}`,
          path: "artifact-purl.txt",
        },
      },
      {
        name: "Upload safe artifact purl",
        uses: ACTIONS_UPLOAD_ARTIFACT,
        with: {
          name: `artifact-purl-safe\${{ inputs.image_suffix }}`,
          path: "artifact-purl-safe.txt",
        },
      },
      {
        name: "Upload image tag",
        uses: ACTIONS_UPLOAD_ARTIFACT,
        with: {
          name: `image-tag\${{ inputs.image_suffix }}`,
          path: "image-tag.txt",
        },
      },
      {
        name: "In-Toto Provenance record stop",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `devguard-scanner intoto stop --step=build --products=image-digest.txt --products=image-tag.txt --token=\${{ secrets.devguard-token }} --apiUrl=${inputValues.devguard_api_url} --assetName=${inputValues.devguard_asset_name} --supplyChainId=\${{ github.sha }} --generateSlsaProvenance --defaultRef=\${{ github.event.repository.default_branch }} --isTag=\${{ github.ref_type == 'tag' }} --ref=\${{ github.ref_name }}`,
        },
        "continue-on-error": true,
      },
      {
        name: "Fix workspace permissions (after provenance)",
        run: `sudo chown -R $(id -u):$(id -g) $GITHUB_WORKSPACE || true
sudo chmod -R u+rw,g+r,o+r $GITHUB_WORKSPACE || true`,
        "continue-on-error": true,
      },
      {
        name: "Upload SLSA Provenance",
        uses: ACTIONS_UPLOAD_ARTIFACT,
        with: {
          path: "build.provenance.json",
          name: `build\${{ inputs.image_suffix }}.provenance.json`,
        },
      },
    ],
  },
}));
