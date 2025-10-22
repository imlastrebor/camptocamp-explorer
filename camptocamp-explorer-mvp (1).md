# 🏔️ Camptocamp Explorer — MVP

A **minimal** Next.js app that lists Camptocamp routes around Chamonix using the public v6 API.  
**No map, no auth, no DB** — just fast server-rendered pages, clean UI with **Tailwind** and **shadcn/ui (MCP)**, and modern fetch patterns.

---

## 🎯 MVP Scope (Keep it simple)
- **Routes List**: Fetch and render a paginated list of routes for a Chamonix area selection (Mont-Blanc / Aiguilles Rouges), with bbox fallback.
- **Route Details**: Simple detail page for a route by ID.
- **Basic Filters (optional)**: Activity and a free-text query.
- **Fast by default**: Server Components + incremental caching.
- **Polished UI**: Tailwind utilities + shadcn/ui components.
- **Zero client state** (no Redux, no heavy data libs).

**Out of scope for MVP**: maps, accounts, favorites, offline, complex filtering, i18n, analytics.

---

## 🧱 Tech Choices (modern & pragmatic)
- **Next.js (App Router)** — React Server Components, Route Handlers, and ISR.
- **Tailwind CSS** — utility-first styling.
- **shadcn/ui (MCP)** — accessible, composable UI primitives (Card, Input, Button, Select).
- **Native `fetch`** — cache & revalidate via Next.js `fetch` options.
- **TypeScript** everywhere.
- **ESLint/Prettier** defaults from Next.js.

---

## 📦 Project Structure (lean)
```
camptocamp-explorer/
├─ app/
│  ├─ page.tsx                 # Routes list (server component)
│  ├─ route/[id]/page.tsx      # Route details (server component)
│  └─ api/c2c/route.ts         # (optional) proxy/caching route handler
├─ lib/
│  └─ c2c.ts                    # Tiny API helpers
├─ components/
│  ├─ RouteCard.tsx             # Uses shadcn/ui Card
│  └─ Filters.tsx               # Uses shadcn/ui Input/Select (optional)
├─ styles/
│  └─ globals.css               # Tailwind base
├─ public/
├─ package.json
└─ README.md
```

---

## 🔧 Setup (copy/paste)
```bash
# 1) Create the app
npx create-next-app@latest camptocamp-explorer --ts
cd camptocamp-explorer

# 2) Tailwind
npx tailwindcss init -p

# tailwind.config.js -> content should include the app/, components/, and node_modules for shadcn/ui
# e.g. content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}", "./node_modules/@(geist|lucide-react|@radix-ui)/**/{*.js,*.ts,*.tsx}"]

# 3) shadcn/ui (MCP)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input select card

# 4) (Optional) UI icon set if you like
npm install lucide-react

# 5) Dev
npm run dev
```

---

## 🔌 API usage (minimal helpers)

**lib/c2c.ts**
```ts
const BASE = 'https://api.camptocamp.org';

export type C2CRoute = {
  document_id: number;
  activities?: string[];
  locales?: { title?: string }[];
};

type Paginated<T> = {
  documents: T[];
  total: number;
  limit: number;
  offset: number;
};

// Mont-Blanc + Aiguilles Rouges area IDs (fallbacks to bbox internally)
const DEFAULT_AREAS = ['14410', '14404'];

export async function listRoutes({
  q,
  act = 'alpine_climbing,rock_climbing,skitouring',
  limit = 50,
  offset = 0,
  areas = DEFAULT_AREAS
}: {
  q?: string;
  act?: string;
  limit?: number;
  offset?: number;
  areas?: string[];
}): Promise<Paginated<C2CRoute>> {
  const url = new URL(`${BASE}/routes`);
  if (areas?.length) {
    url.searchParams.set('a', areas.join(','));
  } else {
    url.searchParams.set('bbox', '6.70,45.85,7.15,46.10');
  }
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('act', act);
  if (q) url.searchParams.set('q', q);

  // Cache for 1 hour; RSC-friendly
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`c2c listRoutes failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function getRoute(id: string) {
  const res = await fetch(`${BASE}/routes/${id}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`c2c getRoute failed: ${res.status}`);
  return res.json();
}
```

---

## 🖼️ UI skeleton (server components)

**app/page.tsx**
```tsx
import { listRoutes } from '@/lib/c2c';
import Link from 'next/link';

export default async function HomePage({
  searchParams
}: {
  searchParams?: { q?: string; act?: string; offset?: string };
}) {
  const q = searchParams?.q || '';
  const act = searchParams?.act || 'alpine_climbing,rock_climbing,skitouring';
  const offset = Number(searchParams?.offset || 0);

  const data = await listRoutes({ q, act, offset });

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Chamonix Routes</h1>

      {/* Simple search/filter (server rendered via URL params) */}
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search..."
          className="w-full border rounded px-3 py-2"
        />
        <button className="px-4 py-2 rounded bg-black text-white">Search</button>
      </form>

      <ul className="space-y-2">
        {data.documents.map((r: any) => (
          <li key={r.document_id} className="border rounded p-3">
            <Link href={`/route/${r.document_id}`} className="font-medium">
              {r.locales?.[0]?.title || 'Untitled route'}
            </Link>
            <div className="text-sm text-gray-500">
              {r.activities?.join(', ') || '—'}
            </div>
          </li>
        ))}
      </ul>

      {/* Simple next page link */}
      {data.documents.length > 0 && (
        <div className="pt-2">
          <Link
            href={`/?q=${encodeURIComponent(q)}&act=${encodeURIComponent(
              act
            )}&offset=${offset + data.limit}`}
            className="underline"
          >
            Next page →
          </Link>
        </div>
      )}
    </main>
  );
}
```

**app/route/[id]/page.tsx**
```tsx
import { getRoute } from '@/lib/c2c';

export default async function RoutePage({ params }: { params: { id: string } }) {
  const data = await getRoute(params.id);

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">
        {data?.locales?.[0]?.title || `Route ${params.id}`}
      </h1>

      <section className="space-y-1">
        <div><span className="font-medium">Activities:</span> {data?.activities?.join(', ') || '—'}</div>
        <div><span className="font-medium">Elevation:</span> {data?.elevation_min}–{data?.elevation_max} m</div>
      </section>

      <article className="prose max-w-none">
        {data?.locales?.[0]?.description || 'No description.'}
      </article>
    </main>
  );
}
```

---

## 🧪 Dev notes
- Prefer **Server Components** for pages; add client components only when needed.
- Use **URL search params** for filters to keep everything SSR-friendly and shareable.
- Use **`next.revalidate`** to keep API data fresh without client state libraries.
- If the API rate limits, add a tiny `/app/api/c2c/route.ts` proxy with caching headers (optional).

---

## 🗺️ Roadmap (post-MVP)
- Map view (Leaflet/Mapbox), richer filters, i18n, favorites, and GPX export.
- Error boundaries + skeleton states.
- E2E tests (Playwright) and a11y checks.

---

## 📄 License
MIT
