import {
    Key01Icon,
    UserIcon,
    UserShield01Icon,
} from '@hugeicons/core-free-icons';
import { useEffect, useState } from 'react';
import type { AppIcon } from '@/components/ui/icon';
import { useAuthorization } from '@/hooks/use-authorization';
import type { SearchItem } from '@/hooks/use-search-items';
import { search as searchRoute } from '@/routes';

export type RemoteSearchGroup = { label: string; items: SearchItem[] };

type ResponseGroup = {
    key: string;
    label: string;
    results: {
        id: string;
        title: string;
        description: string;
        href: string;
        icon: string;
    }[];
};

/** Icon names sent by App\Search\SearchProvider implementations. */
const icons: Record<string, AppIcon> = {
    user: UserIcon,
    role: UserShield01Icon,
    permission: Key01Icon,
};

/** Must match the backend (GlobalSearch::MIN_LENGTH and the providers). */
const MIN_LENGTH = 2;
const SEARCH_PERMISSIONS = ['users.view', 'roles.view', 'permissions.view'];

/**
 * Debounced server search for the command palette (users, roles,
 * permissions, …). The server returns at most 5 results per group and only
 * the groups the user may view.
 */
export function useRemoteSearch(
    query: string,
    enabled: boolean,
): { groups: RemoteSearchGroup[]; loading: boolean } {
    const { canAny } = useAuthorization();
    const [groups, setGroups] = useState<RemoteSearchGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const term = query.trim();
    const active =
        enabled && canAny(SEARCH_PERMISSIONS) && term.length >= MIN_LENGTH;

    useEffect(() => {
        if (!active) {
            setGroups([]);
            setLoading(false);

            return;
        }

        const controller = new AbortController();
        setLoading(true);

        const timeout = setTimeout(async () => {
            try {
                const response = await fetch(
                    searchRoute.url({ query: { q: term } }),
                    {
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'same-origin',
                        signal: controller.signal,
                    },
                );

                if (!response.ok) {
                    setGroups([]);

                    return;
                }

                const data = (await response.json()) as {
                    groups: ResponseGroup[];
                };

                setGroups(
                    data.groups.map((group) => ({
                        label: group.label,
                        items: group.results.map((result) => ({
                            id: `remote.${result.id}`,
                            title: result.title,
                            group: group.label,
                            badge: group.label.replace(/s$/, ''),
                            description: result.description,
                            icon: icons[result.icon] ?? UserIcon,
                            href: result.href,
                        })),
                    })),
                );
            } catch (error) {
                if (
                    !(
                        error instanceof DOMException &&
                        error.name === 'AbortError'
                    )
                ) {
                    setGroups([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }, 200);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [active, term]);

    return { groups, loading };
}
