import { loadVenueRules, loadWeather } from "@/lib/source";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { date?: unknown };
    const date = typeof body.date === "string" ? body.date : undefined;
    const [venue, weather] = await Promise.all([loadVenueRules(), loadWeather(date)]);
    return Response.json({ venue, weather });
  } catch {
    return Response.json({ error: "Venue context is unavailable right now." }, { status: 502 });
  }
}
