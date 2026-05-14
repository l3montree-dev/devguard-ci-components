import { ConfigInputs, IncludeItem, JobTemplate } from "./ci";

export type JobWithSpec = EntryWithSpec & {
    job: JobTemplate,
    secrets?: string[],
}

export type IncludeWithSpec = EntryWithSpec & {
    include: IncludeItem;
};

export type EntryWithSpec = {
    name: string;
    inputs: ConfigInputs;
    platforms?: ('gitlab' | 'github')[]
}

export type CIComponentGroupTemplate = {
    [key: string]: (JobWithSpec | IncludeWithSpec)[];
}
