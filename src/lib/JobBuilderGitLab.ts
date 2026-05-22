import { ConfigInputs, JobTemplate } from "@sleeyax/gitlab-ci-ts";
import { ArrayInputItem, GitLabJobWithSpec } from "./types";
import { resolveInputValue } from "./JobWithSpecBuilder";

export type ArrayInputItemGitLab = ArrayInputItem | JobTemplate["needs"]; // specific case for "needs" which can be an array of strings or objects with id and optional artifacts;

const input = <T extends string>(varName: T, data: { [key: string]: ArrayInputItemGitLab | undefined }) =>
  resolveInputValue(varName, data[varName]);

export type InputDefinitionsGitLab = { [key: string]: ConfigInputs[string] };

export type InputValuesGitLab<TInputDefinitions extends InputDefinitionsGitLab> = {
  [K in keyof TInputDefinitions]: TInputDefinitions[K] extends { type: "array" }
    ? ArrayInputItemGitLab | undefined
    : TInputDefinitions[K] extends { type: "boolean" }
      ? boolean | undefined
      : string | undefined;
};
export type ResolvedInputValuesGitLab<TInputDefinitions extends InputDefinitionsGitLab> = {
  [K in keyof TInputDefinitions]: TInputDefinitions[K] extends { type: "array" }
    ? ArrayInputItemGitLab
    : TInputDefinitions[K] extends { type: "boolean" }
      ? boolean | string
      : string;
};

export const defineInputsGitLab = <TInputDefinitions extends InputDefinitionsGitLab>(
  inputDefinitions: TInputDefinitions,
): TInputDefinitions => inputDefinitions;

export class JobBuilderGitLab {
  static generate<TInputDefinitions extends InputDefinitionsGitLab>(
    inputDefinitions: TInputDefinitions,
    inputs: Partial<InputValuesGitLab<TInputDefinitions>>,
    partialJobGenerator: (inputValues: ResolvedInputValuesGitLab<TInputDefinitions>) => Partial<GitLabJobWithSpec>,
  ) {
    const keys = Object.keys(inputDefinitions) as (keyof TInputDefinitions)[];

    const inputDefs = keys
      .filter((key) => inputs[key] === undefined)
      .reduce((acc, key) => ({ ...acc, [key]: inputDefinitions[key] }), {}) as ConfigInputs;
    const inputValues = keys.reduce(
      (acc, key) => ({
        ...acc,
        [key]: input(key as string, inputs as { [key: string]: ArrayInputItemGitLab | undefined }),
      }),
      {},
    ) as ResolvedInputValuesGitLab<TInputDefinitions>;

    return {
      inputs: inputDefs,
      ...partialJobGenerator(inputValues),
    } as GitLabJobWithSpec;
  }
}

export const defineJobGitLab = <TInputDefinitions extends InputDefinitionsGitLab>(
  inputDefinitions: TInputDefinitions,
  partialJobGenerator: (inputValues: ResolvedInputValuesGitLab<TInputDefinitions>) => Partial<GitLabJobWithSpec>,
) => {
  return (inputs: Partial<InputValuesGitLab<TInputDefinitions>>): GitLabJobWithSpec => {
    return JobBuilderGitLab.generate(inputDefinitions, inputs, partialJobGenerator);
  };
};
