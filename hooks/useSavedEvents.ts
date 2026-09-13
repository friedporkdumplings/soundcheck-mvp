"use client";

import { useEffect, useState } from "react";
import type { Event } from "@/lib/source";

const storageKey = "soundcheck.saved-events";

export type SavedEvent = Pick<Event, "name" | "venue" | "date" | "sourceUrl">;

function eventForStorage(event: Event): SavedEvent {
  return { name: event.name, venue: event.venue, date: event.date, sourceUrl: event.sourceUrl };
}

export function useSavedEvents() {
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let next: SavedEvent[] = [];
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as unknown;
      if (Array.isArray(stored)) next = stored.filter((item): item is SavedEvent => Boolean(item) && typeof item === "object" && typeof (item as SavedEvent).sourceUrl === "string");
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    const hydrate = window.setTimeout(() => {
      setSavedEvents(next);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, []);

  function toggle(event: Event) {
    const savedEvent = eventForStorage(event);
    setSavedEvents((current) => {
      const exists = current.some((item) => item.sourceUrl === savedEvent.sourceUrl);
      const next = exists ? current.filter((item) => item.sourceUrl !== savedEvent.sourceUrl) : [...current, savedEvent];
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  return { savedEvents, hydrated, isSaved: (event: Event) => savedEvents.some((item) => item.sourceUrl === event.sourceUrl), toggle };
}
