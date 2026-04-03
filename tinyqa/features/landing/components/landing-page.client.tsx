"use client";

import { useEffect, useState } from "react";
import { DashboardSheet } from "@/components/layout/dashboard-sheet";
import { DashboardProjectsPanel } from "@/features/projects/components/projects-panel.client";
import { createClient } from "@/lib/supabase/client";
import { SCENE_H, SCENE_W, WALL_COLOR } from "@/features/landing/lib/office-scene-data";
import { LoggedOutInfo } from "./logged-out-info";
import { LandingHeader, OfficeScene } from "./office-scene";

export function LandingPageClient() {
  const [scale, setScale] = useState(0.85);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDashboardSheetOpen, setIsDashboardSheetOpen] = useState(false);

  useEffect(() => {
    const updateScale = () => {
      const nextScale =
        Math.min(window.innerWidth / SCENE_W, window.innerHeight / SCENE_H) * 0.94;
      setScale(Math.max(0.4, nextScale));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(Boolean(data.user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsDashboardSheetOpen(false);
  };

  return (
    <main
      className={`flex flex-col items-center justify-center ${
        isLoggedIn ? "h-screen overflow-hidden" : "min-h-screen overflow-auto py-12"
      }`}
      style={{ backgroundColor: WALL_COLOR }}
    >
      <LandingHeader />

      <OfficeScene
        scale={scale}
        isLoggedIn={isLoggedIn}
        onOpenDashboard={() => setIsDashboardSheetOpen(true)}
        onLogout={handleLogout}
      />

      {!isLoggedIn ? <LoggedOutInfo /> : null}

      {isLoggedIn && isDashboardSheetOpen ? (
        <DashboardSheet
          onClose={() => setIsDashboardSheetOpen(false)}
          fullPageHref="/dashboard"
          fullPageLabel="Full Page"
          title="Dashboard Workspace"
          eyebrow="Office Popup"
        >
          <DashboardProjectsPanel />
        </DashboardSheet>
      ) : null}
    </main>
  );
}
