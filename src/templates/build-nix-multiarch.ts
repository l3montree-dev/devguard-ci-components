import { defineInputsGitLab, defineJobGitLab } from "@l3montree/programmatic-ci-components";
import { Inputs } from "./inputs";

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
            version: inputValues.version,
            build_stage: "build",
            attest_stage: "test",
            job_suffix: inputValues.job_suffix,
            image_suffix: inputValues.image_suffix,
            architecture: "${ARCHITECTURE}",
            needs: [`devguard:container_scanning${inputValues.job_suffix}`],
            dependencies: [`devguard:container_scanning${inputValues.job_suffix}`],
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
