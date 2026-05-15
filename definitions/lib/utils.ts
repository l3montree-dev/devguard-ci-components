import {
  CIComponentGroupTemplate,
  JobWithSpec,
  IncludeWithSpec,
} from "./types";
import { stringify } from "yaml";
import { writeFile, mkdir } from "fs/promises";
import { ConfigInputs, GitLabCI } from "./ci";
import { WorkflowJob } from "./workflow-job";
import { GitHubWorkflowReusable, GitHubJob } from "./github-actions";
import { transformInputsToGitHub } from "./input-transformers";

function convertToGitlabCI(pipeline: GitLabCI): any {
  const { jobs, ...rest } = pipeline;
  return {
    ...rest,
    // merge jobs into the root object
    ...jobs,
  };
}

/**
 * Check if an object is a WorkflowJob instance (has transformation methods)
 */
function isWorkflowJob(job: unknown): job is WorkflowJob {
  return (
    job !== null &&
    typeof job === "object" &&
    typeof (job as any).toGitLab === "function" &&
    typeof (job as any).toGitHub === "function"
  );
}

export async function ExportGitHubActionsWorkflow(
  workflow: GitHubWorkflowReusable,
  filePath: string,
  header: string,
): Promise<void> {
  const yaml = stringify(workflow, {
    lineWidth: 0,
    aliasDuplicateObjects: false,
  });

  // Ensure output directory exists
  const dir = filePath.split("/").slice(0, -1).join("/");
  await mkdir(dir, { recursive: true });

  await writeFile(filePath, header + yaml);
  console.log(`Exported GitHub Actions workflow to ${filePath}`);
}

export async function ExportGitLabCI(
  pipeline: GitLabCI,
  filePath: string,
  header: string,
): Promise<void> {
  const { spec, ...rest } = pipeline;
  const specYaml = Object.keys(spec ?? {}).length
    ? stringify({ spec }, { lineWidth: 0, aliasDuplicateObjects: false }) +
      "---\n"
    : "";
  const yaml =
    specYaml +
    stringify(convertToGitlabCI(rest), {
      lineWidth: 0,
      aliasDuplicateObjects: false,
    });

  await writeFile(filePath, header + yaml);
  console.log(`Exported GitLab CI Template to ${filePath}`);
}

export async function GenerateMermaidDiagram(
  templates: CIComponentGroupTemplate,
): Promise<void> {
  const metaTemplates = Object.entries(templates).filter(
    ([templateName, template]) => template.length > 1,
  );
  const jobTemplates = Object.entries(templates).filter(
    ([templateName, template]) => template.length === 1,
  );

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
    const mapping = template
      .map((def) => `\n  ${templateName} --> ${templateSlug(def.name)}`)
      .join("");
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
  templates: (JobWithSpec | IncludeWithSpec)[],
  ignoreKeys: string[] = [],
): void {
  // Collect every occurrence of each input key: key → [{templateIdx, serialised default}]
  const keyOccurrences = new Map<
    string,
    Array<{ idx: number; serialisedDefault: string }>
  >();
  for (let i = 0; i < templates.length; i++) {
    for (const [key, inputDef] of Object.entries(templates[i].inputs)) {
      if (ignoreKeys.includes(key)) continue;

      if (!keyOccurrences.has(key)) keyOccurrences.set(key, []);
      keyOccurrences.get(key)!.push({
        idx: i,
        serialisedDefault: JSON.stringify(inputDef?.default),
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
        .map(
          (o) =>
            `template "${templates[o.idx].name}" (default: ${o.serialisedDefault})`,
        )
        .join("\n  - ");
      throw new Error(
        `\nConflict detected for input "${key}": multiple templates define different defaults. Please resolve manually by:\n1. renaming the input keys\n2. overriding the keys to be unique across templates\n3. add override in Export function\n\nOccurrences:\n  - ${occurencesStr}\n\nOverriding Keys: ${ignoreKeys.join(", ")}`,
      );
    }
  }
}

export async function ExportCIComponents(
  templates: CIComponentGroupTemplate,
  header: string,
  inputOverrides: { [key: string]: ConfigInputs } = {},
): Promise<void> {
  GenerateMermaidDiagram(templates);

  // check if output directories exist, if not create them
  if (!Bun.file("./templates/").exists()) await mkdir("./templates/");
  if (!Bun.file("./.github/workflows/").exists())
    await mkdir("./.github/workflows/", { recursive: true });

  for (const [templateName, template] of Object.entries(templates)) {
    // Check for conflicting input defaults before merging
    checkForInputConflicts(
      template,
      Object.keys(inputOverrides[templateName] ?? {}),
    );

    const mergedInputs = Object.assign(
      {},
      ...template.map((t) => t.inputs),
      inputOverrides[templateName] ?? {},
    );

    // Separate WorkflowJob instances from legacy jobs
    const jobDefs = template.filter((t): t is JobWithSpec => "job" in t);
    const workflowJobs = jobDefs.filter((def) => isWorkflowJob(def.job));
    const legacyJobs = jobDefs.filter((def) => !isWorkflowJob(def.job));

    // ─── GITLAB CI EXPORT ───────────────────────────────────
    const gitlabJobs: GitLabCI["jobs"] = {};

    // Add legacy jobs as-is
    for (const def of legacyJobs) {
      gitlabJobs[def.name] = def.job as any;
    }

    // Transform WorkflowJob instances to GitLab
    for (const def of workflowJobs) {
      const workflowJob = def.job as WorkflowJob;
      gitlabJobs[def.name] = workflowJob.toGitLab();
    }

    const pipeline: GitLabCI = {
      spec: {
        inputs: mergedInputs,
      },
      jobs: gitlabJobs,
      include: template
        .filter((t): t is IncludeWithSpec => "include" in t)
        .reduce(
          (acc, curr) => [...acc, curr.include],
          [] as IncludeWithSpec["include"][],
        ),
    };

    const filenameGitLab = `./templates/${templateName}.yml`;
    await ExportGitLabCI(pipeline, filenameGitLab, header);

    // ─── GITHUB ACTIONS EXPORT ──────────────────────────────
    // Only export if there are WorkflowJob instances
    if (workflowJobs.length > 0) {
      const githubJobs: Record<string, GitHubJob> = {};

      for (const def of workflowJobs) {
        const workflowJob = def.job as WorkflowJob;
        const jobId = templateSlug(def.name);
        githubJobs[jobId] = workflowJob.toGitHub();
      }

      const githubWorkflow: GitHubWorkflowReusable = {
        on: {
          workflow_call: {
            inputs: transformInputsToGitHub(mergedInputs),
          },
        },
        jobs: githubJobs,
      };

      const filenameGitHub = `./.github/workflows/${templateName}.yml`;
      await ExportGitHubActionsWorkflow(githubWorkflow, filenameGitHub, header);
    }
  }
}
