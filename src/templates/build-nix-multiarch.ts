
import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { Inputs } from "./inputs";
import { ACTIONS_CHECKOUT, ACTIONS_DOWNLOAD_ARTIFACT, ACTIONS_UPLOAD_ARTIFACT, CACHIX_INSTALL_NIX_ACTION, DOCKER_LOGIN_ACTION } from "../actions-versions";

export const BuildNixMultiArchJobInputs = defineInputsGitLab({
  job_suffix: Inputs.job_suffix,

  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_api_url: {
    ...Inputs.devguard_api_url,
    default: "https://api.devguard.opencode.de" as const,
  },
  devguard_token: Inputs.devguard_token,
  devguard_web_ui: Inputs.devguard_web_ui,

  image_suffix: {
    ...Inputs.image_suffix,
    default: "" as const,
  },
  create_root_manifest: Inputs.create_root_manifest,

  nix_target_amd64: {
    description: "Nix flake build target for amd64 (e.g. coreutils-amd64)" as const,
  },
  nix_target_arm64: {
    description: "Nix flake build target for arm64 (e.g. coreutils-arm64)" as const,
  },
  amd64_runner_tag: {
    description: "Runner tag for amd64 builds" as const,
    default: "" as const,
  },
  arm64_runner_tag: {
    description: "Runner tag for arm64 builds" as const,
    default: "" as const,
  },

  nix_cache_substituter: Inputs.nix_cache_substituter,
  nix_cache_public_key: Inputs.nix_cache_public_key,
  nix_cache_s3_endpoint: Inputs.nix_cache_s3_endpoint,
  nix_cache_s3_bucket: Inputs.nix_cache_s3_bucket,
  nix_cache_region: Inputs.nix_cache_region,

  version: {
    default: "main" as const,
    description: "Version/ref of the devguard-ci-component templates to use" as const,
  },
  runner_tags: Inputs.runner_tags,
  git_strategy: {
    ...Inputs.git_strategy,
    default: "fetch" as const,
  },
  pull_policy: Inputs.pull_policy,
  allow_failure: Inputs.allow_failure,
  fail_on_risk: Inputs.fail_on_risk,
  fail_on_cvss: Inputs.fail_on_cvss,
});

export const BuildNixMultiArchJobInputsGitHub = defineInputsGitHub({
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_api_url: {
    ...Inputs.devguard_api_url,
    default: "https://api.devguard.opencode.de" as const,
  },
  image_name: {
    description: "Full OCI image name without tag (e.g. ghcr.io/org/repo/image)" as const,
    type: "string" as const,
  },
  commit_ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,
  registry: Inputs.registry,
  registry_user: Inputs.registry_user,
  image_suffix: {
    ...Inputs.image_suffix,
    default: "" as const,
  },
  create_root_manifest: Inputs.create_root_manifest,
  nix_target_amd64: {
    description: "Nix flake build target for amd64 (e.g. coreutils-amd64)" as const,
    type: "string" as const,
  },
  nix_target_arm64: {
    description: "Nix flake build target for arm64 (e.g. coreutils-arm64)" as const,
    type: "string" as const,
  },
  nix_cache_substituter: Inputs.nix_cache_substituter,
  nix_cache_public_key: Inputs.nix_cache_public_key,
  nix_cache_s3_endpoint: Inputs.nix_cache_s3_endpoint,
  nix_cache_s3_bucket: Inputs.nix_cache_s3_bucket,
  nix_cache_region: Inputs.nix_cache_region,
  nix_version: {
    description: "Pinned Nix version for deterministic builds" as const,
    default: "2.34.4" as const,
    type: "string" as const,
  },
  allow_failure: Inputs.allow_failure,
  fail_on_risk: Inputs.fail_on_risk,
  fail_on_cvss: Inputs.fail_on_cvss,
});

