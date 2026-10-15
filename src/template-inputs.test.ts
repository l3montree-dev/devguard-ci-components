import { describe, expect, test } from "bun:test";
import { inputOverridesGitHub, inputOverridesGitLab, templates, templatesGitHub } from "./index";
import { mergeTemplateInputs } from "./lib/utils";
import { CIComponentGroupTemplateGitHub, CIComponentGroupTemplateGitLab, ConfigInputs } from "./lib/types";

type TemplateGroup = CIComponentGroupTemplateGitLab[string] | CIComponentGroupTemplateGitHub[string];

// Inputs a template group declares (what ends up in spec.inputs / workflow_call.inputs) and the inputs its
// jobs and includes reference. GitHub references are normalized to snake_case, they are kebab-cased on export.
const inputsOf = (group: TemplateGroup, overrides: ConfigInputs | undefined, referencePattern: RegExp) => {
  const declared = new Set(Object.keys(mergeTemplateInputs(group, overrides)));
  const source = JSON.stringify(group.map(({ inputs: _, ...entry }) => entry));
  const referenced = new Set([...source.matchAll(referencePattern)].map((m) => m[1].replace(/-/g, "_")));
  return { declared, referenced };
};

const difference = (a: Set<string>, b: Set<string>) => [...a].filter((x) => !b.has(x)).sort();

const platforms = [
  {
    name: "GitLab",
    groups: templates as Record<string, TemplateGroup>,
    overrides: inputOverridesGitLab,
    referencePattern: /\$\[\[\s*inputs\.([a-z0-9_]+)/g,
  },
  {
    name: "GitHub",
    groups: templatesGitHub as Record<string, TemplateGroup>,
    overrides: inputOverridesGitHub,
    // `$[[ inputs.x ]]` placeholders as well as `inputs.x` in `if:` conditions and `${{ }}` expressions
    referencePattern: /\binputs\.([a-z0-9_-]+)/g,
  },
];

for (const { name, groups, overrides, referencePattern } of platforms) {
  describe(`${name} templates`, () => {
    const entries = Object.entries(groups);

    test.each(entries)("%s: every referenced input is declared", (templateName, group) => {
      const { declared, referenced } = inputsOf(group, overrides[templateName], referencePattern);
      expect(difference(referenced, declared)).toEqual([]);
    });

    test.each(entries)("%s: every declared input is used", (templateName, group) => {
      const { declared, referenced } = inputsOf(group, overrides[templateName], referencePattern);
      expect(difference(declared, referenced)).toEqual([]);
    });
  });
}

// Orchestrations wire the build/scan/push registry flags from a single input (or pin them for Nix, which never
// pushes during the build). Exposing the per-job flags lets callers set them inconsistently and break the pipeline.
describe("orchestrations do not expose per-job registry flags", () => {
  const perJobRegistryFlags = ["push_image", "disable_job", "fetch_image_from_registry", "image_already_in_registry"];
  const orchestrations = [
    {
      name: "GitLab",
      groups: templates as Record<string, TemplateGroup>,
      overrides: inputOverridesGitLab,
      names: [
        "full",
        "container-lifecycle",
        "container-lifecycle-with-base-image-inspection",
        "container-lifecycle-nix",
        "build-nix-multiarch",
      ],
    },
    {
      name: "GitHub",
      groups: templatesGitHub as Record<string, TemplateGroup>,
      overrides: inputOverridesGitHub,
      names: ["full", "container-lifecycle", "container-lifecycle-nix", "full-nix"],
    },
  ];

  for (const { name, groups, overrides, names } of orchestrations) {
    test.each(names)(`${name} %s`, (templateName) => {
      const declared = Object.keys(mergeTemplateInputs(groups[templateName], overrides[templateName]));
      expect(declared.filter((input) => perJobRegistryFlags.includes(input))).toEqual([]);
    });
  }
});
