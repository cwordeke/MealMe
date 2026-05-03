import type { MenuItem } from '@/types';

/** Same shape as daily targets / logged totals */
export type MacroBreakdown = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export type MealScoreResult = {
  score: number;
  /** Meal exceeds what's left on at least one macro or calories */
  disqualified: boolean;
};

const EPS = 0.05;

/** Massive penalty for blowing past what's left today */
const STRICT_OVERSHOOT_MULTIPLIER = 2_500;

/** Ramp in as projected daily use crosses 95% of a macro target */
const PROXIMITY_WEIGHT = 95;

/** Penalize mismatch between normalized meal gram profile and remaining gram profile */
const DISTANCE_WEIGHT = 42;

/** Reward covering the day's biggest remaining macro share */
const FULFILL_WEIGHT = 86;

/** So tiny remaining budgets do not explode ratios */
function clampFrac(numer: number, denom: number): number {
  return numer / Math.max(denom, EPS);
}

/**
 * Remaining budget toward daily targets (floored at zero).
 */
export function computeMissingMacros(
  targets: MacroBreakdown,
  logged: MacroBreakdown,
): MacroBreakdown {
  return {
    calories: Math.max(0, targets.calories - logged.calories),
    protein: Math.max(0, targets.protein - logged.protein),
    carbs: Math.max(0, targets.carbs - logged.carbs),
    fats: Math.max(0, targets.fats - logged.fats),
  };
}

type MacroGramKey = 'protein' | 'carbs' | 'fats';

function sumMealMacrosGrams(meal: MenuItem): number {
  return meal.protein + meal.carbs + meal.fats + EPS;
}

function sumRemainingGrams(rem: MacroBreakdown): number {
  return rem.protein + rem.carbs + rem.fats + EPS;
}

/**
 * Multi-variable score: weighted profile distance, strict overshoot disqualification,
 * proximity penalties near daily caps, fulfillment of the hardest macro gap.
 */
export function calculateMealScore(
  meal: MenuItem,
  remaining: MacroBreakdown,
  targets: MacroBreakdown,
  logged: MacroBreakdown,
): MealScoreResult {
  // --- Strict penalties (macros and calories cannot exceed what's left)
  let overshootPenalty = 0;
  let disqualified = false;

  if (meal.calories > remaining.calories + EPS) {
    disqualified = true;
    overshootPenalty +=
      STRICT_OVERSHOOT_MULTIPLIER *
      (1 + (meal.calories - remaining.calories) / Math.max(targets.calories, 1));
  }
  if (meal.protein > remaining.protein + EPS) {
    disqualified = true;
    overshootPenalty +=
      STRICT_OVERSHOOT_MULTIPLIER *
      (1 + (meal.protein - remaining.protein) / Math.max(targets.protein, 1));
  }
  if (meal.carbs > remaining.carbs + EPS) {
    disqualified = true;
    overshootPenalty +=
      STRICT_OVERSHOOT_MULTIPLIER *
      (1 + (meal.carbs - remaining.carbs) / Math.max(targets.carbs, 1));
  }
  if (meal.fats > remaining.fats + EPS) {
    disqualified = true;
    overshootPenalty +=
      STRICT_OVERSHOOT_MULTIPLIER *
      (1 + (meal.fats - remaining.fats) / Math.max(targets.fats, 1));
  }

  if (disqualified) {
    return {
      score: -1e15 - overshootPenalty,
      disqualified: true,
    };
  }

  let score = 0;

  const after = {
    protein: logged.protein + meal.protein,
    carbs: logged.carbs + meal.carbs,
    fats: logged.fats + meal.fats,
    calories: logged.calories + meal.calories,
  };

  // --- Proximity penalties: discourage landing at or above 95% of any daily macro
  type Edge = readonly [keyof MacroBreakdown, number, number];
  const edges: Edge[] = [
    ['protein', targets.protein, after.protein],
    ['carbs', targets.carbs, after.carbs],
    ['fats', targets.fats, after.fats],
    ['calories', targets.calories, after.calories],
  ];
  for (const [, cap, ate] of edges) {
    const ratio = clampFrac(ate, cap);
    if (ratio >= 0.95) {
      const over = ratio - 0.95;
      score -= PROXIMITY_WEIGHT * (over / 0.05) ** 1.35;
    }
  }

  // --- Weighted Euclidean distance between gram profile shapes
  const remGram = sumRemainingGrams(remaining);
  const mGram = sumMealMacrosGrams(meal);
  const rp = remaining.protein / remGram;
  const rc = remaining.carbs / remGram;
  const rf = remaining.fats / remGram;
  const mp = meal.protein / mGram;
  const mc = meal.carbs / mGram;
  const mf = meal.fats / mGram;

  const wP = clampFrac(remaining.protein, targets.protein);
  const wC = clampFrac(remaining.carbs, targets.carbs);
  const wF = clampFrac(remaining.fats, targets.fats);
  const wSum = wP + wC + wF + EPS;
  const nwP = (wP / wSum) * 3;
  const nwC = (wC / wSum) * 3;
  const nwF = (wF / wSum) * 3;

  const weightedDistSq =
    nwP * (mp - rp) ** 2 + nwC * (mc - rc) ** 2 + nwF * (mf - rf) ** 2;
  score -= DISTANCE_WEIGHT * Math.sqrt(weightedDistSq);

  // --- Calorie fit: soften distance for meals that track remaining calorie share
  const calRemainShare = clampFrac(remaining.calories, targets.calories);
  const calMealShare = clampFrac(meal.calories, Math.max(remaining.calories, 1));
  if (calRemainShare > 0.06) {
    score -= 12 * (calMealShare - Math.min(calMealShare, 1)) ** 2;
    score += 28 * clampFrac(meal.calories, remaining.calories + meal.calories) * calRemainShare;
  }

  // --- Reward fulfilling the macro with the largest remaining share (most needed among P,C,F)
  const needP = clampFrac(remaining.protein, targets.protein);
  const needC = clampFrac(remaining.carbs, targets.carbs);
  const needF = clampFrac(remaining.fats, targets.fats);
  let lead: MacroGramKey = 'protein';
  let leadNeed = needP;
  if (needC > leadNeed + 1e-6) {
    lead = 'carbs';
    leadNeed = needC;
  }
  if (needF > leadNeed + 1e-6) {
    lead = 'fats';
    leadNeed = needF;
  }

  const gramMap: Record<MacroGramKey, number> = {
    protein: meal.protein,
    carbs: meal.carbs,
    fats: meal.fats,
  };
  const remMap: Record<MacroGramKey, number> = {
    protein: remaining.protein,
    carbs: remaining.carbs,
    fats: remaining.fats,
  };
  const delivery = gramMap[lead] / Math.max(remMap[lead], EPS);
  if (delivery > 0) {
    const capped = Math.min(delivery, 1.35);
    score +=
      FULFILL_WEIGHT * leadNeed ** 0.75 * capped * (delivery <= 1.02 ? 1 : 0.65);
  }

  return { score, disqualified: false };
}

