/**
 * Platform-Agnostic Workflow Job Definition
 *
 * Single source of truth for job definitions.
 * Each job can transform to GitLab CI or GitHub Actions via methods.
 */

import { JobTemplate } from "./ci";
import { GitHubJob } from "./github-actions";
import { GitLabTransformer } from "./gitlab-transformer";
import { GitHubTransformer } from "./github-transformer";

/**
 * Represents a single step in a job
 */
export interface WorkflowStep {
  name?: string;
  run?: string; // Shell command
  uses?: string; // Action/image reference
  with?: Record<string, unknown>; // Action inputs
  env?: Record<string, string>;
  shell?: string; // bash, sh, pwsh, etc. (null = no shell for containers)
}

/**
 * Represents a secret input
 */
export interface WorkflowSecret {
  description: string;
  required?: boolean;
}

/**
 * Platform-specific metadata stored in the job for transformations
 */
export interface PlatformMetadata {
  gitlab?: {
    stage?: string;
    pull_policy?: string;
    git_strategy?: string;
    [key: string]: unknown;
  };
  github?: {
    runsOn?: string | string[];
    container?: {
      image: string;
      credentials?: { username: string; password: string };
      env?: Record<string, string>;
      options?: string;
    };
    [key: string]: unknown;
  };
}

/**
 * Represents a single job that can be rendered to multiple CI platforms
 */
export interface WorkflowJob extends PlatformMetadata {
  name: string;
  description?: string;

  // Shared properties - can be simple string[] OR complex Step[]
  image?: string;
  scripts?: string[]; // Legacy: simple scripts
  steps?: WorkflowStep[]; // Modern: structured steps

  environment?: Record<string, string>;
  variables?: Record<string, string>;
  needs?: (string | { job: string; optional?: boolean })[];
  allowFailure?: boolean;
  tags?: string[];
  timeout?: number;

  // Secrets (GitHub Actions)
  secrets?: Record<string, WorkflowSecret>;

  // Transformation methods
  toGitLab(): JobTemplate;
  toGitHub(): GitHubJob;
}

/**
 * Helper to create a workflow job with both transformations
 */
export class BaseWorkflowJob implements WorkflowJob {
  name: string;
  description?: string;
  image?: string;
  scripts?: string[];
  steps?: WorkflowStep[];
  environment?: Record<string, string>;
  variables?: Record<string, string>;
  needs?: (string | { job: string; optional?: boolean })[];
  allowFailure?: boolean;
  tags?: string[];
  timeout?: number;
  secrets?: Record<string, WorkflowSecret>;
  gitlab?: PlatformMetadata["gitlab"];
  github?: PlatformMetadata["github"];

  constructor(job: Partial<WorkflowJob> & { name: string }) {
    this.name = job.name;
    this.description = job.description;
    this.image = job.image;
    this.scripts = job.scripts;
    this.steps = job.steps;
    this.environment = job.environment;
    this.variables = job.variables;
    this.needs = job.needs;
    this.allowFailure = job.allowFailure;
    this.tags = job.tags;
    this.timeout = job.timeout;
    this.secrets = job.secrets;
    this.gitlab = job.gitlab;
    this.github = job.github;
  }

  toGitLab(): JobTemplate {
    return GitLabTransformer.transform(this);
  }

  toGitHub(): GitHubJob {
    return GitHubTransformer.transform(this);
  }
}
