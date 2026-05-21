import { ConfigInputs, IncludeItem, JobTemplate } from "@sleeyax/gitlab-ci-ts";
export type { ConfigInputs } from "@sleeyax/gitlab-ci-ts";

// Allow GitLab CI input placeholders ($[[ inputs.xxx ]]) for any field value
export type JobTemplateLike = { [K in keyof JobTemplate]?: unknown };

export type JobWithSpec = EntryWithSpec & {
  job: JobTemplateLike;
  secrets?: string[];
};

export type IncludeWithSpec = EntryWithSpec & {
  include: IncludeItem;
};

export type EntryWithSpec = {
  name: string;
  inputs: ConfigInputs;
  platforms?: ("gitlab" | "github")[];
};

export type CIComponentGroupTemplate = {
  [key: string]: (JobWithSpec | IncludeWithSpec)[];
};
