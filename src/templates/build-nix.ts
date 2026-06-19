import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { Inputs } from "./inputs";
import { ACTIONS_CHECKOUT, ACTIONS_UPLOAD_ARTIFACT, CACHIX_INSTALL_NIX_ACTION } from "../actions-versions";

// Job 1: extract the devguard-scanner binary once and share as artifact
export const BuildNixExtractScannerJobInputs = defineInputsGitLab({
  job_suffix: Inputs.job_suffix,
});

export const BuildNixExtractScannerTemplate = defineJobGitLab(BuildNixExtractScannerJobInputs, (inputValues) => ({
  name: `devguard:extract_scanner${inputValues.job_suffix}`,
  job: {
    stage: ".pre",
    image: {
      name: "ghcr.io/l3montree-dev/devguard/scanner:main",
      entrypoint: [""],
    },
    script: [`cp /sbin/devguard-scanner ./devguard-scanner`],
    artifacts: {
      paths: [`devguard-scanner`],
    },
  },
}));

// Job 2: generate image tag (Nix variant - uses scanner:main directly)
export const BuildNixGenerateTagJobInputs = defineInputsGitLab({
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
  devguard_artifact_name: Inputs.devguard_artifact_name,
  image_suffix: Inputs.image_suffix,
  image_variant: Inputs.image_variant,
  architecture: Inputs.architecture,
  image_path: Inputs.image_path,
  upstream_version: Inputs.upstream_version,
});

export const BuildNixGenerateTagTemplate = defineJobGitLab(BuildNixGenerateTagJobInputs, (inputValues) => ({
  name: `devguard:generate_tag${inputValues.job_suffix}`,
  job: {
    tags: inputValues.runner_tags,
    stage: inputValues.stage,
    allow_failure: inputValues.allow_failure,
    needs: inputValues.needs,
    dependencies: inputValues.dependencies,
    variables: {
      GIT_STRATEGY: inputValues.git_strategy,
      IMAGE_SUFFIX: inputValues.image_suffix,
      DEVGUARD_ARTIFACT_NAME: `${inputValues.devguard_artifact_name}`,
    },
    image: {
      name: "ghcr.io/l3montree-dev/devguard/scanner:main",
      pull_policy: inputValues.pull_policy,
    },
    script: [
      `devguard-scanner generate-tag --imageSuffix "$IMAGE_SUFFIX" --imageVariant "${inputValues.image_variant}" --architecture "${inputValues.architecture}" --imagePath "${inputValues.image_path}" --ref "$CI_COMMIT_REF_NAME" --upstreamVersion "${inputValues.upstream_version}" >> generate_tag_${inputValues.upstream_version}_${inputValues.architecture}.env`,
      `cat generate_tag_${inputValues.upstream_version}_${inputValues.architecture}.env`,
    ],
    artifacts: {
      reports: {
        dotenv: `generate_tag_${inputValues.upstream_version}_${inputValues.architecture}.env`,
      },
      paths: [`generate_tag_${inputValues.upstream_version}_${inputValues.architecture}.env`],
    },
  },
}));

// Job 3: build OCI image using Nix (dockerTools.buildLayeredImage)
export const BuildNixJobInputs = defineInputsGitLab({
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_token: Inputs.devguard_token,
  runner_tags: Inputs.runner_tags,
  stage: {
    ...Inputs.stage,
    default: "oci-image" as const,
  },
  job_suffix: Inputs.job_suffix,
  allow_failure: Inputs.allow_failure,
  needs: Inputs.needs,
  dependencies: Inputs.dependencies,
  image: {
    ...Inputs.image,
    default: "image.tar" as const,
  },
  supplyChainId: Inputs.supplyChainId,
  nix_target: Inputs.nix_target,
  nix_cache_substituter: Inputs.nix_cache_substituter,
  nix_cache_public_key: Inputs.nix_cache_public_key,
  nix_cache_s3_endpoint: Inputs.nix_cache_s3_endpoint,
  nix_cache_s3_bucket: Inputs.nix_cache_s3_bucket,
  nix_cache_region: Inputs.nix_cache_region,
});

