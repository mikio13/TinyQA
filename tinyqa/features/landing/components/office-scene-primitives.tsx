"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import {
  TILE,
  WALL_COLOR,
  type Room,
  type WallDef,
} from "@/features/landing/lib/office-scene-data";

export type SpriteProps = {
  src: string;
  alt: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z?: number;
  flip?: boolean;
  cls?: string;
};

export type AgentProps = {
  x: number;
  y: number;
  charId: number;
  dir: "down" | "up" | "right" | "left";
  scale?: number;
  z?: number;
  cls?: string;
};

export function Floor({ x, y, w, h, tile, bg }: Room) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
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

export function Wall({ x, y, w, h }: WallDef) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        backgroundColor: WALL_COLOR,
      }}
    />
  );
}

export function Sprite({ src, alt, x, y, w, h, z = 12, flip, cls }: SpriteProps) {
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

export function LinkedSprite({
  src,
  alt,
  x,
  y,
  w,
  h,
  z = 12,
  cls,
  href,
  label,
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

export function ActionSprite({
  src,
  alt,
  x,
  y,
  w,
  h,
  z = 12,
  cls,
  label,
  onClick,
}: SpriteProps & { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`pixelated absolute block group ${cls ?? ""}`}
      style={{
        left: x,
        top: y,
        zIndex: z,
        width: w,
        height: h,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
      }}
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

export function SpeechBubble({
  x,
  y,
  z = 25,
  text,
}: {
  x: number;
  y: number;
  z?: number;
  text: string;
}) {
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
        <div
          className="absolute left-1/2 -bottom-2 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "8px solid white",
          }}
        />
      </div>
    </div>
  );
}

export function Agent({ x, y, charId, dir, scale = 4, z = 18, cls }: AgentProps) {
  const frameWidth = 16 * scale;
  const frameHeight = 32 * scale;
  const spriteSheetWidth = 112 * scale;
  const spriteSheetHeight = 96 * scale;
  const rowIndex = dir === "down" ? 0 : dir === "up" ? 1 : 2;
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
          width: frameWidth,
          height: frameHeight,
          backgroundImage: `url('/pixel-agents/assets/characters/char_${charId}.png')`,
          backgroundSize: `${spriteSheetWidth}px ${spriteSheetHeight}px`,
          backgroundRepeat: "no-repeat",
          backgroundPositionY: -rowIndex * frameHeight,
          imageRendering: "pixelated" as CSSProperties["imageRendering"],
        }}
      />
    </div>
  );
}
