import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Loader2, Plus, Search, X } from 'lucide-react';
import {
  UserStats,
  Goal,
  DietaryPreferences,
  CampusId,
  MenuItem,
  LoggedFoodEntry,
  MealPeriod,
  MEAL_PERIOD_ORDER,
  displayMealPeriod,
} from '@/types';
import { calculateTDEE } from '@/lib/calculations';
import { matchPercent, mealRecommendationScore } from '@/lib/mealRecommendation';
import {
  campusData,
  diningCategoryOrderForTenant,
  userUniversityFromCampusId,
  type CampusDiningLocationConfig,
  type UniversityTenant,
} from '@/config/campusLocations';
import { DiningMenuError, fetchCampusLocationMenuItems } from '@/lib/diningService';
import { MenuMealCardRow } from '@/components/MenuMealCardRow';
import { MacroGapSuggestionCard } from '@/components/MacroGapSuggestionCard';
import { LiveMacroDashboard } from '@/components/LiveMacroDashboard';
import {
  buildTargetMatchReadoutText,
  calculateMealScore,
  computeMissingMacros,
  normalizeHallScores,
  selectBestMacroGapItem,
} from '@/lib/macroGap';

interface DashboardProps {
  stats: UserStats;
  goal: Goal;
  preferences: DietaryPreferences;
  /** From onboarding "Where do you eat?" — drives tenant + sidebar venues. */
  campusId: CampusId;
  onLogout: () => void;
}

const COLUMN_BORDER = 'border-r border-solid border-gray-200' as const;

/** Hero height at top of scroll (Tailwind `h-72`). */
const MENU_FEED_HEADER_MAX_H = 288;
/** Collapsed ribbon height once user has scrolled down the menu pane. */
const MENU_FEED_HEADER_MIN_H = 88;
/** How much menu-pane scroll drives full shrink (0 → fully expanded, ≥ this → collapsed). */
const MENU_FEED_HEADER_COLLAPSE_SCROLL = 200;

function isHallOpenNow(): boolean {
  const h = new Date().getHours();
  return h >= 7 && h < 21;
}

