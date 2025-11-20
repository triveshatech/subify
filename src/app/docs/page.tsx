"use client";

const steps = [
  {
    title: "Upload",
    body:
      "Client-side validation ensures MP4 files under 300MB are accepted. The file stays in memory until you trigger Whisper.",
  },
  {
    title: "Generate",
    body:
      "A Next.js API route streams the file to OpenAI Whisper (`gpt-4o-mini-transcribe`) and normalizes timestamped segments.",
  },
  {
    title: "Style",
    body:
      "Choose among Standard, TopBar, or Karaoke presets. Fonts (Noto Sans + Noto Sans Devanagari) guarantee Hinglish fidelity.",
  },
  {
    title: "Preview & Export",
    body:
      "Remotion Player powers in-browser preview. Developers can render MP4 via CLI with `npm run render:sample`.",
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#040307] px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-semibold">Flow Documentation</h1>
        <p className="text-white/70">
          Quick reference of the Remotion Captioning Platform architecture. Use
          this checklist to validate requirements or explain the experience to
          stakeholders.
        </p>
        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <p className="text-sm font-semibold text-purple-200">
                Step {index + 1}
              </p>
              <h2 className="text-2xl font-semibold">{step.title}</h2>
              <p className="text-white/70">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
