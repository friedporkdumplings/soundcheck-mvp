export type SupportedVenue = {
  id: "prudential-center" | "ubs-arena" | "madison-square-garden" | "infosys-theater";
  name: string;
  aliases: string[];
  guideUrl: string;
  latitude: number;
  longitude: number;
  timezone: string;
  transport: { primaryLabel: string; primaryUrl: string; directions: string; parking: string; description: string };
  seatViewUrl: string;
};

const supportedVenues: SupportedVenue[] = [
  { id: "prudential-center", name: "Prudential Center", aliases: ["prudential center"], guideUrl: "https://www.prucenter.com/a-z-guide", latitude: 40.7336, longitude: -74.171, timezone: "America/New_York", transport: { primaryLabel: "NJ Transit", primaryUrl: "https://www.njtransit.com/prucenter", directions: "https://www.google.com/maps/dir/?api=1&destination=Prudential+Center%2C+25+Lafayette+St%2C+Newark%2C+NJ+07102", parking: "https://www.prucenter.com/parking", description: "Newark Penn Station is a short walk from Prudential Center. Choose your route before event day." }, seatViewUrl: "https://aviewfrommyseat.com/venue/Prudential%2BCenter/" },
  { id: "ubs-arena", name: "UBS Arena at Belmont Park", aliases: ["ubs arena", "belmont park"], guideUrl: "https://ubsarena.com/plan-your-trip/", latitude: 40.7229, longitude: -73.5901, timezone: "America/New_York", transport: { primaryLabel: "Plan your trip", primaryUrl: "https://ubsarena.com/plan-your-trip/", directions: "https://www.google.com/maps/dir/?api=1&destination=UBS+Arena%2C+2400+Hempstead+Turnpike%2C+Elmont%2C+NY+11003", parking: "https://ubsarena.com/plan-your-trip/", description: "Take the LIRR to Elmont–UBS Arena Station, or plan parking before you drive." }, seatViewUrl: "https://aviewfrommyseat.com/venue/UBS%2BArena/" },
  { id: "madison-square-garden", name: "Madison Square Garden", aliases: ["madison square garden"], guideUrl: "https://www.msg.com/madison-square-garden/faqs", latitude: 40.7505, longitude: -73.9934, timezone: "America/New_York", transport: { primaryLabel: "Getting there", primaryUrl: "https://www.msg.com/madison-square-garden/getting-there", directions: "https://www.google.com/maps/dir/?api=1&destination=Madison+Square+Garden%2C+4+Penn+Plaza%2C+New+York%2C+NY+10001", parking: "https://www.msg.com/madison-square-garden/parking", description: "MSG sits above Penn Station, with multiple subway and rail connections nearby." }, seatViewUrl: "https://aviewfrommyseat.com/venue/Madison%2BSquare%2BGarden/" },
  { id: "infosys-theater", name: "Infosys Theater at Madison Square Garden", aliases: ["infosys theater", "infosys theater at madison square garden"], guideUrl: "https://www.msg.com/infosys-theater-at-msg/faqs", latitude: 40.7505, longitude: -73.9934, timezone: "America/New_York", transport: { primaryLabel: "Getting there", primaryUrl: "https://www.msg.com/madison-square-garden/getting-there", directions: "https://www.google.com/maps/dir/?api=1&destination=Infosys+Theater+at+Madison+Square+Garden%2C+4+Penn+Plaza%2C+New+York%2C+NY+10001", parking: "https://www.msg.com/infosys-theater-at-msg/faqs", description: "The theater is inside Madison Square Garden above Penn Station; plan your entry and route ahead." }, seatViewUrl: "https://aviewfrommyseat.com/venue/Madison%2BSquare%2BGarden/" },
];

export function supportedVenueFor(venueName?: string): SupportedVenue | null {
  const normalized = venueName?.toLowerCase().trim() ?? "";
  return supportedVenues.find((venue) => venue.aliases.some((alias) => normalized.includes(alias))) ?? null;
}

export const config = Object.freeze({
  defaultEventUrl: "https://www.ticketmaster.com/le-sserafim-2026-le-sserafim-pureflow-newark-new-jersey-10-08-2026/event/020064ABF7904B12",
  ticketmasterBaseUrl: "https://app.ticketmaster.com/discovery/v2",
  firecrawlScrapeUrl: "https://api.firecrawl.dev/v2/scrape",
  firecrawlWaitMs: 2000,
  openMeteoForecastUrl: "https://api.open-meteo.com/v1/forecast",
  supportedVenues,
  setlistArtistUrl: "https://www.setlist.fm/setlists/le-sserafim-43f2537f.html",
  requestTimeoutMs: 25000,
  checklist: ["Confirm the event time", "Check bag size and prohibited items", "Review the camera policy", "Plan transit or parking", "Save your mobile ticket"] as const,
});
