import { config } from "./config";

export type SourceStatus = "Event Source" | "Official" | "Unavailable";

export type Event = {
  artist: string;
  tour: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  sourceUrl: string;
  sourceStatus: SourceStatus;
};

export type Venue = {
  name: string;
  rules: string[];
  sourceStatus: SourceStatus;
};

export type CommunityContext = { tips: string[]; sourceStatus: "Unavailable" };

const unavailable = "Unavailable";

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : unavailable;
}

function dateTime(event: Record<string, unknown>) {
  const dates = (event.dates ?? {}) as Record<string, unknown>;
  const start = (dates.start ?? {}) as Record<string, unknown>;
  return { date: text(start.localDate), time: text(start.localTime) };
}

export async function loadEvent(url: string): Promise<Event> {
  const match = url.match(/\/event\/([A-Za-z0-9]+)/i);
  if (!match) throw new Error("Enter a valid Ticketmaster event URL.");

  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) throw new Error("Ticketmaster is not configured yet. Add TICKETMASTER_API_KEY in Vercel.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const response = await fetch(
      `${config.ticketmasterBaseUrl}/events/${match[1]}.json?apikey=${encodeURIComponent(apiKey)}`,
      { signal: controller.signal, cache: "no-store" },
    );
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Ticketmaster rejected the configured API key. Check TICKETMASTER_API_KEY in Vercel.");
      }
      if (response.status === 404) {
        throw new Error("Ticketmaster could not find that event.");
      }
      throw new Error("Ticketmaster could not load that event right now.");
    }

    const raw = (await response.json()) as Record<string, unknown>;
    const venues = ((raw._embedded as Record<string, unknown> | undefined)?.venues ?? []) as Record<string, unknown>[];
    const venueRecord = venues[0] ?? {};
    const location = (venueRecord.location ?? {}) as Record<string, unknown>;
    const address = (venueRecord.address ?? {}) as Record<string, unknown>;
    const { date, time } = dateTime(raw);

    return {
      artist: text((raw.name as string | undefined)?.split(" - ")[0] ?? raw.name),
      tour: text(raw.name),
      name: text(raw.name),
      date,
      time,
      venue: text(venueRecord.name),
      address: [address.line1, address.city, address.stateCode, address.postalCode].filter(Boolean).join(", ") || text(location.latitude && location.longitude ? `${location.latitude}, ${location.longitude}` : undefined),
      sourceUrl: url,
      sourceStatus: "Event Source",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadVenueRules(): Promise<Venue> {
  return { name: unavailable, rules: [], sourceStatus: "Unavailable" };
}

export async function loadWeather() {
  return { summary: unavailable, sourceStatus: "Unavailable" as const };
}

export async function loadCommunityContext(): Promise<CommunityContext> {
  return { tips: [], sourceStatus: "Unavailable" };
}
