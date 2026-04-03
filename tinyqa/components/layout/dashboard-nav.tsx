"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Projects" },
  { href: "/dashboard/live-preview", label: "Live Preview" },
  { href: "/dashboard/runs", label: "Run Records" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="w-full border-b border-white/10" style={{ backgroundColor: "rgba(30, 38, 56, 0.8)" }}>
      <div className="mx-auto flex w-full max-w-5xl flex-wrap gap-2 px-5 py-2.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg border px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors",
                isActive
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-transparent bg-transparent text-white/40 hover:bg-white/5 hover:text-white/70"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