export const BuildNixJobInputsGitHub = defineInputsGitHub({
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  image_name: {
    description: "Full OCI image name without tag (e.g. ghcr.io/org/repo/image)" as const,
    type: "string" as const,
  },
  image_suffix: Inputs.image_suffix,
  nix_target: Inputs.nix_target,
  nix_cache_substituter: Inputs.nix_cache_substituter,
  nix_cache_public_key: Inputs.nix_cache_public_key,
  nix_cache_s3_endpoint: Inputs.nix_cache_s3_endpoint,
  nix_cache_s3_bucket: Inputs.nix_cache_s3_bucket,
  nix_cache_region: Inputs.nix_cache_region,
  nix_version: {
    description: "Pinned Nix version for deterministic builds (must match other CI systems)" as const,
    default: "2.34.4" as const,
    type: "string" as const,
  },
  architecture: {
    ...Inputs.architecture,
    default: "" as const,
  },
  runner: {
    description: "GitHub Actions runner label to use (e.g. ubuntu-latest, ubuntu-24.04-arm)" as const,
    default: "ubuntu-latest" as const,
    type: "string" as const,
  },
  allow_failure: Inputs.allow_failure,
});

export const BuildNixTemplateGitHub = defineJobGitHub(BuildNixJobInputsGitHub, (inputValues) => ({
  name: "devguard:build-nix",
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
    "runs-on": `\${{ inputs.runner }}`,
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
        run: `devguard-scanner intoto start --step=build --token=\${{ secrets.devguard-token }} --apiUrl=${inputValues.devguard_api_url} --assetName=${inputValues.devguard_asset_name} --supplyChainId=\${{ github.sha }}`,
        "continue-on-error": true,
      },
      {
        name: "Write Nix cache secret key",
        if: `inputs.nix_cache_s3_endpoint != ''`,
        run: `echo "\${{ secrets.nix-cache-secret-key }}" > /tmp/nix-cache-priv-key.pem`,
      },
      {
        name: "Build OCI image with Nix",
        run: `nix build .#\${{ inputs.nix_target }}`,
      },
      {
        name: "Push build results to Nix cache",
        if: `inputs.nix_cache_s3_endpoint != ''`,
        env: {
          AWS_ACCESS_KEY_ID: `\${{ secrets.nix-cache-aws-access-key-id }}`,
          AWS_SECRET_ACCESS_KEY: `\${{ secrets.nix-cache-aws-secret-access-key }}`,
        },
        run: `mkdir -p ~/.aws
echo "[profile nix-cache]" >> ~/.aws/config
echo "s3.addressing_style = path" >> ~/.aws/config
nix copy $(nix-store -qR $(readlink result)) \\
  --to 's3://\${{ inputs.nix_cache_s3_bucket }}?endpoint=\${{ inputs.nix_cache_s3_endpoint }}&region=\${{ inputs.nix_cache_region }}&scheme=https&profile=nix-cache&secret-key=/tmp/nix-cache-priv-key.pem' || true`,
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
        name: "Upload oci-image artifact",
        uses: ACTIONS_UPLOAD_ARTIFACT,
        with: {
          name: `oci-image\${{ inputs.image_suffix }}`,
          path: "image.tar",
        },
      },
      {
        name: "Set image tag",
        id: "set-image-tag",
        run: `devguard-scanner generate-tag \\
  --imagePath='\${{ inputs.image_name }}' \\
  --ref='\${{ github.ref_name }}' \\
  --architecture='\${{ inputs.architecture }}' \\
  >> image-tag-env.txt
IMAGE_TAG=$(grep '^IMAGE_TAG=' image-tag-env.txt | cut -d= -f2-)
ARTIFACT_NAME=$(grep '^ARTIFACT_NAME=' image-tag-env.txt | cut -d= -f2-)
ARTIFACT_URL_ENCODED=$(grep '^ARTIFACT_URL_ENCODED=' image-tag-env.txt | cut -d= -f2-)
echo "$IMAGE_TAG" > image-tag.txt
echo "$ARTIFACT_NAME" > artifact-purl.txt
echo "$ARTIFACT_URL_ENCODED" > artifact-purl-safe.txt
echo "IMAGE_TAG=$IMAGE_TAG" >> "$GITHUB_ENV"
echo "ARTIFACT_NAME=$ARTIFACT_NAME" >> "$GITHUB_ENV"`,
      },
      {
        name: "Upload image-tag artifact",
        uses: ACTIONS_UPLOAD_ARTIFACT,
        with: {
          name: `image-tag\${{ inputs.image_suffix }}`,
          path: "image-tag.txt",
        },
      },
      {
        name: "Upload image-digest artifact",
        uses: ACTIONS_UPLOAD_ARTIFACT,
        with: {
          name: `image-digest\${{ inputs.image_suffix }}`,
          path: "image-digest.txt",
        },
      },
      {
        name: "Upload artifact-purl artifact",
        uses: ACTIONS_UPLOAD_ARTIFACT,
        with: {
          name: `artifact-purl\${{ inputs.image_suffix }}`,
          path: "artifact-purl.txt",
        },
      },
      {
        name: "Upload artifact-purl-safe artifact",
        uses: ACTIONS_UPLOAD_ARTIFACT,
        with: {
          name: `artifact-purl-safe\${{ inputs.image_suffix }}`,
          path: "artifact-purl-safe.txt",
        },
      },
      {
        name: "In-Toto Provenance record stop",
        run: `devguard-scanner intoto stop --step=build --products=image-digest.txt --products=image-tag.txt --token=\${{ secrets.devguard-token }} --apiUrl=${inputValues.devguard_api_url} --assetName=${inputValues.devguard_asset_name} --supplyChainId=\${{ github.sha }} --generateSlsaProvenance --defaultRef=\${{ github.event.repository.default_branch }} --isTag=\${{ github.ref_type == 'tag' }} --ref=\${{ github.ref_name }}`,
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

export const BuildNixTemplate = defineJobGitLab(BuildNixJobInputs, (inputValues) => ({
  name: `devguard:build_oci_image${inputValues.job_suffix}`,
  job: {
    tags: inputValues.runner_tags,
    stage: inputValues.stage,
    allow_failure: inputValues.allow_failure,
    needs: [`devguard:extract_scanner${inputValues.job_suffix}`, inputValues.needs],
    dependencies: [`devguard:extract_scanner${inputValues.job_suffix}`, inputValues.dependencies],
    image: {
      name: "nixos/nix@sha256:0b1530edf840d9af519c7f3970cafbbed68d9d9554a83cc9adc04099753117e1",
      entrypoint: ["/bin/sh", "-c"],
    },
    before_script: [
      `chmod +x ./devguard-scanner`,
      `mkdir -p /etc/nix`,
      `cat > /etc/nix/nix.conf << EOF\nsandbox = false\nfilter-syscalls = false\nexperimental-features = nix-command flakes\n$([[ -n "${inputValues.nix_cache_substituter}" ]] && echo "substituters = https://cache.nixos.org ${inputValues.nix_cache_substituter}" || true)\n$([[ -n "${inputValues.nix_cache_public_key}" ]] && echo "trusted-public-keys = cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY= ${inputValues.nix_cache_public_key}" || true)\nEOF`,
      `if [[ -n "$NIX_CACHE_SECRET_KEY" ]]; then\n  echo "$NIX_CACHE_SECRET_KEY" > /tmp/nix-cache-priv-key.pem\nfi`,
      `mkdir -p ~/.aws\necho "[profile nix-cache]" >> ~/.aws/config\necho "s3.addressing_style = path" >> ~/.aws/config`,
    ],
    script: [
      `./devguard-scanner intoto start --ignore=devguard-scanner --step=build --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" --supplyChainId="${inputValues.supplyChainId}"`,
      `nix build -L ".#${inputValues.nix_target}" --no-update-lock-file`,
      `gzip -cd result > "${inputValues.image}"`,
      `if [[ -n "${inputValues.nix_cache_s3_endpoint}" && -n "$NIX_CACHE_AWS_ACCESS_KEY_ID" ]]; then\n  export AWS_ACCESS_KEY_ID="$NIX_CACHE_AWS_ACCESS_KEY_ID"\n  export AWS_SECRET_ACCESS_KEY="$NIX_CACHE_AWS_SECRET_ACCESS_KEY"\n  nix copy $(nix-store -qR $(readlink result)) --to 's3://${inputValues.nix_cache_s3_bucket}?endpoint=${inputValues.nix_cache_s3_endpoint}&region=${inputValues.nix_cache_region}&scheme=https&profile=nix-cache&secret-key=/tmp/nix-cache-priv-key.pem' || true\nfi`,
      `nix run nixpkgs#crane -- digest --tarball="${inputValues.image}" > image-digest.txt`,
      `./devguard-scanner intoto stop --ignore=devguard-scanner --step=build --products=image-digest.txt --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" --supplyChainId="${inputValues.supplyChainId}" --generateSlsaProvenance`,
    ],
    artifacts: {
      paths: [inputValues.image, `image-digest.txt`, `build.provenance.json`],
      when: "on_success",
    },
  },
}));
