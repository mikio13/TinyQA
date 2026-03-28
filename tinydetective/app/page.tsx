"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AnalyticsPanel } from "@/components/dashboard/analytics-panel";
import { DashboardProjectsPanel } from "@/components/dashboard/projects-panel";
import { DashboardSheet } from "@/components/dashboard/dashboard-sheet";
import { LivePrPreviewPanel } from "@/components/preview/live-pr-preview-panel";
import { LiveInfraPreviewPanel } from "@/components/preview/live-infra-preview-panel";

/* ================================================================
   SCENE CONSTANTS
   ================================================================ */
const SCENE_W = 1120;
const SCENE_H = 760;
const TILE = 48; // 3× scale of 16px native tiles

/* ================================================================
   TYPES
   ================================================================ */
type Room = {
  x: number; y: number; w: number; h: number;
  tile: string; bg: string;
};
type WallDef = { x: number; y: number; w: number; h: number };
type SpriteProps = {
  src: string; alt: string;
  x: number; y: number; w: number; h: number;
  z?: number; flip?: boolean; cls?: string;
};
type AgentProps = {
  x: number; y: number; charId: number;
  dir: "down" | "up" | "right" | "left";
  scale?: number; z?: number; cls?: string;
};

/* ================================================================
   SCENE DATA
   ================================================================ */

// Rooms with base background-color + tiled floor image
const rooms: Room[] = [
  // Main office — warm brown wood floor
  { x: 16, y: 16, w: 640, h: 480, tile: "/pixel-agents/assets/floors/floor_7.png", bg: "#B09060" },
  // Top-right — bright kitchen/break area
  { x: 672, y: 16, w: 432, h: 224, tile: "/pixel-agents/assets/floors/floor_0.png", bg: "#B0A890" },
  // Bottom-right — cool meeting/review room
  { x: 672, y: 256, w: 432, h: 488, tile: "/pixel-agents/assets/floors/floor_4.png", bg: "#506878" },
  // Bottom-left — utility/lounge
  { x: 16, y: 512, w: 320, h: 232, tile: "/pixel-agents/assets/floors/floor_5.png", bg: "#908070" },
  // Bottom-mid — corridor area
  { x: 352, y: 512, w: 304, h: 232, tile: "/pixel-agents/assets/floors/floor_1.png", bg: "#687080" },
];

// Walls — thin dark partitions
const WALL_COLOR = "#1E2638";
const walls: WallDef[] = [
  // Outer boundary
  { x: 0, y: 0, w: SCENE_W, h: 16 },       // top
  { x: 0, y: 744, w: SCENE_W, h: 16 },      // bottom
  { x: 0, y: 0, w: 16, h: SCENE_H },         // left
  { x: 1104, y: 0, w: 16, h: SCENE_H },      // right
  // Center vertical divider (with doorway gap 200–280)
  { x: 656, y: 0, w: 16, h: 200 },
  { x: 656, y: 280, w: 16, h: 232 },
  // Right horizontal divider
  { x: 656, y: 240, w: 464, h: 16 },
  // Left horizontal divider (with doorway gap 280–380)
  { x: 0, y: 496, w: 280, h: 16 },
  { x: 380, y: 496, w: 292, h: 16 },
];

/* ================================================================
   COMPONENTS
   ================================================================ */

function Floor({ x, y, w, h, tile, bg }: Room) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: x, top: y, width: w, height: h,
        backgroundColor: bg,
        backgroundImage: `url(${tile})`,
        backgroundSize: `${TILE}px ${TILE}px`,
        backgroundRepeat: "repeat",
        backgroundBlendMode: "multiply",
        imageRendering: "pixelated" as CSSProperties["imageRendering"],
      }}
    />
  );
}

function Wall({ x, y, w, h }: WallDef) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: x, top: y, width: w, height: h,
        backgroundColor: WALL_COLOR,
      }}
    />
  );
}

/** Plain <img> for pixel art — avoids Next.js Image optimization that ruins pixel sprites */
function Sprite({ src, alt, x, y, w, h, z = 12, flip, cls }: SpriteProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={w}
      height={h}
      className={`pixelated absolute ${cls ?? ""}`}
      style={{
        left: x,
        top: y,
        zIndex: z,
        width: w,
        height: h,
        transform: flip ? "scaleX(-1)" : undefined,
      }}
      draggable={false}
    />
  );
}

