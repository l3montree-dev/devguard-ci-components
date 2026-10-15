import { WorkflowInput } from "./github/github-actions";
import { resolveInputValue } from "./JobWithSpecBuilder";
import { ArrayInputItem, GitLabJobWithSpec, GitHubWorkflow } from "./types";

const input = <T extends string>(varName: T, data: { [key: string]: ArrayInputItem | undefined }) =>
  resolveInputValue(varName, data[varName]);

export type InputDefinitionsGitHub = { [key: string]: WorkflowInput };

export type InputValuesGitHub<TInputDefinitions extends InputDefinitionsGitHub> = {
  [K in keyof TInputDefinitions]: TInputDefinitions[K] extends { type: "array" }
    ? ArrayInputItem | undefined
    : TInputDefinitions[K] extends { type: "boolean" }
      ? boolean | string | undefined
      : string | undefined;
};
export type ResolvedInputValuesGitHub<TInputDefinitions extends InputDefinitionsGitHub> = {
  [K in keyof TInputDefinitions]: TInputDefinitions[K] extends { type: "array" }
    ? ArrayInputItem
    : TInputDefinitions[K] extends { type: "boolean" }
      ? boolean | string
      : string;
};

/**
 * Builds an `if:` condition checking that a boolean-ish input equals "true" or "false".
 * An unresolved input reference ("$[[ inputs.foo ]]") becomes a runtime comparison via format('{0}', ...),
 * so boolean and string inputs compare the same way. A literal is resolved at generation time.
 */
export const githubInputEquals = (value: boolean | string, expected: "true" | "false"): string => {
  const match = /^\$\[\[\s*(inputs\.[a-z0-9_]+)\s*\]\]$/.exec(String(value));
  return match ? `format('{0}', ${match[1]}) == '${expected}'` : String(String(value) === expected);
};

export const defineInputsGitHub = <TInputDefinitions extends InputDefinitionsGitHub>(
  inputDefinitions: TInputDefinitions,
): TInputDefinitions => inputDefinitions;

export class JobBuilderGitHub {
  static generate<TInputDefinitions extends InputDefinitionsGitHub>(
    inputDefinitions: TInputDefinitions,
    inputs: Partial<InputValuesGitHub<TInputDefinitions>>,
    needs: string[] = [],
    partialJobGenerator: (
      inputValues: ResolvedInputValuesGitHub<TInputDefinitions>,
      needs: string[],
    ) => Partial<GitHubWorkflow>,
  ) {
    const keys = Object.keys(inputDefinitions) as (keyof TInputDefinitions)[];

    const inputDefs = keys
      .filter((key) => inputs[key] === undefined)
      .reduce((acc, key) => ({ ...acc, [key]: inputDefinitions[key] }), {}) as WorkflowInput;
    const inputValues = keys.reduce(
      (acc, key) => ({ ...acc, [key]: input(key as string, inputs as { [key: string]: ArrayInputItem | undefined }) }),
      {},
    ) as ResolvedInputValuesGitHub<TInputDefinitions>;

    const workflow = {
      inputs: inputDefs,
      ...partialJobGenerator(inputValues, needs),
    } as GitHubWorkflow;

    // add needs section if it's available
    if (needs && needs.length > 0) {
      workflow.job = {
        ...workflow.job,
        needs,
      };
    }

    return workflow;
  }
}

export const defineJobGitHub = <TInputDefinitions extends InputDefinitionsGitHub>(
  inputDefinitionsDefault: TInputDefinitions,
  partialJobGenerator: (inputValues: ResolvedInputValuesGitHub<TInputDefinitions>) => Partial<GitHubWorkflow>,
) => {
  return (inputs: Partial<InputValuesGitHub<TInputDefinitions>>, needs: string[] = []): GitHubWorkflow => {
    return JobBuilderGitHub.generate(inputDefinitionsDefault, inputs, needs, partialJobGenerator);
  };
};
