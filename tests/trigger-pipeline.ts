#!/usr/bin/env bun

const PROJECT_ID = mustEnv("PROJECT_ID");
const GITLAB_URL = mustEnv("GITLAB_URL");
const TOKEN = mustEnv("TOKEN");
const REF_NAME = mustEnv("REF_NAME");
const CI_COMPONENT_BRANCH = mustEnv("CI_COMPONENT_BRANCH");

const POLL_SECONDS = 10;
const TIMEOUT_SECS = 3600;

const apiBase = `${GITLAB_URL}/api/v4`;

type TriggerResponse = {
  id: number;
  status: string;
  web_url: string;
};

type PipelineResponse = {
  id: number;
  status:
    | "created"
    | "waiting_for_resource"
    | "preparing"
    | "pending"
    | "running"
    | "success"
    | "failed"
    | "canceled"
    | "skipped"
    | "manual";
  web_url: string;
};

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(2);
  }
  return v;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function gitlabJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `GitLab API request failed: ${res.status} ${res.statusText}\n${text}`,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Expected JSON but got:\n${text}`);
  }
}

async function triggerPipeline(): Promise<TriggerResponse> {
  const url = `${apiBase}/projects/${encodeURIComponent(PROJECT_ID)}/trigger/pipeline`;

  const form = new FormData();
  form.set("token", TOKEN);
  form.set("ref", REF_NAME);
  form.set("variables[CI_COMPONENT_BRANCH]", CI_COMPONENT_BRANCH);

  return await gitlabJson<TriggerResponse>(url, {
    method: "POST",
    body: form,
  });
}

async function getPipeline(pipelineId: number): Promise<PipelineResponse> {
  const url = `${apiBase}/projects/${encodeURIComponent(PROJECT_ID)}/pipelines/${pipelineId}`;
  return await gitlabJson<PipelineResponse>(url);
}

async function main() {
  const triggered = await triggerPipeline();

  console.log(`Triggered downstream pipeline: ${triggered.id}`);
  console.log(`URL: ${triggered.web_url}`);

  const start = Date.now();
  while (true) {
    const p = await getPipeline(triggered.id);

    const elapsed = Math.floor((Date.now() - start) / 1000);
    console.log(`Status: ${p.status} (t=${elapsed}s)`);

    if (p.status === "success") {
      console.log("Downstream pipeline succeeded.");
      return;
    }

    if (p.status === "failed" || p.status === "canceled" || p.status === "skipped") {
      throw new Error(`Downstream pipeline finished with status=${p.status}\n${p.web_url}`);
    }

    if (elapsed >= TIMEOUT_SECS) {
      throw new Error(`Timed out after ${TIMEOUT_SECS}s waiting for downstream pipeline\n${p.web_url}`);
    }

    await sleep(POLL_SECONDS * 1000);
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});