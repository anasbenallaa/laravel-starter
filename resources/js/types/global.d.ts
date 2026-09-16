import type { Auth } from '@/types/auth';
import type { Localization } from '@/types/localization';
import type { NotificationSummary } from '@/types/notifications';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            localization: Localization;
            /** Null for guests. */
            notificationSummary: NotificationSummary | null;
            [key: string]: unknown;
        };
    }
}
