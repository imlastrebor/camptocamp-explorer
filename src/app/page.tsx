import Link from "next/link";
import { Filters } from "@/components/Filters";
import { RouteCard } from "@/components/RouteCard";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_ACTIVITIES,
  listRoutes,
} from "@/lib/c2c";
import {
  AREA_OPTIONS,
  DEFAULT_AREA_IDS,
  normaliseAreaIds,
} from "@/lib/areas";
import { DEFAULT_LIMIT, LIMIT_OPTIONS } from "@/lib/search";

type SearchParams = Record<string, string | string[] | undefined>;

function toSingleValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function sanitizeLimit(rawValue?: string) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  if (LIMIT_OPTIONS.includes(parsed)) {
    return parsed;
  }
  return DEFAULT_LIMIT;
}

function sanitizeOffset(rawValue?: string, limit = DEFAULT_LIMIT) {
  const parsed = Number(rawValue ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed / limit) * limit;
}

function deriveFallbackQuery(query: string) {
  const tokens = query
    .split(/\s+/)
    .map((token) => token.replace(/[^A-Za-z0-9]/g, ""))
    .filter((token) => token.length > 2);

  if (tokens.length === 0) {
    return undefined;
  }

  tokens.sort((a, b) => b.length - a.length);
  return tokens[0];
}

function parseAreasParam(value?: string | string[]) {
  if (!value) return [];
  const parts = Array.isArray(value) ? value : [value];
  const flattened = parts.flatMap((part) => part.split(","));
  return normaliseAreaIds(flattened);
}

export default async function Home({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};

  const qRaw = toSingleValue(params.q);
  const q = qRaw?.trim() ?? "";
  const act = toSingleValue(params.act)?.trim() || DEFAULT_ACTIVITIES;
  const limit = sanitizeLimit(toSingleValue(params.limit));
  const offset = sanitizeOffset(toSingleValue(params.offset), limit);

  const parsedAreas = parseAreasParam(params.areas);
  const hasExplicitAreas = parsedAreas.length > 0;
  const areaIds = hasExplicitAreas ? parsedAreas : DEFAULT_AREA_IDS;

  let data = await listRoutes({
    q,
    act,
    limit,
    offset,
    areas: areaIds,
    fallbackToBbox: true,
    fallbackWhenEmpty: !q,
  });
  let effectiveOffset = data.offset ?? offset;
  let fallbackMessage: string | undefined;
  let areaFallbackMessage: string | undefined;

  if (data.strategy === "bbox" && data.areaIds && data.areaIds.length > 0) {
    areaFallbackMessage =
      "Area lookup returned no results; falling back to legacy map bounds.";
  }

  if (q && data.total === 0) {
    const fallbackQuery = deriveFallbackQuery(q);
    if (fallbackQuery && fallbackQuery !== q) {
      let fallbackData = await listRoutes({
        q: fallbackQuery,
        act,
        limit,
        offset,
        areas: areaIds,
        fallbackToBbox: true,
        fallbackWhenEmpty: false,
      });

      if (fallbackData.total === 0 && offset > 0) {
        fallbackData = await listRoutes({
          q: fallbackQuery,
          act,
          limit,
          offset: 0,
          areas: areaIds,
          fallbackToBbox: true,
          fallbackWhenEmpty: false,
        });
      }

      if (fallbackData.total > 0) {
        data = fallbackData;
        effectiveOffset = fallbackData.offset ?? 0;
        fallbackMessage = `No exact matches for "${q}". Showing results for "${fallbackQuery}".`;
        if (
          fallbackData.strategy === "bbox" &&
          fallbackData.areaIds &&
          fallbackData.areaIds.length > 0
        ) {
          areaFallbackMessage =
            "Area lookup returned no results; falling back to legacy map bounds.";
        } else {
          areaFallbackMessage = undefined;
        }
      }
    }
  }

  const total = data.total;
  const hasPrev = effectiveOffset > 0;
  const hasNext = effectiveOffset + data.documents.length < total;
  const prevOffset = Math.max(0, effectiveOffset - limit);
  const nextOffset = effectiveOffset + limit;

  const buildHref = (newOffset: number) => {
    const nextParams = new URLSearchParams();

    if (q) nextParams.set("q", q);
    if (act) nextParams.set("act", act);
    if (limit !== DEFAULT_LIMIT) nextParams.set("limit", String(limit));
    nextParams.set("offset", String(newOffset));
    if (hasExplicitAreas) {
      nextParams.set("areas", areaIds.join(","));
    }

    return `/?${nextParams.toString()}`;
  };

  const start = data.documents.length > 0 ? effectiveOffset + 1 : 0;
  const end = effectiveOffset + data.documents.length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Camptocamp Explorer
          </p>
          <h1 className="text-3xl font-semibold">Chamonix routes</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          A lightweight index of classic Camptocamp routes leveraging the public
          v6 API and server components.
        </p>
      </header>

      <Filters
        initialQuery={q}
        initialActivity={act}
        initialLimit={limit}
        selectedAreas={areaIds}
        defaultAreas={DEFAULT_AREA_IDS}
        availableAreas={AREA_OPTIONS}
        hasExplicitAreas={hasExplicitAreas}
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {total === 0
              ? "No routes found for the current filters."
              : `Showing ${start}–${end} of ${total.toLocaleString()} routes`}
          </span>
          <span>Fetching {limit} at a time</span>
        </div>

        {fallbackMessage && (
          <div className="rounded-md border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            {fallbackMessage}
          </div>
        )}

        {areaFallbackMessage && (
          <div className="rounded-md border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
            {areaFallbackMessage}
          </div>
        )}

        {data.documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
            Adjust your search or try a different activity preset.
          </div>
        ) : (
          <div className="space-y-4">
            {data.documents.map((route) => (
              <RouteCard key={route.document_id} route={route} />
            ))}
          </div>
        )}
      </section>

      <nav className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {hasPrev ? (
            <Button asChild variant="outline">
              <Link href={buildHref(prevOffset)}>← Previous</Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              ← Previous
            </Button>
          )}

          {hasNext ? (
            <Button asChild variant="outline">
              <Link href={buildHref(nextOffset)}>Next →</Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Next →
            </Button>
          )}
        </div>

        <span className="text-sm text-muted-foreground">
          Page {Math.floor(effectiveOffset / limit) + 1}
        </span>
      </nav>
    </main>
  );
}
