import type { ReactNode } from 'react';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';

export type DataTableColumn<T> = {
    /** Stable identifier, unique within the table. */
    id: string;
    header: ReactNode;
    cell: (row: T) => ReactNode;
    /** Hide the column on screens narrower than this breakpoint. */
    visibleFrom?: Breakpoint;
    align?: 'left' | 'right';
    /** Let long content wrap instead of staying on one line. */
    wrap?: boolean;
    /**
     * Makes the header sortable. Sent as ?sort={sortKey}; the controller must
     * list the same key in its SortOrder::fromRequest() map.
     */
    sortKey?: string;
    className?: string;
};

export type DataTableFilterOption = {
    value: string;
    label: string;
};

/**
 * A single-choice filter. By default it lives in the query string as
 * ?{key}=value (server-side). Pass onChange to filter in the browser instead.
 */
export type DataTableFilter = {
    key: string;
    label: string;
    /** Current value; null means "all". */
    value: string | null;
    options: DataTableFilterOption[];
    /** Label of the "no filter" choice, e.g. "All roles". */
    allLabel?: string;
    /** Local (client-side) filter: called instead of updating the URL. */
    onChange?: (value: string | null) => void;
};

export type DataTableSearch = {
    /** Current value. */
    value: string;
    placeholder?: string;
    /** Local (client-side) search: called instead of updating the URL. */
    onChange?: (value: string) => void;
};

export type DataTableTab = {
    value: string;
    label: string;
};

export type DataTableSortDirection = 'asc' | 'desc';

/** The effective sort returned by the server (SortOrder::toArray()). */
export type DataTableSort = {
    column: string;
    direction: DataTableSortDirection;
};
