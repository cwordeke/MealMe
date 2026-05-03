import {
  MEAL_PERIOD_ORDER,
  type MealPeriod,
  type MenuItemBase,
} from '@/types';

type PurdueAllergen = { Name?: string; Value?: boolean };

type PurdueNutritionRow = {
  Name?: string;
  Value?: number;
  LabelValue?: string | null;
};

export type PurdueMenuItemRaw = {
  ID?: string;
  Name?: string;
  IsVegetarian?: boolean;
  NutritionReady?: boolean;
  Allergens?: PurdueAllergen[];
};

type PurdueStation = { Name?: string; Items?: PurdueMenuItemRaw[] };

type PurdueMeal = {
  Name?: string;
  Type?: string;
  Stations?: PurdueStation[];
};

export type PurdueLocationMenuPayload = {
  Location?: string;
  Meals?: PurdueMeal[];
};

function allergenTrue(
  allergens: PurdueAllergen[] | undefined,
  name: string,
): boolean {
  if (!Array.isArray(allergens)) return false;
  return allergens.some(
    (a) => String(a.Name ?? '').toLowerCase() === name.toLowerCase() && a.Value,
  );
}

function deriveVegan(allergens: PurdueAllergen[] | undefined): boolean {
  return allergenTrue(allergens, 'Vegan');
}

function deriveHalal(allergens: PurdueAllergen[] | undefined): boolean {
  return allergenTrue(allergens, 'Halal');
}

function deriveGlutenFree(allergens: PurdueAllergen[] | undefined): boolean {
  return !(
    allergenTrue(allergens, 'Gluten') || allergenTrue(allergens, 'Wheat')
  );
}

/**
 * Purdue meal blocks use `Type` like "Breakfast" / "Lunch" / "Dinner".
 */
export function purdueMealTypeToPeriods(mealType: string | undefined): MealPeriod[] {
  const raw = (mealType ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const out = new Set<MealPeriod>();

  if (raw.includes('brunch')) {
    out.add('Breakfast');
    out.add('Lunch');
  }
  if (raw.includes('breakfast')) out.add('Breakfast');
  if (raw.includes('lunch')) out.add('Lunch');
  if (raw.includes('dinner')) out.add('Dinner');
  if (/late\s*night/i.test(mealType ?? '')) out.add('LateNight');
  if (/\bsnack\b/i.test(mealType ?? '')) out.add('LateNight');

  const picks = MEAL_PERIOD_ORDER.filter((p) => out.has(p));
  return picks.length > 0 ? picks : [...MEAL_PERIOD_ORDER];
}

export function extractMacrosFromPurdueNutrition(
  rows: PurdueNutritionRow[] | undefined,
): { calories: number; protein: number; carbs: number; fats: number } | null {
  if (!Array.isArray(rows)) return null;
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fats = 0;
  let found = false;

  for (const r of rows) {
    const label = String(r.Name ?? '').trim().toLowerCase();
    const v =
      typeof r.Value === 'number' && Number.isFinite(r.Value) ? r.Value : NaN;

    if (label === 'calories' && !Number.isNaN(v)) {
      calories = v;
      found = true;
    } else if (label === 'protein' && !Number.isNaN(v)) {
      protein = v;
      found = true;
    } else if (
      label.includes('carbohydrate') &&
      label.includes('total') &&
      !Number.isNaN(v)
    ) {
      carbs = v;
      found = true;
    } else if (label.includes('total fat') && !Number.isNaN(v)) {
      fats = v;
      found = true;
    }
  }

  if (!found || !(calories > 0)) return null;
  return { calories, protein, carbs, fats };
}

function unionMealPeriods(a: MealPeriod[], b: MealPeriod[]): MealPeriod[] {
  const set = new Set<MealPeriod>([...a, ...b]);
  return MEAL_PERIOD_ORDER.filter((p) => set.has(p));
}

export function buildPurdueMenuItemBases(
  payload: PurdueLocationMenuPayload,
  locationKey: string,
  nutritionByItemId: ReadonlyMap<
    string,
    { calories: number; protein: number; carbs: number; fats: number }
  >,
): MenuItemBase[] {
  const meals = Array.isArray(payload.Meals) ? payload.Meals : [];
  const byId = new Map<string, MenuItemBase>();

  for (const meal of meals) {
    const periods = purdueMealTypeToPeriods(meal.Type ?? meal.Name);
    const stations = Array.isArray(meal.Stations) ? meal.Stations : [];

    for (const station of stations) {
      const stationName = station.Name?.trim();
      const items = Array.isArray(station.Items) ? station.Items : [];

      for (const it of items) {
        const id = it.ID?.trim();
        const name = it.Name?.trim();
        if (!id || !name) continue;
        const macros = nutritionByItemId.get(id);
        if (!macros || !(macros.calories > 0)) continue;

        const allergens = it.Allergens;
        const prev = byId.get(id);
        if (prev) {
          prev.servedDuring = unionMealPeriods(prev.servedDuring ?? periods, periods);
          continue;
        }

        byId.set(id, {
          id,
          name,
          location: locationKey,
          station: stationName || undefined,
          servedDuring: periods,
          calories: Math.round(macros.calories),
          protein: macros.protein,
          carbs: macros.carbs,
          fats: macros.fats,
          isHalal: deriveHalal(allergens),
          isVegan: deriveVegan(allergens),
          isVegetarian: Boolean(it.IsVegetarian),
          isGlutenFree: deriveGlutenFree(allergens),
        });
      }
    }
  }

  return [...byId.values()];
}
