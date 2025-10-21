"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

export function Filters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const initialQuery = searchParams.get("q") ?? "";
  const initialAct = searchParams.get("act") ?? DEFAULT_ACTIVITIES;
  const initialLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);

  const initialActivityValue = useMemo(() => {
    const match = ACTIVITY_OPTIONS.find((option) => option.value === initialAct);
    return match ? match.value : "custom";
  }, [initialAct]);

  const [query, setQuery] = useState(initialQuery);
  const [selectedActivity, setSelectedActivity] = useState(initialActivityValue);
  const [customActivity, setCustomActivity] = useState(
    initialActivityValue === "custom" ? initialAct : "",
  );
  const [limit, setLimit] = useState(
    LIMIT_OPTIONS.includes(initialLimit) ? initialLimit : DEFAULT_LIMIT,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (query.trim().length > 0) {
      params.set("q", query.trim());
    }

    const activityValue =
      selectedActivity === "custom" ? customActivity.trim() : selectedActivity;
    if (activityValue) {
      params.set("act", activityValue);
    }

    if (limit !== DEFAULT_LIMIT) {
      params.set("limit", String(limit));
    }

    params.set("offset", "0");

    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  }

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
          className="flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_minmax(0,220px)] sm:items-end sm:gap-4"
        >
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
            {selectedActivity === "custom" && (
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

          <div className="flex gap-2 sm:justify-end">
            <Button
              type="submit"
              className="sm:w-fit"
              disabled={isPending || (selectedActivity === "custom" && !customActivity)}
            >
              {isPending ? "Filtering..." : "Apply filters"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
