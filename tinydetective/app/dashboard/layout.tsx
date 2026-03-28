import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center bg-background">
      <div className="flex-1 w-full flex flex-col items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent text-lg">
                  TinyDetective
                </span>
              </Link>
            </div>
            {hasEnvVars ? (
              <Suspense>
                <AuthButton />
              </Suspense>
            ) : (
              <Link
                href="/"
                className="rounded-full border border-foreground/10 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                Configure Supabase
              </Link>
            )}
          </div>
        </nav>
        <div className="flex-1 flex flex-col w-full max-w-5xl p-5">
          {children}
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-8">
          <p className="text-muted-foreground">
            TinyDetective — Autonomous Visual Testing for PRs
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
