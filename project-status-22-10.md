# Camptocamp Explorer — Project Status (22 Oct)

## Snapshot
- **Stack:** Next.js App Router, React Server Components, Tailwind CSS v4, shadcn/ui, TypeScript.
- **Goal:** Server-rendered catalogue of Camptocamp routes around Chamonix with zero client state beyond URL search params.

## What’s Implemented
- **Route Listing & Detail**
  - Landing page fetches Camptocamp v6 `/routes` with pagination, activity filter, free-text search, and area constraints.
  - Detail page hydrates individual route data and renders headings using locale-aware title prefix + title logic.
- **Area-First Query Strategy**
  - Default areas: `14410` (Mont-Blanc Massif) and `14404` (Haut Giffre · Aiguilles Rouges · Fiz).
  - `listRoutes` helper tries area-based queries first; if the API returns nothing (or errors) and fallback is allowed, it retries with the legacy Chamonix bbox (converted to EPSG:3857) to guarantee coverage.
  - Search re-run logic tokenises the query and retries with the longest keyword when initial results are empty.
- **Filtering UI**
  - Client-side `Filters` component keeps query/activity/limit inputs plus a checkbox grid for the curated area list (with reset).
  - Selected areas are encoded in the URL as `areas=...`, enabling bookmarking/shareable queries; defaults are omitted unless the user changes the selection.
- **Locale Handling**
  - `pickLocale` chooses English when available, otherwise falls through to other languages.
  - `formatLocaleTitle` joins `title_prefix` and `title` (e.g. “Col des Cristaux : NE Slope”) for consistent naming across list and detail views.

## Data Layer Notes
- `src/lib/c2c.ts` centralises Camptocamp API interactions and returns metadata about which strategy (areas vs. bbox) produced results.
- `src/lib/areas.ts` exposes the curated area list, default IDs, and helpers to normalise URL-provided area sets.
- Requests leverage Next.js fetch caching (`revalidate: 3600`) for server component performance.

## Current Behaviour
1. Incoming request parses search params (`q`, `act`, `limit`, `offset`, `areas`).
2. If `areas` is provided, it overrides defaults; otherwise defaults apply.
3. `listRoutes` executes area-first query, falling back to bbox only when needed.
4. UI renders route cards using locale-aware summaries and mirrors the applied filters in the form.
5. Pagination links maintain the active filters and areas.

## Open Considerations
- Area catalogue is currently hand-curated; a dynamic fetch (e.g., discoverable areas from the API) would broaden coverage.
- UX copy surfaces when bbox fallback happens, but there’s no explicit toggle to disable fallback.
- No loading/error states beyond server-rendered fallbacks; optional skeletons or boundaries could improve perceived performance.
- Deployment is local-only; README still reflects the vanilla `create-next-app` boilerplate.

## Next Steps (suggestions)
1. Persist area choices (and potential future filters) in cookies or user profiles if auth is introduced.
2. Extend area list or expose hierarchical navigation (massif → sub-area).
3. Add integration tests (Playwright) or contract tests for `listRoutes` to guard query logic.
4. Update documentation/README to mirror the current feature set and filtered search behaviour.
