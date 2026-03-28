"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function DashboardSheet({
  children,
  onClose,
  title = "Dashboard Workspace",
  eyebrow = "Office Popup",
  fullPageHref,
  fullPageLabel = "Full Page",
  maxWidthClassName = "max-w-[46rem]",
}: {
  children: React.ReactNode;
  onClose?: () => void;
  title?: string;
  eyebrow?: string;
  fullPageHref?: string;
  fullPageLabel?: string;
  maxWidthClassName?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (onClose) {
          onClose();
          return;
        }
        router.back();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, router]);

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    router.back();
  };

  return (
    <div className="dashboard-sheet-backdrop fixed inset-0 z-[100] flex justify-end">
      <button
        aria-label="Close dashboard"
        className="flex-1 cursor-default"
        onClick={handleClose}
      />
      <section
        aria-modal="true"
        role="dialog"
        className={`dashboard-sheet-panel relative flex h-full w-full ${maxWidthClassName} flex-col border-l border-white/10 bg-[#151d2d]/95 shadow-[-24px_0_60px_rgba(0,0,0,0.45)] backdrop-blur-xl`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8bd6d6]">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {fullPageHref ? (
              <Link
                href={fullPageHref}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                {fullPageLabel}
              </Link>
            ) : null}
            <button
              onClick={handleClose}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </section>
    </div>
  );
}