// GitHub: builds amd64 + arm64 in parallel using matrix strategy
export const BuildNixMultiArchBuildImageTemplateGitHub = defineJobGitHub(BuildNixMultiArchJobInputsGitHub, (inputValues) => ({
  name: "devguard:build-nix-multiarch",
  secrets: {
    "devguard-token": {
      description: "DevGuard API token",
      required: false,
    },
    "nix-cache-secret-key": {
      description: "Nix binary cache signing secret key.",
      required: false,
    },
    "nix-cache-aws-access-key-id": {
      description: "AWS access key ID for the Nix S3 cache.",
      required: false,
    },
    "nix-cache-aws-secret-access-key": {
      description: "AWS secret access key for the Nix S3 cache.",
      required: false,
    },
  },
  job: {
    "runs-on": `\${{ matrix.runner }}`,
    strategy: {
      matrix: {
        include: [
          { arch: "amd64", runner: "ubuntu-latest", nix_target: `${ inputValues.nix_target_amd64 }` },
          { arch: "arm64", runner: "ubuntu-24.04-arm", nix_target: `${ inputValues.nix_target_arm64 }` },
        ],
      },
    },
    steps: [
      {
        name: "Checkout code",
        uses: ACTIONS_CHECKOUT,
        with: {
          "fetch-depth": 0,
          "persist-credentials": false,
        },
      },
      {
        name: "Install Nix",
        uses: CACHIX_INSTALL_NIX_ACTION,
        with: {
          install_url: `\${{ format('https://releases.nixos.org/nix/nix-{0}/install', inputs.nix_version) }}`,
          extra_nix_config: `experimental-features = nix-command flakes
\${{ inputs.nix_cache_substituter != '' && format('substituters = https://cache.nixos.org {0}', inputs.nix_cache_substituter) || '' }}
\${{ inputs.nix_cache_public_key != '' && format('trusted-public-keys = cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY= {0}', inputs.nix_cache_public_key) || '' }}`,
        },
      },
      {
        name: "Install crane and devguard-scanner",
        run: `nix profile install nixpkgs#crane github:l3montree-dev/devguard#devguardScanner`,
      },
      {
        name: "In-Toto Provenance record start",
        env: {
          DEVGUARD_API_URL: inputValues.devguard_api_url,
          DEVGUARD_ASSET_NAME: inputValues.devguard_asset_name,
        } as Record<string, string>,
        run: `devguard-scanner intoto start --step=build --token=\${{ secrets.devguard-token }} --apiUrl=$DEVGUARD_API_URL --assetName=$DEVGUARD_ASSET_NAME --supplyChainId=$GITHUB_SHA`,
        "continue-on-error": true,
      },
      {
        name: "Write Nix cache secret key",
        if: `inputs.nix_cache_s3_endpoint != ''`,
        run: `echo "\${{ secrets.nix-cache-secret-key }}" > /tmp/nix-cache-priv-key.pem`,
      },
      {
        name: "Build OCI image with Nix",
        env: {
          NIX_TARGET: `\${{ matrix.nix_target }}`,
        } as Record<string, string>,
        run: `nix build .#$NIX_TARGET`,
      },
      {
        name: "Push build results to Nix cache",
        if: `inputs.nix_cache_s3_endpoint != ''`,
        env: {
          AWS_ACCESS_KEY_ID: `\${{ secrets.nix-cache-aws-access-key-id }}`,
          AWS_SECRET_ACCESS_KEY: `\${{ secrets.nix-cache-aws-secret-access-key }}`,
          NIX_CACHE_S3_BUCKET: `${ inputValues.nix_cache_s3_bucket }`,
          NIX_CACHE_S3_ENDPOINT: `${ inputValues.nix_cache_s3_endpoint }`,
          NIX_CACHE_REGION: `${ inputValues.nix_cache_region }`,
        } as Record<string, string>,
        run: `mkdir -p ~/.aws
echo "[profile nix-cache]" >> ~/.aws/config
echo "s3.addressing_style = path" >> ~/.aws/config
nix copy $(nix-store -qR $(readlink result)) \\
  --to "s3://$NIX_CACHE_S3_BUCKET?endpoint=$NIX_CACHE_S3_ENDPOINT&region=$NIX_CACHE_REGION&scheme=https&profile=nix-cache&secret-key=/tmp/nix-cache-priv-key.pem" || true`,
      },
      {
        name: "Prepare image.tar",
        run: `gunzip -c "$(readlink -f result)" > image.tar`,
      },
      {
        name: "Get image digest",
        run: `crane digest --tarball=image.tar > image-digest.txt`,
      },
      {
        name: "Set image tag",
        env: {
          IMAGE_NAME: inputValues.image_name,
          COMMIT_REF: inputValues.commit_ref,
          IS_TAG: inputValues.is_tag,
        } as Record<string, string>,
        run: `devguard-scanner generate-tag \\
  --imagePath="$IMAGE_NAME" \\
  --ref=$COMMIT_REF \\
  --isTag=$IS_TAG \\
  --architecture="\${{ matrix.arch }}" \\
  >> image-tag-env.txt
grep '^IMAGE_TAG=' image-tag-env.txt | cut -d= -f2- > image-tag.txt
grep '^ARTIFACT_NAME=' image-tag-env.txt | cut -d= -f2- > artifact-purl.txt
grep '^ARTIFACT_URL_ENCODED=' image-tag-env.txt | cut -d= -f2- > artifact-purl-safe.txt`,
      },
      {
        name: "Upload oci-image artifact",
        uses: ACTIONS_UPLOAD_ARTIFACT,
        with: {
          name: `oci-image${ inputValues.image_suffix }-\${{ matrix.arch }}`,
          path: "image.tar",
        },
      },
      {
        name: "Upload image-tag artifact",
        uses: ACTIONS_UPLOAD_ARTIFACT,
        with: {
          name: `image-tag${ inputValues.image_suffix }-\${{ matrix.arch }}`,
          path: "image-tag.txt",
        },
      },
      {
        name: "Upload image-digest artifact",
        uses: ACTIONS_UPLOAD_ARTIFACT,
        with: {
          name: `image-digest${ inputValues.image_suffix }-\${{ matrix.arch }}`,
          path: "image-digest.txt",
        },
      },
      {
        name: "In-Toto Provenance record stop",
        env: {
          DEVGUARD_API_URL: inputValues.devguard_api_url,
          DEVGUARD_ASSET_NAME: inputValues.devguard_asset_name,
          DEFAULT_BRANCH: `\${{ github.event.repository.default_branch }}`,
          IS_TAG: inputValues.is_tag,
          COMMIT_REF: inputValues.commit_ref,
        } as Record<string, string>,
        run: `devguard-scanner intoto stop --step=build --products=image-digest.txt --products=image-tag.txt --token=\${{ secrets.devguard-token }} --apiUrl=$DEVGUARD_API_URL --assetName=$DEVGUARD_ASSET_NAME --supplyChainId=$GITHUB_SHA --generateSlsaProvenance --defaultRef=$DEFAULT_BRANCH --isTag=$IS_TAG --ref=$COMMIT_REF`,
        "continue-on-error": true,
      },
      {
        name: "Upload SLSA Provenance",
        uses: ACTIONS_UPLOAD_ARTIFACT,
        with: {
          path: "build.provenance.json",
          name: `build${ inputValues.image_suffix }-\${{ matrix.arch }}.provenance.json`,
        },
      },
    ],
  },
}));

