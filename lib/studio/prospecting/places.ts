// Google Places API (New) text-search client for the Prospect Finder (Studio,
// phase 4). This is our own outbound call to places.googleapis.com (a safe,
// fixed host) — no SSRF surface here; the SSRF boundary is each result's
// websiteUri, which score.ts routes through safe-fetch. The field mask below is
// the billing driver (Text Search Enterprise SKU, ~$35/1k requests) and
// MAX_PAGES is the hard billing guard — do not soften either.

export interface PlaceResult {
  placeId: string;
  name: string;
  website: string | null; // raw websiteUri (normalized later by score/upsert)
  phone: string | null;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
}

export type PlacesErrorCode = 'NO_KEY' | 'API_ERROR' | 'TIMEOUT';

export class PlacesError extends Error {
  code: PlacesErrorCode;
  constructor(message: string, code: PlacesErrorCode) {
    super(message);
    this.name = 'PlacesError';
    this.code = code;
  }
}

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,nextPageToken';
const PAGE_SIZE = 20;
// Hard cap — the billing guard (3 requests ≈ $0.105 beyond the free tier).
const MAX_PAGES = 3;
const PAGE_TIMEOUT_MS = 15_000;

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
}

interface SearchTextResponse {
  places?: RawPlace[];
  nextPageToken?: string;
}

/**
 * Text-search Places, following pagination up to MAX_PAGES, deduped by placeId
 * (Places can repeat results across page boundaries). Results missing the
 * DB-required id or displayName.text are skipped with a warn, never thrown —
 * one malformed result must not fail the whole batch. Throws PlacesError only:
 * NO_KEY (env missing), TIMEOUT (a page hit the 15s abort), API_ERROR (non-2xx;
 * status code in the message, raw body to server logs only).
 */
export async function searchPlaces(textQuery: string): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new PlacesError('GOOGLE_PLACES_API_KEY is not configured', 'NO_KEY');
  }

  const byId = new Map<string, PlaceResult>();
  let pageToken: string | undefined;
  let skipped = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    // All params identical across pages except the token, per the API contract.
    const body: Record<string, unknown> = {
      textQuery,
      pageSize: PAGE_SIZE,
      includePureServiceAreaBusinesses: true,
    };
    if (pageToken) body.pageToken = pageToken;

    let res: Response;
    try {
      res = await fetch(SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        throw new PlacesError('Places request timed out', 'TIMEOUT');
      }
      console.error('[studio/prospects] Places request failed:', err);
      throw new PlacesError('Places request failed', 'API_ERROR');
    }

    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      console.error(`[studio/prospects] Places API ${res.status}:`, raw.slice(0, 500));
      throw new PlacesError(`Places API returned ${res.status}`, 'API_ERROR');
    }

    let data: SearchTextResponse;
    try {
      data = (await res.json()) as SearchTextResponse;
    } catch (err) {
      console.error('[studio/prospects] Places response was not JSON:', err);
      throw new PlacesError('Places API returned malformed JSON', 'API_ERROR');
    }
    for (const p of data.places ?? []) {
      const placeId = p.id;
      const name = p.displayName?.text;
      if (!placeId || !name) {
        skipped += 1;
        continue;
      }
      if (byId.has(placeId)) continue;
      byId.set(placeId, {
        placeId,
        name,
        website: p.websiteUri ?? null,
        phone: p.nationalPhoneNumber ?? null,
        address: p.formattedAddress ?? null,
        rating: typeof p.rating === 'number' ? p.rating : null,
        reviewCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
      });
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  if (skipped > 0) {
    console.warn(`[studio/prospects] skipped ${skipped} malformed Places result(s)`);
  }
  return [...byId.values()];
}
