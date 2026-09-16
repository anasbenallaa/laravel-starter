import { useTranslation } from 'react-i18next';
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
            {/* Role names are data: never translated. */}
            {name}
        </Badge>
    );
}

/** Marks the protected Admin role. */
export function SystemRoleBadge() {
    const { t } = useTranslation();

    return (
        <Badge variant="outline" className="text-muted-foreground">
            {t('roles.system_role')}
        </Badge>
    );
}
