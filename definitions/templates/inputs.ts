import { ConfigInputs } from "@l3montree/programmatic-ci-components";

export const Inputs = {
  job_suffix: {
    type: "string" as const,
    description: "Suffix for the job name. You need this if you are using the component multiple times in one pipeline." as const,
    default: "" as const,
  },
  job_prefix: {
    default: "" as const,
    description: "Prefix for the job name." as const,
  },
  stage: {
    default: "test" as const,
    description: "The pipeline stage for the job" as const,
  },

  /*
  DevGuard specific inputs
  */
  devguard_api_url: {
    description: "The url of the API to send the scan request to (default 'https://api.devguard.org')" as const,
    default: "https://api.devguard.org" as const,
  },
  devguard_web_ui: {
    description: "The DevGuard Web-UI Instance URL" as const,
    default: "https://app.devguard.org" as const,
  },
  devguard_asset_name: {
    description: "DevGuard asset name (e.g., @opencode/projects/oci/assets/k8s-tools)" as const,
    default: "$DEVGUARD_ASSET_NAME" as const,
  },
  devguard_token: {
    description: "The DevGuard API token (use CI/CD variable, your private key)" as const,
    default: "$DEVGUARD_TOKEN" as const,
  },
  devguard_artifact_name: {
    description: "The name of the artifact (in purl format e.g., pkg:oci/k8s-tools)" as const,
    default: "" as const,
  },
  devguard_origin: {
    description: "Origin of the resource/information (how it was generated). Examples: 'source-scanning', 'container-scanning', 'base-image'. (default 'DEFAULT')" as const,
    default: "DEFAULT" as any,
  },

  /*
  GitLab CI specific inputs
  */
  runner_tags: {
    default: [] as const,
    type: "array" as const,
    description: "The runner tags to use for the job" as const,
  },
  git_strategy: {
    description: "The Git strategy to use for the job" as const,
    default: "none" as const,
  },
  pull_policy: {
    description: "The pull policy for the container image (can be [always, if-not-present, never])" as const,
    default: "always" as const,
  },
  allow_failure: {
    description: "Whether the job is allowed to fail without stopping the pipeline" as const,
    type: "boolean" as const,
    default: false as const,
  },

  /*
  Job Dependencies
  */
  needs: {
    description: "List of jobs this attestation depends on" as const,
    type: "array" as const,
    default: [] as string[] | { name: string; optional: boolean }[],
  },
  dependencies: {
    description: "List of jobs to download artifacts from" as const,
    type: "array" as const,
    default: [] as string[],
  },

  /*
  Other inputs
  */
  default_ref: {
    description: "Default branch reference" as const,
    default: "$CI_DEFAULT_BRANCH" as const,
  },
  commit_ref: {
    description: "Current commit reference" as const,
    default: "$CI_COMMIT_REF_NAME" as const,
  },
  path: {
    description: "The path to the git repository to scan" as const,
    default: "$CI_PROJECT_DIR" as const,
  },
  is_tag: {
    description: "Is the current commit a tag" as const,
    default: '$(if [ "$CI_COMMIT_TAG" != "" ]; then echo "true"; else echo "false"; fi)' as const,
  },
  fail_on_risk: {
    description: "The risk level to fail the job on. Options are: none, low, medium, high, critical" as const,
    default: "critical" as const,
  },
  fail_on_cvss: {
    description: "The CVSS score to fail the job on. Options are: none, low, medium, high, critical" as const,
    default: "critical" as const,
  },
  ignore_external_references: {
    description: "Whether to ignore external references in any discovered attestations. This is useful when you are using this component to scan your own built images which have a valid vex attestation." as const,
    default: "false" as const,
  },
  ignore_upstream_attestations: {
    default: "false" as const,
    description: "Whether to ignore upstream attestations when scanning the image." as const
  },

  /*
  Container Registry inputs
  */
  registry: {
    description: "Container registry URL" as const,
    default: "$CI_REGISTRY" as const,
  },
  registry_user: {
    description: "Container registry username" as const,
    default: "$CI_REGISTRY_USER" as const,
  },
  registry_password: {
    description: "Container registry password" as const,
    default: "$CI_REGISTRY_PASSWORD" as const,
  },


  /*
  Attestation inputs
  */

  attestations: {
    description: "List of attestations to create. Each item should have:\n- source: file path OR full URL (URLs are automatically detected and downloaded). Special string ARTIFACT_NAME will be replaced with URL-encoded artifact name.\n- predicate_type: the predicate type URL" as const,
    default: [] as const,
    type: "array" as const,
  },
  image: { // TODO!.. this is used in different pipelines for different purposes - we should make this more generic or add a separate input for the image to attest in case of the attest template -> some should probably use image_tar_path instead
    description: "Container image to use for attestation" as const,
    default: "$CI_REGISTRY_IMAGE" as const,
  },

  image_tag: {
    default: "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA" as const,
    description: "The tag to use for the built image" as const,
  },
  image_tar_path: {
    default: "image.tar" as const,
    description: "The path to the local image tar file to scan (e.g. image.tar). Used when image_tag is empty." as const,
  },
  build_args: {
    default: "--context $CI_PROJECT_DIR --dockerfile $CI_PROJECT_DIR/Dockerfile" as const,
    description: "The build arguments to pass to the Kaniko build command" as const,
  },
  push_image: {
    default: "false" as const,
    description: "If your GitLab instance has small artifact size limits, set this to true to push the image to the registry instead of uploading artifacts." as const,
  },
  supplyChainId: {
    default: "$CI_COMMIT_SHA" as const,
    description: "The supply chain ID to use for the in-toto attestation" as const,
  },



  image_suffix: {
    default: "default" as const,
    description: "Suffix for the image name (e.g. 'web'). Leave empty for no suffix." as const,
  },
  image_variant: {
    default: "" as const,
    description: "Variant for the image name (e.g., 'slim' for 'image-slim'). Leave empty for no variant." as const,
  },
  architecture: {
    default: "amd64" as const,
    description: "Target architecture (e.g., amd64 or arm64)" as const,
  },
  image_path: {
    default: "$CI_REGISTRY_IMAGE" as const,
    description: "Path to the built image (e.g., registry.example.com/project/image). If not provided, the job will attempt to discover the image from previous jobs." as const,
  },
  upstream_version: {
    default: "0" as const,
    description: "Upstream version to use for tag generation. If not provided, the job will ignore this parameter." as const,
  },

  fetch_image_from_registry: {
    default: "false" as const,
    description: "If the artifact size is too big for your GitLab instance and the image was pushed directly to the registry during build (small_artifact_registry=true), set this to true to pull the image from the registry for scanning instead of using a local tar artifact." as const,
  },

  small_artifact_registry: {
        default: "false" as const,
        description: "If the artifact size is too big for your GitLab instance, set this to true. This will push the image directly to the registry during the build step instead of uploading it as an artifact, and skip the separate push step." as const,
  },

  disable_job: {
    default: "false" as const,
    description: "Whether to disable the job. This is useful when you want to conditionally disable this job in orchestration templates." as const,
  },


  /*
  Nix-specific inputs
  */
  nix_target: {
    description: "Flake output attribute to build (e.g. devguardOCI). Must be a dockerTools.buildLayeredImage derivation." as const,
  },
  nix_cache_substituter: {
    default: "" as const,
    description: "Nix binary cache substituter URL. Set to empty string to disable." as const,
  },
  nix_cache_public_key: {
    default: "" as const,
    description: "Trusted public key for the Nix binary cache." as const,
  },
  nix_cache_s3_endpoint: {
    default: "" as const,
    description: "S3 API endpoint for pushing to the cache (e.g. s3.garage.l3montree.cloud). Leave empty to skip pushing." as const,
  },
  nix_cache_s3_bucket: {
    default: "" as const,
    description: "S3 bucket name for the cache." as const,
  },
  nix_cache_region: {
    default: "" as const,
    description: "S3 region for the cache bucket." as const,
  },

  /*
  Upload inputs
  */
  sarif_file: {
    description: "The SARIF file to upload" as const,
  },
  sbom_file: {
    description: "The SBOM file to upload" as const,
  },
  vex_file: {
    default: "$CI_PROJECT_DIR/vex.json" as const,
    description: "The VeX file to upload" as const,
  },

  /*
  Discover base-image attestations inputs
  */
  predicate_type: {
    default: "" as const,
    description: "The predicate type to discover. If empty, all attestations will be discovered." as const,
  },
  output: {
    default: "." as const,
    description: "Output directory for discovered attestations (relative to project root)." as const,
  },

  /*
  Docker DinD build inputs
  */
  docker_buildkit: {
    default: "" as const,
    description: "Enable Docker BuildKit by setting to '1'." as const,
  },

  /*
  Release inputs
  */
  release_tag: {
    default: "$CI_COMMIT_TAG" as const,
    description: "The tag to create the release for" as const,
  },
  release_name: {
    default: "Release $CI_COMMIT_TAG" as const,
    description: "The name of the release" as const,
  },
  release_description: {
    default: "" as const,
    description: "Custom release description (optional, leave empty for auto-generated)" as const,
  },
  rules: {
    type: "array" as const,
    default: [{ if: "$CI_COMMIT_TAG" }] as any,
    description: "The rules to determine when to create a release" as const,
  },
  assets_links: {
    type: "array" as const,
    default: [] as any,
    description: "List of asset links to attach to the release" as const,
  },

  /*
  Orchestration inputs
  */
  build_job_name: {
    description: "The name of the external build job to depend on. Must produce an image tar file as artifact." as const,
  },

  /*
  Multi-arch manifest inputs
  */
  create_root_manifest: {
    default: '$(if [ "$CI_COMMIT_TAG" != "" ]; then echo "true"; else echo "false"; fi)' as const,
    description: "Whether to also create a manifest without the branch ref in the tag." as const,
  },
  artifacts_subdirectory: {
    default: "." as const,
    description: "Directory to store generated artifacts in (relative to project root)." as const,
  },
} satisfies ConfigInputs;