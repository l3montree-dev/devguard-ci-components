import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { IncludeWithSpec } from "../lib/types";
import { Inputs } from "./inputs";

const JobInputs = defineInputsGitLab({
  job_suffix: Inputs.job_suffix,
  job_prefix: Inputs.job_prefix,
  stage: Inputs.stage,
});

export const SourceProvenanceTemplate = defineJobGitLab(
  JobInputs,
  (inputValues) =>
    ({
      platforms: ["gitlab"],
      name: "source-provenance-attestation",
      inputs: {},
      include: {
        remote:
          "https://gitlab.opencode.de/open-code/badgebackend/source-provenance-attestation-service/-/raw/main/templates/attestation.yml",
        inputs: {
          job_suffix: inputValues.job_suffix,
          image: `$IMAGE_TAG`,
          // the trigger job takes IMAGE_TAG from these jobs and needs the image to exist.
          // push_oci_image is optional, because it does not run on merge request pipelines
          // or with small_artifact_registry
          needs: [
            `devguard:generate_tag${inputValues.job_suffix}`,
            `${inputValues.job_prefix}devguard:build_oci_image${inputValues.job_suffix}`,
            {
              job: `devguard:push_oci_image${inputValues.job_suffix}`,
              optional: true,
            },
          ],
          dependencies: [`devguard:generate_tag${inputValues.job_suffix}`],
          stage: inputValues.stage,
        },
        rules: [
          {
            if: '$CI_SERVER_FQDN == "gitlab.opencode.de"',
          },
        ],
      },
    }) satisfies IncludeWithSpec,
);
