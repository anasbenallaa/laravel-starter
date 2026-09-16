import { ArrowRight01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { router } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { type SearchItem, useSearchItems } from '@/hooks/use-search-items';
import { cn } from '@/lib/utils';

type ResultGroup = { label: string; items: SearchItem[] };

function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
    );
}

function groupResults(items: SearchItem[], query: string): ResultGroup[] {
    const needle = query.trim().toLowerCase();

    const matches = needle
        ? items.filter((item) =>
              [
                  item.title,
                  item.description,
                  item.badge,
                  ...(item.keywords ?? []),
              ]
                  .join(' ')
                  .toLowerCase()
                  .includes(needle),
          )
        : items;

    const groups: ResultGroup[] = [];

    for (const item of matches) {
        let group = groups.find((entry) => entry.label === item.group);

        if (!group) {
            group = { label: item.group, items: [] };
            groups.push(group);
        }

        group.items.push(item);
    }

    return groups;
}

const kbdClass =
    'pointer-events-none hidden h-5 select-none items-center rounded border px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex';

/**
 * Sidebar button that opens the command palette. Kept separate from the
 * dialog so the dialog survives the mobile sidebar sheet closing.
 */
export function GlobalSearchTrigger({ onOpen }: { onOpen: () => void }) {
    return (
        <>
            <button
                type="button"
                onClick={onOpen}
                data-test="global-search-trigger"
                className="border-sidebar-border/60 bg-sidebar-accent/40 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring flex h-9 w-full items-center gap-2 rounded-lg border px-3 text-sm transition-colors group-data-[collapsible=icon]:hidden focus-visible:ring-2 focus-visible:outline-none"
            >
                <Icon
                    iconNode={Search01Icon}
                    className="size-4 shrink-0 opacity-70"
                />
                <span className="flex-1 text-left">Search</span>
                <kbd className={kbdClass}>⌘K</kbd>
            </button>

            <button
                type="button"
                onClick={onOpen}
                aria-label="Search"
                className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring hidden size-8 shrink-0 items-center justify-center rounded-md transition-colors group-data-[collapsible=icon]:flex focus-visible:ring-2 focus-visible:outline-none"
            >
                <Icon iconNode={Search01Icon} className="size-4" />
            </button>
        </>
    );
}

/**
 * App-wide command palette: the blurred overlay dialog and the global ⌘K /
 * Ctrl+K (and "/") shortcut. Render it outside the sidebar so it stays
 * mounted on mobile, where the sidebar only exists while its sheet is open.
 */
export function GlobalSearch({
    open,
    onOpenChange: setOpen,
}: {
    open: boolean;
    onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const items = useSearchItems();
    const groups = useMemo(() => groupResults(items, query), [items, query]);
    const flat = useMemo(
        () => groups.flatMap((group) => group.items),
        [groups],
    );

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const isShortcut =
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === 'k';
            const isSlash =
                event.key === '/' &&
                !event.metaKey &&
                !event.ctrlKey &&
                !event.altKey &&
                !isEditableTarget(event.target);

            if (isShortcut || isSlash) {
                event.preventDefault();
                setOpen((value) => !value);
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [setOpen]);

    useEffect(() => {
        if (!open) {
            setQuery('');
            setActiveIndex(0);
        }
    }, [open]);

    useEffect(() => {
        setActiveIndex((index) => {
            if (flat.length === 0) {
                return 0;
            }

            return Math.min(index, flat.length - 1);
        });
    }, [flat.length]);

    useEffect(() => {
        const node = listRef.current?.querySelector<HTMLElement>(
            `[data-index="${activeIndex}"]`,
        );
        node?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const runItem = useCallback(
        (item: SearchItem | undefined) => {
            if (!item) {
                return;
            }

            setOpen(false);

            if (item.href) {
                router.visit(item.href);
                return;
            }

            item.onSelect?.();
        },
        [setOpen],
    );

    const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((index) =>
                flat.length ? (index + 1) % flat.length : 0,
            );
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) =>
                flat.length ? (index - 1 + flat.length) % flat.length : 0,
            );
        } else if (event.key === 'Enter') {
            event.preventDefault();
            runItem(flat[activeIndex]);
        }
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="bg-background/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-sm" />
                <DialogPrimitive.Content
                    aria-describedby={undefined}
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        inputRef.current?.focus();
                    }}
                    className="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[12vh] left-1/2 z-50 w-[640px] max-w-[calc(100%-2rem)] -translate-x-1/2 overflow-hidden rounded-xl border shadow-2xl duration-150"
                >
                    <DialogPrimitive.Title className="sr-only">
                        Global search
                    </DialogPrimitive.Title>

                    <div className="flex items-center gap-3 border-b px-4">
                        <Icon
                            iconNode={Search01Icon}
                            className="text-muted-foreground size-5 shrink-0"
                        />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={onInputKeyDown}
                            placeholder="Search resources, paths, everything…"
                            className="placeholder:text-muted-foreground h-14 flex-1 bg-transparent text-sm outline-none"
                            autoComplete="off"
                            spellCheck={false}
                        />
                        <div className="flex shrink-0 items-center gap-1">
                            <kbd className={kbdClass}>/</kbd>
                            <kbd className={kbdClass}>⌘K</kbd>
                            <kbd className={kbdClass}>ESC</kbd>
                        </div>
                    </div>

                    <div
                        ref={listRef}
                        className="max-h-[60vh] overflow-y-auto p-2"
                    >
                        {flat.length === 0 ? (
                            <p className="text-muted-foreground px-3 py-10 text-center text-sm">
                                No results
                                {query ? ` for “${query.trim()}”` : ''}.
                            </p>
                        ) : (
                            groups.map((group) => (
                                <div
                                    key={group.label}
                                    className="mb-1 last:mb-0"
                                >
                                    <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                                        {group.label}
                                    </p>
                                    {group.items.map((item) => {
                                        const index = flat.findIndex(
                                            (entry) => entry.id === item.id,
                                        );
                                        const isActive = index === activeIndex;

                                        return (
                                            <button
                                                type="button"
                                                key={item.id}
                                                data-index={index}
                                                onMouseMove={() =>
                                                    setActiveIndex(index)
                                                }
                                                onClick={() => runItem(item)}
                                                className={cn(
                                                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                                                    isActive
                                                        ? 'bg-accent text-accent-foreground'
                                                        : 'text-foreground',
                                                )}
                                            >
                                                <Icon
                                                    iconNode={item.icon}
                                                    className="text-muted-foreground size-4 shrink-0"
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-center gap-2">
                                                        <span className="truncate text-sm font-medium">
                                                            {item.title}
                                                        </span>
                                                        <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[11px] font-medium">
                                                            {item.badge}
                                                        </span>
                                                    </span>
                                                    <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                                                        {item.description}
                                                    </span>
                                                </span>
                                                <Icon
                                                    iconNode={ArrowRight01Icon}
                                                    className="text-muted-foreground/50 size-4 shrink-0"
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
