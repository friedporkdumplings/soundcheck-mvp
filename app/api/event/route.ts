import { loadEvent } from "@/lib/source";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: unknown };
    if (typeof body.url !== "string") return Response.json({ error: "Enter a Ticketmaster event URL." }, { status: 400 });
    return Response.json({ event: await loadEvent(body.url) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The event could not be loaded.";
    return Response.json({ error: message }, { status: 502 });
  }
}
