import { defineInputs, defineJob } from "../lib/JobWithSpecBuilder";
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";

export const SignOciImageJobInputs = defineInputs({
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_token: Inputs.devguard_token,

  runner_tags: Inputs.runner_tags,
  stage: {
    ...Inputs.stage,
    default: "attestation",
  },
  job_suffix: Inputs.job_suffix,
  git_strategy: {
    ...Inputs.git_strategy,
    default: "fetch",
  },
  pull_policy: Inputs.pull_policy,
  allow_failure: Inputs.allow_failure,
  needs: {
    ...Inputs.needs,
    description: "List of jobs this scan depends on" as const,
  },
  dependencies: Inputs.dependencies,

  registry: Inputs.registry,
  registry_user: Inputs.registry_user,
  registry_password: Inputs.registry_password,

  image: {
    ...Inputs.image,
    description:
      "The container image to sign (e.g., registry.example.com/project/image:tag)" as const,
    default: "$CI_REGISTRY_IMAGE:latest" as const,
  },
});

export const SignOciImageTemplate = defineJob(
  SignOciImageJobInputs,
  (inputValues) => ({
    name: `devguard:sign_oci_image${inputValues.job_suffix}`,
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
        entrypoint: [""],
      },
      script: [
        `devguard-scanner login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}`,
        `devguard-scanner sign --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" "${inputValues.image}"`,
      ],
    },
  }),
);
