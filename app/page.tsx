"use client";

import { FormEvent, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { SectionBadge } from "@/components/ui/SectionBadge";
import { config } from "@/lib/config";
import type { Event } from "@/lib/source";

const savedKey = "soundcheck.saved-events";
const checklistKey = "soundcheck.checklist";

export default function Home() {
  const [url, setUrl] = useState<string>(config.defaultEventUrl);
  const [event, setEvent] = useState<Event | null>(null);
  const [saved, setSaved] = useState<Event[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(savedKey) ?? "[]") as Event[]; } catch { return []; }
  });
  const [checked, setChecked] = useState<boolean[]>(() => {
    if (typeof window === "undefined") return config.checklist.map(() => false);
    try { return JSON.parse(localStorage.getItem(checklistKey) ?? "[]") as boolean[]; } catch { return config.checklist.map(() => false); }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const result = (await response.json()) as { event?: Event; error?: string };
      if (!response.ok || !result.event) throw new Error(result.error ?? "The event could not be loaded.");
      setEvent(result.event);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The event could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  function saveEvent() {
    if (!event) return;
    const next = [...saved.filter((item) => item.sourceUrl !== event.sourceUrl), event];
    setSaved(next);
    localStorage.setItem(savedKey, JSON.stringify(next));
  }

  function toggleChecklist(index: number) {
    const next = checked.length === config.checklist.length ? [...checked] : config.checklist.map(() => false);
    next[index] = !next[index];
    setChecked(next);
    localStorage.setItem(checklistKey, JSON.stringify(next));
  }

  return (
    <main className="min-h-screen bg-[#08090c] px-5 py-6 text-[#f4f1ec] sm:px-10 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full bg-[#e5ff4d] shadow-[0_0_24px_4px_rgba(229,255,77,0.45)]" /><span className="text-sm font-semibold tracking-[0.26em] text-[#e5ff4d] uppercase">Soundcheck</span></div>
          <span className="text-xs tracking-[0.16em] text-white/35 uppercase">Your concert brief</span>
        </header>

        <section className="py-14 sm:py-20"><p className="mb-4 text-sm tracking-[0.2em] text-white/45 uppercase">Get ready for the show</p><h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">Less searching.<br />More showing up.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-white/60">Load an event to build one clear, source-linked preparation brief.</p></section>

        <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-[#101217] p-4 sm:flex sm:items-end sm:gap-4 sm:p-5">
          <label className="block flex-1"><span className="mb-2 block text-xs font-medium tracking-[0.14em] text-white/45 uppercase">Ticketmaster event URL</span><input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#e5ff4d]/70" placeholder="Paste a Ticketmaster event URL" /></label>
          <button className="mt-3 w-full rounded-xl bg-[#e5ff4d] px-6 py-3 text-sm font-semibold text-[#101217] transition hover:bg-[#f0ff91] sm:mt-0 sm:w-auto" type="submit">Load event</button>
        </form>

        <div className="mt-8">{loading && <LoadingState />}{error && <ErrorState message={error} />}</div>

        {event && !loading && <section className="mt-8 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <article className="rounded-2xl border border-white/10 bg-[#101217] p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><SectionBadge status={event.sourceStatus} /><button onClick={saveEvent} className="text-sm text-white/55 underline-offset-4 hover:text-white hover:underline">Save event</button></div><h2 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">{event.name}</h2><p className="mt-3 text-white/55">{event.artist} · {event.tour}</p><div className="mt-8 grid gap-5 border-t border-white/10 pt-6 sm:grid-cols-2"><Fact label="Date" value={event.date} /><Fact label="Time" value={event.time} /><Fact label="Venue" value={event.venue} /><Fact label="Address" value={event.address} /></div><a className="mt-8 inline-block text-sm text-[#e5ff4d] underline-offset-4 hover:underline" href={event.sourceUrl} target="_blank" rel="noreferrer">View event source ↗</a></article>
          <aside className="rounded-2xl border border-white/10 bg-[#101217] p-6 sm:p-8"><p className="text-xs tracking-[0.16em] text-white/45 uppercase">Your preparation</p><h2 className="mt-3 text-2xl font-semibold">Before you go</h2><div className="mt-6 space-y-3">{config.checklist.map((item, index) => <label key={item} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/75"><input type="checkbox" checked={checked[index] ?? false} onChange={() => toggleChecklist(index)} className="h-4 w-4 accent-[#e5ff4d]" />{item}</label>)}</div></aside>
        </section>}

        {!event && !loading && !error && <div className="mt-8"><EmptyState message="Load an event to see its details and preparation checklist." /></div>}
        {saved.length > 0 && <section className="mt-12 border-t border-white/10 pt-8"><p className="text-xs tracking-[0.16em] text-white/45 uppercase">Saved events</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{saved.map((item) => <button key={item.sourceUrl} onClick={() => { setEvent(item); setUrl(item.sourceUrl); }} className="rounded-xl border border-white/10 bg-[#101217] p-4 text-left hover:border-[#e5ff4d]/40"><p className="font-medium">{item.name}</p><p className="mt-1 text-sm text-white/50">{item.venue} · {item.date}</p></button>)}</div></section>}
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) { return <div><p className="text-xs tracking-[0.14em] text-white/35 uppercase">{label}</p><p className="mt-2 text-sm text-white/80">{value}</p></div>; }
