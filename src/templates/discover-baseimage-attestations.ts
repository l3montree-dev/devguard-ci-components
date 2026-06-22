import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_CHECKOUT, ACTIONS_UPLOAD_ARTIFACT } from "../actions-versions";

const DiscoverBaseimageAttestationsJobInputs = defineInputsGitLab({
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

const DiscoverBaseimageAttestationsJobInputsGitHub = defineInputsGitHub({
  registry: {
    ...Inputs.registry,
    default: "ghcr.io" as const,
  },
  registry_user: {
    ...Inputs.registry_user,
    default: "" as const,
    description: "Registry username. Defaults to github.actor when empty." as const,
  },
  predicate_type: Inputs.predicate_type,
  output: Inputs.output,
  path: {
    description: "Path to the Containerfile/Dockerfile",
    default: "Dockerfile",
    type: "string" as const,
  },
  allow_failure: {
    ...Inputs.allow_failure,
    default: true as const,
  },
});

export const DiscoverBaseimageAttestationsTemplateGitHub = defineJobGitHub(
  DiscoverBaseimageAttestationsJobInputsGitHub,
  (inputValues) => ({
    name: "devguard:discover-baseimage-attestations",
    secrets: {
      "registry-password": {
        description: "Registry password for pulling the base image.",
        required: false,
      },
    },
    job: {
      "runs-on": "ubuntu-latest",
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
          name: "Discover base image attestations",
          uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
          "continue-on-error": inputValues.allow_failure as boolean,
          with: {
            args: `devguard-scanner login -u \${{ inputs.registry_user || github.actor }} -p \${{ secrets.registry-password || github.token }} ${inputValues.registry} && devguard-scanner discover-baseimage-attestations --output "${inputValues.output}" --predicateType "${inputValues.predicate_type}" "${inputValues.path}"`,
          },
        },
        {
          name: "Upload attestation artifacts",
          uses: ACTIONS_UPLOAD_ARTIFACT,
          with: {
            name: "baseimage-attestations",
            path: `${inputValues.output}/attestation-*.json`,
          },
          if: "always()",
        },
      ],
    },
  }),
);

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
