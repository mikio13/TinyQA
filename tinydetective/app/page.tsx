import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";

async function HeroCTA() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Link
        href="/auth/login"
        className="px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg"
      >
        Log In
      </Link>
      <Link
        href="/auth/sign-up"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Don&apos;t have an account? Sign up
      </Link>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 p-8 max-w-2xl text-center">
        <span className="text-6xl">🔍</span>
        <h1 className="text-5xl font-bold">
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            TinyDetective
          </span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Autonomous AI visual testing for your Pull Requests. Connect a repo,
          and TinyDetective will test every PR on your staging site and post a
          code review automatically.
        </p>
        <Suspense>
          <HeroCTA />
        </Suspense>
      </div>
      <footer className="absolute bottom-0 w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-8">
        <p className="text-muted-foreground">
          Built for the TinyFish x OpenAI Hackathon
        </p>
        <ThemeSwitcher />
      </footer>
    </main>
  );
}
