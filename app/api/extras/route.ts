import { loadSetlistHistory } from "@/lib/source";

export async function POST() {
  return Response.json({ setlists: await loadSetlistHistory() });
}
