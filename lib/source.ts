import { config } from "./config";

export type SourceStatus = "Event Source" | "Ticketmaster Page" | "Official" | "Unavailable";

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

function ticketmasterUrl(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Enter a valid Ticketmaster event URL.");
  }

  const isTicketmaster = parsed.protocol === "https:" && (parsed.hostname === "ticketmaster.com" || parsed.hostname.endsWith(".ticketmaster.com"));
  const match = parsed.pathname.match(/\/event\/([A-Za-z0-9]+)/i);
  if (!isTicketmaster || !match) throw new Error("Enter a valid Ticketmaster event URL.");
  return { url: parsed.toString(), eventId: match[1] };
}

function cleanLine(value: string) {
  return value.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*+/g, "").trim();
}

function pageEvent(markdown: string, sourceUrl: string): Event {
  const lines = markdown.split("\n").map(cleanLine).filter(Boolean);
  const title = lines.find((line) => line.startsWith("# "))?.replace(/^#\s*/, "")
    ?? lines.find((line) => /\bTickets\b/i.test(line) && line.length > 8)
    ?? unavailable;
  const dateLineIndex = lines.findIndex((line) => /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*[•·]/.test(line) && /\b(?:AM|PM)\b/i.test(line));
  const dateLine = lines[dateLineIndex] ?? "";
  const dateMatch = dateLine.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*[•·]\s*([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})\s*[•·]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  const venueLine = lines.slice(dateLineIndex + 1, dateLineIndex + 7).find((line) => /,\s*[A-Za-z .'-]+,\s*[A-Z]{2}\b/.test(line)) ?? unavailable;
  const [venue = unavailable, ...address] = venueLine.split(",").map((part) => part.trim());

  return {
    artist: text(title.split(" - ")[0]),
    tour: text(title),
    name: text(title),
    date: text(dateMatch?.[1]),
    time: text(dateMatch?.[2]),
    venue: text(venue),
    address: address.join(", ") || unavailable,
    sourceUrl,
    sourceStatus: "Ticketmaster Page",
  };
}

function extractedPageEvent(fields: Record<string, unknown>, sourceUrl: string): Event {
  const name = text(fields.name);
  return {
    artist: text(fields.artist) === unavailable ? text(name.split(" - ")[0]) : text(fields.artist),
    tour: name,
    name,
    date: text(fields.date),
    time: text(fields.time),
    venue: text(fields.venue),
    address: text(fields.address),
    sourceUrl,
    sourceStatus: "Ticketmaster Page",
  };
}

async function loadTicketmasterPage(url: string): Promise<Event> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("This event is not indexed by Ticketmaster yet. Add FIRECRAWL_API_KEY in Vercel to enable the public-page fallback.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const response = await fetch(config.firecrawlScrapeUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: [
          "markdown",
          {
            type: "json",
            prompt: "Extract only the event facts visibly published on this Ticketmaster page. Use 'Unavailable' for any missing value.",
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                artist: { type: "string" },
                date: { type: "string" },
                time: { type: "string" },
                venue: { type: "string" },
                address: { type: "string" },
              },
              required: ["name", "artist", "date", "time", "venue", "address"],
            },
          },
        ],
        onlyMainContent: false,
        waitFor: config.firecrawlWaitMs,
        location: { country: "US", languages: ["en-US"] },
        proxy: "auto",
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error("Firecrawl rejected FIRECRAWL_API_KEY. Check the key in Vercel.");
      if (response.status === 402) throw new Error("Firecrawl needs available credits to read this Ticketmaster page.");
      if (response.status === 429) throw new Error("Firecrawl is rate-limited. Please try again in a moment.");
      throw new Error(`Firecrawl could not read this Ticketmaster page (status ${response.status}).`);
    }
    const raw = (await response.json()) as { data?: { markdown?: unknown; json?: unknown } };
    if (raw.data?.json && typeof raw.data.json === "object" && !Array.isArray(raw.data.json)) return extractedPageEvent(raw.data.json as Record<string, unknown>, url);
    if (typeof raw.data?.markdown !== "string" || !raw.data.markdown.trim()) throw new Error("Firecrawl reached Ticketmaster but did not return event details.");
    return pageEvent(raw.data.markdown, url);
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadEvent(url: string): Promise<Event> {
  const ticketmaster = ticketmasterUrl(url);

  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) throw new Error("Ticketmaster is not configured yet. Add TICKETMASTER_API_KEY in Vercel.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const response = await fetch(
      `${config.ticketmasterBaseUrl}/events/${ticketmaster.eventId}.json?apikey=${encodeURIComponent(apiKey)}`,
      { signal: controller.signal, cache: "no-store" },
    );
    if (!response.ok) return loadTicketmasterPage(ticketmaster.url);

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
      sourceUrl: ticketmaster.url,
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