export function selectBestMacroGapItem(
  items: MenuItem[],
  remaining: MacroBreakdown,
  targets: MacroBreakdown,
  logged: MacroBreakdown,
): MenuItem | null {
  let bestItem: MenuItem | null = null;
  let bestScore = -Infinity;
  let bestDisq: MenuItem | null = null;
  let bestDisqScore = -Infinity;

  for (const item of items) {
    const { score, disqualified } = calculateMealScore(
      item,
      remaining,
      targets,
      logged,
    );
    if (!disqualified) {
      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    } else if (score > bestDisqScore) {
      bestDisqScore = score;
      bestDisq = item;
    }
  }

  return bestItem ?? bestDisq;
}

const MACRO_WORD: Record<'protein' | 'carbs' | 'fats', string> = {
  protein: 'Protein',
  carbs: 'Carbs',
  fats: 'Fat',
};

/**
 * Narrative aligned with thresholds used in scoring (remaining share vs targets).
 */
export function buildMealMeMacroSuggestionText(
  remaining: MacroBreakdown,
  targets: MacroBreakdown,
  meal: MenuItem,
): string {
  const np = clampFrac(remaining.protein, targets.protein);
  const nc = clampFrac(remaining.carbs, targets.carbs);
  const nf = clampFrac(remaining.fats, targets.fats);

  let mostNeeded: keyof typeof MACRO_WORD = 'protein';
  let hi = np;
  if (nc > hi) {
    mostNeeded = 'carbs';
    hi = nc;
  }
  if (nf > hi) {
    mostNeeded = 'fats';
    hi = nf;
  }

  let tightest: keyof typeof MACRO_WORD | null = null;
  let lo = 2;
  (['protein', 'carbs', 'fats'] as const).forEach((k) => {
    const f = clampFrac(remaining[k], targets[k]);
    if (f < lo) {
      lo = f;
      tightest = k;
    }
  });

  let head: string;
  if (
    tightest &&
    mostNeeded !== tightest &&
    lo < 0.22 &&
    hi > 0.28
  ) {
    head = `You need ${MACRO_WORD[mostNeeded]}, but you are close to your ${MACRO_WORD[tightest]} limit.`;
  } else if (hi > 0.3) {
    head = `${MACRO_WORD[mostNeeded]} is still where you have the most room.`;
  } else if (
    clampFrac(remaining.calories, targets.calories) < 0.16
  ) {
    head =
      'Calories are tight, so portions that fit the rest of today matter.';
  } else if (lo < 0.2 && tightest) {
    head = `${MACRO_WORD[tightest]} is almost topped off for today.`;
  } else {
    head = 'This fits what you still have room for.';
  }

  const macroLine =
    `P: ${Math.round(meal.protein)}g | C: ${Math.round(meal.carbs)}g | F: ${Math.round(meal.fats)}g`;
  return `${head} Suggested: ${meal.name} (${macroLine}).`;
}

/**
 * Normalize raw scores inside one menu for UI (0 .. 1), using batch min/max among eligible items only.
 */
export function normalizeHallScores(effectiveScores: Map<string, number>): {
  normalized: Map<string, number>;
  minRaw: number;
  maxRaw: number;
} {
  if (effectiveScores.size === 0) {
    return { normalized: new Map(), minRaw: 0, maxRaw: 0 };
  }
  let minRaw = Infinity;
  let maxRaw = -Infinity;
  for (const v of effectiveScores.values()) {
    if (Number.isFinite(v)) {
      minRaw = Math.min(minRaw, v);
      maxRaw = Math.max(maxRaw, v);
    }
  }
  const span = maxRaw - minRaw;
  const normalized = new Map<string, number>();
  if (!(span > 1e-9)) {
    effectiveScores.forEach((_, id) => normalized.set(id, 0.9));
    return { normalized, minRaw, maxRaw };
  }
  effectiveScores.forEach((v, id) => {
    normalized.set(id, Math.min(1, Math.max(0, (v - minRaw) / span)));
  });
  return { normalized, minRaw, maxRaw };
}

/** Green tint alpha for weighted top picks: stronger for higher relative score */
export function weightedTopPickGreenAlpha(
  rawScore: number,
  minRaw: number,
  maxRaw: number,
): number {
  const span = maxRaw - minRaw;
  let t =
    span > 1e-9
      ? (rawScore - minRaw) / span
      : 1;
  t = Math.min(1, Math.max(0, t));
  return 0.08 + t * 0.26;
}

