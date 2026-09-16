import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useFormatters } from '@/hooks/use-formatters';
import type { Paginator } from '@/types';

/** Previous / next pagination for a server-side Laravel paginator. */
export function SimplePagination<T>({
    paginator,
    countLabel,
}: {
    paginator: Paginator<T>;
    /** Translated, pluralized total, e.g. "42 users". */
    countLabel?: (count: number) => string;
}) {
    const { t } = useTranslation();
    const { number } = useFormatters();

    if (paginator.total === 0) {
        return null;
    }

    return (
        <nav
            className="flex items-center justify-between gap-4"
            aria-label={t('table.pagination')}
        >
            <p className="text-muted-foreground text-sm">
                {t('table.range', {
                    from: number(paginator.from ?? 0),
                    to: number(paginator.to ?? 0),
                    total: countLabel
                        ? countLabel(paginator.total)
                        : t('table.results', { count: paginator.total }),
                })}
            </p>
            {paginator.last_page > 1 && (
                <div className="flex gap-2">
                    <PageButton href={paginator.prev_page_url}>
                        {/* Arrows point along the reading direction. */}
                        <Icon
                            iconNode={ArrowLeft01Icon}
                            className="rtl:rotate-180"
                        />
                        {t('table.previous')}
                    </PageButton>
                    <PageButton href={paginator.next_page_url}>
                        {t('table.next')}
                        <Icon
                            iconNode={ArrowRight01Icon}
                            className="rtl:rotate-180"
                        />
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
