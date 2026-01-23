// bun-mermaid-gitlab-ci-graph.ts
//
// Usage:
//   bun run bun-mermaid-gitlab-ci-graph.ts --root . --out graph.mmd
//   bun run bun-mermaid-gitlab-ci-graph.ts --root templates --remote-map remote-map.json
//
// What it does:
// - Scans all *.yml/*.yaml under --root
// - Parses GitLab CI YAML and extracts:
//   - includes (local/file/remote/template)
//   - jobs (top-level keys that look like jobs)
//   - job needs/dependencies
// - Builds a Mermaid graph:
//   - file -> included file edges
//   - file -> job edges
//   - job -> job edges (needs/dependencies), linked across includes where possible
//
// Notes:
// - GitLab CI YAML can contain anchors/extends/includes, and remote templates. This script
//   does not evaluate GitLab’s full config expansion; it builds a static graph from files.
// - Remote includes can be mapped to local files using --remote-map (recommended).

import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";

type IncludeItem =
  | string
  | {
      local?: string;
      file?: string | string[];
      remote?: string;
      template?: string;
      project?: string;
      ref?: string;
      inputs?: Record<string, unknown>;
    };

type ParsedFile = {
  filePath: string;      // absolute
  relPath: string;       // relative to root
  includes: string[];    // normalized include targets (local-ish keys)
  jobs: Record<string, JobInfo>;
};

type JobInfo = {
  name: string;
  needs: string[];
  dependencies: string[];
  extends: string[];
  stage?: string;
};

const RESERVED_TOPLEVEL = new Set([
  "stages",
  "types",
  "default",
  "variables",
  "workflow",
  "include",
  "image",
  "services",
  "before_script",
  "after_script",
  "cache",
  "pages",
  "schedules",
  "trigger",
  "rules",
  "interruptible",
  "retry",
  "timeout",
  "resource_group",
]);

//const root = "./"
const root = "./templates/"

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === ".git" || e.name === "node_modules") continue;
      out.push(...(await walk(p)));
    } else {
      const lower = e.name.toLowerCase();
      if (lower.endsWith(".yml") || lower.endsWith(".yaml")) out.push(p);
    }
  }
  return out;
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function normalizeIncludeTarget(
  inc: IncludeItem,
  relDir: string,
): string[] {
  // Returns "keys" that we can try to resolve to local files later.
  if (typeof inc === "string") {
    // GitLab supports include: "path" (treated as local)
    const p = path.normalize(path.join(relDir, inc));
    return [p];
  }
  if (inc?.local) {
    return [path.normalize(path.join(relDir, inc.local))];
  }
  if (inc?.file) {
    // include: { project, ref, file } or include: { file } (rare)
    // If project is present, we can't resolve unless remote-map provides it.
    // We’ll emit a descriptive key.
    const files = asArray(inc.file);
    const prefix = inc.project ? `project:${inc.project}@${inc.ref ?? "?"}:` : "";
    return files.map((f) => path.normalize(prefix + f));
  }
  if (inc?.remote) {
    return [`remote:${inc.remote}`];
  }
  if (inc?.template) return [`template:${inc.template}`];
  return ["include:unknown"];
}

function isLikelyJob(name: string, value: any): boolean {
  if (RESERVED_TOPLEVEL.has(name)) return false;
  if (!value || typeof value !== "object") return false;

  // Heuristic: job usually has at least script/rules/needs/trigger/extends/stage
  const keys = Object.keys(value);
  const jobish = ["script", "rules", "needs", "trigger", "extends", "stage", "when", "only", "except"];
  return keys.some((k) => jobish.includes(k));
}

function parseJob(name: string, obj: any): JobInfo {
  const needs = asArray(obj?.needs).map((n: any) => {
    if (typeof n === "string") return n;
    if (n && typeof n === "object" && typeof n.job === "string") return n.job;
    return String(n);
  });

  const deps = asArray(obj?.dependencies).map(String);
  const ext = asArray(obj?.extends).map(String);

  return {
    name,
    needs,
    dependencies: deps,
    extends: ext,
    stage: typeof obj?.stage === "string" ? obj.stage : undefined,
  };
}

async function parseYamlFile(absPath: string, root: string): Promise<ParsedFile> {
  const relPath = path.relative(root, absPath).replaceAll("\\", "/");
  const text = await Bun.file(absPath).text();
  let doc: any;
  try {
    doc = YAML.parse(text);
  } catch (e) {
    // If it fails to parse, still include it as a node.
    return { filePath: absPath, relPath, includes: [], jobs: {} };
  }

  const relDir = path.dirname(relPath);
  const includesRaw = doc?.include;
  const includeItems = asArray<IncludeItem>(includesRaw);
  const includes = includeItems.flatMap((inc) => normalizeIncludeTarget(inc, relDir === "." ? "" : relDir))
    .map((s) => s.replaceAll("\\", "/"));

  const jobs: Record<string, JobInfo> = {};
  if (doc && typeof doc === "object") {
    for (const [k, v] of Object.entries(doc)) {
      if (isLikelyJob(k, v)) jobs[k] = parseJob(k, v);
    }
  }

  return { filePath: absPath, relPath, includes, jobs };
}

