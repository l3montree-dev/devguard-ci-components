import { defineInputs, defineJob, IncludeWithSpec } from "@l3montree/programmatic-ci-components";
import { Inputs } from "./inputs";

const JobInputs = defineInputs({
    job_suffix: Inputs.job_suffix,
});

export const SourceProvenanceTemplate = defineJob(JobInputs, (inputValues) => ({
    platforms: ['gitlab'],
    name: "source-provenance-attestation",
    inputs: {},
    include: {
        remote: {
            component: '$CI_SERVER_FQDN/open-code/badgebackend/source-provenance-attestation-service/attestation@main',
            inputs: {
                job_suffix: inputValues.job_suffix,
                image: `$IMAGE_TAG`,
                needs: [`devguard:generate_tag${inputValues.job_suffix}`],
                dependencies: [`devguard:generate_tag${inputValues.job_suffix}`],
            },
            rules: [
                {
                    if: '$CI_SERVER_FQDN == "gitlab.opencode.de"',
                },
            ]
        } as any,
    }
} satisfies IncludeWithSpec));
