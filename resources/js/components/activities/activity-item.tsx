import {
    ArrowDown01Icon,
    ArrowRight01Icon,
    Settings01Icon,
} from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ltr } from '@/components/ltr';
import { Icon } from '@/components/ui/icon';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserInfo } from '@/components/user-info';
import { useFormatters } from '@/hooks/use-formatters';
import {
    actionPresentation,
    activitySentence,
    fieldLabel,
    formatActivityValue,
    toneClasses,
} from '@/lib/activity-presentation';
import { cn } from '@/lib/utils';
import type { Activity, User } from '@/types';

/** Changes shown before "Show all changes". */
const VISIBLE_CHANGES = 3;

type Props = {
    activity: Activity;
    /** Show the actor's email (when viewing other people's activity). */
    showEmail?: boolean;
    isLast?: boolean;
};

/** One entry in the read-only activity timeline. */
export function ActivityItem({
    activity,
    showEmail = false,
    isLast = false,
}: Props) {
    const [expanded, setExpanded] = useState(false);
    const { t, i18n } = useTranslation();
    const { relativeTime, dateTime } = useFormatters();
    const presentation = actionPresentation(activity.action, t);
    const format = (value: Activity['changes'][number]['old']) =>
        formatActivityValue(value, t, i18n.language);
    const details =
        activity.changes.length > 0
            ? activity.changes.map((change) => ({
                  field: change.field,
                  content: (
                      <>
                          <span className="text-muted-foreground decoration-muted-foreground/40 line-through">
                              {format(change.old)}
                          </span>
                          <Icon
                              iconNode={ArrowRight01Icon}
                              className="text-muted-foreground size-3 shrink-0 rtl:rotate-180"
                          />
                          <span className="text-foreground">
                              {format(change.new)}
                          </span>
                      </>
                  ),
              }))
            : [
                  ...activity.values.map((item) => ({
                      field: item.field,
                      content: (
                          <span className="text-foreground">
                              {format(item.value)}
                          </span>
                      ),
                  })),
                  ...Object.entries(activity.metadata).map(
                      ([field, value]) => ({
                          field,
                          content: (
                              <span className="text-foreground">
                                  {format(value)}
                              </span>
                          ),
                      }),
                  ),
              ];
    // Changes are the point of an update, so show a few; snapshots stay collapsed.
    const visible = expanded
        ? details
        : activity.changes.length > 0
          ? details.slice(0, VISIBLE_CHANGES)
          : [];
    const hiddenCount = details.length - visible.length;

    return (
        <li className="relative flex gap-4 pb-6">
            {!isLast && (
                <span
                    aria-hidden
                    className="bg-border absolute start-4 top-9 bottom-0 w-px -translate-x-1/2 rtl:translate-x-1/2"
                />
            )}

            <span
                className={cn(
                    'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-1',
                    toneClasses[presentation.tone],
                )}
                title={presentation.label}
            >
                <Icon iconNode={presentation.icon} className="size-4" />
            </span>

            <div className="min-w-0 flex-1 space-y-1.5 pt-1">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                    <Actor activity={activity} showEmail={showEmail} />
                    <span className="text-muted-foreground break-words">
                        {activitySentence(activity, t)}
                    </span>
                </div>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <time
                            dateTime={activity.created_at}
                            className="text-muted-foreground/80 block w-fit text-xs"
                        >
                            {relativeTime(activity.created_at)}
                        </time>
                    </TooltipTrigger>
                    <TooltipContent>
                        {dateTime(activity.created_at)}
                    </TooltipContent>
                </Tooltip>

                {visible.length > 0 && (
                    <dl className="bg-muted/40 mt-2 space-y-1.5 rounded-lg border px-3 py-2 text-xs">
                        {visible.map((row) => (
                            <div
                                key={row.field}
                                className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-3"
                            >
                                <dt className="text-muted-foreground font-medium">
                                    {fieldLabel(row.field, t)}
                                </dt>
                                <dd className="flex min-w-0 flex-wrap items-center gap-1.5 break-words">
                                    {row.content}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}

                {details.length > 0 && (hiddenCount > 0 || expanded) && (
                    <button
                        type="button"
                        onClick={() => setExpanded((value) => !value)}
                        className="text-muted-foreground hover:text-foreground mt-1 inline-flex items-center gap-1 text-xs font-medium"
                        aria-expanded={expanded}
                    >
                        <Icon
                            iconNode={ArrowDown01Icon}
                            className={cn(
                                'size-3.5 transition-transform',
                                expanded && 'rotate-180',
                            )}
                        />
                        {expanded
                            ? t('activities.hide_details')
                            : activity.changes.length > 0
                              ? t('activities.show_more_changes', {
                                    count: hiddenCount,
                                })
                              : t('activities.show_details')}
                    </button>
                )}
            </div>
        </li>
    );
}

function Actor({
    activity,
    showEmail,
}: {
    activity: Activity;
    showEmail: boolean;
}) {
    const { t } = useTranslation();

    if (!activity.user) {
        const deleted = activity.user_id !== null;

        return (
            <span className="text-foreground inline-flex items-center gap-1.5 font-medium">
                <span className="bg-muted text-muted-foreground flex size-5 items-center justify-center rounded-full">
                    <Icon iconNode={Settings01Icon} className="size-3" />
                </span>
                {deleted
                    ? t('activities.actor.deleted_user')
                    : t('activities.actor.system')}
            </span>
        );
    }

    return (
        <span className="text-foreground inline-flex min-w-0 items-center gap-1.5 font-medium">
            <span className="flex">
                <UserInfo
                    user={
                        {
                            ...activity.user,
                            avatar: activity.user.avatar ?? undefined,
                        } as unknown as User
                    }
                    showName={false}
                    avatarClassName="size-5 text-[9px]"
                />
            </span>
            {activity.user.name}
            {showEmail && (
                <span className="text-muted-foreground hidden font-normal sm:inline">
                    (<Ltr>{activity.user.email}</Ltr>)
                </span>
            )}
        </span>
    );
}
