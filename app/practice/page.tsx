"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

const letters = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
const seats = Array.from({ length: 26 }, (_, row) => letters.map((letter) => `${letter}${row + 1}`)).flat();
type Screen = "modes" | "waiting" | "queue" | "rush" | "checkout" | "rush-result" | "sniper-countdown" | "sniper" | "sniper-result";
type RushResult = "secured" | "lost" | "sold-out" | "expired" | null;

function randomSeat(except?: string) {
  const options = except ? seats.filter((seat) => seat !== except) : seats;
  return options[Math.floor(Math.random() * options.length)];
}

function rating(score: number) {
  if (score < 10) return "Getting warmed up";
  if (score < 20) return "Quick fingers";
  if (score < 30) return "Ticketing ready";
  return "Queue demon";
}

export default function PracticePage() {
  const [screen, setScreen] = useState<Screen>("modes");
  const [target, setTarget] = useState("");
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [queueNumber, setQueueNumber] = useState(0);
  const [queueVisible, setQueueVisible] = useState(false);
  const [queueStart, setQueueStart] = useState(0);
  const [rushStartedAt, setRushStartedAt] = useState(0);
  const [selectedSeat, setSelectedSeat] = useState("");
  const [rushResult, setRushResult] = useState<RushResult>(null);
  const [rushFindTime, setRushFindTime] = useState("0.0");
  const [checkoutTime, setCheckoutTime] = useState(9);
  const [sniperCountdown, setSniperCountdown] = useState(3);
  const [sniperTarget, setSniperTarget] = useState("");
  const [sniperTime, setSniperTime] = useState(60);
  const [score, setScore] = useState(0);

  function startRush() {
    setTarget(randomSeat());
    setUnavailable(new Set());
    setQueueStart(Math.floor(1000 + Math.random() * 19001));
    setQueueNumber(0);
    setQueueVisible(false);
    setRushResult(null);
    setScreen("waiting");
  }

  function startSniper() {
    setSniperCountdown(3);
    setSniperTime(60);
    setScore(0);
    setSniperTarget(randomSeat());
    setScreen("sniper-countdown");
  }

  useEffect(() => {
    if (screen !== "waiting") return;
    const timer = window.setTimeout(() => setScreen("queue"), 4000);
    return () => window.clearTimeout(timer);
  }, [screen]);

  useEffect(() => {
    if (screen !== "queue") return;
    const reveal = window.setTimeout(() => { setQueueVisible(true); setQueueNumber(queueStart); }, 1800 + Math.floor(Math.random() * 2200));
    const move = window.setInterval(() => {
      setQueueNumber((current) => {
        if (!current || current <= 1) return current;
        const next = Math.max(1, Math.floor(current * (0.35 + Math.random() * 0.3)));
        return next;
      });
    }, 700);
    const finish = window.setTimeout(() => { setRushStartedAt(Date.now()); setScreen("rush"); }, 8500);
    return () => { window.clearTimeout(reveal); window.clearInterval(move); window.clearTimeout(finish); };
  }, [screen, queueStart]);

  useEffect(() => {
    if (screen !== "rush") return;
    const inventory = window.setInterval(() => {
      setUnavailable((current) => {
        const next = new Set(current);
        const available = seats.filter((seat) => !next.has(seat) && (Date.now() - rushStartedAt < 3000 ? seat !== target : true));
        for (let index = 0; index < Math.min(3 + Math.floor(Math.random() * 8), available.length); index += 1) {
          const seat = available.splice(Math.floor(Math.random() * available.length), 1)[0];
          if (seat) next.add(seat);
        }
        if (next.has(target)) { setRushResult("lost"); setScreen("rush-result"); }
        else if (next.size === seats.length) { setRushResult("sold-out"); setScreen("rush-result"); }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(inventory);
  }, [screen, target, rushStartedAt]);

  useEffect(() => {
    if (screen !== "checkout") return;
    const timer = window.setInterval(() => setCheckoutTime((time) => {
      if (time <= 1) { setRushResult("expired"); setScreen("rush-result"); return 0; }
      return time - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [screen]);

  useEffect(() => {
    if (screen !== "sniper-countdown") return;
    const timer = window.setInterval(() => setSniperCountdown((count) => count - 1), 1000);
    const go = window.setTimeout(() => setScreen("sniper"), 3200);
    return () => { window.clearInterval(timer); window.clearTimeout(go); };
  }, [screen]);

  useEffect(() => {
    if (screen !== "sniper") return;
    const timer = window.setInterval(() => setSniperTime((time) => {
      if (time <= 1) { setScreen("sniper-result"); return 0; }
      return time - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [screen]);

  function chooseRushSeat(seat: string) {
    if (unavailable.has(seat) || seat !== target) return;
    setSelectedSeat(seat);
    setRushFindTime(((Date.now() - rushStartedAt) / 1000).toFixed(1));
    setCheckoutTime(9);
    setScreen("checkout");
  }

  function chooseSniperSeat(seat: string) {
    if (seat !== sniperTarget) return;
    setScore((current) => current + 1);
    setSniperTarget((current) => randomSeat(current));
  }

  return <main className="min-h-screen bg-white px-5 py-6 text-[#183153] sm:px-10 sm:py-10"><div className="mx-auto max-w-6xl">
    <header className="flex items-center justify-between border-b-2 border-[#193a68] pb-5"><Link href="/" className="flex items-center gap-3"><span className="h-3 w-3 rounded-full border border-[#193a68] bg-[#8ed1ff]" /><span className="text-sm font-black tracking-[0.22em] uppercase">Soundcheck</span></Link><Link href="/" className="text-xs font-bold tracking-[0.12em] text-[#31577f] uppercase underline decoration-2 underline-offset-4">Concert brief</Link></header>
    {screen === "modes" && <ModeSelect onRush={startRush} onSniper={startSniper} />}
    {screen === "waiting" && <StatusCard eyebrow="Seat Rush" title="You’re in the waiting room." detail="Your practice queue opens in a few seconds." />}
    {screen === "queue" && <StatusCard eyebrow="Seat Rush" title="You’re in the queue." detail={queueVisible ? `${queueNumber < 2 ? "<1" : queueNumber.toLocaleString()} people ahead of you` : "Confirming your queue position…"} />}
    {screen === "rush" && <GameFrame eyebrow="Seat Rush" title={`Your target: ${target}`} detail="Find the seat before inventory disappears. Your target is protected for the first three seconds."><SeatGrid unavailable={unavailable} onSeat={chooseRushSeat} /></GameFrame>}
    {screen === "checkout" && <Checkout seat={selectedSeat} seconds={checkoutTime} onComplete={() => { setRushResult("secured"); setScreen("rush-result"); }} />}
    {screen === "rush-result" && <RushResult result={rushResult} target={target} findTime={rushFindTime} queueStart={queueStart} onAgain={startRush} onModes={() => setScreen("modes")} />}
    {screen === "sniper-countdown" && <StatusCard eyebrow="Seat Sniper" title={sniperCountdown > 0 ? String(sniperCountdown) : "GO"} detail="Hit as many targets as you can in 60 seconds." />}
    {screen === "sniper" && <GameFrame eyebrow="Seat Sniper" title={`Time ${String(sniperTime).padStart(2, "0")} · Score ${score}`} detail="Click the navy target. Every hit moves it immediately."><SeatGrid target={sniperTarget} onSeat={chooseSniperSeat} /></GameFrame>}
    {screen === "sniper-result" && <ResultCard title="Time’s Up" detail={`Score: ${score} · ${rating(score)}`} primary="Play Again" onPrimary={startSniper} secondary="Back to Practice Modes" onSecondary={() => setScreen("modes")} />}
    {screen !== "modes" && <p className="mt-8 text-center text-xs font-bold tracking-[0.12em] text-[#52739a] uppercase">Practice simulation — no real tickets are being sold.</p>}
  </div></main>;
}

function ModeSelect({ onRush, onSniper }: { onRush: () => void; onSniper: () => void }) { return <section className="py-16 sm:py-20"><p className="text-sm font-bold tracking-[0.16em] text-[#52739a] uppercase">Soundcheck training</p><h1 className="mt-4 text-5xl font-black tracking-[-0.055em] sm:text-7xl">Ticketing Practice</h1><p className="mt-6 max-w-xl text-lg leading-8 text-[#31577f]">Practice finding and securing tickets under pressure.</p><div className="mt-10 grid gap-5 md:grid-cols-2"><ModeCard title="Seat Rush" detail="Find your assigned seat before it disappears." button="Play Seat Rush" onClick={onRush} /><ModeCard title="Seat Sniper" detail="Hit as many target seats as possible in 60 seconds." button="Play Seat Sniper" onClick={onSniper} /></div></section>; }
function ModeCard({ title, detail, button, onClick }: { title: string; detail: string; button: string; onClick: () => void }) { return <article className="border-2 border-[#193a68] bg-[#eef8ff] p-7 shadow-[4px_4px_0_#193a68]"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">Practice mode</p><h2 className="mt-3 text-3xl font-black">{title}</h2><p className="mt-3 min-h-12 text-[#31577f]">{detail}</p><button onClick={onClick} className="mt-7 border-2 border-[#193a68] bg-white px-5 py-3 text-sm font-black shadow-[3px_3px_0_#193a68]">{button}</button></article>; }
function StatusCard({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) { return <section className="mx-auto mt-20 max-w-xl border-2 border-[#193a68] bg-[#eef8ff] p-10 text-center shadow-[4px_4px_0_#193a68]"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">{eyebrow}</p><div className="mx-auto mt-7 h-8 w-8 animate-spin border-2 border-[#193a68] border-t-[#8ed1ff]" /><h1 className="mt-7 text-4xl font-black">{title}</h1><p className="mt-4 text-lg text-[#31577f]">{detail}</p></section>; }
function GameFrame({ eyebrow, title, detail, children }: { eyebrow: string; title: string; detail: string; children: ReactNode }) { return <section className="mt-10"><div className="border-2 border-[#193a68] bg-[#ccecff] p-6 shadow-[4px_4px_0_#193a68]"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">{eyebrow}</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">{title}</h1><p className="mt-3 text-[#31577f]">{detail}</p></div><div className="mt-6 overflow-x-auto border-2 border-[#193a68] bg-white p-4 shadow-[4px_4px_0_#193a68]">{children}</div></section>; }
function SeatGrid({ unavailable = new Set<string>(), target, onSeat }: { unavailable?: Set<string>; target?: string; onSeat: (seat: string) => void }) { return <div className="min-w-[720px]"><div className="grid items-center gap-1" style={{ gridTemplateColumns: "28px repeat(26, 24px)" }}><span />{letters.map((letter) => <span key={letter} className="text-center text-[10px] font-black text-[#52739a]">{letter}</span>)}{Array.from({ length: 26 }, (_, row) => <div key={row} className="contents"><span className="text-center text-[10px] font-black text-[#52739a]">{row + 1}</span>{letters.map((letter) => { const seat = `${letter}${row + 1}`; const gone = unavailable.has(seat); return <button key={seat} disabled={gone} onClick={() => onSeat(seat)} aria-label={`Seat ${seat}`} className={`flex h-6 w-6 items-center justify-center border border-[#193a68] transition ${gone ? "cursor-not-allowed bg-[#d5e9f8] opacity-35" : "bg-[#eef8ff] hover:bg-[#8ed1ff]"}`}>{target === seat && <span className="h-3 w-3 rounded-full bg-[#193a68]" />}</button>; })}</div>)}</div></div>; }
function Checkout({ seat, seconds, onComplete }: { seat: string; seconds: number; onComplete: () => void }) { return <section className="mx-auto mt-12 max-w-xl border-2 border-[#193a68] bg-[#eef8ff] p-8 shadow-[4px_4px_0_#193a68]"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">Practice checkout</p><h1 className="mt-3 text-4xl font-black">Hold expires in {seconds}s</h1><div className="mt-7 space-y-3 border-y-2 border-[#193a68] py-5 text-[#31577f]"><p>Seat <b className="text-[#183153]">{seat}</b> · Section 114</p><p>Ticket <b className="float-right text-[#183153]">$189</b></p><p>Fictional fee <b className="float-right text-[#183153]">$42</b></p><p className="font-black text-[#183153]">Total <b className="float-right">$231</b></p></div><button onClick={onComplete} className="mt-7 w-full border-2 border-[#193a68] bg-white px-5 py-3 font-black shadow-[3px_3px_0_#193a68]">Complete Checkout</button></section>; }
function RushResult({ result, target, findTime, queueStart, onAgain, onModes }: { result: RushResult; target: string; findTime: string; queueStart: number; onAgain: () => void; onModes: () => void }) { const copy = result === "secured" ? ["Tickets Secured 🎟️", `Seat ${target} · found in ${findTime}s · started behind ${queueStart.toLocaleString()} people.`] : result === "lost" ? ["Someone else got your seat.", `Your target ${target} is no longer available.`] : result === "sold-out" ? ["Sold Out", "Every practice seat disappeared before you could secure yours."] : ["Your hold expired.", "Practice checkout moves fast—try again."]; return <ResultCard title={copy[0]} detail={copy[1]} primary="Play Again" onPrimary={onAgain} secondary="Back to Practice Modes" onSecondary={onModes} />; }
function ResultCard({ title, detail, primary, onPrimary, secondary, onSecondary }: { title: string; detail: string; primary: string; onPrimary: () => void; secondary: string; onSecondary: () => void }) { return <section className="mx-auto mt-20 max-w-xl border-2 border-[#193a68] bg-[#eef8ff] p-10 text-center shadow-[4px_4px_0_#193a68]"><h1 className="text-4xl font-black">{title}</h1><p className="mt-4 text-lg leading-7 text-[#31577f]">{detail}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><button onClick={onPrimary} className="border-2 border-[#193a68] bg-[#8ed1ff] px-5 py-3 font-black shadow-[3px_3px_0_#193a68]">{primary}</button><button onClick={onSecondary} className="border border-[#193a68] bg-white px-5 py-3 font-black shadow-[2px_2px_0_#193a68]">{secondary}</button></div></section>; }
