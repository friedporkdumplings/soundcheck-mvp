"use client";

import { useEffect, useState } from "react";
import type { Event } from "@/lib/source";

const storageKey = "soundcheck.event-history";
export const eventCacheLifetimeMs = 48 * 60 * 60 * 1000;

export type HistoryEvent = Event & { cachedAt: number };

function valid(item: unknown): item is HistoryEvent {
  return Boolean(item) && typeof item === "object" && typeof (item as HistoryEvent).sourceUrl === "string" && typeof (item as HistoryEvent).cachedAt === "number";
}

function fresh(item: HistoryEvent) {
  return Date.now() - item.cachedAt < eventCacheLifetimeMs;
}

export function useEventHistory() {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let next: HistoryEvent[] = [];
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as unknown;
      if (Array.isArray(stored)) next = stored.filter(valid).filter(fresh).sort((a, b) => b.cachedAt - a.cachedAt);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    const hydrate = window.setTimeout(() => { setEvents(next); setHydrated(true); }, 0);
    return () => window.clearTimeout(hydrate);
  }, []);

  function remember(event: Event) {
    setEvents((current) => {
      const next = [{ ...event, cachedAt: Date.now() }, ...current.filter((item) => item.sourceUrl !== event.sourceUrl)].slice(0, 12);
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  return { events, hydrated, latest: events[0] ?? null, find: (url: string) => events.find((item) => item.sourceUrl === url) ?? null, remember };
}
