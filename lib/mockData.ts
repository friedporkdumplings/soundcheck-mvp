import type { Event, Venue } from "./source";

export const mockEvent: Event = {
  artist: "LE SSERAFIM",
  tour: "Unavailable",
  name: "LE SSERAFIM 2026 LE SSERAFIM PUREFLOW",
  date: "2026-10-08",
  time: "Unavailable",
  venue: "Prudential Center",
  address: "25 Lafayette Street, Newark, NJ 07102",
  sourceUrl:
    "https://www.ticketmaster.com/le-sserafim-2026-le-sserafim-pureflow-newark-new-jersey-10-08-2026/event/020064ABF7904B12",
  sourceStatus: "Event Source",
};

export const mockVenue: Venue = {
  name: "Prudential Center",
  rules: [],
  sourceStatus: "Unavailable",
};
