import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

type Filters = Record<string, string | null>;

type UpdateOptions = {
    /** Visit right away instead of waiting for the debounce (e.g. clicks). */
    immediate?: boolean;
};

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
    const nextDelay = useRef(debounceMs);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;

            return;
        }

        const delay = nextDelay.current;
        nextDelay.current = debounceMs;

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
        }, delay);

        return () => clearTimeout(timeout);
    }, [filters, url, debounceMs]);

    const update = (values: Partial<T>, options: UpdateOptions = {}) => {
        if (options.immediate) {
            nextDelay.current = 0;
        }

        setFilters((current) => ({ ...current, ...values }));
    };

    const setFilter = <K extends keyof T>(
        key: K,
        value: T[K],
        options?: UpdateOptions,
    ) => update({ [key]: value } as unknown as Partial<T>, options);

    return { filters, setFilter, setFilters: update };
}
