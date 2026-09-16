import { Ltr } from '@/components/ltr';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
    showName = true,
    avatarClassName,
}: {
    user: User;
    showEmail?: boolean;
    showName?: boolean;
    avatarClassName?: string;
}) {
    const getInitials = useInitials();
    const showAvatar = Boolean(user.avatar && user.avatar !== '');

    return (
        <>
            <Avatar
                className={cn(
                    'h-8 w-8 shrink-0 overflow-hidden rounded-full',
                    avatarClassName,
                )}
            >
                {showAvatar ? (
                    <AvatarImage src={user.avatar} alt={user.name} />
                ) : null}
                <AvatarFallback className="rounded-full text-xs text-black dark:text-white">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            {showName ? (
                <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    {showEmail ? (
                        <span className="text-muted-foreground truncate text-xs">
                            <Ltr>{user.email}</Ltr>
                        </span>
                    ) : null}
                </div>
            ) : null}
        </>
    );
}
