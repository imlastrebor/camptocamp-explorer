"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_ACTIVITIES } from "@/lib/c2c";
import { AREA_OPTIONS, AreaOption, normaliseAreaIds } from "@/lib/areas";
import { DEFAULT_LIMIT, LIMIT_OPTIONS } from "@/lib/search";

const ACTIVITY_OPTIONS = [
  {
    label: "Alpine · Rock · Ski",
    value: DEFAULT_ACTIVITIES,
  },
  {
    label: "Alpine climbing",
    value: "alpine_climbing",
  },
  {
    label: "Rock climbing",
    value: "rock_climbing",
  },
  {
    label: "Ski touring",
    value: "skitouring",
  },
];

type FiltersProps = {
  initialQuery: string;
  initialActivity: string;
  initialLimit: number;
  selectedAreas: string[];
  defaultAreas: string[];
  availableAreas?: AreaOption[];
  hasExplicitAreas: boolean;
};

function areSetsEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function orderAreas(ids: string[], options: AreaOption[]) {
  const order = options.map((option) => option.id);
  return normaliseAreaIds(ids).sort(
    (left, right) => order.indexOf(left) - order.indexOf(right),
  );
}

export function Filters({
  initialQuery,
  initialActivity,
  initialLimit,
  selectedAreas,
  defaultAreas,
  availableAreas = AREA_OPTIONS,
  hasExplicitAreas,
}: FiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialActivityValue = useMemo(() => {
    const match = ACTIVITY_OPTIONS.find(
      (option) => option.value === initialActivity,
    );
    return match ? match.value : "custom";
  }, [initialActivity]);

  const [query, setQuery] = useState(initialQuery);
  const [selectedActivity, setSelectedActivity] =
    useState(initialActivityValue);
  const [customActivity, setCustomActivity] = useState(
    initialActivityValue === "custom" ? initialActivity : "",
  );
  const [limit, setLimit] = useState(
    LIMIT_OPTIONS.includes(initialLimit) ? initialLimit : DEFAULT_LIMIT,
  );
  const [areas, setAreas] = useState(
    orderAreas(selectedAreas, availableAreas),
  );
  const [areasDirty, setAreasDirty] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setSelectedActivity(initialActivityValue);
    if (initialActivityValue !== "custom") {
      setCustomActivity("");
    } else {
      setCustomActivity(initialActivity);
    }
  }, [initialActivity, initialActivityValue]);

  useEffect(() => {
    setLimit(LIMIT_OPTIONS.includes(initialLimit) ? initialLimit : DEFAULT_LIMIT);
  }, [initialLimit]);

  useEffect(() => {
    setAreas(orderAreas(selectedAreas, availableAreas));
    setAreasDirty(false);
  }, [selectedAreas, availableAreas]);

  function handleAreaToggle(optionId: string) {
    setAreasDirty(true);
    setAreas((prev) => {
      const exists = prev.includes(optionId);
      const next = exists
        ? prev.filter((value) => value !== optionId)
        : [...prev, optionId];
      return orderAreas(next, availableAreas);
    });
  }

  function handleResetAreas() {
    setAreas(orderAreas(defaultAreas, availableAreas));
    setAreasDirty(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    const trimmedQuery = query.trim();
    if (trimmedQuery.length > 0) {
      params.set("q", trimmedQuery);
    }

    const activityValue =
      selectedActivity === "custom" ? customActivity.trim() : selectedActivity;
    if (activityValue) {
      params.set("act", activityValue);
    }

    if (limit !== DEFAULT_LIMIT) {
      params.set("limit", String(limit));
    }

    const cleanedAreas = orderAreas(areas, availableAreas);
    const shouldIncludeAreas =
      cleanedAreas.length > 0 &&
      (hasExplicitAreas || areasDirty || !areSetsEqual(cleanedAreas, defaultAreas));

    if (shouldIncludeAreas) {
      params.set("areas", cleanedAreas.join(","));
    }

    params.set("offset", "0");

    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  }

  const isCustomActivity = selectedActivity === "custom";
  const disableSubmit =
    isPending || (isCustomActivity && customActivity.trim().length === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Filters</CardTitle>
        <CardDescription>
          Server-rendered search powered by URL parameters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)] sm:items-end sm:gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="q">
                Search
              </label>
              <Input
                id="q"
                name="q"
                placeholder="North face, Frendo Spur..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="act">
                Activity
              </label>
              <Select
                value={selectedActivity}
                onValueChange={setSelectedActivity}
                name="act-select"
              >
                <SelectTrigger id="act">
                  <SelectValue placeholder="Select activity" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
              </Select>
              {isCustomActivity && (
                <Input
                  aria-label="Custom activities"
                  placeholder="e.g. ice_climbing"
                  value={customActivity}
                  onChange={(event) => setCustomActivity(event.target.value)}
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="limit">
                Results per page
              </label>
              <Select
                value={String(limit)}
                onValueChange={(value) => setLimit(Number(value))}
                name="limit-select"
              >
                <SelectTrigger id="limit">
                  <SelectValue placeholder="Results per page" />
                </SelectTrigger>
                <SelectContent>
                  {LIMIT_OPTIONS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} routes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-sm font-medium text-foreground">Areas</span>
                <p className="text-xs text-muted-foreground">
                  Choose the massifs to include. Leave unchanged for the default mix.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetAreas}
              >
                Reset
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {availableAreas.map((area) => {
                const checked = areas.includes(area.id);
                return (
                  <label
                    key={area.id}
                    className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:border-foreground transition"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() => handleAreaToggle(area.id)}
                    />
                    <span className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {area.label}
                      </span>
                      {area.description && (
                        <span className="text-xs text-muted-foreground">
                          {area.description}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 sm:justify-end">
            <Button type="submit" className="sm:w-fit" disabled={disableSubmit}>
              {isPending ? "Filtering..." : "Apply filters"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
