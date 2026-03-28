import Image from "next/image";
import Link from "next/link";
import { hasEnvVars } from "@/lib/utils";

const workflowSteps = [
  {
    eyebrow: "1. Pull Request Detected",
    title: "One computer reads the code change.",
    description:
      "TinyDetective picks up the PR context, understands what changed, and translates it into a test mission worth validating.",
  },
  {
    eyebrow: "2. Pixel Agents Move",
    title: "Agents travel between systems.",
    description:
      "MetroCity characters carry intent from the repo to the staging environment, checking what actually renders on-screen.",
  },
  {
    eyebrow: "3. Review Posted Back",
    title: "The second computer sends evidence home.",
    description:
      "Screenshots, observations, and a pass or fail verdict return to GitHub as a clean PR comment your team can trust.",
  },
] as const;

const features = [
  {
    title: "Visual PR Understanding",
    description:
      "Turn diffs into clear browser tasks instead of brittle hardcoded scripts.",
    accent: "from-[#ff8a58] to-[#ffbe5c]",
    asset: "/metrocity/showcase-2.png",
    alt: "MetroCity character portrait",
  },
  {
    title: "Live Agent Energy",
    description:
      "Pixel characters, animated signals, and live motion make the system feel active instead of abstract.",
    accent: "from-[#5dd39e] to-[#0ea5e9]",
    asset: "/metrocity/run-cycle-1.gif",
    alt: "MetroCity running animation",
  },
  {
    title: "Startup-Ready Demo Flow",
    description:
      "Show GitHub, staging, and the final review comment as one crisp loop during a live demo.",
    accent: "from-[#a78bfa] to-[#60a5fa]",
    asset: "/metrocity/run-cycle-2.gif",
    alt: "MetroCity animated character",
  },
] as const;

function CTACluster() {
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row">
      <Link
        href="/auth/sign-up"
        className="inline-flex items-center justify-center rounded-full bg-[#ff8a58] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(255,138,88,0.35)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#ff7b44]"
      >
        Start Building
      </Link>
      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white/[0.88] backdrop-blur transition-colors duration-200 hover:bg-white/10"
      >
        View Dashboard
      </Link>
    </div>
  );
}

function ComputerStation({
  label,
  title,
  detail,
  tone,
  align = "left",
}: {
  label: string;
  title: string;
  detail: string;
  tone: string;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`relative rounded-[30px] border border-white/10 bg-[#0d1723]/95 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.35)] backdrop-blur ${
        align === "right" ? "md:mt-16" : ""
      }`}
    >
      <div className="rounded-[24px] border border-white/[0.08] bg-[#111c2a] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">
            {label}
          </span>
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff8a58]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffcf5a]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#42d392]" />
          </div>
        </div>
        <div
          className={`monitor-glow rounded-[20px] border border-white/10 bg-gradient-to-br ${tone} p-4 text-left text-[#07131d]`}
        >
          <div className="mb-6 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.22em] text-[#07131d]/[0.65]">
            <span>{title}</span>
            <span className="rounded-full bg-[#07131d]/10 px-2 py-1 text-[10px]">
              Live
            </span>
          </div>
          <div className="space-y-2 rounded-[18px] bg-[#07131d]/9 p-3">
            <div className="h-2 w-2/3 rounded-full bg-[#07131d]/[0.22]" />
            <div className="h-2 w-1/2 rounded-full bg-[#07131d]/[0.18]" />
            <div className="h-16 rounded-[16px] bg-[#07131d]/12" />
          </div>
          <p className="mt-4 text-sm font-medium leading-6 text-[#07131d]/[0.78]">
            {detail}
          </p>
        </div>
      </div>
      <div className="mx-auto mt-3 h-4 w-28 rounded-full bg-black/30 blur-sm" />
    </div>
  );
}

function FeatureCard({
  title,
  description,
  accent,
  asset,
  alt,
}: (typeof features)[number]) {
  const animated = asset.endsWith(".gif");

  return (
    <article className="pixel-panel group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1723]/[0.88] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent} opacity-80`}
      />
      <div className="mb-5 flex items-center justify-between">
        <div className="max-w-[12rem]">
          <h3 className="text-xl font-semibold tracking-tight text-white">
            {title}
          </h3>
        </div>
        <div className="rounded-[20px] border border-white/10 bg-white/5 p-2">
          <Image
            src={asset}
            alt={alt}
            width={80}
            height={80}
            unoptimized={animated}
            className="pixelated h-16 w-16 object-contain"
          />
        </div>
      </div>
      <p className="text-sm leading-7 text-white/[0.68]">{description}</p>
    </article>
  );
}

