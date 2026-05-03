import type { MenuItem } from '@/types';

type IsuTrait = { name?: string; typeName?: string };

type IsuNutrient = { name?: string; qty?: string };

type RawMenuItem = {
  name?: string;
  servingSize?: string;
  totalCal?: string;
  isHalal?: string;
  isVegetarian?: string;
  isVegan?: string;
  nutrients?: string;
  traits?: string;
};

type RawCategory = { category?: string; menuItems?: RawMenuItem[] };

type RawMenuDisplay = { name?: string; id?: string; categories?: RawCategory[] };

type RawMenuSection = {
  section?: string;
  menuDisplays?: RawMenuDisplay[];
};

type RawLocation = {
  slug?: string;
  id?: number;
  menus?: RawMenuSection[];
};

function parseJsonArray<T>(raw: string | undefined): T[] {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function parseQty(n: string | undefined): number {
  if (n == null || n === '') return 0;
  const x = parseFloat(String(n).replace(/,/g, ''));
  return Number.isFinite(x) ? x : 0;
}

function extractMacrosFromNutrients(rows: IsuNutrient[]): {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
} {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fats = 0;
  for (const r of rows) {
    const label = (r.name ?? '').toUpperCase();
    const q = parseQty(r.qty);
    if (label.includes('ENERGY') && label.includes('KCAL')) calories = q;
    else if (label === 'PROTEIN') protein = q;
    else if (label.includes('CARBOHYDRATE') && label.includes('DIFFERENCE'))
      carbs = q;
    else if (label.includes('LIPID') && label.includes('FAT')) fats = q;
  }
  return { calories, protein, carbs, fats };
}

function truthyFlag(v: string | undefined): boolean {
  return v === '1' || v === 'true';
}

function hasWheatGlutenAllergen(traits: IsuTrait[]): boolean {
  return traits.some(
    (t) =>
      t.typeName === 'Allergen' &&
      typeof t.name === 'string' &&
      /wheat|gluten/i.test(t.name),
  );
}

function slugPart(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Walks Iowa State `get-single-location` JSON and maps menu rows to {@link MenuItem}.
 */
export function transformIsuLocationPayload(
  payload: unknown,
  locationKey: string,
  apiSlug: string,
): MenuItem[] {
  if (!Array.isArray(payload) || payload.length === 0) return [];

  const loc = payload[0] as RawLocation;
  if (!loc || loc.slug === 'hours-menus') return [];

  const menus = Array.isArray(loc.menus) ? loc.menus : [];
  const out: MenuItem[] = [];
  let seq = 0;

  for (const menu of menus) {
    const mealPeriod = menu.section ?? 'Menu';
    const displays = Array.isArray(menu.menuDisplays) ? menu.menuDisplays : [];
    for (const display of displays) {
      const station = display.name ?? 'Station';
      const categories = Array.isArray(display.categories)
        ? display.categories
        : [];
      for (const cat of categories) {
        const categoryLabel = cat.category ?? '';
        const items = Array.isArray(cat.menuItems) ? cat.menuItems : [];
        for (const raw of items) {
          const name = (raw.name ?? '').trim();
          if (!name) continue;

          const nutrients = parseJsonArray<IsuNutrient>(raw.nutrients);
          let { calories, protein, carbs, fats } =
            extractMacrosFromNutrients(nutrients);

          const fromCal = parseQty(raw.totalCal);
          if (calories <= 0 && fromCal > 0) calories = fromCal;

          const traits = parseJsonArray<IsuTrait>(raw.traits);
          const isHalal = truthyFlag(raw.isHalal);
          const isVegetarian = truthyFlag(raw.isVegetarian);
          const isVegan = truthyFlag(raw.isVegan);
          const isGlutenFree = !hasWheatGlutenAllergen(traits);

          seq += 1;
          const id = [
            slugPart(apiSlug),
            slugPart(mealPeriod),
            slugPart(station),
            slugPart(categoryLabel),
            slugPart(name),
            String(seq),
          ].join('-');

          out.push({
            id,
            name,
            location: locationKey,
            station: [mealPeriod, station, categoryLabel]
              .filter(Boolean)
              .join(' · '),
            calories,
            protein,
            carbs,
            fats,
            isHalal,
            isVegan,
            isVegetarian,
            isGlutenFree,
          });
        }
      }
    }
  }

  return out;
}
