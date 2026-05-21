export const unresolvedInput = (varName: string): string =>
  `$[[ inputs.${varName} ]]`;

export const resolveInputValue = <T>(
  varName: string,
  value: T | undefined,
): T | string => value ?? unresolvedInput(varName);