export default function Home() {
  return (
    <main className="landing-shell relative min-h-screen overflow-hidden bg-[#09111a] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,138,88,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(93,211,158,0.14),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.02),_transparent_28%)]" />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-16 pt-6 sm:px-8 lg:px-10">
        <header className="mb-12 flex flex-col gap-5 rounded-full border border-white/10 bg-white/5 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a58] to-[#ffcf5a] text-lg font-black text-[#09111a] shadow-[0_12px_28px_rgba(255,138,88,0.35)]">
              TD
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight text-white">
                TinyDetective
              </div>
              <div className="text-xs uppercase tracking-[0.24em] text-white/[0.45]">
                AI Visual Testing For Pull Requests
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-white/60">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              GitHub to Staging
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              Pixel Agents In Motion
            </span>
            <Link
              href="/auth/login"
              className="rounded-full border border-white/10 px-4 py-2 text-white transition-colors hover:bg-white/[0.08]"
            >
              Sign In
            </Link>
          </div>
        </header>

        <section className="grid items-center gap-12 pb-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ff8a58]/30 bg-[#ff8a58]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#ffd6c6]">
              Startup-Quality Demo Layer
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              Two computers talk.
              <span className="block bg-gradient-to-r from-[#ff8a58] via-[#ffcf5a] to-[#5dd39e] bg-clip-text text-transparent">
                Pixel agents carry the evidence.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/[0.68] sm:text-xl">
              TinyDetective turns a pull request into a visible QA loop. One
              machine understands the code change, another verifies the staging
              experience, and animated agents bring the result back home.
            </p>

            <div className="mt-8">
              <CTACluster />
            </div>

            {!hasEnvVars && (
              <div className="mt-5 inline-flex max-w-xl rounded-2xl border border-[#ffcf5a]/25 bg-[#ffcf5a]/10 px-4 py-3 text-sm leading-6 text-[#ffe8a3]">
                Supabase environment variables are not configured yet, so the
                landing page stays public and static until auth is connected.
              </div>
            )}

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="pixel-panel rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-semibold text-white">PR In</div>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Understand what changed before opening the browser.
                </p>
              </div>
              <div className="pixel-panel rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-semibold text-white">Run Live</div>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Agents move between systems and validate the UI.
                </p>
              </div>
              <div className="pixel-panel rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-semibold text-white">Review Out</div>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Post screenshots, verdicts, and next actions back to GitHub.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="pixel-panel relative overflow-hidden rounded-[36px] border border-white/10 bg-[#0b1622]/[0.92] p-5 shadow-[0_35px_120px_rgba(0,0,0,0.4)] backdrop-blur">
              <div className="absolute -left-20 top-8 h-44 w-44 rounded-full bg-[#ff8a58]/[0.18] blur-3xl" />
              <div className="absolute -right-10 bottom-5 h-52 w-52 rounded-full bg-[#42d392]/[0.14] blur-3xl" />

              <div className="relative rounded-[30px] border border-white/10 bg-[#07131d] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-white/[0.42]">
                      TinyDetective Live Scene
                    </div>
                    <div className="mt-1 text-sm text-white/60">
                      Inspired by playful pixel-agent systems
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/[0.65]">
                    MetroCity Characters
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1724] px-4 pb-5 pt-6">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,_rgba(255,138,88,0.12),_transparent_18%),radial-gradient(circle_at_82%_18%,_rgba(93,211,158,0.14),_transparent_22%)]" />
                  <div className="landing-grid absolute inset-0 opacity-35" />

                  <div className="absolute left-[20%] top-[46%] z-10 h-[2px] w-[60%] overflow-hidden rounded-full bg-white/12">
                    <span className="signal-packet delay-0" />
                    <span className="signal-packet delay-1" />
                    <span className="signal-packet delay-2" />
                  </div>

                  <div className="relative z-20 grid gap-6 md:grid-cols-2">
                    <ComputerStation
                      label="Computer A"
                      title="GitHub PR"
                      detail="Summarize the diff, draft the test goal, and send the mission across the line."
                      tone="from-[#ffd3c2] via-[#ffb889] to-[#ff8a58]"
                    />
                    <ComputerStation
                      label="Computer B"
                      title="Staging Runner"
                      detail="Inspect the live UI, capture evidence, and return a verdict with screenshots."
                      tone="from-[#d6fff1] via-[#93f0c7] to-[#52d6a5]"
                      align="right"
                    />
                  </div>

                  <div className="relative z-20 mt-8 rounded-[24px] border border-white/10 bg-black/[0.18] px-4 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs uppercase tracking-[0.25em] text-white/[0.45]">
                        Agent corridor
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/[0.65]">
                        Two systems, one review loop
                      </span>
                    </div>
                    <div className="relative mt-5 h-24 overflow-hidden rounded-[20px] border border-white/[0.08] bg-[linear-gradient(180deg,_rgba(255,255,255,0.02),_transparent)]">
                      <div className="absolute inset-x-0 bottom-5 h-2 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.14)_0,rgba(255,255,255,0.14)_38px,transparent_38px,transparent_64px)] opacity-60" />
                      <div className="absolute left-6 top-3 rounded-full border border-white/10 bg-[#ff8a58]/16 px-3 py-1 text-[11px] font-semibold text-[#ffd6c6]">
                        PR opened
                      </div>
                      <div className="absolute right-6 top-3 rounded-full border border-white/10 bg-[#42d392]/16 px-3 py-1 text-[11px] font-semibold text-[#d5fff0]">
                        Review posted
                      </div>

                      <div className="pixel-float absolute left-8 bottom-4">
                        <Image
                          src="/metrocity/run-cycle-1.gif"
                          alt="MetroCity character running from the code computer"
                          width={86}
                          height={86}
                          unoptimized
                          className="pixelated h-[86px] w-[86px] object-contain"
                        />
                      </div>
                      <div className="pixel-float-delayed absolute left-1/2 bottom-6 -translate-x-1/2">
                        <Image
                          src="/metrocity/showcase-2.png"
                          alt="MetroCity detective character"
                          width={64}
                          height={64}
                          className="pixelated h-16 w-16 object-contain"
                        />
                      </div>
                      <div className="pixel-float-slow absolute right-8 bottom-4">
                        <Image
                          src="/metrocity/run-cycle-2.gif"
                          alt="MetroCity character at the staging computer"
                          width={86}
                          height={86}
                          unoptimized
                          className="pixelated h-[86px] w-[86px] object-contain"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="relative z-20 mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[20px] border border-white/10 bg-white/5 p-3">
                      <div className="text-[11px] uppercase tracking-[0.26em] text-white/[0.45]">
                        Input
                      </div>
                      <div className="mt-2 text-sm font-medium text-white/[0.85]">
                        PR diff + context
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-white/5 p-3">
                      <div className="text-[11px] uppercase tracking-[0.26em] text-white/[0.45]">
                        Motion
                      </div>
                      <div className="mt-2 text-sm font-medium text-white/[0.85]">
                        Agents verify staging
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-white/5 p-3">
                      <div className="text-[11px] uppercase tracking-[0.26em] text-white/[0.45]">
                        Output
                      </div>
                      <div className="mt-2 text-sm font-medium text-white/[0.85]">
                        Screenshot-backed review
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 pb-20 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="max-w-lg">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ffb89a]">
              How It Works
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              A visual explanation that feels alive, not corporate.
            </h2>
            <p className="mt-4 text-base leading-8 text-white/[0.64]">
              The page tells one simple story: code changes on one side, live
              verification on the other, and characters moving through the
              middle to make the handoff tangible.
            </p>

            <div className="pixel-panel mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1723]/[0.88] p-4">
              <div className="rounded-[22px] border border-white/10 bg-[#101b29] p-3">
                <Image
                  src="/metrocity/pack-cover.png"
                  alt="MetroCity character pack overview"
                  width={640}
                  height={256}
                  className="pixelated h-auto w-full rounded-[18px] object-cover"
                />
              </div>
              <p className="mt-4 text-sm leading-7 text-white/[0.62]">
                Character visuals are sourced from the MetroCity free top-down
                character pack, then staged in a cleaner startup-style interface.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {workflowSteps.map((step, index) => (
              <article
                key={step.title}
                className="pixel-panel relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1723]/[0.88] p-6"
              >
                <div className="absolute right-5 top-5 text-5xl font-semibold tracking-[-0.08em] text-white/[0.06]">
                  0{index + 1}
                </div>
                <div className="relative max-w-2xl">
                  <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8fd9bc]">
                    {step.eyebrow}
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/[0.64]">
                    {step.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="pb-20">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8fd9bc]">
                Features
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Built to look modern while staying playfully pixelated.
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-7 text-white/60">
              The visual system borrows the charm of Pixel Agents and grounds it
              in a cleaner product frame for TinyDetective.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        <section className="pb-8">
          <div className="pixel-panel relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,138,88,0.16),rgba(93,211,158,0.12),rgba(96,165,250,0.12))] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:p-10">
            <div className="absolute -right-12 top-0 h-48 w-48 rounded-full bg-[#5dd39e]/[0.18] blur-3xl" />
            <div className="absolute -left-12 bottom-0 h-48 w-48 rounded-full bg-[#ff8a58]/[0.16] blur-3xl" />

            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div className="max-w-2xl">
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/[0.55]">
                  Call To Action
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                  Let the computers talk. Let the agents bring back proof.
                </h2>
                <p className="mt-4 text-base leading-8 text-white/[0.68]">
                  Connect a repo, point TinyDetective at staging, and turn pull
                  requests into visible review loops your team can actually demo.
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="relative flex items-center gap-3 rounded-[28px] border border-white/10 bg-[#081119]/80 px-5 py-4 backdrop-blur">
                  <Image
                    src="/metrocity/run-cycle-3.gif"
                    alt="MetroCity runner character"
                    width={72}
                    height={72}
                    unoptimized
                    className="pixelated h-[72px] w-[72px] object-contain"
                  />
                  <Image
                    src="/metrocity/showcase-2.png"
                    alt="MetroCity character portrait"
                    width={56}
                    height={56}
                    className="pixelated h-14 w-14 object-contain"
                  />
                </div>
                <CTACluster />
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-auto flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/[0.45] sm:flex-row sm:items-center sm:justify-between">
          <p>
            TinyDetective for the TinyFish x OpenAI Hackathon. Character visuals
            reference the MetroCity pack by JIK-A-4.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/pablodelucca/pixel-agents"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-white"
            >
              Pixel Agents inspiration
            </a>
            <a
              href="https://jik-a-4.itch.io/metrocity-free-topdown-character-pack"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-white"
            >
              MetroCity assets
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
