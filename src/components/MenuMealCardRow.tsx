import type { MenuItem } from '@/types';
import { MenuNutritionBadgeRow } from '@/components/MenuNutritionBadges';

type MenuMealCardRowProps = {
  item: MenuItem;
  matchLabel: string;
  showMatch: boolean;
  onAddToPlan: (button: HTMLElement) => void;
};

export function MenuMealCardRow({
  item,
  matchLabel,
  showMatch,
  onAddToPlan,
}: MenuMealCardRowProps) {
  return (
    <li className="rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow duration-150 hover:shadow-[0_1px_8px_-1px_rgba(15,23,42,0.08),0_1px_3px_-1px_rgba(15,23,42,0.05)]">
      <div className="grid w-full grid-cols-1 gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-5">
        <div className="min-w-0 text-left">
          <p className="mb-3 text-lg font-bold leading-snug tracking-[-0.02em] text-neutral-900 sm:text-xl">
            {item.name}
          </p>
          <MenuNutritionBadgeRow
            item={item}
            showMatch={showMatch}
            matchLabel={matchLabel}
          />
        </div>
        <div className="flex shrink-0 justify-start sm:justify-end">
          <button
            type="button"
            onClick={(e) => onAddToPlan(e.currentTarget)}
            className="rounded-md border border-primary bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-px hover:shadow-md active:scale-[0.98]"
          >
            Add to plan
          </button>
        </div>
      </div>
    </li>
  );
}
