import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import Heading from '@/components/heading';
import { useCurrentUrl } from '@/hooks/use-current-url';

// Translation keys per settings page.
const headings: Record<string, { title: string; description: string }> = {
    '/settings/security': {
        title: 'settings.security.title',
        description: 'settings.security.description',
    },
    '/settings/profile': {
        title: 'settings.profile.title',
        description: 'settings.profile.description',
    },
};

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { currentUrl } = useCurrentUrl();
    const { t } = useTranslation();
    const heading = headings[currentUrl] ?? headings['/settings/profile'];

    return (
        <div className="px-4 py-6">
            <Heading
                title={t(heading.title)}
                description={t(heading.description)}
            />

            <section className="space-y-6">{children}</section>
        </div>
    );
}
