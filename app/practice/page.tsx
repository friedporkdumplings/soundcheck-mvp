"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

const letters = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
const seats = Array.from({ length: 26 }, (_, row) => letters.map((letter) => `${letter}${row + 1}`)).flat();
const scoresKey = "soundcheck.practice-high-scores";
type Screen = "modes" | "difficulty" | "waiting" | "queue" | "rush" | "checkout" | "rush-result" | "sniper-countdown" | "sniper" | "sniper-result";
type RushResult = "secured" | "lost" | "sold-out" | "expired" | null;
type Difficulty = "easy" | "medium" | "hard";

const rushSpeed: Record<Difficulty, { interval: number; seats: [number, number]; label: string }> = {
  easy: { interval: 850, seats: [4, 8], label: "Easy" },
  medium: { interval: 550, seats: [8, 15], label: "Medium" },
  hard: { interval: 270, seats: [18, 30], label: "Hard" },
};

function randomSeat(except?: string) {
  const options = except ? seats.filter((seat) => seat !== except) : seats;
  return options[Math.floor(Math.random() * options.length)];
}

function rating(score: number) {
  if (score < 10) return "it will be difficult to get tickets twin";
  if (score < 20) return "lock in bro";
  if (score < 30) return "tickets secured";
  return "fast fingers tickets secured";
}

