import Link from "next/link";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { C2CRoute } from "@/lib/c2c";
import { formatLocaleTitle, pickLocale } from "@/lib/c2c";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type RouteCardProps = {
  route: C2CRoute;
};

export function RouteCard({ route }: RouteCardProps) {
  const locale = pickLocale(route.locales);
  const title = formatLocaleTitle(locale) ?? `Route ${route.document_id}`;
  const activities = route.activities?.join(" · ") ?? "Activity unknown";
  const summaryText = locale?.summary?.trim();
  const rawDescription = !summaryText && locale?.description
    ? locale.description.replace(/<[^>]+>/g, "")
    : "";
  const summary =
    summaryText ||
    (rawDescription.length > 0
      ? rawDescription.slice(0, 220).replace(/\s+\S*$/, "").trim()
      : "");

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-sm">{activities}</CardDescription>
          {route.reliability_tier && (
            <div>
              <Badge
                variant={
                  route.reliability_tier === "great"
                    ? "default"
                    : route.reliability_tier === "medium"
                      ? "secondary"
                      : "outline"
                }
              >
                Reliability: {route.reliability_tier.toUpperCase()}
              </Badge>
            </div>
          )}
        </div>
        <CardAction>
          <Button asChild size="sm" variant="outline">
            <Link href={`/route/${route.document_id}`}>View</Link>
          </Button>
        </CardAction>
      </CardHeader>
      {summary && (
        <CardContent className="text-sm text-muted-foreground">
          {summary}
          {summary.length < rawDescription.length && "…"}
        </CardContent>
      )}
    </Card>
  );
}
