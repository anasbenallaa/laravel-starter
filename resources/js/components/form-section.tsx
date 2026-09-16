import { cn } from '@/lib/utils';

/** A titled card section used by the admin forms. */
export function FormSection({
    title,
    description,
    children,
    className,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className="bg-card rounded-xl border">
            <header className="space-y-1 border-b px-6 py-4">
                <h2 className="text-muted-foreground text-sm font-medium">
                    {title}
                </h2>
                {description && (
                    <p className="text-muted-foreground text-sm">
                        {description}
                    </p>
                )}
            </header>
            <div className={cn('px-6 py-5', className)}>{children}</div>
        </section>
    );
}