/** Clickable sprite with a link — for interactive computer screens */
function LinkedSprite({
  src, alt, x, y, w, h, z = 12, cls, href, label,
}: SpriteProps & { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`pixelated absolute block group ${cls ?? ""}`}
      style={{ left: x, top: y, zIndex: z, width: w, height: h }}
      title={label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={w}
        height={h}
        className="pixelated transition-transform duration-150 group-hover:scale-110 group-hover:brightness-125"
        style={{ width: w, height: h, display: "block" }}
        draggable={false}
      />
      <span
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#1E2638]/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
        style={{ top: -16, zIndex: 30 }}
      >
        {label}
      </span>
    </Link>
  );
}

/** Clickable sprite with an action — for logout etc */
function ActionSprite({
  src, alt, x, y, w, h, z = 12, cls, label, onClick,
}: SpriteProps & { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`pixelated absolute block group ${cls ?? ""}`}
      style={{ left: x, top: y, zIndex: z, width: w, height: h, background: "none", border: "none", padding: 0, cursor: "pointer" }}
      title={label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={w}
        height={h}
        className="pixelated transition-transform duration-150 group-hover:scale-110 group-hover:brightness-125"
        style={{ width: w, height: h, display: "block" }}
        draggable={false}
      />
      <span
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#1E2638]/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
        style={{ top: -16, zIndex: 30 }}
      >
        {label}
      </span>
    </button>
  );
}

/** Pixel-art speech bubble above a character */
function SpeechBubble({ x, y, z = 25, text }: { x: number; y: number; z?: number; text: string }) {
  return (
    <div
      className="absolute"
      style={{ left: x, top: y, zIndex: z, transform: "translateX(-50%)" }}
    >
      <div
        className="relative rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-[#1E2638] shadow-md"
        style={{ imageRendering: "auto", whiteSpace: "nowrap" }}
      >
        {text}
        {/* Triangle pointer */}
        <div
          className="absolute left-1/2 -bottom-2 -translate-x-1/2"
          style={{
            width: 0, height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "8px solid white",
          }}
        />
      </div>
    </div>
  );
}

/** Animated sprite-sheet character from char_*.png (16×32 per frame, 7 frames × 3 dirs) */
function Agent({ x, y, charId, dir, scale = 4, z = 18, cls }: AgentProps) {
  const fw = 16 * scale;
  const fh = 32 * scale;
  const sw = 112 * scale;
  const sh = 96 * scale;
  const rowIdx = dir === "down" ? 0 : dir === "up" ? 1 : 2;
  const flip = dir === "left";

  return (
    <div
      aria-hidden
      className="absolute"
      style={{ left: x, top: y, zIndex: z, transform: flip ? "scaleX(-1)" : undefined }}
    >
      <div
        className={`pixelated agent-bob ${cls ?? ""}`}
        style={{
          width: fw,
          height: fh,
          backgroundImage: `url('/pixel-agents/assets/characters/char_${charId}.png')`,
          backgroundSize: `${sw}px ${sh}px`,
          backgroundRepeat: "no-repeat",
          backgroundPositionY: -rowIdx * fh,
          imageRendering: "pixelated" as CSSProperties["imageRendering"],
        }}
      />
    </div>
  );
}

/* ================================================================
   PAGE
   ================================================================ */
