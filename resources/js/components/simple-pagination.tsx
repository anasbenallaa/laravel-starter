import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import type { Paginator } from '@/types';

/** Previous / next pagination for a server-side Laravel paginator. */
export function SimplePagination<T>({
    paginator,
    noun = 'results',
}: {
    paginator: Paginator<T>;
    noun?: string;
}) {
    if (paginator.total === 0) {
        return null;
    }

    return (
        <nav
            className="flex items-center justify-between gap-4"
            aria-label="Pagination"
        >
            <p className="text-muted-foreground text-sm">
                {paginator.from}–{paginator.to} of {paginator.total} {noun}
            </p>
            {paginator.last_page > 1 && (
                <div className="flex gap-2">
                    <PageButton href={paginator.prev_page_url}>
                        <Icon iconNode={ArrowLeft01Icon} />
                        Previous
                    </PageButton>
                    <PageButton href={paginator.next_page_url}>
                        Next
                        <Icon iconNode={ArrowRight01Icon} />
                    </PageButton>
                </div>
            )}
        </nav>
    );
}

function PageButton({
    href,
    children,
}: {
    href: string | null;
    children: React.ReactNode;
}) {
    if (!href) {
        return (
            <Button variant="outline" size="sm" disabled>
                {children}
            </Button>
        );
    }

    return (
        <Button variant="outline" size="sm" asChild>
            <Link href={href} preserveScroll>
                {children}
            </Link>
        </Button>
    );
}
