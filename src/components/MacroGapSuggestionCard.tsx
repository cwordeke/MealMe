import type { MenuItem } from '@/types';
import { MenuNutritionBadgeRow } from '@/components/MenuNutritionBadges';

type MacroGapSuggestionCardProps = {
  item: MenuItem;
  message: string;
  onAddToPlan: (button: HTMLElement) => void;
};

export function MacroGapSuggestionCard({
  item,
  message,
  onAddToPlan,
}: MacroGapSuggestionCardProps) {
  return (
    <section
      className="mb-8 rounded-lg border border-gray-200 border-l-4 border-l-brand-green bg-green-50 p-4 shadow-sm"
      aria-label="Target match pick"
    >
      <div className="border-b border-gray-200 pb-3">
        <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-neutral-900">
          Target Match
        </h2>
      </div>
      <p className="mb-3 mt-4 text-lg font-bold leading-snug tracking-[-0.02em] text-neutral-900 sm:text-xl">
        {item.name}
      </p>
      <p className="text-sm font-medium leading-relaxed text-neutral-500">
        {message}
      </p>
      <div className="mt-4">
        <MenuNutritionBadgeRow item={item} />
      </div>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={(e) => onAddToPlan(e.currentTarget)}
          className="rounded-md border border-primary bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-px hover:shadow-md active:scale-[0.98]"
        >
          Add to plan
        </button>
      </div>
    </section>
  );
}
