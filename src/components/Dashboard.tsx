import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  UserStats,
  Goal,
  DietaryPreferences,
  MenuItem,
} from '@/types';
import { calculateTDEE } from '@/lib/calculations';
import {
  isTopPick,
  matchPercent,
  mealRecommendationScore,
  topPickGreenAlpha,
} from '@/lib/mealRecommendation';
import { MOCK_DINING_DATA } from '@/data/mockDining';
import { DINING_HALLS } from '@/data/diningHallMeta';
import { MenuMealCardRow } from '@/components/MenuMealCardRow';
import { LiveMacroDashboard } from '@/components/LiveMacroDashboard';

interface DashboardProps {
  stats: UserStats;
  goal: Goal;
  preferences: DietaryPreferences;
  onLogout: () => void;
}

const COLUMN_BORDER =
  'border-r border-solid border-[#e2e8f0]' as const;
const BORDER_SUBTLE = 'border-[#e2e8f0]';

function isHallOpenNow(): boolean {
  const h = new Date().getHours();
  return h >= 7 && h < 21;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type ScoredItem = {
  item: MenuItem;
  score: number;
};

export default function Dashboard({
  stats,
  goal,
  preferences,
  onLogout,
}: DashboardProps) {
  const tdeeResult = useMemo(() => calculateTDEE(stats, goal), [stats, goal]);
  const [planItems, setPlanItems] = useState<MenuItem[]>([]);
  const [selectedLocationKey, setSelectedLocationKey] = useState<string | null>(
    null,
  );

  const macroFlyAnchorRef = useRef<HTMLDivElement>(null);
  const calorieFillRef = useRef<HTMLDivElement>(null);

  const recContext = useMemo(
    () => ({ goal, tdee: tdeeResult }),
    [goal, tdeeResult],
  );

  const totals = useMemo(() => {
    return planItems.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fats: acc.fats + item.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 },
    );
  }, [planItems]);

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

  const scoredMenu: ScoredItem[] = useMemo(() => {
    return drawerFiltered.map((item) => ({
      item,
      score: mealRecommendationScore(item, recContext),
    }));
  }, [drawerFiltered, recContext]);

  const { topPicks, otherOptions } = useMemo(() => {
    const tops = scoredMenu
      .filter((s) => isTopPick(s.score))
      .sort(
        (a, b) =>
          b.score - a.score || a.item.name.localeCompare(b.item.name),
      );
    const rest = scoredMenu
      .filter((s) => !isTopPick(s.score))
      .sort((a, b) => a.item.name.localeCompare(b.item.name));
    return { topPicks: tops, otherOptions: rest };
  }, [scoredMenu]);

  const hallOpen = isHallOpenNow();

  const addToPlanImmediate = useCallback((item: MenuItem) => {
    setPlanItems((prev) => [
      ...prev,
      { ...item, id: `${item.id}-${Date.now()}` },
    ]);
  }, []);

  const runMacroGhost = useCallback(
    (item: MenuItem, buttonEl: HTMLElement | null) => {
      const anchor = macroFlyAnchorRef.current;
      if (prefersReducedMotion() || !buttonEl || !anchor) {
        addToPlanImmediate(item);
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
          addToPlanImmediate(item);
        },
      });
    },
    [addToPlanImmediate],
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
            className={`shrink-0 border-b border-solid border-[#e2e8f0] bg-white px-5 py-4`}
          >
            <h2 className="text-base font-bold tracking-[-0.03em]">
              Dining halls
            </h2>
            <p className="mt-1 text-sm font-medium text-neutral-500">
              Choose a location
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            {DINING_HALLS.map((hall) => {
              const active = selectedLocationKey === hall.locationKey;
              return (
                <button
                  key={hall.id}
                  type="button"
                  onClick={() => selectHall(hall)}
                  className={`w-full rounded-none border-b ${BORDER_SUBTLE} p-5 text-left transition-colors ${
                    active
                      ? 'border-l-4 border-l-primary bg-green-50 pl-[16px]'
                      : 'border-l-4 border-l-transparent hover:bg-neutral-50'
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
            className={`shrink-0 border-b border-solid border-[#e2e8f0] px-5 py-4 md:px-8 md:py-5`}
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
                {scoredMenu.length === 0 ? (
                  <p className="py-14 text-center text-sm font-medium text-neutral-500">
                    No items match your dietary filters at this hall.
                  </p>
                ) : (
                  <div>
                    {topPicks.length > 0 && (
                      <section className="mb-14">
                        <h2 className="mb-6 text-lg font-bold tracking-[-0.02em]">
                          Top picks for you
                        </h2>
                        <ul className="border-t border-black">
                          {topPicks.map(({ item, score }) => (
                            <Fragment key={item.id}>
                              <MenuMealCardRow
                                item={item}
                                matchLabel={`${matchPercent(score)}% match`}
                                showMatch
                                topPick
                                cardStyle={{
                                  backgroundColor: `rgba(34, 197, 94, ${topPickGreenAlpha(score)})`,
                                }}
                                onAddToPlan={(btn) => runMacroGhost(item, btn)}
                              />
                            </Fragment>
                          ))}
                        </ul>
                      </section>
                    )}

                    <section>
                      <h2 className="mb-6 text-lg font-bold tracking-[-0.02em]">
                        All other options
                      </h2>
                      {otherOptions.length === 0 ? (
                        <p className="border border-black bg-neutral-50 px-4 py-6 text-sm font-medium text-neutral-600">
                          Every filtered item is already in your top picks.
                        </p>
                      ) : (
                        <ul className="border-t border-black">
                          {otherOptions.map(({ item, score }) => (
                            <Fragment key={item.id}>
                              <MenuMealCardRow
                                item={item}
                                matchLabel={`${matchPercent(score)}% match`}
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
            onSignOut={onLogout}
            flyAnchorRef={macroFlyAnchorRef}
            calorieFillRef={calorieFillRef}
          />
        </div>
      </div>
    </div>
  );
}
