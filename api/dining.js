const BROWSERISH_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const PURDUE_CANONICAL_LOCATION_NAMES = new Map([
  ['wiley', 'Wiley'],
  ['ford', 'Ford'],
  ['hillenbrand', 'Hillenbrand'],
  ['earhart', 'Earhart'],
  ['windsor', 'Windsor'],
]);

function asSingleQueryValue(value) {
  if (Array.isArray(value)) return value[0] ?? '';
  return typeof value === 'string' ? value : '';
}

function canonicalizePurdueLocationName(locationName) {
  const normalized = locationName.trim();
  return PURDUE_CANONICAL_LOCATION_NAMES.get(normalized.toLowerCase()) ?? normalized;
}

function buildUpstreamUrl(university, slug, date, itemId) {
  if (university === 'PURDUE') {
    if (itemId) {
      return `https://api.hfs.purdue.edu/menus/v2/Items/${encodeURIComponent(itemId)}`;
    }
    const location = canonicalizePurdueLocationName(slug);
    const ymd = date || new Date().toISOString().split('T')[0];
    return `https://api.hfs.purdue.edu/menus/v2/locations/${encodeURIComponent(location)}/${ymd}`;
  }
  return `https://dining.iastate.edu/wp-json/dining/menu-hours/get-single-location/?slug=${encodeURIComponent(slug)}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const slug = asSingleQueryValue(req.query.slug);
  const university = asSingleQueryValue(req.query.university).toUpperCase();
  const date = asSingleQueryValue(req.query.date);
  const itemId = asSingleQueryValue(req.query.itemId);

  if (!university || (university !== 'ISU' && university !== 'PURDUE')) {
    return res.status(400).json({ error: 'Invalid university. Use ISU or PURDUE.' });
  }

  if (!slug && !itemId) {
    return res.status(400).json({ error: 'Missing required query param: slug' });
  }

  try {
    const upstreamUrl = buildUpstreamUrl(university, slug, date, itemId);
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': BROWSERISH_USER_AGENT,
      },
    });

    const textBody = await upstream.text();
    let jsonData;
    try {
      jsonData = JSON.parse(textBody);
    } catch {
      jsonData = { raw: textBody };
    }

    return res.status(upstream.status).json(jsonData);
  } catch (error) {
    return res.status(502).json({
      error: 'Proxy request failed',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
