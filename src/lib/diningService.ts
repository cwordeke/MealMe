/** Live menu pipeline: fetch → parse → sanitize per university tenant. */
import { transformIsuLocationPayload } from '@/lib/isuDiningTransform';
import { sanitizeAndCategorizeMenu } from '@/lib/menuSanitize';
import {
  buildPurdueMenuItemBases,
  extractMacrosFromPurdueNutrition,
  type PurdueLocationMenuPayload,
  type PurdueMenuItemRaw,
} from '@/lib/purdueDiningTransform';
import type { UniversityTenant } from '@/config/campusLocations';
import type { MenuItem } from '@/types';

const ISU_PROXY_PATH = '/api/dining';
const HFS_PROXY_PATH = '/api/hfs';

const PURDUE_ITEM_FETCH_CONCURRENCY = 14;

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function readJsonResponse<T>(
  res: Response,
  errorLabel: string,
): Promise<T> {
  if (!res.ok) {
    throw new Error(`${errorLabel} (${res.status})`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetches a single location from Iowa State Dining (via Vite dev/preview proxy to avoid CORS).
 * @see https://dining.iastate.edu/wp-json/dining/menu-hours/get-single-location/
 */
export async function fetchIsuSingleLocationRaw(
  slug: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const url = `${ISU_PROXY_PATH}?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, { signal });
  return readJsonResponse(res, 'Dining menu request failed');
}

export async function fetchIsuLocationMenuItems(
  apiSlug: string,
  locationKey: string,
  signal?: AbortSignal,
): Promise<MenuItem[]> {
  const raw = await fetchIsuSingleLocationRaw(apiSlug, signal);
  const parsed = transformIsuLocationPayload(raw, locationKey, apiSlug);
  return sanitizeAndCategorizeMenu(parsed);
}

type PurdueItemDetailResponse = {
  ID?: string;
  Nutrition?: { Name?: string; Value?: number; LabelValue?: string | null }[];
};

function collectPurdueNutritionReadyIds(payload: PurdueLocationMenuPayload): string[] {
  const meals = Array.isArray(payload.Meals) ? payload.Meals : [];
  const ids = new Set<string>();
  for (const meal of meals) {
    const stations = Array.isArray(meal.Stations) ? meal.Stations : [];
    for (const st of stations) {
      const items: PurdueMenuItemRaw[] = Array.isArray(st.Items) ? st.Items : [];
      for (const it of items) {
        const id = it.ID?.trim();
        if (!id || !it.NutritionReady) continue;
        ids.add(id);
      }
    }
  }
  return [...ids];
}

async function fetchPurdueItemMacros(
  itemId: string,
  signal?: AbortSignal,
): Promise<{ calories: number; protein: number; carbs: number; fats: number } | null> {
  const url = `${HFS_PROXY_PATH}/menus/v2/Items/${encodeURIComponent(itemId)}`;
  try {
    const res = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    });
    const body = await readJsonResponse<PurdueItemDetailResponse>(
      res,
      'Purdue item nutrition request failed',
    );
    const rows = Array.isArray(body.Nutrition) ? body.Nutrition : [];
    return extractMacrosFromPurdueNutrition(rows);
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]!);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function fetchPurdueLocationMenuItems(
  apiLocationName: string,
  locationKey: string,
  signal?: AbortSignal,
  /** Defaults to today's date in local time (YYYY-MM-DD). */
  calendarDate?: Date,
): Promise<MenuItem[]> {
  const d = calendarDate ?? new Date();
  const dateStr = formatLocalYmd(d);
  const locSeg = encodeURIComponent(apiLocationName);
  const menuUrl = `${HFS_PROXY_PATH}/menus/v2/locations/${locSeg}/${dateStr}`;
  const res = await fetch(menuUrl, {
    signal,
    headers: { Accept: 'application/json' },
  });
  const raw = await readJsonResponse<PurdueLocationMenuPayload>(
    res,
    'Purdue dining menu request failed',
  );

  const idsToFetch = collectPurdueNutritionReadyIds(raw);
  const macroRows = await mapWithConcurrency(
    idsToFetch,
    PURDUE_ITEM_FETCH_CONCURRENCY,
    (id) => fetchPurdueItemMacros(id, signal),
  );

  const nutritionByItemId = new Map<
    string,
    { calories: number; protein: number; carbs: number; fats: number }
  >();
  idsToFetch.forEach((id, idx) => {
    const m = macroRows[idx];
    if (m && m.calories > 0) nutritionByItemId.set(id, m);
  });

  const parsed = buildPurdueMenuItemBases(raw, locationKey, nutritionByItemId);
  return sanitizeAndCategorizeMenu(parsed);
}

export async function fetchCampusLocationMenuItems(
  tenant: UniversityTenant,
  apiSlug: string,
  locationKey: string,
  signal?: AbortSignal,
): Promise<MenuItem[]> {
  if (tenant === 'PURDUE') {
    return fetchPurdueLocationMenuItems(apiSlug, locationKey, signal);
  }
  return fetchIsuLocationMenuItems(apiSlug, locationKey, signal);
}
