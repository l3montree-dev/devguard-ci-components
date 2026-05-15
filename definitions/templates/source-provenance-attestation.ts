import { defineInputsGitLab, defineJobGitLab, IncludeWithSpec } from "@l3montree/programmatic-ci-components";
import { Inputs } from "./inputs";

const JobInputs = defineInputsGitLab({
  job_suffix: Inputs.job_suffix,
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
          needs: [`devguard:generate_tag${inputValues.job_suffix}`],
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
