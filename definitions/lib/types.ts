import { ConfigInputs, IncludeItem, JobTemplate } from "./ci";
import { WorkflowJob } from "./workflow-job";

// Allow GitLab CI input placeholders ($[[ inputs.xxx ]]) for any field value
// OR allow new WorkflowJob instances with transformation methods
export type JobTemplateLike =
  | { [K in keyof JobTemplate]?: unknown }
  | WorkflowJob;

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