function defaultMealPeriodFromClock(): MealPeriod {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'Breakfast';
  if (h >= 11 && h < 14) return 'Lunch';
  if (h >= 14 && h < 17) return 'LateNight';
  if (h >= 17 && h < 22) return 'Dinner';
  return 'LateNight';
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Header art in `/public/hall-headers/{locationId}-header.jpg`. */
function diningHallHeaderImageSrc(locationId: string): string {
  return `/hall-headers/${locationId}-header.jpg`;
}

/** Space-separated tokens must all appear in dish name or station (case-insensitive). */
function menuItemMatchesSearchTokens(
  item: MenuItem,
  tokens: readonly string[],
): boolean {
  if (tokens.length === 0) return true;
  const name = item.name.toLowerCase();
  const station = item.station?.toLowerCase() ?? '';
  return tokens.every(
    (tok) => name.includes(tok) || station.includes(tok),
  );
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
  campusId,
  onLogout,
}: DashboardProps) {
  const userUniversity: UniversityTenant =
    userUniversityFromCampusId(campusId);

  const diningLocations = campusData[userUniversity];
  const locationCategoryOrder = diningCategoryOrderForTenant(userUniversity);
  const tdeeResult = useMemo(() => calculateTDEE(stats, goal), [stats, goal]);
  const [loggedFoods, setLoggedFoods] = useState<LoggedFoodEntry[]>([]);
  const [activeMealPeriod, setActiveMealPeriod] = useState<MealPeriod>(
    defaultMealPeriodFromClock,
  );
  const ledgerFlyTargetsRef = useRef<Record<MealPeriod, HTMLDivElement | null>>(
    {
      Breakfast: null,
      Lunch: null,
      Dinner: null,
      LateNight: null,
    },
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );
  const [liveMenuByHall, setLiveMenuByHall] = useState<Record<string, MenuItem[]>>(
    () => ({}),
  );
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  const macroFlyAnchorRef = useRef<HTMLDivElement>(null);
  const menuFeedScrollRef = useRef<HTMLDivElement>(null);
  const menuHeaderShrinkRaf = useRef<number | undefined>(undefined);
  const [macroAbsorbPulseKey, setMacroAbsorbPulseKey] = useState(0);
  const [hallHeaderImageFailed, setHallHeaderImageFailed] = useState(false);
  const [menuFeedHeaderShrinkT, setMenuFeedHeaderShrinkT] = useState(0);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');

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

  useEffect(() => {
    setSelectedLocationId(null);
    setLiveMenuByHall({});
    setMenuError(null);
    setMenuLoading(false);
  }, [campusId]);

  useEffect(() => {
    if (!selectedLocationId) {
      setMenuLoading(false);
      setMenuError(null);
      return;
    }

    const loc = diningLocations.find((l) => l.id === selectedLocationId);
    if (!loc) {
      setMenuLoading(false);
      setMenuError(null);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();

    setMenuLoading(true);
    setMenuError(null);

    fetchCampusLocationMenuItems(userUniversity, loc.slug, loc.id, ac.signal)
      .then((items) => {
        if (cancelled) return;
        setLiveMenuByHall((prev) => ({ ...prev, [loc.id]: items }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const msg =
          err instanceof DiningMenuError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : 'Could not load dining menu';
        setMenuError(msg);
      })
      .finally(() => {
        if (!cancelled) setMenuLoading(false);
      });

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [selectedLocationId, userUniversity, diningLocations]);

  useEffect(() => {
    setHallHeaderImageFailed(false);
  }, [selectedLocationId]);

  useEffect(() => {
    menuFeedScrollRef.current?.scrollTo({ top: 0 });
    setMenuFeedHeaderShrinkT(0);
    setMenuSearchQuery('');
  }, [selectedLocationId]);

  useEffect(() => {
    return () => {
      if (menuHeaderShrinkRaf.current != null)
        cancelAnimationFrame(menuHeaderShrinkRaf.current);
    };
  }, []);

  const updateMenuFeedHeaderShrink = useCallback((): void => {
    menuHeaderShrinkRaf.current = undefined;
    const pane = menuFeedScrollRef.current;
    if (!pane) return;
    const prefersStill =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = prefersStill
      ? 0
      : Math.min(1, pane.scrollTop / MENU_FEED_HEADER_COLLAPSE_SCROLL);
    setMenuFeedHeaderShrinkT(t);
  }, []);

  const handleMenuFeedScroll = useCallback((): void => {
    if (menuHeaderShrinkRaf.current != null) return;
    menuHeaderShrinkRaf.current = window.requestAnimationFrame(
      updateMenuFeedHeaderShrink,
    );
  }, [updateMenuFeedHeaderShrink]);

  const rawLocationMenu = selectedLocationId
    ? liveMenuByHall[selectedLocationId]
    : undefined;

  /** Meal windows this venue publishes in the API (`servedDuring` union on raw menu). */
  const menuPeriodTabsOffered = useMemo((): MealPeriod[] => {
    if (!selectedLocationId || rawLocationMenu === undefined) {
      return [...MEAL_PERIOD_ORDER];
    }
    if (rawLocationMenu.length === 0) {
      return [...MEAL_PERIOD_ORDER];
    }
    const set = new Set<MealPeriod>();
    for (const item of rawLocationMenu) {
      for (const p of item.servedDuring) set.add(p);
    }
    const offered = MEAL_PERIOD_ORDER.filter((p) => set.has(p));
    return offered.length > 0 ? offered : [...MEAL_PERIOD_ORDER];
  }, [selectedLocationId, rawLocationMenu]);

  useEffect(() => {
    if (!selectedLocationId || rawLocationMenu === undefined) return;
    if (rawLocationMenu.length === 0) return;
    const first = menuPeriodTabsOffered[0];
    if (!first) return;
    if (!menuPeriodTabsOffered.includes(activeMealPeriod)) {
      setActiveMealPeriod(first);
    }
  }, [
    selectedLocationId,
    rawLocationMenu,
    menuPeriodTabsOffered,
    activeMealPeriod,
  ]);

  const drawerFiltered = useMemo(() => {
    if (!selectedLocationId || rawLocationMenu === undefined) return [];
    return rawLocationMenu.filter((item) => {
      if (preferences.halal && !item.isHalal) return false;
      if (preferences.vegan && !item.isVegan) return false;
      if (preferences.vegetarian && !item.isVegetarian) return false;
      if (preferences.glutenFree && !item.isGlutenFree) return false;
      return true;
    });
  }, [selectedLocationId, rawLocationMenu, preferences]);

  const mealPeriodFiltered = useMemo(
    () =>
      drawerFiltered.filter((item) =>
        item.servedDuring.includes(activeMealPeriod),
      ),
    [drawerFiltered, activeMealPeriod],
  );

  const menuUnavailableForActivePeriod = useMemo(
    () =>
      drawerFiltered.length > 0 && mealPeriodFiltered.length === 0,
    [drawerFiltered, mealPeriodFiltered],
  );

  const menuSearchTokens = useMemo(
    () =>
      menuSearchQuery
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean),
    [menuSearchQuery],
  );

  const drawerSearchFiltered = useMemo(() => {
    if (menuSearchTokens.length === 0) return mealPeriodFiltered;
    return mealPeriodFiltered.filter((item) =>
      menuItemMatchesSearchTokens(item, menuSearchTokens),
    );
  }, [mealPeriodFiltered, menuSearchTokens]);

  const emptyMenuFromApi =
    Boolean(selectedLocationId) &&
    rawLocationMenu !== undefined &&
    rawLocationMenu.length === 0;

  const drawerFilteredMain = useMemo(
    () => drawerSearchFiltered.filter((i) => i.isMainMeal),
    [drawerSearchFiltered],
  );

  const drawerFilteredAddons = useMemo(
    () => drawerSearchFiltered.filter((i) => i.isAddOn),
    [drawerSearchFiltered],
  );

  const menuScoreRows = useMemo((): MenuScoreRow[] => {
    return drawerFilteredMain.map((item) => {
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
  }, [drawerFilteredMain, missingMacros, macroTargets, totals, recContext]);

  const {
    topPicksWeighted,
    otherOptions,
    normalizedWeightById,
  } = useMemo(() => {
    const eligible = menuScoreRows
      .filter((r) => !r.disqualified)
      .sort((a, b) => b.weightedRaw - a.weightedRaw);

    const eff = new Map<string, number>(
      eligible.map((r) => [r.item.id, r.weightedRaw]),
    );
    const { normalized: normalizedWeightById } = normalizeHallScores(eff);

    if (eligible.length === 0) {
      return {
        topPicksWeighted: [] as MenuScoreRow[],
        otherOptions: [...menuScoreRows].sort((a, b) =>
          a.item.name.localeCompare(b.item.name),
        ),
        normalizedWeightById,
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
    };
  }, [menuScoreRows]);

  const macroGapPick = useMemo(() => {
    if (loggedFoods.length < 1 || drawerFilteredMain.length === 0) return null;
    return selectBestMacroGapItem(
      drawerFilteredMain,
      missingMacros,
      macroTargets,
      totals,
    );
  }, [
    loggedFoods.length,
    drawerFilteredMain,
    missingMacros,
    macroTargets,
    totals,
  ]);

  const macroGapMessage = useMemo(() => {
    if (!macroGapPick) return null;
    return buildTargetMatchReadoutText(
      missingMacros,
      macroTargets,
      macroGapPick,
    );
  }, [macroGapPick, missingMacros, macroTargets]);

  const hallOpen = isHallOpenNow();

  const logFood = useCallback((item: MenuItem, mealPeriod: MealPeriod) => {
    setLoggedFoods((prev) => {
      const idx = prev.findIndex(
        (e) => e.item.id === item.id && e.mealPeriod === mealPeriod,
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + 1,
        };
        return next;
      }
      return [...prev, { item, quantity: 1, mealPeriod }];
    });
  }, []);

  const adjustLoggedQuantity = useCallback(
    (menuItemId: string, mealPeriod: MealPeriod, delta: number) => {
      setLoggedFoods((prev) => {
        const idx = prev.findIndex(
          (e) => e.item.id === menuItemId && e.mealPeriod === mealPeriod,
        );
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

  const registerLedgerFlyAnchor = useCallback(
    (period: MealPeriod, el: HTMLDivElement | null) => {
      ledgerFlyTargetsRef.current[period] = el;
    },
    [],
  );

  const runMacroGhost = useCallback(
    (item: MenuItem, buttonEl: HTMLElement | null, mealPeriod: MealPeriod) => {
      const fallbackAnchor = macroFlyAnchorRef.current;
      const ledgerEl = ledgerFlyTargetsRef.current[mealPeriod];
      const anchor = ledgerEl ?? fallbackAnchor;
      if (prefersReducedMotion() || !buttonEl || !anchor) {
        logFood(item, mealPeriod);
        return;
      }

      const shell = document.createElement('div');
      shell.setAttribute('aria-hidden', 'true');
      shell.className = 'mealme-energy-orb-shell';
      const orb = document.createElement('div');
      orb.className = 'mealme-energy-orb';
      shell.appendChild(orb);
      document.body.appendChild(shell);

      const start = buttonEl.getBoundingClientRect();
      const end = anchor.getBoundingClientRect();

      const sx = start.left + start.width / 2;
      const sy = start.top + start.height / 2;
      const ex = end.left + end.width / 2;
      const ey = end.top + end.height / 2;

      const dx = ex - sx;
      const dy = ey - sy;
      /** Vertical arc offset so the composite path arcs “upward” (~50–100px apex). */
      const arcPeek = Math.min(
        100,
        Math.max(52, Math.hypot(dx, dy) * 0.11),
      );

      gsap.set(shell, {
        left: sx,
        top: sy,
        x: 0,
        y: 0,
        xPercent: -50,
        yPercent: -50,
      });
      gsap.set(orb, { x: 0, y: 0, opacity: 1 });

      const D = 0.46;

      gsap.timeline({
        defaults: { force3D: true },
        onComplete: () => {
          shell.remove();
          logFood(item, mealPeriod);
          setMacroAbsorbPulseKey((n) => n + 1);
        },
      })
        .to(
          shell,
          { x: dx, y: dy, duration: D, ease: 'power2.inOut' },
          0,
        )
        .to(
          orb,
          {
            y: -arcPeek,
            duration: D * 0.5,
            ease: 'power2.out',
          },
          0,
        )
        .to(
          orb,
          {
            y: 0,
            duration: D * 0.5,
            ease: 'power2.in',
          },
          D * 0.5,
        );
    },
    [logFood],
  );

  const selectHall = (loc: CampusDiningLocationConfig): void => {
    setSelectedLocationId(loc.id);
  };

  const selectedHallMeta = selectedLocationId
    ? diningLocations.find((l) => l.id === selectedLocationId)
    : undefined;

  const menuFeedHeaderHeightPx = useMemo(
    () =>
      MENU_FEED_HEADER_MAX_H -
      menuFeedHeaderShrinkT *
        (MENU_FEED_HEADER_MAX_H - MENU_FEED_HEADER_MIN_H),
    [menuFeedHeaderShrinkT],
  );

  const menuFeedHeaderTitleStyle = useMemo(() => {
    const t = menuFeedHeaderShrinkT;
    return {
      fontSize: `${2.25 - t * 0.8125}rem`,
      lineHeight: 1.05 - t * 0.12,
      letterSpacing: `${-0.03 - t * 0.02}em`,
      bottom: `${24 - t * 13}px`,
    } as const;
  }, [menuFeedHeaderShrinkT]);

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
          <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-3">
            {locationCategoryOrder.map((category, ci) => {
              const halls = diningLocations.filter(
                (l) => l.category === category,
              );
              if (halls.length === 0) return null;

              return (
                <div key={category} className={ci > 0 ? 'mt-5' : ''}>
                  <p className="px-5 pb-2 pt-1 text-xs font-bold uppercase tracking-widest text-neutral-400">
                    {category}
                  </p>
                  <div>
                    {halls.map((loc) => {
                      const active = selectedLocationId === loc.id;
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => selectHall(loc)}
                          className={`flex w-full flex-col gap-1 border-b border-gray-100 px-5 py-3.5 text-left transition-colors ${
                            active
                              ? 'border-l-4 border-l-brand-green bg-gray-50 hover:bg-gray-50'
                              : 'border-l-4 border-l-transparent bg-white hover:bg-gray-50'
                          }`}
                        >
                          <h3 className="text-[clamp(0.95rem,1.9vw,1.06rem)] font-bold leading-tight tracking-[-0.03em]">
                            {loc.name}
                          </h3>
                          <div
                            className={`flex items-center text-sm font-medium ${
                              hallOpen ? 'text-neutral-600' : 'text-gray-400'
                            }`}
                          >
                            <span
                              className={`mr-1.5 inline-block size-2 shrink-0 rounded-full ${
                                hallOpen ? 'bg-brand-green' : 'bg-gray-300'
                              }`}
                              aria-hidden
                            />
                            {hallOpen ? 'Open' : 'Closed'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Menu feed */}
        <section
          className={`flex min-h-0 min-w-0 flex-col bg-white ${COLUMN_BORDER}`}
        >
          {selectedHallMeta ? (
            <div
              className="relative w-full shrink-0 overflow-hidden bg-white"
              style={{ height: menuFeedHeaderHeightPx }}
            >
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200"
                aria-hidden
              />
              {!hallHeaderImageFailed ? (
                <img
                  src={diningHallHeaderImageSrc(selectedHallMeta.id)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  style={{
                    objectPosition: `center ${48 + menuFeedHeaderShrinkT * 18}%`,
                  }}
                  loading="lazy"
                  decoding="async"
                  onError={() => setHallHeaderImageFailed(true)}
                />
              ) : null}
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent"
                aria-hidden
              />
              <h1
                style={menuFeedHeaderTitleStyle}
                className="absolute left-8 right-8 z-[1] font-bold text-neutral-900"
              >
                {selectedHallMeta.name}
              </h1>
            </div>
          ) : null}
          {selectedLocationId &&
          selectedHallMeta &&
          rawLocationMenu &&
          rawLocationMenu.length > 0 &&
          !menuLoading &&
          !menuError ? (
            <nav
              aria-label="Meal period for menu and plan"
              className="shrink-0 border-b border-gray-100 bg-white px-5 md:px-8"
            >
              <div className="-mb-px flex">
                {menuPeriodTabsOffered.map((period) => {
                  const active = activeMealPeriod === period;
                  return (
                    <button
                      key={period}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setActiveMealPeriod(period)}
                      className={`min-w-0 flex-1 border-b-[2px] py-3 text-sm transition-colors motion-reduce:transition-none max-sm:text-[13px] ${
                        active
                          ? 'border-brand-green font-bold text-brand-green'
                          : 'border-transparent font-medium text-neutral-400 hover:text-neutral-600'
                      }`}
                    >
                      {displayMealPeriod(period)}
                    </button>
                  );
                })}
              </div>
            </nav>
          ) : null}
          <div
            ref={menuFeedScrollRef}
            onScroll={handleMenuFeedScroll}
            className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-6 md:px-8 md:py-8"
          >
            {!selectedLocationId ? (
              <div className="flex min-h-[40vh] flex-col justify-center pb-8 text-center">
                <p className="text-lg font-bold tracking-[-0.02em]">
                  Choose a dining hall
                </p>
                <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-relaxed text-neutral-500">
                  Your menu feed appears here—top picks and every option that fits
                  your goals.
                </p>
              </div>
            ) : menuLoading ? (
              <div
                className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-16"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <Loader2
                  className="h-8 w-8 shrink-0 animate-spin text-neutral-400"
                  aria-hidden
                />
                <p className="text-sm font-medium text-neutral-500">Loading menu…</p>
              </div>
            ) : menuError ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 py-16 text-center">
                <p className="text-lg font-bold tracking-[-0.02em] text-neutral-900">
                  Menu unavailable
                </p>
                <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-neutral-500">
                  {menuError}
                </p>
              </div>
            ) : (
              <>
                {menuUnavailableForActivePeriod ? (
                  <div className="flex min-h-[36vh] flex-col items-center justify-center px-2 py-12 text-center">
                    <p className="max-w-md text-[0.9375rem] font-medium leading-relaxed text-neutral-600">
                      Menu not available for{' '}
                      <span className="font-semibold text-neutral-800">
                        {displayMealPeriod(activeMealPeriod)}
                      </span>{' '}
                      at this location.
                    </p>
                  </div>
                ) : (
                  <>
                    {rawLocationMenu &&
                      rawLocationMenu.length > 0 &&
                      !menuUnavailableForActivePeriod && (
                      <div className="mb-6">
                        <label htmlFor="menu-feed-search" className="sr-only">
                          Search meals at this dining hall
                        </label>
                        <div className="relative flex items-center">
                          <Search
                            className="pointer-events-none absolute left-3.5 top-1/2 h-[1.0625rem] w-[1.0625rem] -translate-y-1/2 text-neutral-400"
                            strokeWidth={2.25}
                            aria-hidden
                          />
                          <input
                            id="menu-feed-search"
                            type="search"
                            value={menuSearchQuery}
                            onChange={(e) =>
                              setMenuSearchQuery(e.target.value)
                            }
                            placeholder="Search meals..."
                            autoComplete="off"
                            spellCheck={false}
                            enterKeyHint="search"
                            className="min-h-[2.625rem] w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-[0.9375rem] font-medium text-neutral-900 shadow-sm outline-none placeholder:text-neutral-400 focus:border-primary/45 focus:ring-2 focus:ring-primary/20"
                          />
                          {menuSearchQuery.trim().length > 0 ? (
                            <button
                              type="button"
                              aria-label="Clear search"
                              onClick={() => setMenuSearchQuery('')}
                              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
                            >
                              <X
                                className="h-4 w-4"
                                strokeWidth={2.25}
                                aria-hidden
                              />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {drawerFiltered.length === 0 ? (
                      <p className="py-14 text-center text-sm font-medium text-neutral-500">
                        {emptyMenuFromApi
                          ? 'No menu data available for this location today.'
                          : 'No items match your dietary filters at this hall.'}
                      </p>
                    ) : drawerSearchFiltered.length === 0 ? (
                      <p className="py-12 text-center text-sm font-medium leading-relaxed text-neutral-500">
                        No meals match{' '}
                        <span className="font-semibold text-neutral-700">
                          &ldquo;{menuSearchQuery.trim()}&rdquo;
                        </span>
                        . Try different words or clear the search.
                      </p>
                    ) : (
                      <div>
                        {drawerFilteredMain.length === 0 ? (
                          <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-relaxed text-amber-950">
                            No main-course items match your filters right now.
                            Try loosening dietary preferences or use add-ons
                            below.
                          </p>
                        ) : null}

                        {menuScoreRows.length > 0 ? (
                          <>
                            {loggedFoods.length >= 1 &&
                              macroGapPick &&
                              macroGapMessage && (
                                <MacroGapSuggestionCard
                                  item={macroGapPick}
                                  message={macroGapMessage}
                                  onAddToPlan={(btn) =>
                                    runMacroGhost(
                                      macroGapPick,
                                      btn,
                                      activeMealPeriod,
                                    )
                                  }
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
                                      normalizedWeightById.get(row.item.id) ??
                                      0;
                                    const pct = Math.round(
                                      Math.min(
                                        100,
                                        Math.max(0, wNorm * 100),
                                      ),
                                    );
                                    return (
                                      <Fragment key={row.item.id}>
                                        <MenuMealCardRow
                                          item={row.item}
                                          matchLabel={`${pct}% match`}
                                          showMatch
                                          onAddToPlan={(btn) =>
                                            runMacroGhost(
                                              row.item,
                                              btn,
                                              activeMealPeriod,
                                            )
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
                                        onAddToPlan={(btn) =>
                                          runMacroGhost(
                                            item,
                                            btn,
                                            activeMealPeriod,
                                          )
                                        }
                                      />
                                    </Fragment>
                                  ))}
                                </ul>
                              )}
                            </section>
                          </>
                        ) : null}

                        {drawerFilteredAddons.length > 0 ? (
                          <section
                            className={
                              menuScoreRows.length > 0
                                ? 'mt-14 border-t border-gray-200 pt-10'
                                : 'mt-2'
                            }
                          >
                            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                              Sides & Add-ons
                            </h2>
                            <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-neutral-50/80">
                              {drawerFilteredAddons.map((item) => (
                                <li
                                  key={item.id}
                                  className="flex min-h-[2.25rem] items-center gap-2 px-3 py-1.5"
                                >
                                  <span className="min-w-0 flex-1 truncate text-xs font-medium leading-snug text-neutral-800">
                                    {item.name}
                                  </span>
                                  <span className="shrink-0 tabular-nums text-[0.6875rem] font-medium text-neutral-500">
                                    {Math.round(item.calories)} cal
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={`Add ${item.name} to plan`}
                                    onClick={(e) =>
                                      runMacroGhost(
                                        item,
                                        e.currentTarget,
                                        activeMealPeriod,
                                      )
                                    }
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-neutral-600 shadow-sm transition hover:bg-gray-50 active:scale-[0.97]"
                                  >
                                    <Plus
                                      className="h-3.5 w-3.5"
                                      strokeWidth={2.5}
                                      aria-hidden
                                    />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </section>
                        ) : null}
                      </div>
                    )}
                  </>
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
            activeMealPeriod={activeMealPeriod}
            onActiveMealPeriodChange={setActiveMealPeriod}
            registerLedgerFlyAnchor={registerLedgerFlyAnchor}
            onAdjustQuantity={adjustLoggedQuantity}
            mealPeriodChoices={
              selectedLocationId &&
              rawLocationMenu !== undefined &&
              rawLocationMenu.length > 0
                ? menuPeriodTabsOffered
                : undefined
            }
            onSignOut={onLogout}
            flyAnchorRef={macroFlyAnchorRef}
            absorbPulseKey={macroAbsorbPulseKey}
          />
        </div>
      </div>
    </div>
  );
}
