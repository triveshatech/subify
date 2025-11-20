import { Suspense } from "react";
import { HomeShell } from "@/components/home-shell";

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.12),_transparent_55%),_#050209] px-4 py-12 sm:px-8 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="space-y-3 text-center lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-200/80">
            Subify
          </p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl lg:text-6xl">
            Auto subtitle generator online
          </h1>
          <p className="text-base text-white/70 sm:text-lg lg:max-w-2xl">
            Upload your clip, get instant subtitles and preview everything within seconds.
          </p>
        </header>
        <Suspense fallback={<div className="text-white/60">Loading UI…</div>}>
          <HomeShell />
        </Suspense>
      </div>
    </main>
  );
}
