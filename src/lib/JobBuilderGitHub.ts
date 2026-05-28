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
      ? boolean | undefined
      : string | undefined;
};
export type ResolvedInputValuesGitHub<TInputDefinitions extends InputDefinitionsGitHub> = {
  [K in keyof TInputDefinitions]: TInputDefinitions[K] extends { type: "array" }
    ? ArrayInputItem
    : TInputDefinitions[K] extends { type: "boolean" }
      ? boolean | string
      : string;
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
