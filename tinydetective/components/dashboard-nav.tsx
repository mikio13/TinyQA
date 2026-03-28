"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Projects" },
  { href: "/dashboard/live-pr-preview", label: "PR Preview" },
  { href: "/dashboard/live-infra-preview", label: "Infra Preview" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="w-full border-b border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap gap-2 px-5 py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                isActive
                  ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground"
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
