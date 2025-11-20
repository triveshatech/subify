import { notFound } from "next/navigation";
import { DownloadShell } from "@/components/download-shell";
import { readSession } from "@/lib/server/session-store";

type DownloadPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function DownloadPage({ params }: DownloadPageProps) {
  const { sessionId } = await params;
  const session = await readSession(sessionId);

  if (!session) {
    notFound();
  }

  return (
    <main className="min-h-screen w-full bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.12),_transparent_55%),_#050209] px-4 py-10 sm:px-8 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <DownloadShell session={session} />
      </div>
    </main>
  );
}
