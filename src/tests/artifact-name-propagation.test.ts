import { describe, expect, test } from "bun:test";
import { templates } from "../index";
import type { GitLabJobWithSpec } from "../lib/types";



const DOTENV_FIELDS = {
  // image and devguard_artifact_name should be replaced with the corresponding generated values
  image: "$IMAGE_TAG",
  devguard_artifact_name: "$ARTIFACT_NAME",
} as const;

function unresolvedPlaceholder(field: string): RegExp {
  // nosemgrep
  return new RegExp(`\\$\\[\\[\\s*inputs\\.${field}\\s*\\]\\]`);
}

function needsListsGenerateTag(job: GitLabJobWithSpec): boolean {
  return /devguard:generate_tag/.test(JSON.stringify((job.job as { needs?: unknown }).needs ?? ""));
}

describe("generate_tag dotenv values ($IMAGE_TAG / $ARTIFACT_NAME) propagation", () => {
  for (const [groupName, entries] of Object.entries(templates)) {
    describe(groupName, () => {
      for (const entry of entries) {
        if (!("job" in entry)) continue; // skip plain IncludeWithSpec entries
        const job = entry as GitLabJobWithSpec;

        test(job.name, () => {
          if (!needsListsGenerateTag(job)) return;

          const jobText = JSON.stringify(job);
          for (const [field, dotenvVar] of Object.entries(DOTENV_FIELDS)) {
            expect(
              unresolvedPlaceholder(field).test(jobText),
              `${groupName} / "${job.name}": composed after generate_tag but "${field}" is still the unresolved $[[ inputs.${field} ]] passthrough instead of the "${dotenvVar}" value generate_tag resolved`,
            ).toBe(false);
          }
        });
      }
    });
  }
});
