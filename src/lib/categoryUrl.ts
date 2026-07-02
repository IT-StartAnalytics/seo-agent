// Pure helpers (no server deps) shared by server + client components.
// PlatinumList category pages live on a per-city subdomain, e.g.
//   base:    https://platinumlist.net/comedy   (does NOT resolve on its own)
//   working: https://dubai.platinumlist.net/comedy
// The city list comes from content_categories.linked_cities (comma-separated).

export function parseCities(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const c = part.trim();
    if (!c) continue;
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

// Default to Dubai (primary market, always a valid subdomain) else the first city.
export function pickDefaultCity(cities: string[]): string | null {
  if (cities.length === 0) return null;
  return cities.find((c) => c.toLowerCase() === 'dubai') ?? cities[0];
}

function citySlug(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, '-');
}

// Build a working URL by putting the city subdomain in front of platinumlist.net,
// preserving the path from the stored base URL.
export function categoryUrlForCity(baseUrl: string | null, city: string | null): string | null {
  if (!baseUrl) return null;
  let path = '';
  try {
    path = new URL(baseUrl).pathname;
  } catch {
    return baseUrl;
  }
  if (!city) return baseUrl;
  return `https://${citySlug(city)}.platinumlist.net${path}`;
}
