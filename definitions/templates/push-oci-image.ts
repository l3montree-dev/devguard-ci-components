import { defineInputs, defineJob } from "@l3montree/programmatic-ci-components";
import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";

export const PushOciImageJobInputs = defineInputs({
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_token: Inputs.devguard_token,

  runner_tags: Inputs.runner_tags,
  stage: {
    ...Inputs.stage,
    default: "oci-image",
  },
  job_suffix: Inputs.job_suffix,
  git_strategy: {
    ...Inputs.git_strategy,
    default: "none",
  },
  pull_policy: Inputs.pull_policy,
  allow_failure: Inputs.allow_failure,
  needs: Inputs.needs,
  dependencies: Inputs.dependencies,

  registry: Inputs.registry,
  registry_user: Inputs.registry_user,
  registry_password: Inputs.registry_password,

  image: {
    ...Inputs.image,
    description: "The image file to build (e.g. image.tar)" as const,
    default: "image.tar" as const,
  },
  image_tag: {
    ...Inputs.image_tag,
    description:
      "The tag to use for the built image. Leave empty to use the generated tag from the 'generate-tag' component." as const,
  },

  supplyChainId: Inputs.supplyChainId,

  default_ref: Inputs.default_ref,
  ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,

  disable_job: Inputs.disable_job,
});

export const PushOciImageTemplate = defineJob(
  PushOciImageJobInputs,
  (inputValues) => ({
    name: `devguard:push_oci_image${inputValues.job_suffix}`,
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
        name: ContainerImages.KANIKO,
        entrypoint: [""],
      },
      rules: [
        {
          if: `${inputValues.disable_job} == "true"`,
          when: "never",
        },
        {
          when: "on_success",
        },
      ],
      script: `/crane auth login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}

echo "Image: ${inputValues.image}"
echo "Image Tag: ${inputValues.image_tag}"

/crane push ${inputValues.image} ${inputValues.image_tag}

/devguard-scanner intoto run --step=deploy --materials="${inputValues.image}" --products="" --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" --supplyChainId="${inputValues.supplyChainId}" --supplyChainOutputDigest="\${DIGEST}" --defaultRef="${inputValues.default_ref}" --ref="${inputValues.ref}" --isTag="${inputValues.is_tag}"
`,
    },
  }),
);
