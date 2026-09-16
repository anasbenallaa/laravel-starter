import type { ReactNode } from 'react';

/**
 * Keeps technical values (emails, IPs, URLs, identifiers, codes) left-to-right
 * inside right-to-left text without changing the surrounding alignment.
 */
export function Ltr({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <bdi dir="ltr" className={className}>
            {children}
        </bdi>
    );
}