function mermaidEscapeId(id: string) {
  // Mermaid node ids should be simple. We'll hash-ish by replacing non-word chars.
  return "n_" + id.replace(/[^a-zA-Z0-9_]/g, "_");
}

function mermaidLabel(s: string) {
  // Use brackets labels: ["..."]
  return s.replaceAll('"', '\\"');
}

async function main() {
  const { root, remoteMapPath, direction } = parseArgs();
  const files = await walk(root);
  const parsed = await Promise.all(files.map((f) => parseYamlFile(f, root)));

  // Index by relPath for include resolution.
  const byRel = new Map<string, ParsedFile>();
  for (const p of parsed) byRel.set(p.relPath, p);

  // Map job name -> possible full ids (file/job). Job names can collide; we'll keep all.
  const jobIndex = new Map<string, string[]>();
  for (const p of parsed) {
    for (const j of Object.keys(p.jobs)) {
      const full = `${p.relPath}::${j}`;
      const arr = jobIndex.get(j) ?? [];
      arr.push(full);
      jobIndex.set(j, arr);
    }
  }

  const lines: string[] = [];
  lines.push(`graph ${direction}`);

  // Node declarations
  for (const p of parsed) {
    const fileId = mermaidEscapeId(`file:${p.relPath}`);
    lines.push(`  ${fileId}["${mermaidLabel(p.relPath)}"]`);
    for (const jobName of Object.keys(p.jobs)) {
      const jobFull = `${p.relPath}::${jobName}`;
      const jobId = mermaidEscapeId(`job:${jobFull}`);
      lines.push(`  ${jobId}(["${mermaidLabel(jobName)}"])`);
      lines.push(`  ${fileId} -->|defines| ${jobId}`);
    }
  }

  // File include edges
  for (const p of parsed) {
    const fromId = mermaidEscapeId(`file:${p.relPath}`);
    for (const inc of p.includes) {
      // Try to resolve include to an existing local file node
      const resolved = byRel.has(inc) ? inc : (byRel.has(`${inc}.yml`) ? `${inc}.yml` : (byRel.has(`${inc}.yaml`) ? `${inc}.yaml` : ""));
      const toKey = resolved || inc;

      const toId = mermaidEscapeId(`file:${toKey}`);
      // declare target node if it didn't exist (remote/template/unresolved)
      if (!resolved) {
        lines.push(`  ${toId}["${mermaidLabel(toKey)}"]`);
      }
      lines.push(`  ${fromId} -->|includes| ${toId}`);
    }
  }

  // Job dependency edges (needs/dependencies/extends)
  for (const p of parsed) {
    for (const job of Object.values(p.jobs)) {
      const fromFull = `${p.relPath}::${job.name}`;
      const fromId = mermaidEscapeId(`job:${fromFull}`);

      const linkTo = (depName: string, label: string) => {
        const candidates = jobIndex.get(depName) ?? [];
        if (candidates.length === 1) {
          const toId = mermaidEscapeId(`job:${candidates[0]}`);
          lines.push(`  ${fromId} -->|${label}| ${toId}`);
        } else if (candidates.length > 1) {
          // ambiguous: link to a synthetic node
          const ambKey = `jobname:${depName}`;
          const ambId = mermaidEscapeId(ambKey);
          lines.push(`  ${ambId}(["${mermaidLabel(depName)}"])`);
          lines.push(`  ${fromId} -->|${label}| ${ambId}`);
        } else {
          // unknown dep: synthetic node
          const unkKey = `unknownjob:${depName}`;
          const unkId = mermaidEscapeId(unkKey);
          lines.push(`  ${unkId}(["${mermaidLabel(depName)}"])`);
          lines.push(`  ${fromId} -->|${label}| ${unkId}`);
        }
      };

      for (const n of job.needs) linkTo(n, "needs");
      for (const d of job.dependencies) linkTo(d, "dependencies");
      for (const e of job.extends) linkTo(e, "extends");
    }
  }

  // Slight styling
  lines.push("");
  lines.push("  classDef file fill:#eef,stroke:#88a,stroke-width:1px;");
  lines.push("  classDef job fill:#efe,stroke:#8a8,stroke-width:1px;");
  for (const p of parsed) {
    lines.push(`  class ${mermaidEscapeId(`file:${p.relPath}`)} file;`);
    for (const jobName of Object.keys(p.jobs)) {
      lines.push(`  class ${mermaidEscapeId(`job:${p.relPath}::${jobName}`)} job;`);
    }
  }

  const mermaid = lines.join("\n");

    await Bun.write("diagram.md", "```mermaid\n" + mermaid + "```");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});