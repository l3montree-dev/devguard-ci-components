import { ConfigInputs, GitLabCI, transform as transformToGitLab } from "@sleeyax/gitlab-ci-ts";
import {
  GitLabJobWithSpec,
  IncludeWithSpec,
  GitHubWorkflow,
  CIComponentGroupTemplateGitLab,
  CIComponentGroupTemplateGitHub,
} from "./types";
import { stringify } from "yaml";
import { writeFile, mkdir } from "fs/promises";
import { GitHubWorkflowReusable, GitHubJob } from "./github/github-actions";
import {
  transformInputsToGitHub,
  transformObjectVariableSyntax,
  transformVariableSyntax,
} from "./transformer/input-transformers";

export type StringifyOptions = Extract<NonNullable<Parameters<typeof stringify>[2]>, object>;

function stringifyData(data: any, options: StringifyOptions = {}): string {
  return stringify(data, { lineWidth: 0, aliasDuplicateObjects: false, ...options });
}

/**
 * GITHUB ACTIONS
 */

async function ExportGitHubActionsWorkflow(
  workflow: GitHubWorkflowReusable,
  filePath: string,
  header: string,
): Promise<void> {
  const yaml = stringifyData(workflow);

  // Ensure output directory exists
  const dir = filePath.split("/").slice(0, -1).join("/");
  await mkdir(dir, { recursive: true });

  await writeFile(filePath, header + yaml);
  console.log(`Exported GitHub Actions workflow to ${filePath}`);
}

/**
 * GITLAB CI
 */

async function ExportGitLabCI(pipeline: GitLabCI, filePath: string, header: string): Promise<void> {
  const yaml = transformToGitLab(pipeline);
  await writeFile(filePath, header + yaml);
  console.log(`Exported GitLab CI Template to ${filePath}`);
}

/**
 * OTHER
 */

async function GenerateMermaidDiagram(templates: CIComponentGroupTemplateGitLab): Promise<void> {
  const metaTemplates = Object.entries(templates).filter(([templateName, template]) => template.length > 1);
  const jobTemplates = Object.entries(templates).filter(([templateName, template]) => template.length === 1);

  const mermaid = `---
config:
  look: neo
  layout: elk
---
flowchart LR
  subgraph Jobs
  ${[...new Set(jobTemplates.map(([_, template]) => template.map((def) => templateSlug(def.name))))].join("\n  ")}
  end
${metaTemplates
  .map(([templateName, template]) => {
    const mapping = template.map((def) => `\n  ${templateName} --> ${templateSlug(def.name)}`).join("");
    return `  ${mapping}`;
  })
  .join("\n")}`;
  console.log("Mermaid diagram of templates and their jobs:");
  console.log(mermaid);
}

/** Derive a safe snake_case prefix from a template name.
 *  "devguard:build_oci_image$[[ inputs.job_suffix ]]" → "build_oci_image"
 *  "jobB:$[[ inputs.other ]]"                        → "jobB"
 *  "jobA"                                             → "jobA"
 */
function templateSlug(name: string): string {
  const slug = name
    .replace(/^[^:]+:/, "") // drop "devguard:" / "namespace:" prefix
    .replace(/\$\[\[.*?\]\]/g, "") // drop $[[ … ]] interpolations
    .replace(/[^a-zA-Z0-9]+/g, "_") // non-alphanumeric → underscore
    .replace(/^_+|_+$/g, ""); // trim leading/trailing underscores

  // Fallback: if the whole useful part was inside an interpolation (e.g.
  // "jobB:$[[ inputs.other ]]"), use the segment before the first ":" or "$".
  if (!slug) {
    return name
      .split(/[:$]/)[0]
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }
  return slug;
}

/**
 * Detect conflicting input defaults across templates in a group.
 */
