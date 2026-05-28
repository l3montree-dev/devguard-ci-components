import { ConfigInputs, IncludeItem, JobTemplate } from "@sleeyax/gitlab-ci-ts";
import { GitHubJob } from "./github/github-actions";
export type { ConfigInputs } from "@sleeyax/gitlab-ci-ts";

// Allow GitLab CI input placeholders ($[[ inputs.xxx ]]) for any field value
export type JobTemplateLike = { [K in keyof JobTemplate]?: unknown };

export type GitHubWorkflow = EntryWithSpec & {
  job: GitHubJob;
  secrets?: {
    [k: string]: {
      /**
       * A string description of the secret parameter.
       */
      description?: string;
      /**
       * A boolean specifying whether the secret must be supplied.
       */
      required?: boolean;
    };
  };
};

export type GitLabJobWithSpec = EntryWithSpec & {
  job: JobTemplateLike;
  // secrets?: string[],
};

export type IncludeWithSpec = EntryWithSpec & {
  include: IncludeItem;
};

export type EntryWithSpec = {
  name: string;
  inputs: ConfigInputs;
  platforms?: ("gitlab" | "github")[];
};

export type CIComponentGroupTemplateGitLab = {
  [key: string]: (GitLabJobWithSpec | IncludeWithSpec)[];
};

export type CIComponentGroupTemplateGitHub = {
  [key: string]: (GitHubWorkflow | IncludeWithSpec)[];
};

export type ArrayInputItem =
  | string // required for regular input array
  | { [id: string]: string }[]; // required for input arrays with objects
