import type { MenuItem } from '@/types';

function formatWhole(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

/** Premium editorial macro pill: muted letter + bold value; no stroke. */
export function MacroNutrientBadge({
  abbrev,
  value,
}: {
  abbrev: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-baseline rounded-md bg-neutral-100 px-3 py-1 font-sans text-sm tabular-nums">
      <span className="mr-1 shrink-0 font-semibold text-neutral-500">{abbrev}</span>
      <span className="font-semibold text-neutral-900">{value}</span>
    </span>
  );
}

/** "% match" accent — aligns with macro pills via shared padding rhythm; no outline. */
export function MatchPercentBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-baseline rounded-md bg-brand-green/10 px-3 py-1 text-sm font-bold tabular-nums text-brand-green">
      {label}
    </span>
  );
}

type MenuNutritionBadgeRowProps = {
  item: MenuItem;
  /** When true and `matchLabel` is set, the match pill renders first so it separates from nutrient stats. */
  showMatch?: boolean;
  matchLabel?: string;
};

export function MenuNutritionBadgeRow({
  item,
  showMatch,
  matchLabel,
}: MenuNutritionBadgeRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showMatch && matchLabel ? (
        <MatchPercentBadge label={matchLabel} />
      ) : null}
      <MacroNutrientBadge
        abbrev="Cal"
        value={`${formatWhole(item.calories)} kcal`}
      />
      <MacroNutrientBadge
        abbrev="P"
        value={`${formatWhole(item.protein)}g`}
      />
      <MacroNutrientBadge
        abbrev="C"
        value={`${formatWhole(item.carbs)}g`}
      />
      <MacroNutrientBadge abbrev="F" value={`${formatWhole(item.fats)}g`} />
    </div>
  );
}
