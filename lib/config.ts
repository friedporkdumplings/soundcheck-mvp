export const config = Object.freeze({
  defaultEventUrl:
    "https://www.ticketmaster.com/le-sserafim-2026-le-sserafim-pureflow-newark-new-jersey-10-08-2026/event/020064ABF7904B12",
  ticketmasterBaseUrl: "https://app.ticketmaster.com/discovery/v2",
  firecrawlScrapeUrl: "https://api.firecrawl.dev/v2/scrape",
  requestTimeoutMs: 10000,
  checklist: ["Confirm the event time", "Review venue entry rules", "Plan your route"] as const,
});
