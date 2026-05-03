import { transformIsuLocationPayload } from '@/lib/isuDiningTransform';
import type { MenuItem } from '@/types';

const PROXY_PATH = '/api/dining';

/**
 * Fetches a single location from Iowa State Dining (via Vite dev/preview proxy to avoid CORS).
 * @see https://dining.iastate.edu/wp-json/dining/menu-hours/get-single-location/
 */
export async function fetchIsuSingleLocationRaw(
  slug: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const url = `${PROXY_PATH}?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Dining menu request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchIsuLocationMenuItems(
  apiSlug: string,
  locationKey: string,
  signal?: AbortSignal,
): Promise<MenuItem[]> {
  const raw = await fetchIsuSingleLocationRaw(apiSlug, signal);
  return transformIsuLocationPayload(raw, locationKey, apiSlug);
}
