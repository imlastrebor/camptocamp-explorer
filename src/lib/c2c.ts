import { DEFAULT_LIMIT } from "./search";

const BASE_URL = "https://api.camptocamp.org";

export type Locale = {
  lang?: string;
  title?: string;
  description?: string;
  summary?: string | null;
  title_prefix?: string | null;
};

export type C2CRoute = {
  document_id: number;
  activities?: string[];
  locales?: Locale[];
  elevation_min?: number;
  elevation_max?: number;
};

type PaginatedResponse<T> = {
  documents: T[];
  total: number;
  limit: number;
  offset: number;
};

type ListRoutesOptions = {
  q?: string;
  act?: string;
  limit?: number;
  offset?: number;
  areas?: ReadonlyArray<string | number>;
  fallbackToBbox?: boolean;
  fallbackWhenEmpty?: boolean;
};

const EARTH_RADIUS = 6378137;
const CHAMONIX_BOUNDS = {
  lonMin: 6.7,
  latMin: 45.85,
  lonMax: 7.15,
  latMax: 46.1,
} as const;

function projectLonLatToWebMercator(lon: number, lat: number): [number, number] {
  // The Camptocamp API expects bounding boxes in EPSG:3857 (spherical Mercator).
  const lambda = (lon * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;

  const x = EARTH_RADIUS * lambda;
  const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + phi / 2));

  return [x, y];
}

const [MIN_X, MIN_Y] = projectLonLatToWebMercator(
  CHAMONIX_BOUNDS.lonMin,
  CHAMONIX_BOUNDS.latMin,
);
const [MAX_X, MAX_Y] = projectLonLatToWebMercator(
  CHAMONIX_BOUNDS.lonMax,
  CHAMONIX_BOUNDS.latMax,
);
const CHAMONIX_BBOX = `${MIN_X},${MIN_Y},${MAX_X},${MAX_Y}`;

export const DEFAULT_ACTIVITIES =
  "alpine_climbing,rock_climbing,skitouring";

export const DEFAULT_AREA_IDS = ["14410", "14404"];

const PREFERRED_LOCALES = ["en", "fr", "it", "es"];

export function pickLocale(
  locales?: Locale[],
  preferred: string[] = PREFERRED_LOCALES,
) {
  if (!locales || locales.length === 0) {
    return undefined;
  }

  for (const language of preferred) {
    const match = locales.find((locale) => locale.lang === language);
    if (match) {
      return match;
    }
  }

  return locales[0];
}

export function formatLocaleTitle(locale?: Locale) {
  if (!locale) {
    return undefined;
  }

  const prefix = locale.title_prefix?.trim();
  const title = locale.title?.trim();

  if (prefix && title) {
    return `${prefix} : ${title}`;
  }

  return title ?? prefix ?? undefined;
}

export type ListRoutesResult = PaginatedResponse<C2CRoute> & {
  strategy: "areas" | "bbox";
  areaIds?: string[];
};

function serializeAreaIds(areas?: ReadonlyArray<string | number>) {
  if (!areas) return undefined;
  const cleaned = areas
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);
  if (cleaned.length === 0) return undefined;
  return cleaned;
}

async function fetchRoutes(
  params: URLSearchParams,
): Promise<PaginatedResponse<C2CRoute>> {
  const url = new URL(`${BASE_URL}/routes`);
  url.search = params.toString();

  const response = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to list routes: ${response.status} ${message}`);
  }

  return response.json();
}

export async function listRoutes(
  options: ListRoutesOptions = {},
): Promise<ListRoutesResult> {
  const {
    q,
    act = DEFAULT_ACTIVITIES,
    limit = DEFAULT_LIMIT,
    offset = 0,
    areas,
    fallbackToBbox = true,
    fallbackWhenEmpty,
  } = options;

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  params.set("act", act);

  if (q) {
    params.set("q", q);
  }

  const serializedAreas = serializeAreaIds(areas);
  const shouldFallbackWhenEmpty =
    fallbackWhenEmpty ?? (serializedAreas ? !q : false);

  if (serializedAreas && serializedAreas.length > 0) {
    const areaParams = new URLSearchParams(params);
    areaParams.set("a", serializedAreas.join(","));

    try {
      const areaData = await fetchRoutes(areaParams);

      if (
        areaData.total > 0 ||
        !fallbackToBbox ||
        !shouldFallbackWhenEmpty
      ) {
        return {
          ...areaData,
          strategy: "areas",
          areaIds: serializedAreas,
        };
      }
    } catch (error) {
      if (!fallbackToBbox) {
        throw error;
      }
    }
  }

  const bboxParams = new URLSearchParams(params);
  bboxParams.set("bbox", CHAMONIX_BBOX);
  const bboxData = await fetchRoutes(bboxParams);

  return {
    ...bboxData,
    strategy: serializedAreas ? "bbox" : "bbox",
    areaIds: serializedAreas,
  };
}

export async function getRoute(id: string): Promise<C2CRoute> {
  const response = await fetch(`${BASE_URL}/routes/${id}`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch route ${id}: ${response.status}`);
  }

  return response.json();
}
