import { describe, expect, test } from "bun:test";
import { templates } from "../templates";

/** Render a template entry with sentinel inputs so inputValues references become markers, not $[[ ]] placeholders. */
function render([_name, factory, inputDefs]: (typeof templates.gitlab)[number] | (typeof templates.github)[number]): unknown {
  const overrides = Object.fromEntries(Object.keys(inputDefs).map((k) => [k, `__INPUT_${k}__`]));
  return factory(overrides);
}

/** Collect all shell command strings from `run` (GitHub) and `script` (GitLab) keys */
function collectCommandStrings(obj: unknown): string[] {
  if (typeof obj === "string") return [];
  if (Array.isArray(obj)) return obj.flatMap(collectCommandStrings);
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([key, val]) => {
      if ((key === "run" || key === "script" || key === "args") && typeof val === "string") return [val];
      if (key === "script" && Array.isArray(val)) return val.filter((v): v is string => typeof v === "string");
      return collectCommandStrings(val);
    });
  }
  return [];
}

describe("--ref= always paired with --isTag=", () => {
  for (const [platform, list] of Object.entries(templates)) {
    describe(platform, () => {
      for (const entry of list) {
        const [name] = entry;
        test(name, () => {
          const commands = collectCommandStrings(render(entry));
          for (const cmd of commands) {
            if (cmd.includes("--ref=")) {
              expect(cmd, `${name}: --ref= without --isTag=\n\n${cmd}`).toContain("--isTag=");
            }
          }
        });
      }
    });
  }
});

describe("no hardcoded platform syntax in run/script", () => {
  describe("github: no ${{ }} in run commands (except secrets and matrix)", () => {
    for (const entry of templates.github) {
      const [name] = entry;
      test(name, () => {
        for (const cmd of collectCommandStrings(render(entry))) {
          const stripped = cmd
            .replace(/\$\{\{\s*secrets\.[^}]+\}\}/g, "")
            .replace(/\$\{\{\s*matrix\.[^}]+\}\}/g, "")
            .replace(/\$\{\{\s*env\.[^}]+\}\}/g, "");
          expect(stripped, `${name}: hardcoded \${{ }} found in run command\n\n${cmd}`).not.toMatch(/\$\{\{/);
        }
      });
    }
  });

  describe("gitlab: no $[[ ]] in script commands", () => {
    for (const entry of templates.gitlab) {
      const [name] = entry;
      test(name, () => {
        for (const cmd of collectCommandStrings(render(entry))) {
          expect(cmd, `${name}: unresolved \\$[[ ]] found in script\n\n${cmd}`).not.toMatch(/\$\[\[/);
        }
      });
    }
  });
});
