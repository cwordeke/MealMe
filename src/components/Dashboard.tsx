import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  UserStats,
  Goal,
  DietaryPreferences,
  MenuItem,
  LoggedFoodEntry,
} from '@/types';
import { calculateTDEE } from '@/lib/calculations';
import { matchPercent, mealRecommendationScore } from '@/lib/mealRecommendation';
import { MOCK_DINING_DATA } from '@/data/mockDining';
import { DINING_HALLS } from '@/data/diningHallMeta';
import { MenuMealCardRow } from '@/components/MenuMealCardRow';
import { MacroGapSuggestionCard } from '@/components/MacroGapSuggestionCard';
import { LiveMacroDashboard } from '@/components/LiveMacroDashboard';
import {
  buildMealMeMacroSuggestionText,
  calculateMealScore,
  computeMissingMacros,
  normalizeHallScores,
  selectBestMacroGapItem,
  weightedTopPickGreenAlpha,
} from '@/lib/macroGap';

interface DashboardProps {
  stats: UserStats;
  goal: Goal;
  preferences: DietaryPreferences;
  onLogout: () => void;
}

const COLUMN_BORDER = 'border-r border-solid border-gray-200' as const;

function isHallOpenNow(): boolean {
  const h = new Date().getHours();
  return h >= 7 && h < 21;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type MenuScoreRow = {
  item: MenuItem;
  weightedRaw: number;
  disqualified: boolean;
  legacyScore: number;
};

export default function Dashboard({
  stats,
  goal,
  preferences,
  onLogout,
}: DashboardProps) {
  const tdeeResult = useMemo(() => calculateTDEE(stats, goal), [stats, goal]);
  const [loggedFoods, setLoggedFoods] = useState<LoggedFoodEntry[]>([]);
  const [selectedLocationKey, setSelectedLocationKey] = useState<string | null>(
    null,
  );

  const macroFlyAnchorRef = useRef<HTMLDivElement>(null);

  const recContext = useMemo(
    () => ({ goal, tdee: tdeeResult }),
    [goal, tdeeResult],
  );

  const totals = useMemo(() => {
    return loggedFoods.reduce(
      (acc, entry) => ({
        calories: acc.calories + entry.item.calories * entry.quantity,
        protein: acc.protein + entry.item.protein * entry.quantity,
        carbs: acc.carbs + entry.item.carbs * entry.quantity,
        fats: acc.fats + entry.item.fats * entry.quantity,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 },
    );
  }, [loggedFoods]);

  const goalCalories = tdeeResult.goalCalories;
  const macroTargets = useMemo(
    () => ({
      calories: goalCalories,
      protein: tdeeResult.macros.protein,
      carbs: tdeeResult.macros.carbs,
      fats: tdeeResult.macros.fats,
    }),
    [
      goalCalories,
      tdeeResult.macros.protein,
      tdeeResult.macros.carbs,
      tdeeResult.macros.fats,
    ],
  );

  const missingMacros = useMemo(
    () => computeMissingMacros(macroTargets, totals),
    [macroTargets, totals],
  );

  const drawerFiltered = useMemo(() => {
    if (!selectedLocationKey) return [];
    return MOCK_DINING_DATA.filter((item) => {
      if (item.location !== selectedLocationKey) return false;
      if (preferences.halal && !item.isHalal) return false;
      if (preferences.vegan && !item.isVegan) return false;
      if (preferences.vegetarian && !item.isVegetarian) return false;
      if (preferences.glutenFree && !item.isGlutenFree) return false;
      return true;
    });
  }, [selectedLocationKey, preferences]);

  const menuScoreRows = useMemo((): MenuScoreRow[] => {
    return drawerFiltered.map((item) => {
      const { score, disqualified } = calculateMealScore(
        item,
        missingMacros,
        macroTargets,
        totals,
      );
      return {
        item,
        weightedRaw: score,
        disqualified,
        legacyScore: mealRecommendationScore(item, recContext),
      };
    });
  }, [drawerFiltered, missingMacros, macroTargets, totals, recContext]);

  const {
    topPicksWeighted,
    otherOptions,
    normalizedWeightById,
    weightMinRaw,
    weightMaxRaw,
  } = useMemo(() => {
    const eligible = menuScoreRows
      .filter((r) => !r.disqualified)
      .sort((a, b) => b.weightedRaw - a.weightedRaw);

    const eff = new Map<string, number>(
      eligible.map((r) => [r.item.id, r.weightedRaw]),
    );
    const { normalized: normalizedWeightById, minRaw, maxRaw } =
      normalizeHallScores(eff);

    if (eligible.length === 0) {
      return {
        topPicksWeighted: [] as MenuScoreRow[],
        otherOptions: [...menuScoreRows].sort((a, b) =>
          a.item.name.localeCompare(b.item.name),
        ),
        normalizedWeightById,
        weightMinRaw: minRaw,
        weightMaxRaw: maxRaw,
      };
    }

    const NORM_THRESHOLD = 0.52;
    const highTier = eligible.filter(
      (r) =>
        (normalizedWeightById.get(r.item.id) ?? 0) >= NORM_THRESHOLD,
    );

    let topPicksWeighted: MenuScoreRow[] =
      highTier.length >= 3
        ? highTier.slice(0, 14)
        : eligible.slice(
            0,
            Math.min(14, Math.max(3, eligible.length)),
          );

    const topIds = new Set(topPicksWeighted.map((r) => r.item.id));
    const otherOptions = menuScoreRows
      .filter((r) => !topIds.has(r.item.id))
      .sort((a, b) => a.item.name.localeCompare(b.item.name));

    return {
      topPicksWeighted,
      otherOptions,
      normalizedWeightById,
      weightMinRaw: minRaw,
      weightMaxRaw: maxRaw,
    };
  }, [menuScoreRows]);

  const macroGapPick = useMemo(() => {
    if (loggedFoods.length < 1 || drawerFiltered.length === 0) return null;
    return selectBestMacroGapItem(
      drawerFiltered,
      missingMacros,
      macroTargets,
      totals,
    );
  }, [
    loggedFoods.length,
    drawerFiltered,
    missingMacros,
    macroTargets,
    totals,
  ]);

  const macroGapMessage = useMemo(() => {
    if (!macroGapPick) return null;
    return buildMealMeMacroSuggestionText(
      missingMacros,
      macroTargets,
      macroGapPick,
    );
  }, [macroGapPick, missingMacros, macroTargets]);

  const hallOpen = isHallOpenNow();

  const logFood = useCallback((item: MenuItem) => {
    setLoggedFoods((prev) => {
      const idx = prev.findIndex((e) => e.item.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + 1,
        };
        return next;
      }
      return [...prev, { item, quantity: 1 }];
    });
  }, []);

  const adjustLoggedQuantity = useCallback(
    (menuItemId: string, delta: number) => {
      setLoggedFoods((prev) => {
        const idx = prev.findIndex((e) => e.item.id === menuItemId);
        if (idx < 0) return prev;
        const q = prev[idx].quantity + delta;
        if (q <= 0) return prev.filter((_, i) => i !== idx);
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: q };
        return next;
      });
    },
    [],
  );

  const runMacroGhost = useCallback(
    (item: MenuItem, buttonEl: HTMLElement | null) => {
      const anchor = macroFlyAnchorRef.current;
      if (prefersReducedMotion() || !buttonEl || !anchor) {
        logFood(item);
        return;
      }

      const ghost = document.createElement('div');
      ghost.setAttribute('aria-hidden', 'true');
      ghost.className = 'mealme-macro-ghost';
      ghost.textContent = `P ${item.protein}g · ${item.carbs}g · ${item.fats}g`;
      document.body.appendChild(ghost);

      const start = buttonEl.getBoundingClientRect();
      const end = anchor.getBoundingClientRect();

      const sx = start.left + start.width / 2;
      const sy = start.top + start.height / 2;
      const ex = end.left + end.width / 2;
      const ey = end.top + end.height / 2;

      const dx = ex - sx;
      const dy = ey - sy;

      gsap.set(ghost, {
        left: sx,
        top: sy,
        x: 0,
        y: 0,
        xPercent: -50,
        yPercent: -50,
        opacity: 1,
        scale: 1,
      });

      gsap.to(ghost, {
        x: dx,
        y: dy,
        scale: 0.94,
        opacity: 0.18,
        duration: 0.74,
        ease: 'power2.inOut',
        onComplete: () => {
          ghost.remove();
          logFood(item);
        },
      });
    },
    [logFood],
  );

  const selectHall = (hall: (typeof DINING_HALLS)[number]): void => {
    setSelectedLocationKey(hall.locationKey);
  };

  const selectedHallMeta = selectedLocationKey
    ? DINING_HALLS.find((h) => h.locationKey === selectedLocationKey)
    : undefined;

  const fontStack =
    "font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,'Inter',sans-serif]";

  return (
    <div
      className={`relative h-[100dvh] w-full min-h-0 overflow-hidden bg-white text-black ${fontStack}`}
    >
      <div
        className="grid h-full min-h-0 w-full grid-cols-[minmax(0,25%)_minmax(0,45%)_minmax(0,30%)]"
      >
        {/* Dining halls */}
        <aside
          className={`flex min-h-0 min-w-0 flex-col bg-white ${COLUMN_BORDER}`}
        >
          <div
            className="shrink-0 border-b border-solid border-gray-200 bg-white px-5 py-4"
          >
            <h2 className="text-base font-bold tracking-[-0.03em]">
              Dining halls
            </h2>
            <p className="mt-1 text-sm font-medium text-neutral-500">
              Choose a location
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-3 py-3">
            {DINING_HALLS.map((hall) => {
              const active = selectedLocationKey === hall.locationKey;
              return (
                <button
                  key={hall.id}
                  type="button"
                  onClick={() => selectHall(hall)}
                  className={`w-full rounded-lg border border-gray-200 p-4 text-left shadow-sm transition-all hover:-translate-y-px hover:shadow-md active:scale-[0.99] ${
                    active
                      ? 'border-primary/40 bg-green-50 ring-2 ring-primary/25'
                      : 'bg-white hover:bg-gray-50/80'
                  }`}
                >
                  <h3 className="text-[clamp(0.95rem,1.9vw,1.06rem)] font-bold leading-tight tracking-[-0.03em]">
                    {hall.displayName}
                  </h3>
                  <p
                    className={`mt-2 text-sm font-medium ${
                      hallOpen ? 'text-primary' : 'text-neutral-400'
                    }`}
                  >
                    {hallOpen ? 'Open' : 'Closed'}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Menu feed */}
        <section
          className={`flex min-h-0 min-w-0 flex-col bg-white ${COLUMN_BORDER}`}
        >
          <header
            className="shrink-0 border-b border-solid border-gray-200 px-5 py-4 md:px-8 md:py-5"
          >
            <p className="text-sm font-medium text-neutral-500">Menu feed</p>
            {selectedLocationKey && selectedHallMeta ? (
              <h1 className="mt-2 text-[clamp(1.2rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.03em]">
                {selectedHallMeta.displayName}
              </h1>
            ) : (
              <p className="mt-2 text-sm font-medium text-neutral-400">
                Select a dining hall to load the menu
              </p>
            )}
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-6 md:px-8 md:py-8">
            {!selectedLocationKey ? (
              <div className="flex min-h-[40vh] flex-col justify-center pb-8 text-center">
                <p className="text-lg font-bold tracking-[-0.02em]">
                  Choose a dining hall
                </p>
                <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-relaxed text-neutral-500">
                  Your menu feed appears here—top picks and every option that fits
                  your goals.
                </p>
              </div>
            ) : (
              <>
                {menuScoreRows.length === 0 ? (
                  <p className="py-14 text-center text-sm font-medium text-neutral-500">
                    No items match your dietary filters at this hall.
                  </p>
                ) : (
                  <div>
                    {loggedFoods.length >= 1 &&
                      macroGapPick &&
                      macroGapMessage && (
                        <MacroGapSuggestionCard
                          item={macroGapPick}
                          message={macroGapMessage}
                          onAddToPlan={(btn) => runMacroGhost(macroGapPick, btn)}
                        />
                      )}
                    {topPicksWeighted.length > 0 && (
                      <section className="mb-14">
                        <h2 className="mb-6 text-lg font-bold tracking-[-0.02em]">
                          Top picks for you
                        </h2>
                        <ul className="flex flex-col gap-3">
                          {topPicksWeighted.map((row) => {
                            const wNorm =
                              normalizedWeightById.get(row.item.id) ?? 0;
                            const pct = Math.round(
                              Math.min(100, Math.max(0, wNorm * 100)),
                            );
                            const greenA = weightedTopPickGreenAlpha(
                              row.weightedRaw,
                              weightMinRaw,
                              weightMaxRaw,
                            );
                            return (
                              <Fragment key={row.item.id}>
                                <MenuMealCardRow
                                  item={row.item}
                                  matchLabel={`${pct}% fit`}
                                  showMatch
                                  topPick
                                  cardStyle={{
                                    backgroundColor: `rgba(34, 197, 94, ${greenA})`,
                                  }}
                                  onAddToPlan={(btn) =>
                                    runMacroGhost(row.item, btn)
                                  }
                                />
                              </Fragment>
                            );
                          })}
                        </ul>
                      </section>
                    )}

                    <section>
                      <h2 className="mb-6 text-lg font-bold tracking-[-0.02em]">
                        All other options
                      </h2>
                      {otherOptions.length === 0 ? (
                        <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-sm font-medium text-neutral-600 shadow-sm">
                          Every filtered item is already in your top picks.
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-3">
                          {otherOptions.map(({ item, legacyScore }) => (
                            <Fragment key={item.id}>
                              <MenuMealCardRow
                                item={item}
                                matchLabel={`${matchPercent(legacyScore)}% match`}
                                showMatch
                                topPick={false}
                                onAddToPlan={(btn) =>
                                  runMacroGhost(item, btn)
                                }
                              />
                            </Fragment>
                          ))}
                        </ul>
                      )}
                    </section>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Live macro dashboard */}
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-white">
          <LiveMacroDashboard
            totals={totals}
            targets={macroTargets}
            loggedFoods={loggedFoods}
            onAdjustQuantity={adjustLoggedQuantity}
            onSignOut={onLogout}
            flyAnchorRef={macroFlyAnchorRef}
          />
        </div>
      </div>
    </div>
  );
}
