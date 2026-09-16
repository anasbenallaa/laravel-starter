import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';

export default function AlertError({
    errors,
    title,
}: {
    errors: string[];
    title?: string;
}) {
    const { t } = useTranslation();

    return (
        <Alert variant="destructive">
            <Icon iconNode={AlertCircleIcon} />
            <AlertTitle>{title || t('common.something_went_wrong')}</AlertTitle>
            <AlertDescription>
                <ul className="list-inside list-disc text-sm">
                    {Array.from(new Set(errors)).map((error, index) => (
                        <li key={index}>{error}</li>
                    ))}
                </ul>
            </AlertDescription>
        </Alert>
    );
}
