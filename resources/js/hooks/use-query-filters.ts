import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

type Filters = Record<string, string | null>;

/**
 * Keeps list filters in the query string (?search=john&role=Manager). Text
 * inputs are debounced; changing any filter resets to the first page.
 */
export function useQueryFilters<T extends Filters>(
    url: string,
    initial: T,
    debounceMs = 300,
) {
    const [filters, setFilters] = useState<T>(initial);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;

            return;
        }

        const timeout = setTimeout(() => {
            const query = Object.fromEntries(
                Object.entries(filters).filter(
                    ([, value]) => value !== null && value !== '',
                ),
            );

            router.get(url, query, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, debounceMs);

        return () => clearTimeout(timeout);
    }, [filters, url, debounceMs]);

    const setFilter = <K extends keyof T>(key: K, value: T[K]) =>
        setFilters((current) => ({ ...current, [key]: value }));

    return { filters, setFilter };
}
