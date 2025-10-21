import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLocaleTitle, getRoute, pickLocale } from "@/lib/c2c";

type RoutePageProps = {
  params: { id: string };
};

function sanitizeDescription(description?: string) {
  if (!description) return "No description available.";

  return description.replace(/<[^>]+>/g, "").trim() || "No description available.";
}

export default async function RoutePage({ params }: RoutePageProps) {
  const route = await getRoute(params.id);
  const locale = pickLocale(route.locales);
  const title = formatLocaleTitle(locale) ?? `Route ${params.id}`;
  const description = sanitizeDescription(locale?.description);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost">
          <Link href="/">← Back to routes</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Route #{route.document_id}
            </p>
            <CardTitle className="text-3xl">{title}</CardTitle>
            <CardDescription className="text-sm">
              {route.activities?.join(" · ") ?? "Activity unknown"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <div>
              <span className="font-medium text-foreground">Elevation</span>
              <p>
                {route.elevation_min ?? "?"}–{route.elevation_max ?? "?"} m
              </p>
            </div>
            <div>
              <span className="font-medium text-foreground">Activities</span>
              <p>{route.activities?.join(", ") ?? "—"}</p>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Overview</h2>
            <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