// GitHub: create multi-arch manifest after parallel builds complete
export const BuildNixMultiArchCreateManifestTemplateGitHub = defineJobGitHub(BuildNixMultiArchJobInputsGitHub, (inputValues) => ({
  name: "devguard:create-nix-manifest-multi-arch",
  secrets: {
    "registry-password": {
        description: "Registry password for pulling the image.",
        required: true,
        default: "${{ github.token }}",
    },
  },
  job: {
    "runs-on": "ubuntu-latest",
    permissions: {
      packages: "write",
    },
    steps: [
      {
        name: "Download amd64 image-tag artifact",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `image-tag${ inputValues.image_suffix }-amd64`,
          path: "amd64",
        },
      },
      {
        name: "Download arm64 image-tag artifact",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `image-tag${ inputValues.image_suffix }-arm64`,
          path: "arm64",
        },
      },
      {
        name: "Log in to ghcr.io",
        uses: DOCKER_LOGIN_ACTION,
        with: {
          registry: inputValues.registry,
          username: inputValues.registry_user,
          password: `\${{ secrets.registry-password }}`,
        },
      },
      {
        name: "Create and push multi-arch manifest",
        env: {
          CREATE_ROOT_MANIFEST: `${ inputValues.create_root_manifest }`,
        } as Record<string, string>,
        run: `AMD64_TAG=$(cat amd64/image-tag.txt)
ARM64_TAG=$(cat arm64/image-tag.txt)

echo "amd64: $AMD64_TAG"
echo "arm64: $ARM64_TAG"

BASE_TAG="\${AMD64_TAG%-amd64}"

echo "Creating manifest: $BASE_TAG"
docker manifest create "$BASE_TAG" "$AMD64_TAG" "$ARM64_TAG"
docker manifest push "$BASE_TAG"

if [ "$CREATE_ROOT_MANIFEST" = "true" ]; then
  ROOT_TAG=$(echo "$BASE_TAG" | sed "s/-\${GITHUB_REF_NAME}//")
  if [ "$ROOT_TAG" != "$BASE_TAG" ]; then
    echo "Creating root manifest: $ROOT_TAG"
    docker manifest create "$ROOT_TAG" "$AMD64_TAG" "$ARM64_TAG"
    docker manifest push "$ROOT_TAG"
  fi
fi`,
      },
    ],
  },
}));

