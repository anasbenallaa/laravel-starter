import { FilterHorizontalIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import type { DataTableFilter } from './types';

const ALL = '__all__';

type Props = {
    filters: DataTableFilter[];
    values: Record<string, string | null>;
    onChange: (key: string, value: string | null) => void;
};

/** Filter icon button that opens one radio group per filter. */
export function DataTableFilters({ filters, values, onChange }: Props) {
    const activeCount = filters.filter((filter) => values[filter.key]).length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="relative shrink-0"
                    aria-label={
                        activeCount > 0
                            ? `Filters (${activeCount} active)`
                            : 'Filters'
                    }
                >
                    <Icon iconNode={FilterHorizontalIcon} />
                    {activeCount > 0 && (
                        <span className="bg-primary text-primary-foreground ring-background absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold ring-2">
                            {activeCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {filters.map((filter, index) => (
                    <div key={filter.key}>
                        {index > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuLabel className="text-muted-foreground text-xs">
                            Filter by {filter.label.toLowerCase()}
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                            value={values[filter.key] ?? ALL}
                            onValueChange={(value) =>
                                onChange(
                                    filter.key,
                                    value === ALL ? null : value,
                                )
                            }
                        >
                            <DropdownMenuRadioItem value={ALL}>
                                {filter.allLabel ?? 'All'}
                            </DropdownMenuRadioItem>
                            {filter.options.map((option) => (
                                <DropdownMenuRadioItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </div>
                ))}
                {activeCount > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onSelect={() =>
                                filters.forEach((filter) =>
                                    onChange(filter.key, null),
                                )
                            }
                        >
                            Clear filters
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
