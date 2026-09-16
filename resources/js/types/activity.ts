export type ActivityValue =
    | string
    | number
    | boolean
    | null
    | ActivityValue[]
    | { [key: string]: ActivityValue };

export type ActivityChange = {
    field: string;
    old: ActivityValue;
    new: ActivityValue;
};

/** One read-only entry, as presented by ActivityController. */
export type Activity = {
    id: number;
    /** Free-form: created, updated, deleted, login, connected, … */
    action: string;
    /** Plain text, e.g. "Created user Jane Doe". */
    description: string | null;
    subject_type: string | null;
    subject_id: number | null;
    /** Snapshot label; still set after the subject was deleted. */
    subject_label: string | null;
    changes: ActivityChange[];
    values: { field: string; value: ActivityValue }[];
    metadata: Record<string, ActivityValue>;
    user_id: number | null;
    user: {
        id: number;
        name: string;
        email: string;
        avatar: string | null;
    } | null;
    created_at: string;
};

export type ActivityFilters = {
    search: string;
    action: string | null;
    user: number | null;
    from: string | null;
    to: string | null;
};
