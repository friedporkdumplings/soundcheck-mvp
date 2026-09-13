import { supportedVenueFor } from "@/lib/config";
import { loadVenueRules, loadWeather } from "@/lib/source";
import { revalidateTag } from "next/cache";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { date?: unknown; venue?: unknown; freshVenue?: unknown };
    const date = typeof body.date === "string" ? body.date : undefined;
    const eventVenue = typeof body.venue === "string" ? body.venue : undefined;
    const supportedVenue = supportedVenueFor(eventVenue);
    if (body.freshVenue === true && supportedVenue) revalidateTag(`venue-${supportedVenue.id}`, { expire: 0 });
    const [venue, weather] = await Promise.all([loadVenueRules(eventVenue), loadWeather(date, eventVenue)]);
    return Response.json({ venue, weather, supportedVenue });
  } catch {
    return Response.json({ error: "Venue context is unavailable right now." }, { status: 502 });
  }
}
