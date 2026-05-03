import {
  MEAL_PERIOD_ORDER,
  type MealPeriod,
  type MenuItem,
  type MenuItemBase,
} from '@/types';

function normalizeServedDuring(row: MenuItemBase): MealPeriod[] {
  if (Array.isArray(row.servedDuring) && row.servedDuring.length > 0) {
    const picks = MEAL_PERIOD_ORDER.filter((p) =>
      row.servedDuring.includes(p),
    );
    if (picks.length > 0) return picks;
  }
  return [...MEAL_PERIOD_ORDER];
}

function unionServedDuring(
  a: MealPeriod[],
  b: MealPeriod[],
): MealPeriod[] {
  const union = new Set<MealPeriod>([...a, ...b]);
  return MEAL_PERIOD_ORDER.filter((p) => union.has(p));
}

const ADDON_CALORIE_MAX_EXCLUSIVE = 150;

/** Name keywords → always treat as add-on (case-insensitive substring). */
const ADDON_NAME_KEYWORDS = [
  'sauce',
  'dressing',
  'dip',
  'mayo',
  'slice',
  'packet',
] as const;

function normalizeItemName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function nameLooksLikeAddOn(name: string): boolean {
  const lower = name.toLowerCase();
  return ADDON_NAME_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Classifies a menu row after purge rules (calories / macros valid).
 */
export function classifyMainVsAddOn(item: MenuItemBase): {
  isMainMeal: boolean;
  isAddOn: boolean;
} {
  if (nameLooksLikeAddOn(item.name)) {
    return { isMainMeal: false, isAddOn: true };
  }
  if (item.calories < ADDON_CALORIE_MAX_EXCLUSIVE) {
    return { isMainMeal: false, isAddOn: true };
  }
  return { isMainMeal: true, isAddOn: false };
}

function hasValidNutrition(row: MenuItemBase): boolean {
  if (!(row.calories > 0)) return false;
  const nums = [row.calories, row.protein, row.carbs, row.fats];
  if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    return false;
  }
  return true;
}

/**
 * Drops junk rows, dedupes by dish name, assigns {@link MenuItem.isMainMeal} / {@link MenuItem.isAddOn}.
 */
export function sanitizeAndCategorizeMenu(items: MenuItemBase[]): MenuItem[] {
  const purged: MenuItemBase[] = [];
  for (const row of items) {
    if (!hasValidNutrition(row)) continue;
    purged.push(row);
  }

  const byNameKey = new Map<string, MenuItemBase>();
  for (const row of purged) {
    const key = normalizeItemName(row.name);
    if (!key) continue;
    const withPeriods: MenuItemBase = {
      ...row,
      servedDuring: normalizeServedDuring(row),
    };
    const prev = byNameKey.get(key);
    if (!prev) {
      byNameKey.set(key, withPeriods);
      continue;
    }
    byNameKey.set(key, {
      ...prev,
      servedDuring: unionServedDuring(
        prev.servedDuring,
        withPeriods.servedDuring,
      ),
    });
  }
  const deduped = [...byNameKey.values()];

  const out: MenuItem[] = [];
  for (const row of deduped) {
    const { isMainMeal, isAddOn } = classifyMainVsAddOn(row);
    out.push({
      ...row,
      servedDuring: normalizeServedDuring(row),
      isMainMeal,
      isAddOn,
    });
  }
  return out;
}