function checkForInputConflicts(
  templates: (GitHubWorkflow | GitLabJobWithSpec | IncludeWithSpec)[],
  ignoreKeys: string[] = [],
): void {
  // Collect every occurrence of each input key: key → [{templateIdx, serialised default}]
  const keyOccurrences = new Map<string, Array<{ idx: number; serialisedDefault: string }>>();
  for (let i = 0; i < templates.length; i++) {
    for (const [key, inputDef] of Object.entries(templates[i].inputs)) {
      if (ignoreKeys.includes(key)) continue;

      if (!keyOccurrences.has(key)) keyOccurrences.set(key, []);
      keyOccurrences.get(key)!.push({
        idx: i,
        serialisedDefault: JSON.stringify((inputDef as any)?.default),
      });
    }
  }

  // For each key: if any two templates disagree on the default → throw error
  for (const [key, occurrences] of keyOccurrences) {
    if (occurrences.length <= 1) continue;

    const first = occurrences[0].serialisedDefault;
    const allSame = occurrences.every((o) => o.serialisedDefault === first);
    if (!allSame) {
      const occurencesStr = occurrences
        .map((o) => `template "${templates[o.idx].name}" (default: ${o.serialisedDefault})`)
        .join("\n  - ");
      throw new Error(
        `\nConflict detected for input "${key}": multiple templates define different defaults. Please resolve manually by:\n1. renaming the input keys\n2. overriding the keys to be unique across templates\n3. add override in Export function\n\nOccurrences:\n  - ${occurencesStr}\n\nOverriding Keys: ${ignoreKeys.join(", ")}`,
      );
    }
  }
}

export async function ExportCIComponentsGitLab(
  templates: CIComponentGroupTemplateGitLab,
  header: string,
  inputOverrides: { [key: string]: ConfigInputs } = {},
): Promise<void> {
  GenerateMermaidDiagram(templates);

  // Ensure output directories exist
  await mkdir("./templates/", { recursive: true });

  for (const [templateName, template] of Object.entries(templates)) {
    // Check for conflicting input defaults before merging
    checkForInputConflicts(template, Object.keys(inputOverrides[templateName] ?? {}));

    const mergedInputs = Object.assign({}, ...template.map((t) => t.inputs), inputOverrides[templateName] ?? {});

    // find all entries with Jobs
    const jobDefs = template.filter((t): t is GitLabJobWithSpec | GitHubWorkflow => "job" in t);

    const isWorkflowJob = (job: any): job is GitHubJob =>
      typeof job === "object" && job !== null && ("toGitHub" in job || "runs-on" in job); // TODO.. rework this logic once Tims PoC is fully removed

    // ─── GITLAB CI EXPORT ───────────────────────────────────

    const pipeline: GitLabCI = {
      spec: {
        inputs: mergedInputs,
      },
      jobs: jobDefs.reduce((acc, def) => ({ ...acc, [def.name]: def.job }), {}),
      include: template
        .filter((t): t is IncludeWithSpec => "include" in t)
        .reduce((acc, curr) => [...acc, curr.include], [] as IncludeWithSpec["include"][]),
    };

    const filenameGitLab = `./templates/${templateName}.yml`;
    await ExportGitLabCI(pipeline, filenameGitLab, header);
  }
}

export async function ExportCIComponentsGitHub(
  templates: CIComponentGroupTemplateGitHub,
  header: string,
  inputOverrides: { [key: string]: ConfigInputs } = {},
): Promise<void> {
  // GenerateMermaidDiagram(templates);

  // Ensure output directories exist
  await mkdir("./github/", { recursive: true });
  await mkdir("./.github/workflows/", { recursive: true });

  for (const [templateName, template] of Object.entries(templates)) {
    // Check for conflicting input defaults before merging
    checkForInputConflicts(template, Object.keys(inputOverrides[templateName] ?? {}));

    const mergedInputs = Object.assign({}, ...template.map((t) => t.inputs), inputOverrides[templateName] ?? {});

    // find all entries with Jobs
    const jobDefs = template.filter((t): t is GitHubWorkflow => "job" in t);

    // ─── GITHUB ACTIONS EXPORT ──────────────────────────────

    const githubWorkflow: GitHubWorkflowReusable = {
      on: {
        workflow_call: {
          inputs: transformInputsToGitHub(mergedInputs),
          secrets: jobDefs.filter((job) => job.secrets).reduce((acc, def) => ({ ...acc, ...def.secrets }), {}),
        },
      },
      jobs: jobDefs.reduce(
        (acc, def) => ({ ...acc, [transformVariableSyntax(def.name)]: transformObjectVariableSyntax(def.job) }),
        {},
      ),
    };

    const filenameGitHub = `./.github/workflows/${templateName}.yml`;
    await ExportGitHubActionsWorkflow(githubWorkflow, filenameGitHub, header);
    console.log(`Exported template "${templateName}" to GitHub Actions: ${filenameGitHub}`);
  }
}
