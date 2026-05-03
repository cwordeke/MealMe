import type { MenuItem, MenuItemBase } from '@/types';

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

  const seenNames = new Set<string>();
  const deduped: MenuItemBase[] = [];
  for (const row of purged) {
    const key = normalizeItemName(row.name);
    if (!key) continue;
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    deduped.push(row);
  }

  const out: MenuItem[] = [];
  for (const row of deduped) {
    const { isMainMeal, isAddOn } = classifyMainVsAddOn(row);
    out.push({
      ...row,
      isMainMeal,
      isAddOn,
    });
  }
  return out;
}