export default function Home() {
  const [scale, setScale] = useState(0.85);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeSheet, setActiveSheet] = useState<
    "dashboard" | "analytics" | "pr-preview" | "infra-preview" | null
  >(null);

  useEffect(() => {
    const update = () => {
      const s = Math.min(window.innerWidth / SCENE_W, window.innerHeight / SCENE_H) * 0.94;
      setScale(Math.max(0.4, s));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const pcSprite = (n: number) =>
    isLoggedIn
      ? `/pixel-agents/assets/furniture/PC/PC_FRONT_ON_${n}.png`
      : "/pixel-agents/assets/furniture/PC/PC_FRONT_OFF.png";

  const speechText = isLoggedIn
    ? "What would you like to investigate?"
    : "Hi, I'm Tiny QA! Please login to get started.";
  const showChatPrompt = false;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return (
    <main
      className={`flex flex-col items-center justify-center ${isLoggedIn ? "h-screen overflow-hidden" : "min-h-screen overflow-auto py-12"}`}
      style={{ backgroundColor: WALL_COLOR }}
    >
      {/* Wrapper sizes to the visual scaled dimensions for proper centering */}
      <div style={{ width: SCENE_W * scale, height: SCENE_H * scale }}>
        <div
          className="relative"
          style={{
            width: SCENE_W,
            height: SCENE_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
        {/* ── FLOOR ROOMS ──────────────────────────── */}
        {rooms.map((r) => (
          <Floor key={`${r.x}-${r.y}`} {...r} />
        ))}

        {/* ── WALLS ────────────────────────────────── */}
        {walls.map((w, i) => (
          <Wall key={i} {...w} />
        ))}

        {/* ═══════════════════════════════════════════
            MAIN OFFICE — Wall decorations (top wall)
            ═══════════════════════════════════════════ */}
        <Sprite src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="Bookshelf" x={40} y={20} w={96} h={96} />
        <Sprite src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="Bookshelf" x={148} y={20} w={96} h={96} />
        <Sprite src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="Bookshelf" x={370} y={20} w={96} h={96} />
        <Sprite src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="Bookshelf" x={478} y={20} w={96} h={96} />

        {/* ═══════════════════════════════════════════
            MAIN OFFICE — Desk Row 1 (Workstations A & B)
            The two important computer workstations
            ═══════════════════════════════════════════ */}

        {/* Workstation A — live PR preview */}
        <Sprite src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png" alt="Desk A" x={100} y={150} w={144} h={96} z={14} />
        {isLoggedIn ? (
          <ActionSprite
            src={pcSprite(1)}
            alt="PR Preview"
            x={148}
            y={150}
            w={48}
            h={96}
            z={15}
            cls="office-monitor office-monitor-a"
            label="PR Review"
            onClick={() => setActiveSheet("pr-preview")}
          />
        ) : (
          <LinkedSprite
            src={pcSprite(1)}
            alt="PR Preview"
            x={148}
            y={150}
            w={48}
            h={96}
            z={15}
            cls="office-monitor office-monitor-a"
            href="/auth/login"
            label="PR Review"
          />
        )}
        <Sprite src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png" alt="Chair" x={148} y={248} w={48} h={48} z={16} />

        {/* Workstation B — live infra preview */}
        <Sprite src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png" alt="Desk B" x={370} y={150} w={144} h={96} z={14} />
        {isLoggedIn ? (
          <ActionSprite
            src={pcSprite(2)}
            alt="Infra Preview"
            x={418}
            y={150}
            w={48}
            h={96}
            z={15}
            cls="office-monitor office-monitor-b"
            label="Infra Review"
            onClick={() => setActiveSheet("infra-preview")}
          />
        ) : (
          <LinkedSprite
            src={pcSprite(2)}
            alt="Infra Preview"
            x={418}
            y={150}
            w={48}
            h={96}
            z={15}
            cls="office-monitor office-monitor-b"
            href="/auth/login"
            label="Infra Review"
          />
        )}
        <Sprite src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png" alt="Chair" x={418} y={248} w={48} h={48} z={16} />

        {/* ═══════════════════════════════════════════
            MAIN OFFICE — Desk Row 2
            ═══════════════════════════════════════════ */}
        <Sprite src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png" alt="Desk" x={100} y={350} w={144} h={96} z={14} />
        {isLoggedIn ? (
          <ActionSprite
            src={pcSprite(3)}
            alt="Analytics"
            x={148}
            y={350}
            w={48}
            h={96}
            z={15}
            cls="office-monitor office-monitor-c"
            label="Analytics"
            onClick={() => setActiveSheet("analytics")}
          />
        ) : (
          <LinkedSprite
            src={pcSprite(3)}
            alt="Analytics"
            x={148}
            y={350}
            w={48}
            h={96}
            z={15}
            cls="office-monitor office-monitor-c"
            href="/auth/login"
            label="Analytics"
          />
        )}
        <Sprite src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png" alt="Chair" x={148} y={448} w={48} h={48} z={16} />

        <Sprite src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png" alt="Desk" x={370} y={350} w={144} h={96} z={14} />
        {isLoggedIn ? (
          <ActionSprite src={pcSprite(1)} alt="Logout" x={418} y={350} w={48} h={96} z={15} label="Logout" onClick={handleLogout} />
        ) : (
          <LinkedSprite src={pcSprite(1)} alt="Login" x={418} y={350} w={48} h={96} z={15} href="/auth/login" label="Login" />
        )}
        <Sprite src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png" alt="Chair" x={418} y={448} w={48} h={48} z={16} />

        {/* Main office small items */}
        <Sprite src="/pixel-agents/assets/furniture/BIN/BIN.png" alt="Bin" x={590} y={448} w={48} h={48} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/PLANT/PLANT.png" alt="Plant" x={596} y={100} w={48} h={96} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="Plant" x={28} y={400} w={48} h={96} z={14} />

        {/* ═══════════════════════════════════════════
            TOP-RIGHT ROOM — Kitchen / Break area
            ═══════════════════════════════════════════ */}
        <Sprite src="/pixel-agents/assets/furniture/CLOCK/CLOCK.png" alt="Clock" x={864} y={20} w={48} h={96} z={20} />
        <Sprite src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="Bookshelf" x={980} y={20} w={96} h={48} />
        <Sprite src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="Bookshelf" x={980} y={68} w={96} h={48} />
        <Sprite src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="Bookshelf" x={980} y={116} w={96} h={48} />
        <Sprite src="/pixel-agents/assets/furniture/COFFEE/COFFEE.png" alt="Coffee station" x={1050} y={28} w={48} h={48} z={16} />
        {/* ═══════════════════════════════════════════
            BOTTOM-RIGHT ROOM — Meeting / Review room
            ═══════════════════════════════════════════ */}

        {/* Single review-room workstation */}
        <SpeechBubble x={888} y={204} text="New features coming soon" />
        <Agent x={840} y={244} charId={2} dir="down" scale={3} z={14} />
        <Agent x={888} y={244} charId={5} dir="down" scale={3} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png" alt="Desk" x={816} y={296} w={144} h={96} z={15} />
        <Sprite src="/pixel-agents/assets/furniture/COFFEE/COFFEE.png" alt="Coffee" x={822} y={320} w={48} h={48} z={20} />
        <Sprite src="/pixel-agents/assets/furniture/COFFEE/COFFEE.png" alt="Coffee" x={864} y={320} w={48} h={48} z={20} />
        <Sprite src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="Bookshelf" x={680} y={480} w={96} h={48} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="Bookshelf" x={990} y={480} w={96} h={48} z={14} />

        {/* Painting and decorations */}
        <Sprite src="/pixel-agents/assets/furniture/LARGE_PAINTING/LARGE_PAINTING.png" alt="Painting" x={704} y={56} w={96} h={96} z={11} />
        <Sprite src="/pixel-agents/assets/furniture/PLANT/PLANT.png" alt="Plant" x={690} y={540} w={48} h={96} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/PLANT/PLANT.png" alt="Plant" x={1050} y={540} w={48} h={96} z={14} />

        {/* Dashboard whiteboard — on the top-right room wall, only when logged in */}
        {isLoggedIn && (
          <ActionSprite
            src="/pixel-agents/assets/furniture/WHITEBOARD/WHITEBOARD.png"
            alt="Dashboard"
            x={840}
            y={120}
            w={96}
            h={96}
            z={11}
            label="Dashboard"
            onClick={() => setActiveSheet("dashboard")}
          />
        )}

        {/* Sofa lounge area — centered in room */}
        <Sprite src="/pixel-agents/assets/furniture/SOFA/SOFA_FRONT.png" alt="Sofa" x={840} y={500} w={96} h={48} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/SOFA/SOFA_BACK.png" alt="Sofa" x={840} y={580} w={96} h={48} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png" alt="Coffee table" x={840} y={530} w={96} h={96} z={13} />
        <Sprite src="/pixel-agents/assets/furniture/COFFEE/COFFEE.png" alt="Coffee" x={870} y={550} w={48} h={48} z={20} />

        {/* ═══════════════════════════════════════════
            BOTTOM-LEFT — Lounge / Break
            ═══════════════════════════════════════════ */}
        <Sprite src="/pixel-agents/assets/furniture/CUSHIONED_BENCH/CUSHIONED_BENCH.png" alt="Bench" x={40} y={630} w={96} h={48} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/CUSHIONED_BENCH/CUSHIONED_BENCH.png" alt="Bench" x={200} y={630} w={96} h={48} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png" alt="Table" x={120} y={600} w={96} h={96} z={13} />


        {/* Bottom-mid area */}
        <Sprite src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="Plant" x={420} y={580} w={48} h={96} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png" alt="Table" x={468} y={580} w={96} h={96} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="Plant" x={560} y={580} w={48} h={96} z={14} />
        {/* ═══════════════════════════════════════════
            CHARACTER — Blue shirt/vest agent centered between 4 desks
            ═══════════════════════════════════════════ */}
        <SpeechBubble x={304} y={210} text={speechText} />
        <Agent x={268} y={250} charId={4} dir="down" scale={4.5} z={17} />
        </div>
      </div>

      {/* ── Chat prompt (logged in only) ─── */}
      {isLoggedIn && showChatPrompt && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-5">
          <div className="flex w-full max-w-xl items-center gap-2 rounded-xl border border-white/10 bg-[#1E2638]/90 px-4 py-3 shadow-lg backdrop-blur-sm">
            <input
              type="text"
              placeholder="Ask Tiny QA..."
              className="flex-1 bg-transparent text-sm text-white placeholder-white/40 outline-none"
              readOnly
            />
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Send"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95l14.095-5.638a.75.75 0 0 0 0-1.398L3.105 2.289Z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Info section below the office (logged out only) ─── */}
      {!isLoggedIn && (
        <div className="mt-12 w-full max-w-2xl px-6 pb-12">
          <h1 className="mb-4 text-center text-2xl font-bold text-white">
            Tiny QA
          </h1>
          <p className="mb-8 text-center text-sm text-white/60">
            Your AI-powered QA assistant that lives in a pixel-art office
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="mb-1 text-sm font-semibold text-white">Monitor Repos</h3>
              <p className="text-xs text-white/50">Track changes across your repositories and get notified when something needs attention.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="mb-1 text-sm font-semibold text-white">Staging Checks</h3>
              <p className="text-xs text-white/50">Keep an eye on staging deployments and catch issues before they hit production.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="mb-1 text-sm font-semibold text-white">Code Reviews</h3>
              <p className="text-xs text-white/50">Automated code review powered by AI to help you ship better code faster.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="mb-1 text-sm font-semibold text-white">Real-time Alerts</h3>
              <p className="text-xs text-white/50">Get notifications when repos update, staging deploys, or reviews need your attention.</p>
            </div>
          </div>

        </div>
      )}

      {isLoggedIn && activeSheet === "dashboard" ? (
        <DashboardSheet
          onClose={() => setActiveSheet(null)}
          fullPageHref="/dashboard"
          fullPageLabel="Full Page"
          title="Dashboard Workspace"
          eyebrow="Office Popup"
        >
          <DashboardProjectsPanel />
        </DashboardSheet>
      ) : null}

      {isLoggedIn && activeSheet === "analytics" ? (
        <DashboardSheet
          onClose={() => setActiveSheet(null)}
          fullPageHref="/dashboard/analytics"
          fullPageLabel="Open Full Analytics"
          title="Analytics Workspace"
          eyebrow="Metrics Popup"
          maxWidthClassName="max-w-[72rem]"
        >
          <AnalyticsPanel />
        </DashboardSheet>
      ) : null}

      {isLoggedIn && activeSheet === "pr-preview" ? (
        <DashboardSheet
          onClose={() => setActiveSheet(null)}
          fullPageHref="/dashboard/live-pr-preview"
          fullPageLabel="Open Full Preview"
          title="PR Review Live View"
          eyebrow="Live Browser Popup"
          maxWidthClassName="max-w-[72rem]"
        >
          <LivePrPreviewPanel />
        </DashboardSheet>
      ) : null}

      {isLoggedIn && activeSheet === "infra-preview" ? (
        <DashboardSheet
          onClose={() => setActiveSheet(null)}
          fullPageHref="/dashboard/live-infra-preview"
          fullPageLabel="Open Full Preview"
          title="Infra Review Live View"
          eyebrow="Environment Popup"
          maxWidthClassName="max-w-[72rem]"
        >
          <LiveInfraPreviewPanel />
        </DashboardSheet>
      ) : null}
    </main>
  );
}
