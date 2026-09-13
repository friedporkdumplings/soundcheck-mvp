export default function Home() {
  return (
    <main className="min-h-screen bg-[#08090c] px-6 py-8 text-[#f4f1ec] sm:px-10 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-between rounded-3xl border border-white/10 bg-[#101217] p-8 shadow-2xl shadow-black/30 sm:p-12">
        <header className="flex items-center gap-3" aria-label="Soundcheck">
          <span className="h-3 w-3 rounded-full bg-[#e5ff4d] shadow-[0_0_24px_4px_rgba(229,255,77,0.5)]" />
          <span className="text-sm font-semibold tracking-[0.26em] text-[#e5ff4d] uppercase">Soundcheck</span>
        </header>
        <section className="max-w-3xl py-20 sm:py-28">
          <p className="mb-5 text-sm font-medium tracking-[0.2em] text-white/45 uppercase">Concert preparation, simplified</p>
          <h1 className="text-5xl font-semibold tracking-[-0.055em] text-balance sm:text-7xl">Your Soundcheck workspace is live.</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-white/60">One clear place to get ready for the show.</p>
        </section>
        <footer className="flex items-center justify-between border-t border-white/10 pt-6 text-xs tracking-[0.16em] text-white/35 uppercase">
          <span>Phase 0</span><span>Ready to build</span>
        </footer>
      </div>
    </main>
  );
}
