/**
 * GitHub Actions Transformer
 *
 * Transforms platform-agnostic WorkflowJob to GitHub Actions job schema
 */

import type { WorkflowJob, WorkflowStep } from "./workflow-job";
import { GitHubJob, GitHubStep } from "./github-actions";
import { transformVariableSyntax } from "./input-transformers";

export class GitHubTransformer {
  static transform(job: WorkflowJob): GitHubJob {
    // Convert to steps - use existing steps or convert scripts
    let steps: GitHubStep[];

    if (job.steps && job.steps.length > 0) {
      // Use structured steps
      steps = job.steps.map((step) => this.transformStep(step));
    } else if (job.scripts && job.scripts.length > 0) {
      // Convert scripts to steps
      steps = job.scripts.map((script) => ({
        run: transformVariableSyntax(script),
      }));
    } else {
      steps = [];
    }

    const githubJob: GitHubJob = {
      name: job.description || job.name,
      "runs-on": job.github?.runsOn || "ubuntu-latest",
      steps,
    };

    // Add container if image is specified (without shell for direct command execution)
    if (job.image) {
      githubJob.container = {
        image: job.image,
        ...job.github?.container,
      };
    }

    // Add environment variables
    if (job.variables || job.environment) {
      githubJob.env = {
        ...job.environment,
        ...job.variables,
      };
    }

    // Handle needs (job dependencies)
    if (job.needs && job.needs.length > 0) {
      // Convert needs format: string | { job, optional } → string[]
      githubJob.needs = job.needs.map((need) => {
        if (typeof need === "string") {
          return need;
        }
        // GitHub doesn't have optional in needs; it's handled with if conditions
        // For now, just use the job name
        return need.job;
      });
    }

    // Handle timeout (GitHub uses minutes)
    if (job.timeout) {
      githubJob.timeout_minutes = job.timeout;
    }

    // Handle continue on error
    if (job.allowFailure) {
      githubJob["continue-on-error"] = true;
    }

    // Clean up undefined values
    Object.keys(githubJob).forEach(
      (key) =>
        githubJob[key as keyof GitHubJob] === undefined &&
        delete githubJob[key as keyof GitHubJob],
    );

    return githubJob;
  }

  /**
   * Transform a single workflow step to GitHub Actions step
   */
  private static transformStep(step: WorkflowStep): GitHubStep {
    const githubStep: GitHubStep = {
      name: step.name,
      id: step.name?.toLowerCase().replace(/\s+/g, "-"),
    };

    if (step.run) {
      // Shell command
      githubStep.run = transformVariableSyntax(step.run);
      if (step.shell) {
        githubStep.shell = step.shell;
      }
    } else if (step.uses) {
      // Action/Docker image
      githubStep.uses = step.uses;
      if (step.with) {
        githubStep.with = step.with;
      }
    }

    if (step.env) {
      githubStep.env = step.env;
    }

    // Clean up undefined
    Object.keys(githubStep).forEach(
      (key) =>
        githubStep[key as keyof GitHubStep] === undefined &&
        delete githubStep[key as keyof GitHubStep],
    );

    return githubStep;
  }
}
