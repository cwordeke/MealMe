import { useEffect, useMemo, useRef, type RefObject } from 'react';
import {
  displayMealPeriod,
  MEAL_PERIOD_ORDER,
  type LoggedFoodEntry,
  type MealPeriod,
} from '@/types';

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
  activeMealPeriod: MealPeriod;
  onActiveMealPeriodChange: (period: MealPeriod) => void;
  registerLedgerFlyAnchor: (
    period: MealPeriod,
    el: HTMLDivElement | null,
  ) => void;
  onAdjustQuantity: (
    menuItemId: string,
    mealPeriod: MealPeriod,
    delta: number,
  ) => void;
  /** Periods the current venue serves (hides e.g. Late Night when unavailable). Omit for all periods. */
  mealPeriodChoices?: readonly MealPeriod[];
  onSignOut?: () => void;
  flyAnchorRef?: RefObject<HTMLDivElement | null>;
  /** Increment after an energy orb completes to cue a brief pulse on gauges. */
  absorbPulseKey?: number;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function LiveMacroDashboard({
  totals,
  targets,
  loggedFoods,
  activeMealPeriod,
  onActiveMealPeriodChange,
  registerLedgerFlyAnchor,
  onAdjustQuantity,
  mealPeriodChoices,
  onSignOut,
  flyAnchorRef,
  absorbPulseKey = 0,
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

  const absorbSurfaceRef = useRef<HTMLDivElement>(null);

  const pickerPeriods = useMemo((): readonly MealPeriod[] => {
    if (!mealPeriodChoices || mealPeriodChoices.length === 0) {
      return MEAL_PERIOD_ORDER;
    }
    const ordered = MEAL_PERIOD_ORDER.filter((p) =>
      mealPeriodChoices.includes(p),
    );
    return ordered.length > 0 ? ordered : MEAL_PERIOD_ORDER;
  }, [mealPeriodChoices]);

  const ledgerSectionPeriods = useMemo(() => {
    const used = new Set<MealPeriod>(pickerPeriods);
    for (const e of loggedFoods) used.add(e.mealPeriod);
    return MEAL_PERIOD_ORDER.filter((p) => used.has(p));
  }, [pickerPeriods, loggedFoods]);

  const entriesByPeriod = useMemo(() => {
    const map = new Map<MealPeriod, LoggedFoodEntry[]>();
    for (const p of MEAL_PERIOD_ORDER) map.set(p, []);
    for (const entry of loggedFoods) {
      const list = map.get(entry.mealPeriod);
      if (list) list.push(entry);
      else map.get('LateNight')!.push(entry);
    }
    return map;
  }, [loggedFoods]);

  useEffect(() => {
    if (absorbPulseKey < 1) return;
    if (prefersReducedMotion()) return;
    const el = absorbSurfaceRef.current;
    if (!el) return;

    el.classList.remove('mealme-absorb-surface--pulse');
    requestAnimationFrame(() => {
      el.classList.add('mealme-absorb-surface--pulse');
    });

    const onEnd = (): void => {
      el.classList.remove('mealme-absorb-surface--pulse');
    };
    el.addEventListener('animationend', onEnd, { once: true });
    return () => el.removeEventListener('animationend', onEnd);
  }, [absorbPulseKey]);

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

          <div ref={absorbSurfaceRef} className="mealme-absorb-surface">
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
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-t border-gray-200 px-6 pb-4 pt-6">
          <div className="flex min-h-0 flex-1 flex-col">
            <h3 className="shrink-0 text-sm font-semibold tracking-tight text-neutral-700">
              Daily Timeline Ledger
            </h3>
            <fieldset className="mt-5 shrink-0">
              <legend className="sr-only">
                Planned meal period for new items from the menu
              </legend>
              <div className="flex w-full gap-1 rounded-lg bg-gray-100 p-1">
                {pickerPeriods.map((period) => {
                  const active = activeMealPeriod === period;
                  return (
                    <button
                      key={period}
                      type="button"
                      onClick={() => onActiveMealPeriodChange(period)}
                      aria-pressed={active}
                      className={`min-w-0 flex-1 rounded-md py-2.5 text-[0.8125rem] transition-colors ${
                        active
                          ? 'bg-white font-bold text-neutral-900 shadow-sm'
                          : 'font-semibold text-neutral-400 hover:text-neutral-500'
                      }`}
                    >
                      {displayMealPeriod(period)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="relative mt-5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 pb-2">
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-2 left-[10px] top-9 w-px bg-gray-200"
              />
              <div className="pb-8">
                {ledgerSectionPeriods.map((period, idx) => {
                  const entries = entriesByPeriod.get(period) ?? [];
                  const subtotal = entries.reduce(
                    (acc, e) => acc + e.item.calories * e.quantity,
                    0,
                  );
                  return (
                    <section
                      key={period}
                      className={idx > 0 ? 'mt-8' : ''}
                    >
                      <div
                        ref={(el) => registerLedgerFlyAnchor(period, el)}
                        className="relative z-[1] pl-7"
                      >
                        <p className="text-xs font-bold tracking-widest">
                          <span className="text-neutral-400">
                            {displayMealPeriod(period).toUpperCase()} •{' '}
                          </span>
                          <span className="tabular-nums text-brand-green">
                            {formatEnergy(subtotal)} kcal
                          </span>
                        </p>
                      </div>

                      {entries.length === 0 ? (
                        <p className="relative mt-3 rounded-md border border-dashed border-gray-200/90 bg-neutral-50/30 py-4 pl-7 pr-4 text-[13px] font-medium text-neutral-400/90">
                          No meals planned.
                        </p>
                      ) : (
                        <ul className="relative mt-1">
                          {entries.map((entry) => {
                            const lineKcal =
                              entry.item.calories * entry.quantity;
                            const key = `${entry.item.id}::${entry.mealPeriod}`;
                            return (
                              <li
                                key={key}
                                className="relative flex items-start gap-3 py-3 pl-7 sm:gap-4"
                              >
                                <span
                                  aria-hidden
                                  className="pointer-events-none absolute left-[10px] top-1/2 z-[1] size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-neutral-300 shadow-[0_0_0_2px_white]"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-semibold leading-snug tracking-tight text-neutral-900">
                                    {entry.item.name}
                                  </p>
                                  <p className="mt-1 font-mono text-[11px] font-semibold tabular-nums text-neutral-500">
                                    {Math.round(lineKcal)} kcal
                                  </p>
                                </div>
                                <div
                                  className="flex shrink-0 items-center rounded-md border border-gray-200/90 bg-gray-50/40"
                                  role="group"
                                  aria-label="Serving count"
                                >
                                  <button
                                    type="button"
                                    aria-label="Decrease servings"
                                    className="flex size-7 items-center justify-center text-[13px] font-medium tabular-nums text-neutral-400 transition-colors hover:bg-white hover:text-neutral-900"
                                    onClick={() =>
                                      onAdjustQuantity(
                                        entry.item.id,
                                        entry.mealPeriod,
                                        -1,
                                      )
                                    }
                                  >
                                    −
                                  </button>
                                  <span className="border-x border-gray-200 bg-white px-2 py-1 text-[11px] font-bold tabular-nums tracking-tight text-neutral-900">
                                    {entry.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label="Increase servings"
                                    className="flex size-7 items-center justify-center text-[13px] font-medium tabular-nums text-neutral-400 transition-colors hover:bg-white hover:text-neutral-900"
                                    onClick={() =>
                                      onAdjustQuantity(
                                        entry.item.id,
                                        entry.mealPeriod,
                                        1,
                                      )
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
                    </section>
                  );
                })}
              </div>
            </div>
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
