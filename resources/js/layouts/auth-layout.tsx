import { useTranslation } from 'react-i18next';
import AuthLayoutTemplate from '@/layouts/auth/auth-simple-layout';

/**
 * Auth pages pass translation keys as `title` and `description` (static
 * `Page.layout` objects can't call hooks); they are translated here.
 */
export default function AuthLayout({
    title = '',
    description = '',
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <AuthLayoutTemplate
            title={title ? t(title) : ''}
            description={description ? t(description) : ''}
        >
            {children}
        </AuthLayoutTemplate>
    );
}
