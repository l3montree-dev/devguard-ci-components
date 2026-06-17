/**
 * Input Transformers for cross-platform compatibility
 *
 * Converts GitLab CI input definitions to GitHub Actions format
 * and vice versa, handling differences in schema requirements.
 */

import { ConfigInputs } from "@sleeyax/gitlab-ci-ts";
import { WorkflowInput } from "../github/github-actions";
import { mapVariableToGitHub } from "../github/platform-variables";

/**
 * Convert a snake_case string to kebab-case.
 * Only converts underscore separators; does not touch digits or uppercase.
 */
export function snakeToKebab(s: string): string {
  return s.replace(/_/g, "-");
}

/**
 * Convert GitLab CI input definitions to GitHub Actions format.
 * - Renames keys from snake_case to kebab-case (GitHub convention)
 * - Requires a 'type' field for all inputs
 * - Transforms platform-agnostic defaults to GitHub-specific values
 */
export function transformInputsToGitHub(inputs: ConfigInputs): Record<string, WorkflowInput> {
  const gitHubInputs: Record<string, WorkflowInput> = {};

  for (const [key, inputDef] of Object.entries(inputs)) {
    // Skip null inputs and GitLab-specific inputs
    if (!inputDef) continue;

    // Determine the type based on the input definition
    let type: "string" | "choice" | "boolean" | "environment" | "number" = "string";

    if (inputDef.type === "boolean") {
      type = "boolean";
    } else if (inputDef.type === "array") {
      type = "string"; // GitHub Actions doesn't have array type, use string
    } else if (inputDef.type === "number") {
      type = "number";
    }

    let defaultValue: string | boolean | number | undefined = undefined;
    if (inputDef.default !== undefined && inputDef.default !== null) {
      if (typeof inputDef.default === "boolean") {
        defaultValue = inputDef.default;
      } else if (typeof inputDef.default === "number") {
        defaultValue = inputDef.default;
      } else {
        // Map platform-agnostic variables to GitHub syntax
        defaultValue = mapVariableToGitHub(String(inputDef.default));
      }
    }

    // Rename key to kebab-case for GitHub Actions convention
    const kebabKey = snakeToKebab(key);

    gitHubInputs[kebabKey] = {
      description: inputDef.description || "",
      type,
      required: false,
      ...(defaultValue !== undefined && { default: defaultValue }),
    };
  }

  return gitHubInputs;
}

/**
 * In a string, replace `inputs.snake_case_name` with `inputs.kebab-case-name`.
 * Applied after transformVariableSyntax so that ${{ inputs.foo_bar }} becomes ${{ inputs.foo-bar }}.
 */
function transformInputNamesToKebab(s: string): string {
  return s.replace(/(\binputs\.)([a-z][a-z0-9_]*)/g, (_, prefix, name) => prefix + snakeToKebab(name));
}

/**
 * Recursively apply transformInputNamesToKebab to all string values in an object/array/tree.
 */
export function transformObjectInputNamesToKebab<T>(value: T): T {
  if (typeof value === "string") {
    return transformInputNamesToKebab(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => transformObjectInputNamesToKebab(item)) as T;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      transformObjectInputNamesToKebab(item),
    ]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

/**
 * Remove all variables from string
 */
export function githubJobId(jobId: string): string {
  return jobId
    .replace(/\$\{\{\s*([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\s*\}\}/g, "") // remove any GitHub Action Variables that are not allowed
    .replace(/[^a-zA-Z0-9_]/g, "_"); // replace any character except _ and alphanumeric with _
}

/**
 * Transform variable syntax from GitLab CI to GitHub Actions
 * Converts $[[ abc.xyz ]] to ${{ abc.xyz }}
 */
export function transformVariableSyntax(script: string): string {
  return script.replace(/\$\[\[\s*([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\s*\]\]/g, "${{ $1.$2 }}");
}

/**
 * Recursively transform all string values in an object/array/tree from
 * GitLab-style placeholders to GitHub Actions expression syntax.
 */
export function transformObjectVariableSyntax<T>(value: T): T {
  if (typeof value === "string") {
    return transformVariableSyntax(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => transformObjectVariableSyntax(item)) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      transformObjectVariableSyntax(item),
    ]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}
