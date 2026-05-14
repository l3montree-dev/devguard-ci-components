import { defineInputs, defineJob } from "../lib/JobWithSpecBuilder";
import { Inputs } from "./inputs"


// Job 1: extract the devguard-scanner binary once and share as artifact
export const BuildNixExtractScannerJobInputs = defineInputs({
    job_suffix: Inputs.job_suffix,
});

export const BuildNixExtractScannerTemplate = defineJob(BuildNixExtractScannerJobInputs, (inputValues) => ({
    name: `devguard:extract_scanner${inputValues.job_suffix}`,
    job: {
        stage: ".pre",
        image: {
            name: "ghcr.io/l3montree-dev/devguard/scanner:main",
            entrypoint: [""],
        },
        script: [
            `cp /sbin/devguard-scanner ./devguard-scanner`,
        ],
        artifacts: {
            paths: [
                `devguard-scanner`,
            ],
        }
    }
}));


// Job 2: generate image tag (Nix variant - uses scanner:main directly)
export const BuildNixGenerateTagJobInputs = defineInputs({
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

export const BuildNixGenerateTagTemplate = defineJob(BuildNixGenerateTagJobInputs, (inputValues) => ({
    name: `devguard:generate_tag${inputValues.job_suffix}`,
    job: {
        tags: inputValues.runner_tags as any,
        stage: inputValues.stage,
        allow_failure: inputValues.allow_failure as any,
        needs: inputValues.needs as any,
        dependencies: inputValues.dependencies as any,
        variables: {
            GIT_STRATEGY: inputValues.git_strategy,
            IMAGE_SUFFIX: inputValues.image_suffix,
            DEVGUARD_ARTIFACT_NAME: `${inputValues.devguard_artifact_name}`,
        },
        image: {
            name: "ghcr.io/l3montree-dev/devguard/scanner:main",
            pull_policy: inputValues.pull_policy as any,
        },
        script: [
            `devguard-scanner generate-tag --imageSuffix "$IMAGE_SUFFIX" --imageVariant "${inputValues.image_variant}" --architecture "${inputValues.architecture}" --imagePath "${inputValues.image_path}" --ref "$CI_COMMIT_REF_NAME" --upstreamVersion "${inputValues.upstream_version}" >> generate_tag_${inputValues.upstream_version}_${inputValues.architecture}.env`,
            `cat generate_tag_${inputValues.upstream_version}_${inputValues.architecture}.env`,
        ],
        artifacts: {
            reports: {
                dotenv: `generate_tag_${inputValues.upstream_version}_${inputValues.architecture}.env`,
            },
            paths: [
                `generate_tag_${inputValues.upstream_version}_${inputValues.architecture}.env`,
            ],
        }
    }
}));


// Job 3: build OCI image using Nix (dockerTools.buildLayeredImage)
export const BuildNixJobInputs = defineInputs({
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

export const BuildNixTemplate = defineJob(BuildNixJobInputs, (inputValues) => ({
    name: `devguard:build_oci_image${inputValues.job_suffix}`,
    job: {
        tags: inputValues.runner_tags as any,
        stage: inputValues.stage,
        allow_failure: inputValues.allow_failure as any,
        needs: [
            `devguard:extract_scanner${inputValues.job_suffix}`,
            inputValues.needs,
        ] as any,
        dependencies: [
            `devguard:extract_scanner${inputValues.job_suffix}`,
            inputValues.dependencies,
        ] as any,
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
            paths: [
                inputValues.image,
                `image-digest.txt`,
                `build.provenance.json`,
            ],
            when: "on_success",
        }
    }
}));
