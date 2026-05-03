import type { RefObject } from 'react';
import type { LoggedFoodEntry } from '@/types';

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export type MacroTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

/** viewBox 200×200, r tuned for thick stroke clearance */
const R = 71;
const CIRC = 2 * Math.PI * R;
const SW = 16;
const VB = 200;
const VC = VB / 2;

function formatEnergy(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

type MacroRingProps = {
  label: string;
  current: number;
  goal: number;
  stroke: string;
  trackStroke: string;
  dashOffset: number;
};

function MacroRing({
  label,
  current,
  goal,
  stroke,
  trackStroke,
  dashOffset,
}: MacroRingProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
      <p className="text-center text-xs font-semibold tracking-tight text-neutral-800">
        {label}
      </p>
      <div className="relative mx-auto aspect-square w-full max-w-[min(100%,192px)]">
        <svg
          className="size-full rotate-[-90deg]"
          viewBox={`0 0 ${VB} ${VB}`}
          aria-hidden
        >
          <circle
            cx={VC}
            cy={VC}
            r={R}
            fill="none"
            stroke={trackStroke}
            strokeWidth={SW}
            strokeLinecap="round"
          />
          <circle
            cx={VC}
            cy={VC}
            r={R}
            fill="none"
            stroke={stroke}
            strokeWidth={SW}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:duration-0"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-2">
          <div className="flex flex-col items-center justify-center text-center leading-none">
            <span className="font-sans text-3xl font-extrabold tabular-nums text-neutral-900 sm:text-[2.125rem]">
              {Math.round(current)}
            </span>
            <span className="mt-px font-sans text-xs font-medium tabular-nums leading-tight text-neutral-400">
              {` / ${Math.round(goal)}g`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

type LiveMacroDashboardProps = {
  totals: MacroTotals;
  targets: MacroTargets;
  loggedFoods: LoggedFoodEntry[];
  onAdjustQuantity: (menuItemId: string, delta: number) => void;
  onSignOut?: () => void;
  flyAnchorRef?: RefObject<HTMLDivElement | null>;
};

export function LiveMacroDashboard({
  totals,
  targets,
  loggedFoods,
  onAdjustQuantity,
  onSignOut,
  flyAnchorRef,
}: LiveMacroDashboardProps) {
  const pct = Math.min(
    100,
    targets.calories > 0 ? (totals.calories / targets.calories) * 100 : 0,
  );
  const protOff =
    CIRC *
    (1 - Math.min(1, totals.protein / Math.max(targets.protein, 1)));
  const carbOff =
    CIRC * (1 - Math.min(1, totals.carbs / Math.max(targets.carbs, 1)));
  const fatOff =
    CIRC * (1 - Math.min(1, totals.fats / Math.max(targets.fats, 1)));

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white font-sans">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          ref={flyAnchorRef}
          id="macro-dashboard-fly-anchor"
          className="min-w-0 shrink-0 px-6 pb-6 pt-8"
        >
          <h2 className="text-2xl font-bold leading-none tracking-[-0.03em] text-neutral-900 sm:text-[1.85rem]">
            Today&apos;s progress
          </h2>

          <div className="mt-8">
            <p className="text-sm font-semibold text-neutral-600">Calories</p>
            <div className="mt-3 h-[18px] w-full max-w-full overflow-hidden rounded-full border border-gray-200 bg-gray-100 shadow-inner">
              <div
                className="h-full max-w-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:duration-0"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-0 font-sans">
              <span className="text-lg font-bold tabular-nums text-neutral-900">
                {formatEnergy(totals.calories)}
              </span>
              <span className="text-sm font-medium tabular-nums text-neutral-500">
                {` / ${formatEnergy(targets.calories)} kcal`}
              </span>
            </p>
          </div>

          <div className="mt-10 border-t border-gray-200 pt-8">
            <h3 className="text-sm font-semibold tracking-tight text-neutral-700">
              Macros
            </h3>
            <div className="mx-auto mt-8 flex w-full min-w-0 flex-nowrap items-start justify-between gap-x-2 gap-y-8 sm:gap-x-4">
              <MacroRing
                label="Protein"
                current={totals.protein}
                goal={targets.protein}
                stroke="var(--primary)"
                trackStroke="#e8ecf0"
                dashOffset={protOff}
              />
              <MacroRing
                label="Carbohydrates"
                current={totals.carbs}
                goal={targets.carbs}
                stroke="#292524"
                trackStroke="#e8ecf0"
                dashOffset={carbOff}
              />
              <MacroRing
                label="Fat"
                current={totals.fats}
                goal={targets.fats}
                stroke="#44403c"
                trackStroke="#e8ecf0"
                dashOffset={fatOff}
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-t border-gray-200 px-6 pb-4 pt-6">
          <h3 className="shrink-0 text-sm font-semibold tracking-tight text-neutral-700">
            Logged Meals
          </h3>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            {loggedFoods.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-center text-sm font-medium text-neutral-500">
                Add meals from the menu to see them here.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {loggedFoods.map((entry) => {
                  const lineKcal = entry.item.calories * entry.quantity;
                  return (
                    <li
                      key={entry.item.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-neutral-900">
                          {entry.item.name}
                        </p>
                        <p className="mt-0.5 text-xs font-medium tabular-nums text-neutral-500">
                          {Math.round(lineKcal)} kcal
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                        <button
                          type="button"
                          aria-label="Decrease servings"
                          className="flex size-8 items-center justify-center rounded-md text-base font-semibold text-neutral-700 transition hover:bg-white hover:shadow-sm active:scale-[0.98]"
                          onClick={() =>
                            onAdjustQuantity(entry.item.id, -1)
                          }
                        >
                          −
                        </button>
                        <span className="min-w-[1.25rem] text-center text-sm font-semibold tabular-nums text-neutral-800">
                          {entry.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase servings"
                          className="flex size-8 items-center justify-center rounded-md text-base font-semibold text-neutral-700 transition hover:bg-white hover:shadow-sm active:scale-[0.98]"
                          onClick={() =>
                            onAdjustQuantity(entry.item.id, 1)
                          }
                        >
                          +
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {onSignOut && (
        <div className="mt-auto shrink-0 border-t border-gray-200 px-6 py-5">
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-gray-50 hover:shadow-md active:scale-[0.98]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
