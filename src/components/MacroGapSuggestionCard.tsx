import { Sparkles } from 'lucide-react';
import type { MenuItem } from '@/types';

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
      className="mb-8 rounded-lg border-2 border-primary/55 bg-gradient-to-br from-emerald-50/95 via-white to-sky-50/40 p-4 shadow-sm ring-1 ring-primary/15"
      aria-label="MealMe macro suggestion"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-primary/15 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles
            className="size-5 shrink-0 text-primary"
            strokeWidth={2}
            aria-hidden
          />
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
            MealMe Macro Suggestion
          </h2>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-800">
        {message}
      </p>
      <p className="mt-2 font-mono text-xs font-medium tabular-nums text-neutral-500">
        {item.calories} kcal
      </p>
      <div className="mt-4 flex justify-end">
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
