import { AuthButton } from "@/components/auth-button";
import { DashboardNav } from "@/components/dashboard-nav";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center" style={{ backgroundColor: "#1E2638" }}>
      <div className="flex-1 w-full flex flex-col items-center">
        {/* Top nav bar */}
        <nav className="w-full flex justify-center border-b border-white/10 h-14">
          <div className="w-full max-w-5xl flex justify-between items-center px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href="/" className="group">
                <span className="text-lg font-bold text-white group-hover:text-white/80 transition-colors">
                  Tiny QA
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
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                Configure Supabase
              </Link>
            )}
          </div>
        </nav>

        {/* Sub-nav tabs */}
        <DashboardNav />

        {/* Page content */}
        <div className="flex-1 flex flex-col w-full max-w-5xl p-5">
          {children}
        </div>

        {/* Footer */}
        <footer className="w-full flex items-center justify-center border-t border-white/10 mx-auto text-center text-xs gap-8 py-6">
          <p className="text-white/40">
            Tiny QA — Autonomous Visual Testing for PRs
          </p>
        </footer>
      </div>
    </main>
  );
}
