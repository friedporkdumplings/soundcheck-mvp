import { config } from "./config";

export type SourceStatus = "Event Source" | "Ticketmaster Page" | "Official" | "Live weather" | "Setlist.fm" | "Unavailable";

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

export type Weather = {
  summary: string;
  sourceStatus: "Live weather" | "Unavailable";
};

export type Setlist = { date: string; venue: string; city: string; tour: string; songs: string[]; sourceUrl: string };
export type SetlistHistory = { setlists: Setlist[]; sourceStatus: "Setlist.fm" | "Unavailable"; notice: string };

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
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return { name: unavailable, rules: [], sourceStatus: "Unavailable" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const response = await fetch(config.firecrawlScrapeUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: config.venueGuideUrl,
        formats: [{
          type: "json",
          prompt: "Extract only current official Prudential Center entry rules relevant to concert guests: bag limits, backpacks, camera restrictions, and security screening. Keep each rule concise. Do not infer rules not stated on the page.",
          schema: { type: "object", properties: { rules: { type: "array", items: { type: "string" } } }, required: ["rules"] },
        }],
        onlyMainContent: true,
        waitFor: config.firecrawlWaitMs,
        location: { country: "US", languages: ["en-US"] },
        proxy: "auto",
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return { name: unavailable, rules: [], sourceStatus: "Unavailable" };
    const raw = (await response.json()) as { data?: { json?: { rules?: unknown } } };
    const rules = Array.isArray(raw.data?.json?.rules) ? raw.data.json.rules.filter((rule): rule is string => typeof rule === "string" && Boolean(rule.trim())).map((rule) => rule.trim()) : [];
    return rules.length ? { name: "Prudential Center", rules, sourceStatus: "Official" } : { name: unavailable, rules: [], sourceStatus: "Unavailable" };
  } catch {
    return { name: unavailable, rules: [], sourceStatus: "Unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}

function weatherDate(value: string) {
  const iso = value.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (iso) return iso;
  const named = value.match(/[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}/)?.[0];
  if (!named) return null;
  const parsed = new Date(named);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10);
}

function weatherLabel(code: number) {
  if (code === 0) return "Clear skies";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain possible";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow possible";
  if ([95, 96, 99].includes(code)) return "Thunderstorms possible";
  return "Conditions unavailable";
}

export async function loadWeather(eventDate?: string): Promise<Weather> {
  const date = eventDate ? weatherDate(eventDate) : null;
  if (!date) return { summary: unavailable, sourceStatus: "Unavailable" };
  const now = new Date();
  const target = new Date(`${date}T12:00:00Z`);
  const daysAway = (target.valueOf() - now.valueOf()) / 86_400_000;
  if (daysAway < 0 || daysAway > 16) return { summary: "Forecast unavailable until closer to the event", sourceStatus: "Unavailable" };

  try {
    const location = config.prudentialCenter;
    const params = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max", timezone: location.timezone, start_date: date, end_date: date });
    const response = await fetch(`${config.openMeteoForecastUrl}?${params}`, { cache: "no-store" });
    if (!response.ok) return { summary: unavailable, sourceStatus: "Unavailable" };
    const raw = (await response.json()) as { daily?: { weather_code?: number[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_probability_max?: number[] } };
    const daily = raw.daily;
    const high = daily?.temperature_2m_max?.[0];
    const low = daily?.temperature_2m_min?.[0];
    const rain = daily?.precipitation_probability_max?.[0];
    const code = daily?.weather_code?.[0];
    if (typeof high !== "number" || typeof low !== "number" || typeof code !== "number") return { summary: unavailable, sourceStatus: "Unavailable" };
    return { summary: `${weatherLabel(code)} · ${Math.round(low)}–${Math.round(high)}°C${typeof rain === "number" ? ` · ${rain}% precipitation` : ""}`, sourceStatus: "Live weather" };
  } catch {
    return { summary: unavailable, sourceStatus: "Unavailable" };
  }
}

function setlistDate(value: unknown) {
  if (typeof value !== "string") return unavailable;
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

export async function loadSetlistHistory(): Promise<SetlistHistory> {
  const apiKey = process.env.SETLISTFM_API_KEY;
  if (!apiKey) return { setlists: [], sourceStatus: "Unavailable", notice: "Add SETLISTFM_API_KEY in Vercel to load recent show history." };

  try {
    const params = new URLSearchParams({ artistName: config.setlistArtistName, p: "1" });
    const response = await fetch(`${config.setlistFmSearchUrl}?${params}`, { headers: { Accept: "application/json", "x-api-key": apiKey }, cache: "no-store" });
    if (!response.ok) return { setlists: [], sourceStatus: "Unavailable", notice: "Recent setlist history is unavailable right now." };
    const raw = (await response.json()) as { setlist?: Array<Record<string, unknown>> };
    const setlists = (raw.setlist ?? []).map((item) => {
      const venue = (item.venue ?? {}) as Record<string, unknown>;
      const city = (venue.city ?? {}) as Record<string, unknown>;
      const tour = (item.tour ?? {}) as Record<string, unknown>;
      const sets = Array.isArray(item.set) ? item.set : [];
      const songs = sets.flatMap((set) => Array.isArray((set as Record<string, unknown>).song) ? (set as Record<string, unknown>).song as Record<string, unknown>[] : []).map((song) => text(song.name)).filter((song) => song !== unavailable).slice(0, 4);
      return { date: setlistDate(item.eventDate), venue: text(venue.name), city: text(city.name), tour: text(tour.name), songs, sourceUrl: text(item.url) };
    }).filter((setlist) => setlist.sourceUrl !== unavailable).slice(0, 3);
    return setlists.length ? { setlists, sourceStatus: "Setlist.fm", notice: "Recent fan-submitted setlist history." } : { setlists: [], sourceStatus: "Unavailable", notice: "No recent setlist history was found." };
  } catch {
    return { setlists: [], sourceStatus: "Unavailable", notice: "Recent setlist history is unavailable right now." };
  }
}

export async function loadCommunityContext(): Promise<CommunityContext> {
  return { tips: [], sourceStatus: "Unavailable" };
}
