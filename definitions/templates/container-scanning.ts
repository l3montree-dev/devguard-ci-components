import { defineInputs, defineJob } from "../lib/JobWithSpecBuilder";
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";
export const ContainerScanningJobInputs = defineInputs({
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_token: Inputs.devguard_token,
  devguard_origin: Inputs.devguard_origin,
  devguard_web_ui: Inputs.devguard_web_ui,
  devguard_artifact_name: Inputs.devguard_artifact_name,

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

  default_ref: Inputs.default_ref,
  commit_ref: Inputs.commit_ref,

  registry: Inputs.registry,
  registry_user: Inputs.registry_user,
  registry_password: Inputs.registry_password,

  image_tar_path: Inputs.image_tar_path,
  image_tag: {
    ...Inputs.image_tag,
    default: "" as const,
    description:
      "The (remote) OCI image reference to scan (e.g. ghcr.io/org/image:tag). If provided, this takes precedence over image_tar_path.",
  },

  fail_on_risk: Inputs.fail_on_risk,
  fail_on_cvss: Inputs.fail_on_cvss,
  is_tag: Inputs.is_tag,
  ignore_external_references: Inputs.ignore_external_references,
  ignore_upstream_attestations: Inputs.ignore_upstream_attestations,

  fetch_image_from_registry: Inputs.fetch_image_from_registry,
});

export const ContainerScanningTemplate = defineJob(
  ContainerScanningJobInputs,
  (inputValues) => ({
    name: `devguard:container_scanning${inputValues.job_suffix}`,
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
      },
      script: [
        `echo "Running DevGuard Container Scanning..."`,
        `echo "Image Tag: ${inputValues.image_tag}"`,
        `echo "Image Tar Path: ${inputValues.image_tar_path}"`,
        `echo "Fetch Image From Registry: ${inputValues.fetch_image_from_registry}"`,
        `echo "Origin: ${inputValues.devguard_origin}"`,
        `echo "Asset Name: ${inputValues.devguard_asset_name}"`,
        `echo "API URL: ${inputValues.devguard_api_url}"`,
        `echo "Path: ${inputValues.image_tar_path}"`,
        `echo "Default Ref: ${inputValues.default_ref}"`,
        `echo "Commit Ref: ${inputValues.commit_ref}"`,
        `echo "Is Tag: ${inputValues.is_tag}"`,
        `echo "Artifact Name: ${inputValues.devguard_artifact_name}"`,
        `echo "Web UI: ${inputValues.devguard_web_ui}"`,
        `echo "Fail on Risk: ${inputValues.fail_on_risk}"`,
        `echo "Fail on CVSS: ${inputValues.fail_on_cvss}"`,

        `echo "---"
if [ "${inputValues.fetch_image_from_registry}" = "true" ]; then
    echo "Scanning remote image from registry: $IMAGE_TAG"
    devguard-scanner login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}
    devguard-scanner container-scanning \\
        --origin="${inputValues.devguard_origin}" \\
        --assetName="${inputValues.devguard_asset_name}" \\
        --apiUrl="${inputValues.devguard_api_url}" \\
        --token="${inputValues.devguard_token}" \\
        --image="$IMAGE_TAG" \\
        --defaultRef="${inputValues.default_ref}" \\
        --ref="${inputValues.commit_ref}" \\
        --isTag="${inputValues.is_tag}" \\
        --artifactName="${inputValues.devguard_artifact_name}" \\
        --webUI="${inputValues.devguard_web_ui}" \\
        --failOnRisk="${inputValues.fail_on_risk}" \\
        --failOnCVSS="${inputValues.fail_on_cvss}" \\
        --ignoreExternalReferences=${inputValues.ignore_external_references} \\
        --ignoreUpstreamAttestations=${inputValues.ignore_upstream_attestations}
elif [ -n "${inputValues.image_tag}" ]; then
  echo "Scanning remote image: ${inputValues.image_tag}"
  devguard-scanner login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}
  devguard-scanner container-scanning \\
    --origin="${inputValues.devguard_origin}" \\
    --assetName="${inputValues.devguard_asset_name}" \\
    --apiUrl="${inputValues.devguard_api_url}" \\
    --token="${inputValues.devguard_token}" \\
    --image="${inputValues.image_tag}" \\
    --defaultRef="${inputValues.default_ref}" \\
    --ref="${inputValues.commit_ref}" \\
    --isTag="${inputValues.is_tag}" \\
    --artifactName="${inputValues.devguard_artifact_name}" \\
    --webUI="${inputValues.devguard_web_ui}" \\
    --failOnRisk="${inputValues.fail_on_risk}" \\
    --failOnCVSS="${inputValues.fail_on_cvss}" \\
    --ignoreExternalReferences=${inputValues.ignore_external_references} \\
    --ignoreUpstreamAttestations=${inputValues.ignore_upstream_attestations}
else
  echo "Scanning local tar file: ${inputValues.image_tar_path}"
  devguard-scanner container-scanning \\
    --origin="${inputValues.devguard_origin}" \\
    --assetName="${inputValues.devguard_asset_name}" \\
    --apiUrl="${inputValues.devguard_api_url}" \\
    --token="${inputValues.devguard_token}" \\
    --path="${inputValues.image_tar_path}" \\
    --defaultRef="${inputValues.default_ref}" \\
    --ref="${inputValues.commit_ref}" \\
    --isTag="${inputValues.is_tag}" \\
    --artifactName="${inputValues.devguard_artifact_name}" \\
    --webUI="${inputValues.devguard_web_ui}" \\
    --failOnRisk="${inputValues.fail_on_risk}" \\
    --failOnCVSS="${inputValues.fail_on_cvss}"
fi`,
      ],
    },
  }),
);
