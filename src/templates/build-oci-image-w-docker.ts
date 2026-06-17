
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";

export const BuildOciImageWDockerJobInputs = defineInputsGitLab({
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_token: Inputs.devguard_token,

  docker_buildkit: Inputs.docker_buildkit,

  runner_tags: Inputs.runner_tags,
  stage: {
    ...Inputs.stage,
    default: "oci-image" as const,
  },
  job_suffix: Inputs.job_suffix,
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

  image: {
    ...Inputs.image,
    description: "The image file to build (e.g. image.tar)" as const,
    default: "image.tar" as const,
  },
  image_tag: Inputs.image_tag,
  build_args: Inputs.build_args,
  push_image: Inputs.push_image,
  supplyChainId: Inputs.supplyChainId,

  default_ref: Inputs.default_ref,
  ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,
});

export const BuildOciImageWDockerJobInputsGitHub = defineInputsGitHub({
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_artifact_name: Inputs.devguard_artifact_name,

  image: {
    ...Inputs.image,
    description: "The image file to build (e.g. image.tar)" as const,
    default: "image.tar" as const,
  },
  image_suffix: Inputs.image_suffix,
  image_tag: Inputs.image_tag,
  build_args: Inputs.build_args,
  push_image: Inputs.push_image,
  supplyChainId: Inputs.supplyChainId,
});

export const BuildOciImageWDockerTemplateGitHub = defineJobGitHub(BuildOciImageWDockerJobInputsGitHub, (inputValues) => ({
  name: "devguard:build-oci-image-w-docker",
  secrets: {
    "devguard-token": {
      description: "DevGuard API token",
      required: true,
    },
    "build-args": {
      description: "Build arguments passed to docker buildx build.",
      required: false,
    },
    "registry-user": {
      description: "Registry username for pushing the image.",
      required: false,
    },
    "registry-password": {
      description: "Registry password for pushing the image.",
      required: false,
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
          "persist-credentials": false,
        },
      },
      {
        name: "Set up Docker Buildx",
        uses: "docker/setup-buildx-action@v3",
      },
      {
        name: "In-Toto Provenance record start",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `devguard-scanner intoto start --step=build --token=\${{ secrets.devguard-token }} --apiUrl=${inputValues.devguard_api_url} --assetName=${inputValues.devguard_asset_name} --supplyChainId=\${{ github.sha }}`,
        },
        "continue-on-error": true,
      },
      {
        name: "Build Docker image",
        run: `BUILD_ARGS="\${{ secrets.build-args }}"
if [ -z "$BUILD_ARGS" ]; then
  BUILD_ARGS="--context=. --file=Dockerfile"
fi
docker buildx build $BUILD_ARGS --output type=docker,dest=./\${{ inputs.image }} -t \${{ inputs.image_tag }}`,
      },
      {
        name: "Get image digest",
        run: `docker run --rm \\
  -v "$GITHUB_WORKSPACE:/workspace" \\
  -w /workspace \\
  ${ContainerImages.DEVGUARD_SCANNER} \\
  crane digest --tarball="\${{ inputs.image }}" > image-digest.txt`,
      },
      {
        name: "Push image to registry",
        if: "inputs.push_image == 'true'",
        run: `docker load -i \${{ inputs.image }}
docker push \${{ inputs.image_tag }}`,
      },
      {
        name: "Upload oci-image artifact",
        uses: "actions/upload-artifact@v4",
        with: {
          name: `oci-image\${{ inputs.image_suffix }}`,
          path: `\${{ inputs.image }}`,
        },
        if: "inputs.push_image != 'true'",
      },
      {
        name: "Upload image-digest artifact",
        uses: "actions/upload-artifact@v4",
        with: {
          name: `image-digest\${{ inputs.image_suffix }}`,
          path: "image-digest.txt",
        },
      },
      {
        name: "In-Toto Provenance record stop",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `devguard-scanner intoto stop --step=build --products=image-digest.txt --token=\${{ secrets.devguard-token }} --apiUrl=${inputValues.devguard_api_url} --assetName=${inputValues.devguard_asset_name} --supplyChainId=\${{ github.sha }} --generateSlsaProvenance --defaultRef=\${{ github.event.repository.default_branch }} --isTag=\${{ github.ref_type == 'tag' }} --ref=\${{ github.ref_name }}`,
        },
        "continue-on-error": true,
      },
      {
        name: "Upload SLSA Provenance",
        uses: "actions/upload-artifact@v4",
        with: {
          path: "build.provenance.json",
          name: `build\${{ inputs.image_suffix }}.provenance.json`,
        },
      },
    ],
  },
}));

export const BuildOciImageWDockerTemplate = defineJobGitLab(BuildOciImageWDockerJobInputs, (inputValues) => ({
  name: `devguard:build_oci_image${inputValues.job_suffix}`,
  job: {
    tags: inputValues.runner_tags,
    stage: inputValues.stage,
    allow_failure: inputValues.allow_failure,
    needs: inputValues.needs,
    dependencies: inputValues.dependencies,
    variables: {
      GIT_STRATEGY: inputValues.git_strategy,
      DOCKER_BUILDKIT: inputValues.docker_buildkit,
      DOCKER_HOST: "tcp://127.0.0.1:2375",
      DOCKER_TLS_CERTDIR: "",
    },
    services: [
      {
        name: ContainerImages.DOCKER_KRANE,
        entrypoint: ["/bin/sh", "-c"],
        command: [
          `if [[ $(df -PT /var/lib/docker | awk 'NR==2 {print $2}') == virtiofs ]]; then\n  apk add e2fsprogs && \\\n  truncate -s 20G /tmp/disk.img && \\\n  mkfs.ext4 /tmp/disk.img && \\\n  mount /tmp/disk.img /var/lib/docker; fi && \\\n  dockerd-entrypoint.sh;`,
        ],
        variables: {
          HEALTHCHECK_TCP_PORT: "2375",
        },
      },
    ],
    image: {
      name: ContainerImages.DOCKER_KRANE,
      pull_policy: inputValues.pull_policy,
      entrypoint: [""],
    },
    before_script: [
      `echo "Uses Docker DIND to build Docker images inside a secured kata container.\\n The artifacts are not pushed to the registry until they have undergone security scanning to ensure vulnerabilities are addressed before deployment - therefore they are stored as artifacts rather than pushed to the registry."`,
      `/devguard-scanner intoto start --step=build --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" --supplyChainId="${inputValues.supplyChainId}"`,
    ],
    script: [
      `echo "$CI_JOB_TOKEN" | docker login $CI_REGISTRY -u gitlab-ci-token --password-stdin`,
      `/crane auth login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}`,
      `docker buildx build --output type=docker,dest=./${inputValues.image} -t ${inputValues.image_tag} ${inputValues.build_args}`,
      `if [[ "${inputValues.push_image}" == "true" ]]; then docker load -i ./${inputValues.image} && docker push ${inputValues.image_tag}; fi`,
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