// Job 1: parallel matrix trigger — builds amd64 + arm64 images in child pipelines
export const BuildNixMultiArchBuildImageTemplate = defineJobGitLab(BuildNixMultiArchJobInputs, (inputValues) => ({
  name: `build_image${inputValues.job_suffix}`,
  job: {
    stage: "build",
    parallel: {
      matrix: [
        {
          RUNNER_TAG: inputValues.amd64_runner_tag,
          NIX_TARGET: inputValues.nix_target_amd64,
          ARCHITECTURE: "amd64",
        },
        {
          RUNNER_TAG: inputValues.arm64_runner_tag,
          NIX_TARGET: inputValues.nix_target_arm64,
          ARCHITECTURE: "arm64",
        },
      ],
    },
    trigger: {
      strategy: "depend",
      include: [
        {
          remote: `https://gitlab.com/l3montree/devguard/-/raw/${inputValues.version}/templates/build-nix.yml`,
          inputs: {
            devguard_asset_name: inputValues.devguard_asset_name,
            devguard_token: inputValues.devguard_token,
            devguard_api_url: inputValues.devguard_api_url,
            nix_target: "${NIX_TARGET}",
            stage: "build",
            job_suffix: inputValues.job_suffix,
            image_suffix: inputValues.image_suffix,
            runner_tags: ["${RUNNER_TAG}"],
            nix_cache_substituter: inputValues.nix_cache_substituter,
            nix_cache_public_key: inputValues.nix_cache_public_key,
            nix_cache_s3_endpoint: inputValues.nix_cache_s3_endpoint,
            nix_cache_s3_bucket: inputValues.nix_cache_s3_bucket,
            nix_cache_region: inputValues.nix_cache_region,
          },
        },
        {
          remote: `https://gitlab.com/l3montree/devguard/-/raw/${inputValues.version}/templates/container-scanning.yml`,
          inputs: {
            devguard_asset_name: inputValues.devguard_asset_name,
            devguard_token: inputValues.devguard_token,
            devguard_api_url: inputValues.devguard_api_url,
            devguard_web_ui: inputValues.devguard_web_ui,
            runner_tags: ["${RUNNER_TAG}"],
            stage: "test",
            job_suffix: inputValues.job_suffix,
            git_strategy: inputValues.git_strategy,
            pull_policy: inputValues.pull_policy,
            allow_failure: inputValues.allow_failure,
            fail_on_risk: inputValues.fail_on_risk,
            fail_on_cvss: inputValues.fail_on_cvss,
            devguard_artifact_name: "$ARTIFACT_NAME",
            image_tar_path: "image.tar",
            needs: [
              `devguard:generate_tag${inputValues.job_suffix}`,
              `devguard:build_oci_image${inputValues.job_suffix}`,
            ],
            dependencies: [
              `devguard:generate_tag${inputValues.job_suffix}`,
              `devguard:build_oci_image${inputValues.job_suffix}`,
            ],
          },
        },
        {
          remote: `https://gitlab.com/l3montree/devguard/-/raw/${inputValues.version}/templates/push-and-attest.yml`,
          inputs: {
            devguard_asset_name: inputValues.devguard_asset_name,
            devguard_token: inputValues.devguard_token,
            devguard_api_url: inputValues.devguard_api_url,
            build_job_name: `devguard:build_oci_image${inputValues.job_suffix}`,
            job_suffix: inputValues.job_suffix,
            build_stage: "test",
            attest_stage: "test",
            image_suffix: inputValues.image_suffix,
            architecture: "${ARCHITECTURE}",
          },
        },
      ],
    },
  },
}));

