import { Activity01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { Head, InfiniteScroll } from '@inertiajs/react';
import ActivityController from '@/actions/App/Http/Controllers/ActivityController';
import { ActivityItem } from '@/components/activities/activity-item';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryFilters } from '@/hooks/use-query-filters';
import { actionPresentation } from '@/lib/activity-presentation';
import type { Activity, ActivityFilters } from '@/types';

type Props = {
    activities: { data: Activity[] };
    filters: ActivityFilters;
    canViewAll: boolean;
    actions: string[];
    users: { id: number; name: string; email: string }[];
};

const ALL = '__all__';

export default function Activities({
    activities,
    filters,
    canViewAll,
    actions,
    users,
}: Props) {
    const {
        filters: current,
        setFilter,
        setFilters,
    } = useQueryFilters(
        ActivityController.index.url(),
        {
            search: filters.search,
            action: filters.action,
            user: filters.user ? String(filters.user) : null,
            from: filters.from,
            to: filters.to,
        },
        300,
        {
            reset: ['activities'],
            only: ['filters', 'actions', 'users', 'canViewAll'],
        },
    );
    const isFiltered = Boolean(
        filters.search ||
        filters.action ||
        filters.user ||
        filters.from ||
        filters.to,
    );
    const selectedUser = users.find((user) => user.id === filters.user);

    return (
        <>
            <Head title="Activities" />

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold tracking-tight">
                        {selectedUser
                            ? `Activities · ${selectedUser.name}`
                            : 'Activities'}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {canViewAll
                            ? 'A chronological history of user activity across the system.'
                            : 'A history of actions performed from your account.'}
                    </p>
                </div>

                <div className="bg-card flex flex-col gap-2 rounded-xl border p-3 md:flex-row md:flex-wrap md:items-center">
                    <div className="relative flex-1 md:min-w-56">
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
                            placeholder={
                                canViewAll
                                    ? 'Search user, record or description'
                                    : 'Search your activity'
                            }
                            aria-label="Search activities"
                            className="pl-9"
                        />
                    </div>

                    <Select
                        value={current.action ?? ALL}
                        onValueChange={(value) =>
                            setFilter('action', value === ALL ? null : value, {
                                immediate: true,
                            })
                        }
                    >
                        <SelectTrigger
                            className="w-full md:w-44"
                            aria-label="Filter by action"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All actions</SelectItem>
                            {actions.map((action) => (
                                <SelectItem key={action} value={action}>
                                    {actionPresentation(action).label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {canViewAll && (
                        <Select
                            value={current.user ?? ALL}
                            onValueChange={(value) =>
                                setFilter(
                                    'user',
                                    value === ALL ? null : value,
                                    { immediate: true },
                                )
                            }
                        >
                            <SelectTrigger
                                className="w-full md:w-52"
                                aria-label="Filter by user"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All users</SelectItem>
                                {users.map((user) => (
                                    <SelectItem
                                        key={user.id}
                                        value={String(user.id)}
                                    >
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={current.from ?? ''}
                            max={current.to ?? undefined}
                            onChange={(event) =>
                                setFilter('from', event.target.value || null, {
                                    immediate: true,
                                })
                            }
                            aria-label="From date"
                            className="md:w-40"
                        />
                        <span className="text-muted-foreground text-xs">
                            to
                        </span>
                        <Input
                            type="date"
                            value={current.to ?? ''}
                            min={current.from ?? undefined}
                            onChange={(event) =>
                                setFilter('to', event.target.value || null, {
                                    immediate: true,
                                })
                            }
                            aria-label="To date"
                            className="md:w-40"
                        />
                    </div>

                    {isFiltered && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                                setFilters(
                                    {
                                        search: '',
                                        action: null,
                                        user: null,
                                        from: null,
                                        to: null,
                                    },
                                    { immediate: true },
                                )
                            }
                        >
                            Clear
                        </Button>
                    )}
                </div>

                {activities.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
                        <span className="bg-muted flex size-12 items-center justify-center rounded-full">
                            <Icon
                                iconNode={Activity01Icon}
                                className="text-muted-foreground size-6"
                            />
                        </span>
                        {isFiltered ? (
                            <p className="font-medium">
                                No activities match these filters.
                            </p>
                        ) : (
                            <div className="space-y-1">
                                <p className="font-medium">No activities yet</p>
                                <p className="text-muted-foreground text-sm">
                                    Activity performed in the application will
                                    appear here.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <InfiniteScroll
                        data="activities"
                        buffer={400}
                        onlyNext
                        className="bg-card rounded-xl border p-4 md:p-6"
                        loading={<TimelineSkeleton />}
                        next={({ hasNext }) =>
                            hasNext ? null : (
                                <p className="text-muted-foreground/70 pt-2 text-center text-xs">
                                    You've reached the end of the activity
                                    history.
                                </p>
                            )
                        }
                    >
                        <ol aria-label="Activity timeline">
                            {activities.data.map((activity, index) => (
                                <ActivityItem
                                    key={activity.id}
                                    activity={activity}
                                    showEmail={canViewAll}
                                    isLast={
                                        index === activities.data.length - 1
                                    }
                                />
                            ))}
                        </ol>
                    </InfiniteScroll>
                )}
            </div>
        </>
    );
}

function TimelineSkeleton() {
    return (
        <div className="space-y-6 pt-2" aria-label="Loading more activities">
            {[0, 1, 2].map((item) => (
                <div key={item} className="flex gap-4">
                    <Skeleton className="size-8 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2 pt-1">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
            ))}
        </div>
    );
}

Activities.layout = () => ({
    breadcrumbs: [{ title: 'Activities', href: ActivityController.index() }],
});