export default function PracticePage() {
  const [screen, setScreen] = useState<Screen>("modes");
  const [target, setTarget] = useState("");
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [queueNumber, setQueueNumber] = useState(0);
  const [queueStart, setQueueStart] = useState(0);
  const [waitingMinutes, setWaitingMinutes] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [rushStartedAt, setRushStartedAt] = useState(0);
  const [selectedSeat, setSelectedSeat] = useState("");
  const [rushResult, setRushResult] = useState<RushResult>(null);
  const [rushFindTime, setRushFindTime] = useState("0.0");
  const [wrongSeatNotice, setWrongSeatNotice] = useState<string | null>(null);
  const [checkoutTime, setCheckoutTime] = useState(9);
  const [sniperCountdown, setSniperCountdown] = useState(3);
  const [sniperTarget, setSniperTarget] = useState("");
  const [sniperTime, setSniperTime] = useState(20);
  const [score, setScore] = useState(0);
  const [bestRush, setBestRush] = useState<number | null>(null);
  const [bestSniper, setBestSniper] = useState<number | null>(null);

  useEffect(() => {
    let nextRush: number | null = null;
    let nextSniper: number | null = null;
    try {
      const stored = JSON.parse(window.localStorage.getItem(scoresKey) ?? "{}") as { rush?: unknown; sniper?: unknown };
      nextRush = typeof stored.rush === "number" ? stored.rush : null;
      nextSniper = typeof stored.sniper === "number" ? stored.sniper : null;
    } catch {
      window.localStorage.removeItem(scoresKey);
    }
    const hydrate = window.setTimeout(() => { setBestRush(nextRush); setBestSniper(nextSniper); }, 0);
    return () => window.clearTimeout(hydrate);
  }, []);

  function saveScores(rush: number | null, sniper: number | null) {
    window.localStorage.setItem(scoresKey, JSON.stringify({ rush, sniper }));
  }

  function chooseRushDifficulty() {
    setScreen("difficulty");
  }

  function startRush(nextDifficulty: Difficulty) {
    setDifficulty(nextDifficulty);
    setTarget(randomSeat());
    setUnavailable(new Set());
    const nextQueue = Math.floor(25 + Math.random() * 19976);
    setQueueStart(nextQueue);
    setQueueNumber(nextQueue);
    setWaitingMinutes(5);
    setRushResult(null);
    setSelectedSeat("");
    setScreen("waiting");
  }

  function startSniper() {
    setSniperCountdown(3);
    setSniperTime(20);
    setScore(0);
    setSniperTarget(randomSeat());
    setScreen("sniper-countdown");
  }

  useEffect(() => {
    if (screen !== "waiting") return;
    const countdown = window.setInterval(() => setWaitingMinutes((minutes) => Math.max(0, minutes - 2)), 1000);
    const timer = window.setTimeout(() => setScreen("queue"), 4000);
    return () => { window.clearInterval(countdown); window.clearTimeout(timer); };
  }, [screen]);

  useEffect(() => {
    if (screen !== "queue") return;
    const move = window.setInterval(() => {
      setQueueNumber((current) => {
        if (!current || current <= 1) return current;
        const next = Math.max(1, Math.floor(current * (0.35 + Math.random() * 0.3)));
        return next;
      });
    }, 700);
    const finalCount = window.setTimeout(() => setQueueNumber(1), 5400);
    const finish = window.setTimeout(() => { setRushStartedAt(Date.now()); setScreen("rush"); }, 6500);
    return () => { window.clearInterval(move); window.clearTimeout(finalCount); window.clearTimeout(finish); };
  }, [screen, queueStart]);

  useEffect(() => {
    if (screen !== "rush") return;
    const inventory = window.setInterval(() => {
      setUnavailable((current) => {
        const next = new Set(current);
        const available = seats.filter((seat) => !next.has(seat) && (Date.now() - rushStartedAt < 3000 ? seat !== target : true));
        if (selectedSeat) return current;
        const [minimum, maximum] = rushSpeed[difficulty].seats;
        for (let index = 0; index < Math.min(minimum + Math.floor(Math.random() * (maximum - minimum + 1)), available.length); index += 1) {
          const seat = available.splice(Math.floor(Math.random() * available.length), 1)[0];
          if (seat) next.add(seat);
        }
        if (next.has(target)) { setRushResult("lost"); setScreen("rush-result"); }
        else if (next.size === seats.length) { setRushResult("sold-out"); setScreen("rush-result"); }
        return next;
      });
    }, rushSpeed[difficulty].interval);
    return () => window.clearInterval(inventory);
  }, [screen, target, rushStartedAt, difficulty, selectedSeat]);

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
      if (time <= 1) {
        setScore((current) => {
          const nextBest = bestSniper === null || current > bestSniper ? current : bestSniper;
          setBestSniper(nextBest);
          saveScores(bestRush, nextBest);
          return current;
        });
        setScreen("sniper-result");
        return 0;
      }
      return time - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [screen, bestRush, bestSniper]);

  function chooseRushSeat(seat: string) {
    if (unavailable.has(seat)) {
      setWrongSeatNotice("This seat is unavailable.");
      window.setTimeout(() => setWrongSeatNotice(null), 500);
      return;
    }
    if (seat !== target) {
      setWrongSeatNotice("This is not your assigned seat.");
      window.setTimeout(() => setWrongSeatNotice(null), 500);
      return;
    }
    setSelectedSeat(seat);
    setRushFindTime(((Date.now() - rushStartedAt) / 1000).toFixed(1));
    window.setTimeout(() => { setCheckoutTime(9); setScreen("checkout"); }, 500);
  }

  function chooseSniperSeat(seat: string) {
    if (seat !== sniperTarget) return;
    setScore((current) => current + 1);
    setSniperTarget((current) => randomSeat(current));
  }

  function secureRush() {
    const time = Number(rushFindTime);
    const nextBest = bestRush === null || time < bestRush ? time : bestRush;
    setBestRush(nextBest);
    saveScores(nextBest, bestSniper);
    setRushResult("secured");
    setScreen("rush-result");
  }

  return <main className="min-h-screen bg-white px-5 py-6 text-[#183153] sm:px-10 sm:py-10"><div className="mx-auto max-w-6xl">
    <header className="flex items-center justify-between border-b-2 border-[#193a68] pb-5"><Link href="/" className="flex items-center gap-3"><span className="h-3 w-3 rounded-full border border-[#193a68] bg-[#8ed1ff]" /><span className="text-sm font-black tracking-[0.22em] uppercase">Soundcheck</span></Link><Link href="/" className="text-xs font-bold tracking-[0.12em] text-[#31577f] uppercase underline decoration-2 underline-offset-4">Concert brief</Link></header>
    {screen === "modes" && <ModeSelect onRush={chooseRushDifficulty} onSniper={startSniper} bestRush={bestRush} bestSniper={bestSniper} />}
    {screen === "difficulty" && <DifficultySelect onSelect={startRush} onBack={() => setScreen("modes")} />}
    {screen === "waiting" && <StatusCard eyebrow={`Seat Rush · ${rushSpeed[difficulty].label}`} title="You’re in the waiting room." detail={`${waitingMinutes > 0 ? `${waitingMinutes} min` : "<1 min"} until your queue starts`} progress={(5 - waitingMinutes) * 20} />}
    {screen === "queue" && <StatusCard eyebrow="Seat Rush" title="You’re in the queue." detail={`${queueNumber < 2 ? "<1" : queueNumber.toLocaleString()} people ahead of you`} progress={queueStart ? Math.min(100, (1 - queueNumber / queueStart) * 100) : 0} />}
    {screen === "rush" && <GameFrame eyebrow={`Seat Rush · ${rushSpeed[difficulty].label}`} title={`Your target: ${target}`} detail="Find the seat before inventory disappears. Your target is protected for the first three seconds."><SeatGrid unavailable={unavailable} selected={selectedSeat} notice={wrongSeatNotice} onSeat={chooseRushSeat} /></GameFrame>}
    {screen === "checkout" && <Checkout seat={selectedSeat} seconds={checkoutTime} onComplete={secureRush} />}
    {screen === "rush-result" && <RushResult result={rushResult} target={target} findTime={rushFindTime} queueStart={queueStart} bestRush={bestRush} onAgain={() => setScreen("difficulty")} onModes={() => setScreen("modes")} />}
    {screen === "sniper-countdown" && <StatusCard eyebrow="Seat Sniper" title={sniperCountdown > 0 ? String(sniperCountdown) : "GO"} detail="Hit as many targets as you can in 20 seconds." progress={(3 - sniperCountdown) * 33} />}
    {screen === "sniper" && <GameFrame eyebrow="Seat Sniper" title={`Time ${String(sniperTime).padStart(2, "0")} · Score ${score}`} detail="Click the navy target. Every hit moves it immediately."><SeatGrid target={sniperTarget} onSeat={chooseSniperSeat} /></GameFrame>}
    {screen === "sniper-result" && <ResultCard title="Time’s Up" detail={`Score: ${score} · ${rating(score)}${bestSniper !== null ? ` · Best: ${bestSniper}` : ""}`} primary="Play Again" onPrimary={startSniper} secondary="Back to Practice Modes" onSecondary={() => setScreen("modes")} />}
    {screen !== "modes" && <p className="mt-8 text-center text-xs font-bold tracking-[0.12em] text-[#52739a] uppercase">Practice simulation — no real tickets are being sold.</p>}
  </div></main>;
}

