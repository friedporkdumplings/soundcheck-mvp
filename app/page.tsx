"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { SectionBadge } from "@/components/ui/SectionBadge";
import { config, type SupportedVenue } from "@/lib/config";
import type { Event, Venue, Weather } from "@/lib/source";
import { useSavedEvents, type SavedEvent } from "@/hooks/useSavedEvents";
import { useEventHistory } from "@/hooks/useEventHistory";

const checklistKey = "soundcheck.checklist";
const loadingMessages = ["Verifying Ticketmaster link…", "Extracting venue guidelines…", "Loading live weather forecast…", "Preparing your concert brief…"];
const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.2 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const venueRefreshKey = "soundcheck.venue-refresh";

function easternWeekKey() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const date = new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

export default function Home() {
  const [url, setUrl] = useState<string>(config.defaultEventUrl);
  const [event, setEvent] = useState<Event | null>(null);
  const { savedEvents, hydrated: savedEventsHydrated, isSaved, toggle: toggleSavedEvent } = useSavedEvents();
  const { events: historyEvents, hydrated: historyHydrated, latest: latestHistoryEvent, find: findHistoryEvent, remember: rememberEvent } = useEventHistory();
  const [checked, setChecked] = useState<boolean[]>(() => {
    if (typeof window === "undefined") return config.checklist.map(() => false);
    try { return JSON.parse(localStorage.getItem(checklistKey) ?? "[]") as boolean[]; } catch { return config.checklist.map(() => false); }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [venue, setVenue] = useState<Venue | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [supportedVenue, setSupportedVenue] = useState<SupportedVenue | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [lastVenueRefresh, setLastVenueRefresh] = useState<string | null>(null);
  const [venueRefreshWeek, setVenueRefreshWeek] = useState<string | null>(null);

  useEffect(() => {
    if (!demoLoading) return;
    const interval = window.setInterval(() => setLoadingStep((step) => Math.min(step + 1, loadingMessages.length - 1)), 700);
    const finish = window.setTimeout(() => setDemoLoading(false), 2500);
    return () => { window.clearInterval(interval); window.clearTimeout(finish); };
  }, [demoLoading]);

  useEffect(() => {
    if (!historyHydrated || !latestHistoryEvent || event) return;
    const restore = window.setTimeout(() => {
      setUrl(latestHistoryEvent.sourceUrl);
      setEvent(latestHistoryEvent);
      void loadContext(latestHistoryEvent);
      setLoadingStep(0);
      setDemoLoading(true);
    }, 0);
    return () => window.clearTimeout(restore);
  }, [historyHydrated, latestHistoryEvent, event]);

  useEffect(() => {
    if (!supportedVenue) return;
    let refreshedAt: string | null = null;
    let refreshWeek: string | null = null;
    try {
      const stored = JSON.parse(window.localStorage.getItem(`${venueRefreshKey}-${supportedVenue.id}`) ?? "null") as { refreshedAt?: unknown; week?: unknown } | null;
      if (typeof stored?.refreshedAt === "string") {
        refreshedAt = stored.refreshedAt;
        refreshWeek = typeof stored.week === "string" ? stored.week : null;
      }
    } catch {
      window.localStorage.removeItem(venueRefreshKey);
    }
    const hydrate = window.setTimeout(() => { setLastVenueRefresh(refreshedAt); setVenueRefreshWeek(refreshWeek); }, 0);
    return () => window.clearTimeout(hydrate);
  }, [supportedVenue]);

  async function loadContext(eventDetails: Event, freshVenue = false) {
    setContextLoading(true);
    setVenue(null);
    setWeather(null);
    setSupportedVenue(null);
    try {
      const response = await fetch("/api/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: eventDetails.date, venue: eventDetails.venue, freshVenue }) });
      const result = (await response.json()) as { venue?: Venue; weather?: Weather; supportedVenue?: SupportedVenue | null };
      if (result.venue) setVenue(result.venue);
      if (result.weather) setWeather(result.weather);
      if (result.supportedVenue) setSupportedVenue(result.supportedVenue);
      if (freshVenue && result.supportedVenue) {
        const refreshedAt = new Date().toISOString();
        window.localStorage.setItem(`${venueRefreshKey}-${result.supportedVenue.id}`, JSON.stringify({ week: easternWeekKey(), refreshedAt }));
        setLastVenueRefresh(refreshedAt);
        setVenueRefreshWeek(easternWeekKey());
      }
    } finally {
      setContextLoading(false);
    }
  }

  async function loadEventUrl(eventUrl: string) {
    setLoading(true);
    setError("");
    setLoadingStep(0);
    setDemoLoading(false);
    const cached = findHistoryEvent(eventUrl);
    if (cached) {
      setEvent(cached);
      void loadContext(cached);
      setDemoLoading(true);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: eventUrl }) });
      const result = (await response.json()) as { event?: Event; error?: string };
      if (!response.ok || !result.event) throw new Error(result.error ?? "The event could not be loaded.");
      setEvent(result.event);
      rememberEvent(result.event);
      void loadContext(result.event);
      setDemoLoading(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The event could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  function submit(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    void loadEventUrl(url);
  }

  function loadSavedEvent(savedEvent: SavedEvent) {
    setUrl(savedEvent.sourceUrl);
    void loadEventUrl(savedEvent.sourceUrl);
  }

  async function refreshVenueData() {
    if (!event || !supportedVenue) return;
    const stored = JSON.parse(window.localStorage.getItem(`${venueRefreshKey}-${supportedVenue.id}`) ?? "null") as { week?: unknown } | null;
    if (stored?.week === easternWeekKey()) return;
    await loadContext(event, true);
  }

  const refreshedThisWeek = venueRefreshWeek === easternWeekKey();

  function toggleChecklist(index: number) {
    const next = checked.length === config.checklist.length ? [...checked] : config.checklist.map(() => false);
    next[index] = !next[index];
    setChecked(next);
    localStorage.setItem(checklistKey, JSON.stringify(next));
  }

  return (
    <main className="min-h-screen bg-white px-5 py-6 text-[#183153] sm:px-10 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between border-b-2 border-[#193a68] pb-5">
          <div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full border border-[#193a68] bg-[#8ed1ff]" /><span className="text-sm font-black tracking-[0.22em] text-[#183153] uppercase">Soundcheck</span></div>
          <nav className="flex items-center gap-4"><a href="/practice" className="text-xs font-bold tracking-[0.12em] text-[#31577f] uppercase underline decoration-2 underline-offset-4">Ticketing practice</a><a href="#history" className="text-xs font-bold tracking-[0.12em] text-[#31577f] uppercase underline decoration-2 underline-offset-4">History{historyHydrated ? ` (${historyEvents.length})` : ""}</a><a href="#saved-events" className="text-xs font-bold tracking-[0.12em] text-[#31577f] uppercase underline decoration-2 underline-offset-4">Saved{savedEventsHydrated ? ` (${savedEvents.length})` : ""}</a><span className="text-xs font-bold tracking-[0.12em] text-[#52739a] uppercase">Your concert brief</span></nav>
        </header>

        <section className="grid gap-8 py-14 sm:py-20 lg:grid-cols-[1.15fr_.85fr] lg:items-end"><div><p className="mb-4 text-sm font-bold tracking-[0.16em] text-[#52739a] uppercase">Your concert-day command center</p><h1 className="max-w-4xl text-5xl font-black tracking-[-0.055em] text-[#183153] sm:text-7xl">Know the plan.<br />Own the night.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-[#31577f]">Paste one exact Ticketmaster event page. Soundcheck turns it into a practical brief with show timing, official venue rules, weather, routes, seat views, and recent tour context.</p><div className="mt-7 flex flex-wrap gap-2 text-xs font-black tracking-[0.1em] text-[#31577f] uppercase"><span className="border border-[#193a68] bg-white px-3 py-2 shadow-[2px_2px_0_#193a68]">Event brief</span><span className="border border-[#193a68] bg-white px-3 py-2 shadow-[2px_2px_0_#193a68]">Venue intel</span><span className="border border-[#193a68] bg-white px-3 py-2 shadow-[2px_2px_0_#193a68]">Ticketing practice</span></div></div><aside className="border-2 border-[#193a68] bg-[#eef8ff] p-5 shadow-[4px_4px_0_#193a68]"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">What you&apos;ll get</p><div className="mt-4 grid gap-3"><div className="border border-[#193a68] bg-white p-3"><p className="text-sm font-black">The essentials</p><p className="mt-1 text-xs leading-5 text-[#52739a]">Date, time, venue, and the official event page.</p></div><div className="border border-[#193a68] bg-white p-3"><p className="text-sm font-black">The practical stuff</p><p className="mt-1 text-xs leading-5 text-[#52739a]">Entry rules, weather, transit, parking, and seat views.</p></div><div className="border border-[#193a68] bg-white p-3"><p className="text-sm font-black">Less repeat searching</p><p className="mt-1 text-xs leading-5 text-[#52739a]">Recent briefs stay ready in History for 48 hours on this device.</p></div></div></aside></section>

        <form onSubmit={submit} className="border-2 border-[#193a68] bg-[#ccecff] p-4 shadow-[4px_4px_0_#193a68] sm:flex sm:items-end sm:gap-4 sm:p-5">
          <label className="block flex-1"><span className="mb-2 block text-xs font-black tracking-[0.12em] text-[#183153] uppercase">Start with the exact event page</span><span className="mb-3 block text-sm leading-5 text-[#31577f]">Use the Ticketmaster page for your specific show—the URL should include <b>/event/</b>. Artist and venue listings cannot build a concert brief.</span><input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full border border-[#193a68] bg-white px-4 py-3 text-sm text-[#183153] outline-none placeholder:text-[#7894b3] focus:shadow-[3px_3px_0_#193a68]" placeholder="https://www.ticketmaster.com/.../event/..." /></label>
          <button className="mt-3 w-full border-2 border-[#193a68] bg-white px-6 py-3 text-sm font-black text-[#183153] shadow-[4px_4px_0_#193a68] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#193a68] sm:mt-0 sm:w-auto" type="submit">Build my brief</button>
        </form>

        <div className="border-x-2 border-b-2 border-[#193a68] bg-white px-4 py-3 text-xs leading-5 text-[#52739a] shadow-[4px_4px_0_#193a68]"><span className="font-black text-[#183153]">Caching note:</span> briefs you&apos;ve viewed reopen from this device for 48 hours; source event data is also cached for 7 days to limit repeat Ticketmaster and public-page requests.</div>

        <section className="mt-8 border-2 border-[#193a68] bg-white p-5 shadow-[4px_4px_0_#193a68]" aria-label="Currently supported venues">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">Currently supported venues</p><p className="mt-2 text-sm text-[#31577f]">Each brief includes official venue guidance, routes, weather, and seat-view links where available.</p></div><p className="max-w-xs text-xs leading-5 text-[#52739a]">Venue rules are cached for 7 days. You can request one official refresh per venue each week.</p></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{config.supportedVenues.map((item) => <div key={item.id} className="border border-[#193a68] bg-[#eef8ff] px-4 py-3"><p className="text-sm font-black text-[#183153]">{item.name}</p><p className="mt-1 text-xs leading-5 text-[#52739a]">Official venue guide, route links, and weather</p></div>)}</div>
        </section>

        <section className="mt-8 grid gap-5 border-2 border-[#193a68] bg-[#eef8ff] p-5 shadow-[4px_4px_0_#193a68] lg:grid-cols-[1.1fr_.9fr] lg:items-center"><div><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">Before the ticketing battle</p><h2 className="mt-3 text-3xl font-black tracking-tight text-[#183153]">Train the skill, not the panic.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#31577f]">Ticketing Practice is a no-stakes simulation for faster seat scanning, quick clicks, queue pressure, and disappearing inventory—so the real sale feels more familiar.</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="border border-[#193a68] bg-white p-4"><p className="font-black text-[#183153]">Seat Rush</p><p className="mt-1 text-xs leading-5 text-[#52739a]">Find your assigned seat before it&apos;s gone.</p></div><div className="border border-[#193a68] bg-white p-4"><p className="font-black text-[#183153]">Seat Sniper</p><p className="mt-1 text-xs leading-5 text-[#52739a]">Build quick eyes and faster clicks.</p></div><a href="/practice" className="border-2 border-[#193a68] bg-[#8ed1ff] px-4 py-3 text-center text-sm font-black text-[#183153] shadow-[3px_3px_0_#193a68] sm:col-span-2">Open Ticketing Practice →</a></div></section>

        <div className="mt-8">{loading && <LoadingState />}{demoLoading && !loading && <section className="border-2 border-[#193a68] bg-[#eef8ff] p-10 text-center shadow-[4px_4px_0_#193a68]"><div className="mx-auto h-7 w-7 animate-spin border-2 border-[#193a68] border-t-[#8ed1ff]" /><p className="mt-6 text-xl font-black text-[#183153]">{loadingMessages[loadingStep]}</p><p className="mt-2 text-sm text-[#52739a]">Building your source-linked concert brief.</p></section>}{error && <ErrorState message={error} />}</div>

        {event && !loading && !demoLoading && <motion.section className="mt-8" variants={containerVariants} initial="hidden" animate="visible" viewport={{ once: true }}>
          <motion.div variants={itemVariants} className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <article className="border-2 border-[#193a68] bg-white p-6 shadow-[4px_4px_0_#193a68] sm:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><SectionBadge status={event.sourceStatus} /><button onClick={() => toggleSavedEvent(event)} className="border border-[#193a68] bg-[#ccecff] px-3 py-2 text-sm font-black text-[#183153] shadow-[2px_2px_0_#193a68]">{isSaved(event) ? "Unsave event" : "Save event"}</button></div><h2 className="mt-8 text-3xl font-black tracking-tight text-[#183153] sm:text-4xl">{event.name}</h2><p className="mt-3 text-[#52739a]">{event.artist} · {event.tour}</p><div className="mt-8 grid gap-5 border-t-2 border-[#d5e9f8] pt-6 sm:grid-cols-2"><Fact label="Date" value={event.date} /><Fact label="Time" value={event.time} /><Fact label="Venue" value={event.venue} /><Fact label="Address" value={event.address} /></div><a className="mt-8 inline-block text-sm font-bold text-[#31577f] underline decoration-2 underline-offset-4 hover:text-[#183153]" href={event.sourceUrl} target="_blank" rel="noreferrer">View event source ↗</a></article>
          <aside className="border-2 border-[#193a68] bg-[#eef8ff] p-6 shadow-[4px_4px_0_#193a68] sm:p-8"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">Your preparation</p><h2 className="mt-3 text-2xl font-black text-[#183153]">Before you go</h2><div className="mt-6 space-y-3">{config.checklist.map((item, index) => <label key={item} className="flex cursor-pointer items-center gap-3 border border-[#193a68] bg-white px-4 py-3 text-sm font-medium text-[#284b76]"><input type="checkbox" checked={checked[index] ?? false} onChange={() => toggleChecklist(index)} className="h-4 w-4 accent-[#5baeea]" />{item}</label>)}</div></aside>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-5 grid gap-5 lg:grid-cols-3">
          <article className="border-2 border-[#193a68] bg-[#eef8ff] p-6 shadow-[4px_4px_0_#193a68]"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">Venue rules</p><SectionBadge status={venue?.sourceStatus ?? "Unavailable"} /></div>{contextLoading ? <p className="mt-5 text-sm text-[#31577f]">Loading official venue guidance…</p> : venue?.rules.length ? <ul className="mt-5 space-y-3 text-sm leading-6 text-[#284b76]">{venue.rules.map((rule) => <li key={rule} className="border-l-2 border-[#5baeea] pl-3">{rule}</li>)}</ul> : <p className="mt-5 text-sm text-[#52739a]">{supportedVenue ? "Official venue guidance is unavailable right now." : "This venue is not supported yet."}</p>}{supportedVenue && <><a className="mt-6 inline-block text-sm font-bold text-[#31577f] underline decoration-2 underline-offset-4" href={supportedVenue.guideUrl} target="_blank" rel="noreferrer">Open official venue guide ↗</a><div className="mt-5 border-t border-[#193a68] pt-4"><button onClick={() => void refreshVenueData()} disabled={refreshedThisWeek || contextLoading} className="border border-[#193a68] bg-white px-3 py-2 text-sm font-black text-[#183153] shadow-[2px_2px_0_#193a68] disabled:cursor-not-allowed disabled:opacity-50">{refreshedThisWeek ? "Venue data refreshed this week" : "Refresh official venue data"}</button><p className="mt-3 text-xs leading-5 text-[#52739a]">{lastVenueRefresh ? `Last refreshed ${new Date(lastVenueRefresh).toLocaleString()} · available again next week.` : "Official venue data is cached for 7 days. One refresh is available per venue each week."}</p></div></>}</article>
          <article className="border-2 border-[#193a68] bg-white p-6 shadow-[4px_4px_0_#193a68]"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">Event-day weather</p><SectionBadge status={weather?.sourceStatus ?? "Unavailable"} /></div><p className="mt-5 text-lg font-black leading-7 text-[#183153]">{contextLoading ? "Checking the forecast…" : weather?.summary ?? "Unavailable"}</p><p className="mt-4 text-sm leading-6 text-[#52739a]">Live forecasts are typically available closer to the event date.</p></article>
          <article className="border-2 border-[#193a68] bg-[#ccecff] p-6 shadow-[4px_4px_0_#193a68]"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">Getting there</p><h2 className="mt-3 text-2xl font-black text-[#183153]">Make a route plan</h2><p className="mt-3 text-sm leading-6 text-[#31577f]">{supportedVenue?.transport.description ?? "Route details appear for supported venues."}</p>{supportedVenue && <div className="mt-5 flex flex-wrap gap-3"><a className="border border-[#193a68] bg-white px-3 py-2 text-sm font-bold text-[#183153] shadow-[2px_2px_0_#193a68]" href={supportedVenue.transport.primaryUrl} target="_blank" rel="noreferrer">{supportedVenue.transport.primaryLabel} ↗</a><a className="border border-[#193a68] bg-white px-3 py-2 text-sm font-bold text-[#183153] shadow-[2px_2px_0_#193a68]" href={supportedVenue.transport.directions} target="_blank" rel="noreferrer">Directions ↗</a><a className="border border-[#193a68] bg-white px-3 py-2 text-sm font-bold text-[#183153] shadow-[2px_2px_0_#193a68]" href={supportedVenue.transport.parking} target="_blank" rel="noreferrer">Parking ↗</a></div>}</article>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <article className="border-2 border-[#193a68] bg-white p-6 shadow-[4px_4px_0_#193a68]"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">Seat view</p><h2 className="mt-3 text-2xl font-black text-[#183153]">Picture your seat</h2><p className="mt-3 text-sm leading-6 text-[#31577f]">{supportedVenue ? `Browse fan-uploaded photos from ${supportedVenue.name} before you buy or choose your section.` : "Seat-view links appear for supported venues."}</p>{supportedVenue && <a className="mt-6 inline-block border border-[#193a68] bg-[#ccecff] px-4 py-3 text-sm font-black text-[#183153] shadow-[3px_3px_0_#193a68]" href={supportedVenue.seatViewUrl} target="_blank" rel="noreferrer">Explore seat views ↗</a>}</article>
          <article className="border-2 border-[#193a68] bg-[#eef8ff] p-6 shadow-[4px_4px_0_#193a68]"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">Recent show history</p><h2 className="mt-3 text-2xl font-black text-[#183153]">See the tour setlists</h2><p className="mt-3 text-sm leading-6 text-[#31577f]">Open LE SSERAFIM&apos;s recent fan-submitted setlists directly on Setlist.fm.</p><a className="mt-6 inline-block border border-[#193a68] bg-white px-4 py-3 text-sm font-black text-[#183153] shadow-[3px_3px_0_#193a68]" href={config.setlistArtistUrl} target="_blank" rel="noreferrer">View Recent Tour Setlists on Setlist.fm ↗</a><p className="mt-5 text-xs text-[#52739a]">Setlist.fm entries are fan-submitted and may be incomplete.</p></article>
          </motion.div>
        </motion.section>}

        {!event && !loading && !demoLoading && !error && <div className="mt-8"><EmptyState message="Paste a Ticketmaster event page to see its details and concert preparation checklist." /></div>}
        <section id="history" className="mt-12 border-t-2 border-[#193a68] pt-8"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">Previously viewed</p><p className="mt-2 max-w-2xl text-sm leading-6 text-[#52739a]">Your latest event briefs are kept on this device for 48 hours. Reopen one below and Soundcheck replays the saved brief before reaching Ticketmaster or a public event page again.</p>{historyHydrated && historyEvents.length > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{historyEvents.map((item) => <button key={item.sourceUrl} onClick={() => loadSavedEvent(item)} className="border border-[#193a68] bg-[#eef8ff] p-4 text-left shadow-[3px_3px_0_#193a68] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#193a68]"><p className="font-black text-[#183153]">{item.name}</p><p className="mt-1 text-sm text-[#52739a]">{item.venue} · {item.date}</p></button>)}</div> : <p className="mt-4 text-sm text-[#52739a]">The event briefs you load will appear here for the next 48 hours.</p>}</section>
        <section id="saved-events" className="mt-12 border-t-2 border-[#193a68] pt-8"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">Saved events</p><p className="mt-2 text-sm leading-6 text-[#52739a]">Save the shows you care about most. Saved links stay here, and reopen from recent History instantly when a 48-hour device copy is available.</p>{savedEventsHydrated && savedEvents.length > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{savedEvents.map((item) => <button key={item.sourceUrl} onClick={() => loadSavedEvent(item)} className="border border-[#193a68] bg-white p-4 text-left shadow-[3px_3px_0_#193a68] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#193a68]"><p className="font-black text-[#183153]">{item.name}</p><p className="mt-1 text-sm text-[#52739a]">{item.venue} · {item.date}</p></button>)}</div> : <p className="mt-4 text-sm text-[#52739a]">Load an event brief, then use Save event to keep its Ticketmaster link here.</p>}</section>
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-black tracking-[0.12em] text-[#52739a] uppercase">{label}</p><p className="mt-2 text-sm font-medium text-[#183153]">{value}</p></div>; }
