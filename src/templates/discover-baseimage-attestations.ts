import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";

export const DiscoverBaseimageAttestationsJobInputs = defineInputsGitLab({
  stage: {
    ...Inputs.stage,
    default: "build" as const,
  },
  job_suffix: Inputs.job_suffix,
  pull_policy: Inputs.pull_policy,
  allow_failure: {
    ...Inputs.allow_failure,
    default: true as const,
  },
  needs: Inputs.needs,
  dependencies: Inputs.dependencies,

  registry: Inputs.registry,
  registry_user: Inputs.registry_user,
  registry_password: Inputs.registry_password,

  predicate_type: Inputs.predicate_type,
  output: Inputs.output,
  path: {
    description: "Path to the Containerfile/Dockerfile",
  },
});

export const DiscoverBaseimageAttestationsTemplate = defineJobGitLab(
  DiscoverBaseimageAttestationsJobInputs,
  (inputValues) => ({
    name: `devguard:discover_baseimage_attestations${inputValues.job_suffix}`,
    job: {
      stage: inputValues.stage,
      image: {
        name: ContainerImages.DEVGUARD_SCANNER,
        pull_policy: inputValues.pull_policy,
        entrypoint: [""],
      },
      needs: inputValues.needs,
      allow_failure: inputValues.allow_failure,
      dependencies: inputValues.dependencies,
      script: [
        `devguard-scanner login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}\ndevguard-scanner discover-baseimage-attestations --output "${inputValues.output}" --predicateType "${inputValues.predicate_type}" "${inputValues.path}"`,
      ],
      artifacts: {
        paths: [`${inputValues.output}/attestation-*.json`],
      },
    },
  }),
);
