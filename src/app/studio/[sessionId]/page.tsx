import Link from "next/link";
import { notFound } from "next/navigation";
import { readSession } from "@/lib/server/session-store";
import { StudioShell } from "@/components/studio-shell";

type StudioPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function StudioPage({ params }: StudioPageProps) {
  const { sessionId } = await params;
  const session = await readSession(sessionId);
  if (!session) {
    notFound();
  }

  return (
    <main className="min-h-screen w-full bg-transparent px-4 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-2 text-center lg:text-left">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-purple-200 transition hover:border-white/40 hover:bg-white/10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M20 12H6" />
              <path d="M10 18l-6-6 6-6" />
            </svg>
            Subify
          </Link>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">
            Preview, Position & Export
          </h1>
          <p className="text-base text-white/70 sm:text-lg">
            Adjust your caption style & placement, then export your video in
            seconds.
          </p>
        </header>
        <StudioShell initialSession={session} />
      </div>
    </main>
  );
}