// Job 2: collect artifacts from child pipelines, create multi-arch manifest, sign image
export const BuildNixMultiArchCreateManifestTemplate = defineJobGitLab(BuildNixMultiArchJobInputs, (inputValues) => ({
  name: `create_and_sign_manifest${inputValues.job_suffix}`,
  job: {
    stage: "attestation",
    variables: {
      PARENT_PIPELINE_ID: "$CI_PIPELINE_ID",
    },
    trigger: {
      strategy: "depend",
      forward: {
        pipeline_variables: true,
      },
      include: [
        {
          remote:
            "https://gitlab.opencode.de/oci-community/tools/container-hardening-work-bench/-/raw/main/templates/collect-child-pipeline-artifacts.yml",
          inputs: {
            stage: "build",
            job_suffix: inputValues.job_suffix,
            downstream_pipeline_trigger_job_name_prefix: `build_image${inputValues.job_suffix}:`,
            parent_pipeline_id: "$PARENT_PIPELINE_ID",
          },
        },
        {
          remote: `https://gitlab.com/l3montree/devguard/-/raw/${inputValues.version}/templates/create-manifest-multi-arch.yml`,
          inputs: {
            stage: "build",
            job_suffix: inputValues.job_suffix,
            create_root_manifest: inputValues.create_root_manifest,
            artifacts_subdirectory: "artifacts",
            needs: [`collect_child_pipeline_artifacts${inputValues.job_suffix}`],
            dependencies: [`collect_child_pipeline_artifacts${inputValues.job_suffix}`],
          },
        },
        {
          remote: `https://gitlab.com/l3montree/devguard/-/raw/${inputValues.version}/templates/sign-oci-image.yml`,
          inputs: {
            devguard_asset_name: inputValues.devguard_asset_name,
            devguard_token: inputValues.devguard_token,
            devguard_api_url: inputValues.devguard_api_url,
            image: "$MANIFEST_IMAGE_TAG",
            stage: "deploy",
            job_suffix: inputValues.job_suffix,
            needs: [`devguard:create_manifest_multi_arch${inputValues.job_suffix}`],
            dependencies: [`devguard:create_manifest_multi_arch${inputValues.job_suffix}`],
          },
        },
      ],
    },
  },
}));
