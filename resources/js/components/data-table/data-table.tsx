import {
    ArrowDown01Icon,
    ArrowUp01Icon,
    ArrowUpDownIcon,
    Search01Icon,
} from '@hugeicons/core-free-icons';
import { Fragment, type ReactNode } from 'react';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useQueryFilters } from '@/hooks/use-query-filters';
import { cn } from '@/lib/utils';
import type { Paginator } from '@/types';
import { DataTableFilters } from './data-table-filters';
import type {
    DataTableColumn,
    DataTableFilter,
    DataTableSearch,
    DataTableSort,
    DataTableTab,
} from './types';

export type {
    DataTableColumn,
    DataTableFilter,
    DataTableFilterOption,
    DataTableSearch,
    DataTableSort,
    DataTableSortDirection,
    DataTableTab,
} from './types';

type Props<T> = {
    title: string;
    description?: string;
    columns: DataTableColumn<T>[];
    rowKey: (row: T) => string | number;
    /** Server data: paginated, with search/filters/sort in the query string. */
    paginator?: Paginator<T>;
    /** Local data: rendered as-is (filter it yourself), no pagination. */
    rows?: T[];
    /** URL server-side search, filters and sort apply to (paginator mode). */
    url?: string;
    search?: DataTableSearch;
    filters?: DataTableFilter[];
    /** Current sort from the server; enables sortable column headers. */
    sort?: DataTableSort;
    /** View switcher buttons in the header, e.g. Roles / Matrix / Permissions. */
    tabs?: DataTableTab[];
    activeTab?: string;
    onTabChange?: (value: string) => void;
    /**
     * Group rows under section headers (rows must already be ordered by group),
     * e.g. permissions by resource.
     */
    groupBy?: (row: T) => string;
    groupLabel?: (group: string) => ReactNode;
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
 * The app's table: title, search, filters, view tabs and actions in the
 * header; optional group rows; pagination or a row count in the footer.
 *
 * - Server mode (`paginator` + `url`): search, filters and sort live in the
 *   query string; the controller reads them and paginates withQueryString().
 * - Local mode (`rows`): pass `onChange` on search/filters and filter the rows
 *   yourself.
 */
export function DataTable<T>({
    title,
    description,
    columns,
    rowKey,
    paginator,
    rows,
    url = '',
    search,
    filters = [],
    sort,
    tabs,
    activeTab,
    onTabChange,
    groupBy,
    groupLabel = (group) => group,
    actions,
    noun = 'results',
    emptyMessage = 'Nothing here yet.',
    emptyFilteredMessage = 'No results match your search or filters.',
}: Props<T>) {
    const serverSearch = search && !search.onChange ? search : undefined;
    const serverFilters = filters.filter((filter) => !filter.onChange);

    const {
        filters: current,
        setFilter,
        setFilters,
    } = useQueryFilters<Record<string, string | null>>(url, {
        ...(serverSearch ? { search: serverSearch.value } : {}),
        ...(sort ? { sort: sort.column, direction: sort.direction } : {}),
        ...Object.fromEntries(
            serverFilters.map((filter) => [filter.key, filter.value]),
        ),
    });

    const data = paginator?.data ?? rows ?? [];
    const searchValue = search?.onChange
        ? search.value
        : (current.search ?? '');
    const filterValues = Object.fromEntries(
        filters.map((filter) => [
            filter.key,
            filter.onChange ? filter.value : (current[filter.key] ?? null),
        ]),
    );
    const isFiltered =
        Boolean(search?.value) || filters.some((filter) => filter.value);

    const onSearch = (value: string) =>
        search?.onChange ? search.onChange(value) : setFilter('search', value);
    const onFilter = (key: string, value: string | null) => {
        const filter = filters.find((item) => item.key === key);

        if (filter?.onChange) {
            filter.onChange(value);
        } else {
            setFilter(key, value, { immediate: true });
        }
    };
    const toggleSort = (sortKey: string) => {
        const direction =
            current.sort === sortKey && current.direction === 'asc'
                ? 'desc'
                : 'asc';

        setFilters({ sort: sortKey, direction }, { immediate: true });
    };

    const cellClass = (column: DataTableColumn<T>) =>
        cn(
            'px-4',
            column.visibleFrom && visibleFromClass[column.visibleFrom],
            column.align === 'right' && 'text-right',
            column.className,
        );

    return (
        <div className="bg-card overflow-hidden rounded-xl border">
            <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-0.5 lg:flex-1">
                    <h2 className="text-base font-semibold">{title}</h2>
                    {description && (
                        <p className="text-muted-foreground text-sm">
                            {description}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:flex-nowrap">
                    {tabs && tabs.length > 1 && (
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            value={activeTab}
                            onValueChange={(value) =>
                                value && onTabChange?.(value)
                            }
                            aria-label="View"
                            className="w-full sm:w-auto"
                        >
                            {tabs.map((tab) => (
                                <ToggleGroupItem
                                    key={tab.value}
                                    value={tab.value}
                                    className="flex-1 px-3 sm:flex-none"
                                >
                                    {tab.label}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    )}
                    {search && (
                        <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none lg:w-56 xl:w-64">
                            <Icon
                                iconNode={Search01Icon}
                                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                            />
                            <Input
                                type="search"
                                value={searchValue}
                                onChange={(event) =>
                                    onSearch(event.target.value)
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
                            values={filterValues}
                            onChange={onFilter}
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
                                className={cellClass(column)}
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
                    {data.length === 0 ? (
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
                        data.map((row, index) => {
                            const group = groupBy?.(row);
                            const startsGroup =
                                groupBy !== undefined &&
                                (index === 0 ||
                                    groupBy(data[index - 1]) !== group);

                            return (
                                <Fragment key={rowKey(row)}>
                                    {startsGroup && group !== undefined && (
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableCell
                                                colSpan={columns.length}
                                                className="text-muted-foreground px-4 py-2 text-xs font-medium tracking-wide uppercase"
                                            >
                                                {groupLabel(group)}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    <TableRow>
                                        {columns.map((column) => (
                                            <TableCell
                                                key={column.id}
                                                className={cn(
                                                    cellClass(column),
                                                    column.wrap &&
                                                        'whitespace-normal',
                                                )}
                                            >
                                                {column.cell(row)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </Fragment>
                            );
                        })
                    )}
                </TableBody>
            </Table>

            {paginator && paginator.total > 0 && (
                <div className="border-t px-4 py-3">
                    <SimplePagination paginator={paginator} noun={noun} />
                </div>
            )}
            {!paginator && data.length > 0 && (
                <div className="text-muted-foreground border-t px-4 py-3 text-sm">
                    {data.length} {noun}
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
