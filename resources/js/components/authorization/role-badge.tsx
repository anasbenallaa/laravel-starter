import { Badge } from '@/components/ui/badge';
import { ADMIN_ROLE } from '@/lib/permissions';
import { cn } from '@/lib/utils';

export function RoleBadge({
    name,
    className,
}: {
    name: string;
    className?: string;
}) {
    return (
        <Badge
            variant={name === ADMIN_ROLE ? 'default' : 'secondary'}
            className={cn('font-medium', className)}
        >
            {name}
        </Badge>
    );
}

/** Marks the protected Admin role. */
export function SystemRoleBadge() {
    return (
        <Badge variant="outline" className="text-muted-foreground">
            System role
        </Badge>
    );
}
