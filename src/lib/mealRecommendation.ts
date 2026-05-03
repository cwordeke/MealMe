import type { Goal, MenuItem, TDEEResult } from '@/types';

/** Rough slots per day for “ideal” per-meal macro shape */
const MEALS_PER_DAY = 3;

export type RecommendationContext = {
  goal: Goal;
  tdee: TDEEResult;
};

/**
 * 0–1 score: how well this item matches per-meal macro targets + goal bias.
 * Higher = better recommendation.
 */
export function mealRecommendationScore(
  item: MenuItem,
  ctx: RecommendationContext,
): number {
  const perCal = ctx.tdee.goalCalories / MEALS_PER_DAY;
  const perP = ctx.tdee.macros.protein / MEALS_PER_DAY;
  const perC = ctx.tdee.macros.carbs / MEALS_PER_DAY;
  const perF = ctx.tdee.macros.fats / MEALS_PER_DAY;

  const calErr =
    Math.abs(item.calories - perCal) / Math.max(perCal, 100);
  const pErr = Math.abs(item.protein - perP) / Math.max(perP, 6);
  const cErr = Math.abs(item.carbs - perC) / Math.max(perC, 8);
  const fErr = Math.abs(item.fats - perF) / Math.max(perF, 4);

  let calW = 0.32;
  let pW = 0.34;
  let cW = 0.17;
  let fW = 0.17;
  let goalBonus = 0;

  if (ctx.goal === 'cut') {
    calW = 0.42;
    pW = 0.38;
    cW = 0.12;
    fW = 0.08;
    if (item.calories <= perCal * 1.08 && item.protein >= perP * 0.95) {
      goalBonus = 0.06;
    }
    if (item.calories > perCal * 1.35) {
      goalBonus -= 0.12;
    }
  } else if (ctx.goal === 'bulk') {
    calW = 0.3;
    pW = 0.42;
    cW = 0.18;
    fW = 0.1;
    if (item.calories >= perCal * 0.92 && item.protein >= perP * 0.98) {
      goalBonus = 0.06;
    }
    if (item.calories < perCal * 0.55) {
      goalBonus -= 0.05;
    }
  } else {
    if (calErr < 0.25 && pErr < 0.3) {
      goalBonus = 0.04;
    }
  }

  const err =
    calW * Math.min(calErr, 1.5) +
    pW * Math.min(pErr, 1.5) +
    cW * Math.min(cErr, 1.5) +
    fW * Math.min(fErr, 1.5);

  const base = 1 - Math.min(1, err / 1.45);
  return Math.max(0, Math.min(1, base + goalBonus));
}

/** Highly compatible → “Top picks for you” section */
export const TOP_PICK_SCORE_THRESHOLD = 0.78;

export function isTopPick(score: number): boolean {
  return score >= TOP_PICK_SCORE_THRESHOLD;
}

/** @deprecated use isTopPick */
export function isPerfectMacroFit(score: number): boolean {
  return isTopPick(score);
}

/** Whole-number match for UI (0–100) */
export function matchPercent(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score * 100)));
}

/**
 * Alpha for green card tint on top picks: 5% at low score → 25% at perfect (1.0).
 * Apply as rgba(34, 197, 94, alpha).
 */
export function topPickGreenAlpha(score: number): number {
  const s = Math.min(1, Math.max(0, score));
  return 0.05 + s * 0.2;
}
