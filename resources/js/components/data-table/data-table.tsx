import {
    ArrowDown01Icon,
    ArrowUp01Icon,
    ArrowUpDownIcon,
    Search01Icon,
} from '@hugeicons/core-free-icons';
import type { ReactNode } from 'react';
import { SimplePagination } from '@/components/simple-pagination';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useQueryFilters } from '@/hooks/use-query-filters';
import { cn } from '@/lib/utils';
import type { Paginator } from '@/types';
import { DataTableFilters } from './data-table-filters';
import type {
    DataTableColumn,
    DataTableFilter,
    DataTableSearch,
    DataTableSort,
} from './types';

export type {
    DataTableColumn,
    DataTableFilter,
    DataTableFilterOption,
    DataTableSearch,
    DataTableSort,
    DataTableSortDirection,
} from './types';

type Props<T> = {
    title: string;
    description?: string;
    /** URL the search and filters are applied to (usually the current page). */
    url: string;
    paginator: Paginator<T>;
    columns: DataTableColumn<T>[];
    rowKey: (row: T) => string | number;
    search?: DataTableSearch;
    filters?: DataTableFilter[];
    /** Current sort from the server; enables sortable column headers. */
    sort?: DataTableSort;
    /** Extra controls on the right of the header, e.g. a "Create" button. */
    actions?: ReactNode;
    /** Plural noun for the footer, e.g. "users". */
    noun?: string;
    emptyMessage?: string;
    emptyFilteredMessage?: string;
};

const visibleFromClass = {
    sm: 'hidden sm:table-cell',
    md: 'hidden md:table-cell',
    lg: 'hidden lg:table-cell',
    xl: 'hidden xl:table-cell',
} as const;

/**
 * Server-paginated table with a title, search, filters and pagination in one
 * card. Search and filters live in the query string (?search=…&role=…), so the
 * controller only needs to read them and paginate with withQueryString().
 */
export function DataTable<T>({
    title,
    description,
    url,
    paginator,
    columns,
    rowKey,
    search,
    filters = [],
    sort,
    actions,
    noun = 'results',
    emptyMessage = 'Nothing here yet.',
    emptyFilteredMessage = 'No results match your search or filters.',
}: Props<T>) {
    const {
        filters: current,
        setFilter,
        setFilters,
    } = useQueryFilters<Record<string, string | null>>(url, {
        ...(search ? { search: search.value } : {}),
        ...(sort ? { sort: sort.column, direction: sort.direction } : {}),
        ...Object.fromEntries(
            filters.map((filter) => [filter.key, filter.value]),
        ),
    });

    const toggleSort = (sortKey: string) => {
        const direction =
            current.sort === sortKey && current.direction === 'asc'
                ? 'desc'
                : 'asc';

        setFilters({ sort: sortKey, direction }, { immediate: true });
    };

    const isFiltered =
        Boolean(search?.value) || filters.some((filter) => filter.value);

    return (
        <div className="bg-card overflow-hidden rounded-xl border">
            <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-0.5">
                    <h2 className="text-base font-semibold">{title}</h2>
                    {description && (
                        <p className="text-muted-foreground text-sm">
                            {description}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {search && (
                        <div className="relative flex-1 sm:w-64 sm:flex-none">
                            <Icon
                                iconNode={Search01Icon}
                                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                            />
                            <Input
                                type="search"
                                value={current.search ?? ''}
                                onChange={(event) =>
                                    setFilter('search', event.target.value)
                                }
                                placeholder={search.placeholder ?? 'Search'}
                                aria-label={search.placeholder ?? 'Search'}
                                className="pl-9"
                            />
                        </div>
                    )}
                    {filters.length > 0 && (
                        <DataTableFilters
                            filters={filters}
                            values={current}
                            onChange={setFilter}
                        />
                    )}
                    {actions}
                </div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        {columns.map((column) => (
                            <TableHead
                                key={column.id}
                                aria-sort={
                                    column.sortKey &&
                                    current.sort === column.sortKey
                                        ? current.direction === 'desc'
                                            ? 'descending'
                                            : 'ascending'
                                        : undefined
                                }
                                className={cn(
                                    'px-4',
                                    column.visibleFrom &&
                                        visibleFromClass[column.visibleFrom],
                                    column.align === 'right' && 'text-right',
                                    column.className,
                                )}
                            >
                                {sort && column.sortKey ? (
                                    <SortableHeader
                                        active={current.sort === column.sortKey}
                                        direction={
                                            current.direction === 'desc'
                                                ? 'desc'
                                                : 'asc'
                                        }
                                        onClick={() =>
                                            toggleSort(column.sortKey!)
                                        }
                                    >
                                        {column.header}
                                    </SortableHeader>
                                ) : (
                                    column.header
                                )}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginator.data.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell
                                colSpan={columns.length}
                                className="text-muted-foreground px-4 py-16 text-center"
                            >
                                {isFiltered
                                    ? emptyFilteredMessage
                                    : emptyMessage}
                            </TableCell>
                        </TableRow>
                    ) : (
                        paginator.data.map((row) => (
                            <TableRow key={rowKey(row)}>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        className={cn(
                                            'px-4',
                                            column.visibleFrom &&
                                                visibleFromClass[
                                                    column.visibleFrom
                                                ],
                                            column.align === 'right' &&
                                                'text-right',
                                            column.wrap && 'whitespace-normal',
                                            column.className,
                                        )}
                                    >
                                        {column.cell(row)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {paginator.total > 0 && (
                <div className="border-t px-4 py-3">
                    <SimplePagination paginator={paginator} noun={noun} />
                </div>
            )}
        </div>
    );
}

function SortableHeader({
    active,
    direction,
    onClick,
    children,
}: {
    active: boolean;
    direction: 'asc' | 'desc';
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'hover:text-foreground focus-visible:ring-ring -mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors focus-visible:ring-2 focus-visible:outline-none',
                active && 'text-foreground',
            )}
        >
            {children}
            <Icon
                iconNode={
                    !active
                        ? ArrowUpDownIcon
                        : direction === 'asc'
                          ? ArrowUp01Icon
                          : ArrowDown01Icon
                }
                className={cn('size-3.5', !active && 'opacity-40')}
                aria-hidden
            />
        </button>
    );
}
