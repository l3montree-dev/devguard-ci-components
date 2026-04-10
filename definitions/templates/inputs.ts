import { ConfigInputs } from "../../../gitlab-ci-ts/dist";

export const Inputs = {
  job_suffix: {
    type: "string" as const,
    description: "Suffix for the job name. You need this if you are using the component multiple times in one pipeline.",
    default: "" as const,
  },
  stage: {
    default: "test" as const,
    description: "The pipeline stage for the job",
  },

  /*
  DevGuard specific inputs
  */
  devguard_api_url: {
    description: "The url of the API to send the scan request to (default 'https://api.devguard.org')" as const,
    default: "https://api.devguard.org" as const,
  },
  devguard_web_ui: {
    description: "The DevGuard Web-UI Instance URL",
    default: "https://app.devguard.org" as const,
  },
  devguard_asset_name: {
    description: "DevGuard asset name (e.g., @opencode/projects/oci/assets/k8s-tools)",
    default: "$DEVGUARD_ASSET_NAME" as const,
  },
  devguard_token: {
    description: "The DevGuard API token (use CI/CD variable, your private key)",
    default: "$DEVGUARD_TOKEN" as const,
  },
  devguard_artifact_name: {
    description: "The name of the artifact (in purl format e.g., pkg:oci/k8s-tools)",
  },
  devguard_origin: {
    description: "Origin of the resource/information (how it was generated). Examples: 'source-scanning', 'container-scanning', 'base-image'. (default 'DEFAULT')",
    default: "DEFAULT" as any,
  },

  /*
  GitLab CI specific inputs
  */
  runner_tags: {
    default: [] as const,
    type: "array" as const,
    description: "The runner tags to use for the job",
  },
  git_strategy: {
    description: "The Git strategy to use for the job",
    default: "none" as const,
  },
  pull_policy: {
    description: "The pull policy for the container image (can be [always, if-not-present, never])",
    default: "always" as const,
  },
  allow_failure: {
    description: "Whether the job is allowed to fail without stopping the pipeline",
    type: "boolean" as const,
    default: false as const,
  },

  /*
  Job Dependencies
  */
  needs: {
    description: "List of jobs this attestation depends on",
    type: "array" as const,
    default: [] as string[],
  },
  dependencies: {
    description: "List of jobs to download artifacts from",
    type: "array" as const,
    default: [] as string[],
  },

  /*
  Other inputs
  */
  default_ref: {
    description: "Default branch reference",
    default: "$CI_DEFAULT_BRANCH" as const,
  },
  commit_ref: {
    description: "Current commit reference",
    default: "$CI_COMMIT_REF_NAME" as const,
  },
  path: {
    description: "The path to the git repository to scan",
    default: "$CI_PROJECT_DIR" as const,
  },
  is_tag: {
    description: "Is the current commit a tag",
    default: '$(if [ "$CI_COMMIT_TAG" != "" ]; then echo "true"; else echo "false"; fi)' as const,
  },
  fail_on_risk: {
    description: "The risk level to fail the job on. Options are: none, low, medium, high, critical",
    default: "critical" as const,
  },
  fail_on_cvss: {
    description: "The CVSS score to fail the job on. Options are: none, low, medium, high, critical",
    default: "critical" as const,
  },
  ignore_external_references: {
    description: "Whether to ignore external references in any discovered attestations. This is useful when you are using this component to scan your own built images which have a valid vex attestation.",
    default: "false" as const,
  },
  ignore_upstream_attestations: {
    default: "false" as const,
    description: "Whether to ignore upstream attestations when scanning the image."
  },

  /*
  Container Registry inputs
  */
  registry: {
    description: "Container registry URL",
    default: "$CI_REGISTRY" as const,
  },
  registry_user: {
    description: "Container registry username",
    default: "$CI_REGISTRY_USER" as const,
  },
  registry_password: {
    description: "Container registry password",
    default: "$CI_REGISTRY_PASSWORD" as const,
  },


  /*
  Attestation inputs
  */

  attestations: {
    description: `|
      List of attestations to create. Each item should have:
      - source: file path OR full URL (URLs are automatically detected and downloaded). Special string ARTIFACT_NAME will be replaced with URL-encoded artifact name.
      - predicate_type: the predicate type URL
      `,
    default: [] as const,
    type: "array" as const,
  },
  image: { // TODO!.. this is used in different pipelines for different purposes - we should make this more generic or add a separate input for the image to attest in case of the attest template -> some should probably use image_tar_path instead
    description: "Container image to use for attestation",
    default: "$CI_REGISTRY_IMAGE" as const,
  },

  image_tag: {
    default: "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA" as const,
    description: "The tag to use for the built image"
  },
  image_tar_path: {
    default: "image.tar" as const,
    description: "The path to the local image tar file to scan (e.g. image.tar). Used when image_tag is empty."
  },
  build_args: {
    default: "--context $CI_PROJECT_DIR --dockerfile $CI_PROJECT_DIR/Dockerfile" as const,
    description: "The build arguments to pass to the Kaniko build command"
  },
  push_image: {
    default: "false" as const,
    description: "If your GitLab instance has small artifact size limits, set this to true to push the image to the registry instead of uploading artifacts."
  },
  supplyChainId: {
    default: "$CI_COMMIT_SHA" as const,
    description: "The supply chain ID to use for the in-toto attestation"
  },



  image_suffix: {
    default: "default" as const,
    description: "Suffix for the image name (e.g. 'web'). Leave empty for no suffix."
  },
  image_variant: {
    default: "" as const,
    description: "Variant for the image name (e.g., 'slim' for 'image-slim'). Leave empty for no variant."
  },
  architecture: {
    default: "amd64" as const,
    description: "Target architecture (e.g., amd64 or arm64)"
  },
  image_path: {
    default: "$CI_REGISTRY_IMAGE" as const,
    description: "Path to the built image (e.g., registry.example.com/project/image). If not provided, the job will attempt to discover the image from previous jobs."
  },
  upstream_version: {
    default: "0" as const,
    description: "Upstream version to use for tag generation. If not provided, the job will ignore this parameter."
  }
} satisfies ConfigInputs;