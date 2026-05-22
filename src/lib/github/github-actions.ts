/**
 * GitHub Actions Workflow Types
 *
 * Clean interface over the auto-generated github-actions-schema.ts
 * Provides ergonomic types for building workflows programmatically.
 */

/**
 * GitHub Actions Job definition
 * Represents a single job in a workflow
 */
export interface GitHubJob {
  name?: string;
  description?: string;
  "runs-on": string | string[];
  environment?:
    | string
    | {
        name: string;
        url?: string;
      };
  container?: {
    image: string;
    credentials?: {
      username: string;
      password: string;
    };
    env?: Record<string, string>;
    ports?: number[];
    volumes?: string[];
    options?: string;
  };
  services?: Record<
    string,
    {
      image: string;
      credentials?: {
        username: string;
        password: string;
      };
      env?: Record<string, string>;
      ports?: number[];
      volumes?: string[];
      options?: string;
    }
  >;
  permissions?: Record<string, "read" | "write" | "none"> | "read-all" | "write-all";
  environment_variables?: Record<string, string>;
  env?: Record<string, string>;
  concurrency?:
    | string
    | {
        group: string;
        "cancel-in-progress"?: boolean;
      };
  outputs?: Record<
    string,
    {
      description: string;
      value: string;
    }
  >;
  env_vars?: Record<string, string>;
  needs?: string | string[];
  if?: string;
  steps: GitHubStep[];
  strategy?: {
    matrix: Record<string, unknown>;
    "fail-fast"?: boolean;
    "max-parallel"?: number;
  };
  "continue-on-error"?: boolean;
  timeout_minutes?: number;
}

/**
 * GitHub Actions Step definition
 * Represents a single step within a job
 */
export interface GitHubStep {
  id?: string;
  name?: string;
  env?: Record<string, string>;
  working_directory?: string;
  "working-directory"?: string;
  if?: string;
  uses?: string;
  run?: string;
  shell?: string;
  "continue-on-error"?: boolean;
  timeout_minutes?: number;
  with?: Record<string, unknown>;
}

/**
 * GitHub Actions Workflow Input (for workflow_call trigger)
 */
export interface WorkflowInput {
  description: string;
  deprecationMessage?: string;
  required?: boolean;
  default?: string;
  type?: "string" | "choice" | "boolean" | "environment" | "number";
  options?: string[];
}

/**
 * GitHub Actions complete workflow
 * Exported as reusable workflow
 */
export interface GitHubWorkflowReusable {
  name?: string;
  on: {
    workflow_call: {
      inputs?: Record<string, WorkflowInput>;
      outputs?: Record<
        string,
        {
          description: string;
          value: string;
        }
      >;
      secrets?: Record<
        string,
        {
          description: string;
          required?: boolean;
        }
      >;
    };
  };
  env?: Record<string, string>;
  concurrency?:
    | string
    | {
        group: string;
        "cancel-in-progress"?: boolean;
      };
  defaults?: {
    run?: {
      shell?: string;
      "working-directory"?: string;
    };
  };
  permissions?: Record<string, "read" | "write" | "none"> | "read-all" | "write-all";
  jobs: Record<string, GitHubJob>;
}
