/**
 * GitLab CI Transformer
 *
 * Transforms platform-agnostic WorkflowJob to GitLab CI job schema
 */

import type { WorkflowJob } from "../workflow-job";
import { JobTemplate } from "@sleeyax/gitlab-ci-ts";

export class GitLabTransformer {
  static transform(job: WorkflowJob): JobTemplate {
    const gitlabJob: JobTemplate = {
      tags: job.tags,
      script: job.scripts,
      allow_failure: job.allowFailure,
      needs: job.needs,
      timeout: job.timeout ? `${job.timeout}m` : undefined,
    };

    // Add image if specified
    if (job.image) {
      gitlabJob.image = {
        name: job.image,
        pull_policy: job.gitlab?.pull_policy as any,
      };
    }

    // Add GitLab-specific stage and git_strategy
    if (job.gitlab?.stage) {
      gitlabJob.stage = job.gitlab.stage;
    }

    if (job.gitlab?.git_strategy) {
      gitlabJob.variables = {
        ...gitlabJob.variables,
        GIT_STRATEGY: job.gitlab.git_strategy,
      };
    }

    // Merge user-provided variables
    if (job.variables) {
      gitlabJob.variables = {
        ...gitlabJob.variables,
        ...job.variables,
      };
    }

    // Add environment if specified (skip if not provided)
    if (job.environment && Object.keys(job.environment).length > 0) {
      // Environment in GitLab can be a string or object, we have a string record
      // Skip for now as it needs proper mapping
      // gitlabJob.environment = job.environment;
    }

    // Clean up undefined values
    Object.keys(gitlabJob).forEach(
      (key) =>
        gitlabJob[key as keyof JobTemplate] === undefined &&
        delete gitlabJob[key as keyof JobTemplate],
    );

    return gitlabJob;
  }
}