function ModeSelect({ onRush, onSniper, bestRush, bestSniper }: { onRush: () => void; onSniper: () => void; bestRush: number | null; bestSniper: number | null }) { return <section className="py-16 sm:py-20"><p className="text-sm font-bold tracking-[0.16em] text-[#52739a] uppercase">Soundcheck training</p><h1 className="mt-4 text-5xl font-black tracking-[-0.055em] sm:text-7xl">Ticketing Practice</h1><p className="mt-6 max-w-xl text-lg leading-8 text-[#31577f]">Practice finding and securing tickets under pressure.</p><div className="mt-10 grid gap-5 md:grid-cols-2"><ModeCard title="Seat Rush" detail="Find your assigned seat before it disappears." score={bestRush === null ? "No best time yet" : `Best find: ${bestRush.toFixed(1)}s`} button="Play Seat Rush" onClick={onRush} /><ModeCard title="Seat Sniper" detail="Hit as many target seats as possible in 20 seconds." score={bestSniper === null ? "No high score yet" : `High score: ${bestSniper}`} button="Play Seat Sniper" onClick={onSniper} /></div></section>; }
function DifficultySelect({ onSelect, onBack }: { onSelect: (difficulty: Difficulty) => void; onBack: () => void }) { return <section className="py-16 sm:py-20"><p className="text-sm font-bold tracking-[0.16em] text-[#52739a] uppercase">Seat Rush</p><h1 className="mt-4 text-5xl font-black tracking-[-0.055em] sm:text-7xl">Pick your pressure.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-[#31577f]">Difficulty controls how quickly available seats are taken after the safety buffer.</p><div className="mt-10 grid gap-5 md:grid-cols-3">{(["easy", "medium", "hard"] as Difficulty[]).map((level) => <button key={level} onClick={() => onSelect(level)} className="border-2 border-[#193a68] bg-[#eef8ff] p-6 text-left shadow-[4px_4px_0_#193a68] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#193a68]"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">{level}</p><p className="mt-3 text-2xl font-black text-[#183153]">{level === "easy" ? "A little room" : level === "medium" ? "Fast inventory" : "Full panic"}</p><p className="mt-3 text-sm leading-6 text-[#31577f]">{level === "easy" ? "Seats disappear steadily." : level === "medium" ? "Seats vanish in quick waves." : "Inventory drops aggressively."}</p></button>)}</div><button onClick={onBack} className="mt-8 text-sm font-bold text-[#31577f] underline decoration-2 underline-offset-4">Back to practice modes</button></section>; }
function ModeCard({ title, detail, score, button, onClick }: { title: string; detail: string; score: string; button: string; onClick: () => void }) { return <article className="border-2 border-[#193a68] bg-[#eef8ff] p-7 shadow-[4px_4px_0_#193a68]"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">Practice mode</p><h2 className="mt-3 text-3xl font-black">{title}</h2><p className="mt-3 min-h-12 text-[#31577f]">{detail}</p><p className="mt-4 border-l-2 border-[#5baeea] pl-3 text-sm font-black text-[#183153]">{score}</p><button onClick={onClick} className="mt-7 border-2 border-[#193a68] bg-white px-5 py-3 text-sm font-black shadow-[3px_3px_0_#193a68]">{button}</button></article>; }
function StatusCard({ eyebrow, title, detail, progress }: { eyebrow: string; title: string; detail: string; progress: number }) { return <section className="mx-auto mt-20 max-w-xl border-2 border-[#193a68] bg-[#eef8ff] p-10 text-center shadow-[4px_4px_0_#193a68]"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">{eyebrow}</p><div className="mx-auto mt-7 h-8 w-8 animate-spin border-2 border-[#193a68] border-t-[#8ed1ff]" /><h1 className="mt-7 text-4xl font-black">{title}</h1><p className="mt-4 text-lg text-[#31577f]">{detail}</p><div className="mt-7 h-4 w-full border-2 border-[#193a68] bg-white p-[2px]"><div className="h-full bg-[#8ed1ff] transition-all duration-500" style={{ width: `${Math.max(4, progress)}%` }} /></div></section>; }
function GameFrame({ eyebrow, title, detail, children }: { eyebrow: string; title: string; detail: string; children: ReactNode }) { return <section className="mt-10"><div className="border-2 border-[#193a68] bg-[#ccecff] p-6 shadow-[4px_4px_0_#193a68]"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">{eyebrow}</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">{title}</h1><p className="mt-3 text-[#31577f]">{detail}</p></div><div className="mt-6 overflow-x-auto border-2 border-[#193a68] bg-white p-4 shadow-[4px_4px_0_#193a68]">{children}</div></section>; }
function SeatGrid({ unavailable = new Set<string>(), target, selected, notice, onSeat }: { unavailable?: Set<string>; target?: string; selected?: string; notice?: string | null; onSeat: (seat: string) => void }) { return <div className="relative min-w-[720px]"><div className="grid items-center gap-1" style={{ gridTemplateColumns: "28px repeat(26, 24px)" }}><span />{letters.map((letter) => <span key={letter} className="text-center text-[10px] font-black text-[#52739a]">{letter}</span>)}{Array.from({ length: 26 }, (_, row) => <div key={row} className="contents"><span className="text-center text-[10px] font-black text-[#52739a]">{row + 1}</span>{letters.map((letter) => { const seat = `${letter}${row + 1}`; const gone = unavailable.has(seat); const activeTarget = target === seat; const picked = selected === seat; return <button key={seat} aria-disabled={gone} onClick={() => onSeat(seat)} aria-label={`Seat ${seat}`} className={`h-6 w-6 rounded-full border border-[#193a68] transition ${gone ? "cursor-not-allowed bg-[#193a68]" : picked ? "bg-[#f6b6cf]" : activeTarget ? "bg-[#193a68]" : "bg-[#eef8ff] hover:bg-[#8ed1ff]"}`} />; })}</div>)}</div>{notice && <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 border border-[#193a68] bg-[#f6b6cf]/75 px-3 py-1.5 text-xs font-black text-[#183153] shadow-[2px_2px_0_#193a68]">{notice}</div>}</div>; }
function Checkout({ seat, seconds, onComplete }: { seat: string; seconds: number; onComplete: () => void }) { return <section className="mx-auto mt-12 max-w-xl border-2 border-[#193a68] bg-[#eef8ff] p-8 shadow-[4px_4px_0_#193a68]"><p className="text-xs font-black tracking-[0.14em] text-[#52739a] uppercase">Practice checkout</p><h1 className="mt-3 text-4xl font-black">Hold expires in {seconds}s</h1><div className="mt-7 space-y-3 border-y-2 border-[#193a68] py-5 text-[#31577f]"><p>Seat <b className="text-[#183153]">{seat}</b> · Section 114</p><p>Ticket <b className="float-right text-[#183153]">$189</b></p><p>Fictional fee <b className="float-right text-[#183153]">$42</b></p><p className="font-black text-[#183153]">Total <b className="float-right">$231</b></p></div><button onClick={onComplete} className="mt-7 w-full border-2 border-[#193a68] bg-white px-5 py-3 font-black shadow-[3px_3px_0_#193a68]">Complete Checkout</button></section>; }
function RushResult({ result, target, findTime, queueStart, bestRush, onAgain, onModes }: { result: RushResult; target: string; findTime: string; queueStart: number; bestRush: number | null; onAgain: () => void; onModes: () => void }) { const copy = result === "secured" ? ["Tickets Secured 🎟️", `Seat ${target} · found in ${findTime}s · started behind ${queueStart.toLocaleString()} people.${bestRush !== null ? ` Best find: ${bestRush.toFixed(1)}s.` : ""}`] : result === "lost" ? ["Someone else got your seat.", `Your target ${target} is no longer available.`] : result === "sold-out" ? ["Sold Out", "Every practice seat disappeared before you could secure yours."] : ["Your hold expired.", "Practice checkout moves fast—try again."]; return <ResultCard title={copy[0]} detail={copy[1]} primary="Play Again" onPrimary={onAgain} secondary="Back to Practice Modes" onSecondary={onModes} />; }
function ResultCard({ title, detail, primary, onPrimary, secondary, onSecondary }: { title: string; detail: string; primary: string; onPrimary: () => void; secondary: string; onSecondary: () => void }) { return <section className="mx-auto mt-20 max-w-xl border-2 border-[#193a68] bg-[#eef8ff] p-10 text-center shadow-[4px_4px_0_#193a68]"><h1 className="text-4xl font-black">{title}</h1><p className="mt-4 text-lg leading-7 text-[#31577f]">{detail}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><button onClick={onPrimary} className="border-2 border-[#193a68] bg-[#8ed1ff] px-5 py-3 font-black shadow-[3px_3px_0_#193a68]">{primary}</button><button onClick={onSecondary} className="border border-[#193a68] bg-white px-5 py-3 font-black shadow-[2px_2px_0_#193a68]">{secondary}</button></div></section>; }
