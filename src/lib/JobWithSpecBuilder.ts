import { ConfigInputs, JobTemplate } from "@sleeyax/gitlab-ci-ts";
import { JobWithSpec } from "./types";

export type ArrayInputItem = string // required for regular input array
| { [id: string]: string }[] // required for input arrays with objects
| JobTemplate['needs'] // specific case for "needs" which can be an array of strings or objects with id and optional artifacts;


export const unresolvedInput = (varName: string): string =>
  `$[[ inputs.${varName} ]]`;

export const resolveInputValue = <T>(
  varName: string,
  value: T | undefined,
): T | string => value ?? unresolvedInput(varName);

const input = <T extends string>(
  varName: T,
  data: { [key: string]: ArrayInputItem | undefined },
) => resolveInputValue(varName, data[varName]);



export type InputDefinitions = { [key: string]: ConfigInputs[string] };

export type InputValues<TInputDefinitions extends InputDefinitions> = {
  [K in keyof TInputDefinitions]: TInputDefinitions[K] extends { type: "array" }
    ? ArrayInputItem | undefined
    : TInputDefinitions[K] extends { type: "boolean" }
      ? boolean | undefined
      : string | undefined;
};
export type ResolvedInputValues<TInputDefinitions extends InputDefinitions> = {
  [K in keyof TInputDefinitions]: TInputDefinitions[K] extends { type: "array" }
    ? ArrayInputItem
    : TInputDefinitions[K] extends { type: "boolean" }
      ? boolean | string
      : string;
};

export const defineInput = <T extends ConfigInputs[string]>(inputDefinition: T): T => inputDefinition;
export const defineInputs = <TInputDefinitions extends InputDefinitions>(inputDefinitions: TInputDefinitions): TInputDefinitions => inputDefinitions;

export class JobWithSpecBuilder {

    static generate<TInputDefinitions extends InputDefinitions>(
        inputDefinitions: TInputDefinitions,
        inputs: Partial<InputValues<TInputDefinitions>>,
        partialJobGenerator: (inputValues: ResolvedInputValues<TInputDefinitions>) => Partial<JobWithSpec>
    ) {
        const keys = Object.keys(inputDefinitions) as (keyof TInputDefinitions)[];

        const inputDefs = keys
            .filter((key) => inputs[key] === undefined)
            .reduce((acc, key) => ({ ...acc, [key]: inputDefinitions[key] }), {}) as ConfigInputs;
        const inputValues = keys
            .reduce((acc, key) => ({ ...acc, [key]: input(key as string, inputs as { [key: string]: ArrayInputItem | undefined }) }), {}) as ResolvedInputValues<TInputDefinitions>;

        return {
            inputs: inputDefs,
            ...partialJobGenerator(inputValues),
        } as JobWithSpec;
    }
}

export const defineJob = <TInputDefinitions extends InputDefinitions>(
    inputDefinitions: TInputDefinitions,
    partialJobGenerator: (inputValues: ResolvedInputValues<TInputDefinitions>) => Partial<JobWithSpec>
) => {
    return (inputs: Partial<InputValues<TInputDefinitions>>): JobWithSpec => {
        return JobWithSpecBuilder.generate(inputDefinitions, inputs, partialJobGenerator);
    };
};