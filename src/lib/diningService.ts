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

const PURDUE_ITEM_FETCH_CONCURRENCY = 14;

const PURDUE_CANONICAL_LOCATION_NAMES = new Map<string, string>([
  ['wiley', 'Wiley'],
  ['ford', 'Ford'],
  ['hillenbrand', 'Hillenbrand'],
  ['earhart', 'Earhart'],
  ['windsor', 'Windsor'],
]);

type DiningMenuErrorCode = 'LOCATION_CLOSED' | 'NO_MENU_FOUND' | 'REQUEST_FAILED';

export class DiningMenuError extends Error {
  readonly status: number | null;
  readonly code: DiningMenuErrorCode;
  readonly userMessage: string;

  constructor(
    message: string,
    opts: { status?: number | null; code?: DiningMenuErrorCode; userMessage?: string } = {},
  ) {
    super(message);
    this.name = 'DiningMenuError';
    this.status = opts.status ?? null;
    this.code = opts.code ?? 'REQUEST_FAILED';
    this.userMessage = opts.userMessage ?? 'No Menu Found';
  }
}

async function readJsonResponse<T>(
  res: Response,
  errorLabel: string,
  fallbackUserMessage = 'No Menu Found',
): Promise<T> {
  if (!res.ok) {
    if (res.status === 404) {
      throw new DiningMenuError(`${errorLabel} (${res.status})`, {
        status: res.status,
        code: 'LOCATION_CLOSED',
        userMessage: 'Location Closed for Summer',
      });
    }
    throw new DiningMenuError(`${errorLabel} (${res.status})`, {
      status: res.status,
      code: 'REQUEST_FAILED',
      userMessage: fallbackUserMessage,
    });
  }
  return res.json() as Promise<T>;
}

function canonicalizePurdueLocationName(locationName: string): string {
  const normalized = locationName.trim();
  const byKey = PURDUE_CANONICAL_LOCATION_NAMES.get(normalized.toLowerCase());
  return byKey ?? normalized;
}

/**
 * Fetches a single location from Iowa State Dining (via Vite dev/preview proxy to avoid CORS).
 * @see https://dining.iastate.edu/wp-json/dining/menu-hours/get-single-location/
 */
export async function fetchIsuSingleLocationRaw(
  slug: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const url =
    `${ISU_PROXY_PATH}?slug=${encodeURIComponent(slug)}` +
    '&university=ISU';
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
  const url =
    `${ISU_PROXY_PATH}?university=PURDUE&itemId=${encodeURIComponent(itemId)}` +
    '&slug=ignored';
  try {
    const res = await fetch(url, {
      signal,
    });
    const body = await readJsonResponse<PurdueItemDetailResponse>(
      res,
      'Purdue item nutrition request failed',
      'No Menu Found',
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
  /** Defaults to today's date in YYYY-MM-DD format. */
  calendarDate?: Date,
): Promise<MenuItem[]> {
  const d = calendarDate ?? new Date();
  const dateStr = d.toISOString().split('T')[0];
  const canonicalLocation = canonicalizePurdueLocationName(apiLocationName);
  const menuUrl =
    `${ISU_PROXY_PATH}?slug=${encodeURIComponent(canonicalLocation)}` +
    `&university=PURDUE&date=${encodeURIComponent(dateStr)}`;
  const res = await fetch(menuUrl, {
    signal,
  });
  const raw = await readJsonResponse<PurdueLocationMenuPayload>(
    res,
    'Purdue dining menu request failed',
    'No Menu Found',
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
  try {
    if (tenant === 'PURDUE') {
      return fetchPurdueLocationMenuItems(apiSlug, locationKey, signal);
    }
    return fetchIsuLocationMenuItems(apiSlug, locationKey, signal);
  } catch (err) {
    if (err instanceof DiningMenuError && err.status === 404) {
      throw err;
    }
    throw new DiningMenuError('Dining menu request failed', {
      status: null,
      code: 'NO_MENU_FOUND',
      userMessage: 'No Menu Found',
    });
  }
}

export async function fetchCampusMenu(
  tenant: UniversityTenant,
  apiSlug: string,
  locationKey: string,
  signal?: AbortSignal,
): Promise<MenuItem[]> {
  return fetchCampusLocationMenuItems(tenant, apiSlug, locationKey, signal);
}
