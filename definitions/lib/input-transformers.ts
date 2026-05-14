/**
 * Input Transformers for cross-platform compatibility
 *
 * Converts GitLab CI input definitions to GitHub Actions format
 * and vice versa, handling differences in schema requirements.
 */

import { ConfigInputs } from "./ci";
import { WorkflowInput } from "./github-actions";
import { mapVariableToGitHub } from "./platform-variables";

/**
 * List of GitLab-specific input keys that should not be exported to GitHub Actions
 */
const GITLAB_ONLY_INPUTS = new Set([
  "runner_tags",
  "stage",
  "git_strategy",
  "pull_policy",
  "dependencies",
  "job_suffix", // Not needed in GitHub Actions
]);

/**
 * Convert GitLab CI input definitions to GitHub Actions format
 * GitHub Actions requires a 'type' field for all inputs
 * Filters out GitLab-specific inputs
 * Transforms platform-agnostic defaults to GitHub-specific values
 */
export function transformInputsToGitHub(
  inputs: ConfigInputs,
): Record<string, WorkflowInput> {
  const gitHubInputs: Record<string, WorkflowInput> = {};

  for (const [key, inputDef] of Object.entries(inputs)) {
    // Skip null inputs and GitLab-specific inputs
    if (!inputDef || GITLAB_ONLY_INPUTS.has(key)) continue;

    // Determine the type based on the input definition
    let type: "string" | "choice" | "boolean" | "environment" | "number" =
      "string";

    if (inputDef.type === "boolean") {
      type = "boolean";
    } else if (inputDef.type === "array") {
      type = "string"; // GitHub Actions doesn't have array type, use string
    } else if (inputDef.type === "number") {
      type = "number";
    }

    let defaultValue: string | undefined = undefined;
    if (inputDef.default !== undefined && inputDef.default !== null) {
      const stringValue = String(inputDef.default);
      // Map platform-agnostic variables to GitHub syntax
      defaultValue = mapVariableToGitHub(stringValue);
    }

    gitHubInputs[key] = {
      description: inputDef.description || "",
      type,
      required: false,
      ...(defaultValue !== undefined && { default: defaultValue }),
    };
  }

  return gitHubInputs;
}

/**
 * Transform variable syntax from GitLab CI to GitHub Actions
 * Converts $[[ inputs.xxx ]] to ${{ inputs.xxx }}
 */
export function transformVariableSyntax(script: string): string {
  return script.replace(/\$\[\[\s*inputs\.(\w+)\s*\]\]/g, "${{ inputs.$1 }}");
}
