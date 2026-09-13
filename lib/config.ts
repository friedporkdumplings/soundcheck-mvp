export const config = Object.freeze({
  defaultEventUrl:
    "https://www.ticketmaster.com/le-sserafim-2026-le-sserafim-pureflow-newark-new-jersey-10-08-2026/event/020064ABF7904B12",
  ticketmasterBaseUrl: "https://app.ticketmaster.com/discovery/v2",
  firecrawlScrapeUrl: "https://api.firecrawl.dev/v2/scrape",
  firecrawlWaitMs: 2000,
  venueGuideUrl: "https://www.prucenter.com/a-z-guide",
  venueEntryUrl: "https://www.prucenter.com/entry",
  openMeteoForecastUrl: "https://api.open-meteo.com/v1/forecast",
  prudentialCenter: { latitude: 40.7336, longitude: -74.171, timezone: "America/New_York" },
  transportLinks: {
    njTransit: "https://www.njtransit.com/prucenter",
    directions: "https://www.google.com/maps/dir/?api=1&destination=Prudential+Center%2C+25+Lafayette+St%2C+Newark%2C+NJ+07102",
    parking: "https://www.prucenter.com/parking",
  },
  requestTimeoutMs: 25000,
  checklist: ["Confirm the event time", "Check bag size and prohibited items", "Review the camera policy", "Plan transit or parking", "Save your mobile ticket"] as const,
});
