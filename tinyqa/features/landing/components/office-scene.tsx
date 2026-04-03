"use client";

import Link from "next/link";
import {
  SCENE_H,
  SCENE_W,
  rooms,
  WALL_COLOR,
  walls,
} from "@/features/landing/lib/office-scene-data";
import {
  ActionSprite,
  Agent,
  Floor,
  LinkedSprite,
  SpeechBubble,
  Sprite,
  Wall,
} from "@/features/landing/components/office-scene-primitives";

export function OfficeScene({
  scale,
  isLoggedIn,
  onOpenDashboard,
  onLogout,
}: {
  scale: number;
  isLoggedIn: boolean;
  onOpenDashboard: () => void;
  onLogout: () => void;
}) {
  const pcSprite = (index: number) =>
    isLoggedIn
      ? `/pixel-agents/assets/furniture/PC/PC_FRONT_ON_${index}.png`
      : "/pixel-agents/assets/furniture/PC/PC_FRONT_OFF.png";

  const speechText = isLoggedIn
    ? "What would you like to investigate?"
    : "Hi, I'm Tiny QA! Please login to get started.";

  return (
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
        {rooms.map((room) => (
          <Floor key={`${room.x}-${room.y}`} {...room} />
        ))}

        {walls.map((wall, index) => (
          <Wall key={index} {...wall} />
        ))}

        <Sprite src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="Bookshelf" x={40} y={20} w={96} h={96} />
        <Sprite src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="Bookshelf" x={148} y={20} w={96} h={96} />
        <Sprite src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="Bookshelf" x={370} y={20} w={96} h={96} />
        <Sprite src="/pixel-agents/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png" alt="Bookshelf" x={478} y={20} w={96} h={96} />

        <Sprite src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png" alt="Desk A" x={100} y={150} w={144} h={96} z={14} />
        {isLoggedIn ? (
          <ActionSprite
            src={pcSprite(1)}
            alt="Projects"
            x={148}
            y={150}
            w={48}
            h={96}
            z={15}
            cls="office-monitor office-monitor-a"
            label="Projects"
            onClick={onOpenDashboard}
          />
        ) : (
          <LinkedSprite
            src={pcSprite(1)}
            alt="Projects"
            x={148}
            y={150}
            w={48}
            h={96}
            z={15}
            cls="office-monitor office-monitor-a"
            href="/auth/login"
            label="Projects"
          />
        )}
        <Sprite src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png" alt="Chair" x={148} y={248} w={48} h={48} z={16} />

        <Sprite src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png" alt="Desk B" x={370} y={150} w={144} h={96} z={14} />
        <LinkedSprite
          src={pcSprite(2)}
          alt="Live Preview"
          x={418}
          y={150}
          w={48}
          h={96}
          z={15}
          cls="office-monitor office-monitor-b"
          href={isLoggedIn ? "/dashboard/live-preview" : "/auth/login"}
          label="Live Preview"
        />
        <Sprite src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png" alt="Chair" x={418} y={248} w={48} h={48} z={16} />

        <Sprite src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png" alt="Desk" x={100} y={350} w={144} h={96} z={14} />
        <LinkedSprite
          src={pcSprite(3)}
          alt="Run Records"
          x={148}
          y={350}
          w={48}
          h={96}
          z={15}
          cls="office-monitor office-monitor-c"
          href={isLoggedIn ? "/dashboard/runs" : "/auth/login"}
          label="Run Records"
        />
        <Sprite src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png" alt="Chair" x={148} y={448} w={48} h={48} z={16} />

        <Sprite src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png" alt="Desk" x={370} y={350} w={144} h={96} z={14} />
        {isLoggedIn ? (
          <ActionSprite
            src={pcSprite(1)}
            alt="Logout"
            x={418}
            y={350}
            w={48}
            h={96}
            z={15}
            label="Logout"
            onClick={onLogout}
          />
        ) : (
          <LinkedSprite
            src={pcSprite(1)}
            alt="Login"
            x={418}
            y={350}
            w={48}
            h={96}
            z={15}
            href="/auth/login"
            label="Login"
          />
        )}
        <Sprite src="/pixel-agents/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png" alt="Chair" x={418} y={448} w={48} h={48} z={16} />

        <Sprite src="/pixel-agents/assets/furniture/BIN/BIN.png" alt="Bin" x={590} y={448} w={48} h={48} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/PLANT/PLANT.png" alt="Plant" x={596} y={100} w={48} h={96} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="Plant" x={28} y={400} w={48} h={96} z={14} />

        <Sprite src="/pixel-agents/assets/furniture/CLOCK/CLOCK.png" alt="Clock" x={864} y={20} w={48} h={96} z={20} />
        <Sprite src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="Bookshelf" x={980} y={20} w={96} h={48} />
        <Sprite src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="Bookshelf" x={980} y={68} w={96} h={48} />
        <Sprite src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="Bookshelf" x={980} y={116} w={96} h={48} />
        <Sprite src="/pixel-agents/assets/furniture/COFFEE/COFFEE.png" alt="Coffee station" x={1050} y={28} w={48} h={48} z={16} />

        <SpeechBubble x={888} y={204} text="New features coming soon" />
        <Agent x={840} y={244} charId={2} dir="down" scale={3} z={14} />
        <Agent x={888} y={244} charId={5} dir="down" scale={3} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/DESK/DESK_FRONT.png" alt="Desk" x={816} y={296} w={144} h={96} z={15} />
        <Sprite src="/pixel-agents/assets/furniture/COFFEE/COFFEE.png" alt="Coffee" x={822} y={320} w={48} h={48} z={20} />
        <Sprite src="/pixel-agents/assets/furniture/COFFEE/COFFEE.png" alt="Coffee" x={864} y={320} w={48} h={48} z={20} />
        <Sprite src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="Bookshelf" x={680} y={480} w={96} h={48} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/BOOKSHELF/BOOKSHELF.png" alt="Bookshelf" x={990} y={480} w={96} h={48} z={14} />

        <Sprite src="/pixel-agents/assets/furniture/LARGE_PAINTING/LARGE_PAINTING.png" alt="Painting" x={704} y={56} w={96} h={96} z={11} />
        <Sprite src="/pixel-agents/assets/furniture/PLANT/PLANT.png" alt="Plant" x={690} y={540} w={48} h={96} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/PLANT/PLANT.png" alt="Plant" x={1050} y={540} w={48} h={96} z={14} />

        {isLoggedIn ? (
          <ActionSprite
            src="/pixel-agents/assets/furniture/WHITEBOARD/WHITEBOARD.png"
            alt="Dashboard"
            x={840}
            y={120}
            w={96}
            h={96}
            z={11}
            label="Dashboard"
            onClick={onOpenDashboard}
          />
        ) : null}

        <Sprite src="/pixel-agents/assets/furniture/SOFA/SOFA_FRONT.png" alt="Sofa" x={840} y={500} w={96} h={48} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/SOFA/SOFA_BACK.png" alt="Sofa" x={840} y={580} w={96} h={48} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png" alt="Coffee table" x={840} y={530} w={96} h={96} z={13} />
        <Sprite src="/pixel-agents/assets/furniture/COFFEE/COFFEE.png" alt="Coffee" x={870} y={550} w={48} h={48} z={20} />

        <Sprite src="/pixel-agents/assets/furniture/CUSHIONED_BENCH/CUSHIONED_BENCH.png" alt="Bench" x={40} y={630} w={96} h={48} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/CUSHIONED_BENCH/CUSHIONED_BENCH.png" alt="Bench" x={200} y={630} w={96} h={48} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png" alt="Table" x={120} y={600} w={96} h={96} z={13} />

        <Sprite src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="Plant" x={420} y={580} w={48} h={96} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png" alt="Table" x={468} y={580} w={96} h={96} z={14} />
        <Sprite src="/pixel-agents/assets/furniture/PLANT_2/PLANT_2.png" alt="Plant" x={560} y={580} w={48} h={96} z={14} />

        <SpeechBubble x={304} y={210} text={speechText} />
        <Agent x={268} y={250} charId={4} dir="down" scale={4.5} z={17} />
      </div>
    </div>
  );
}

export function LandingHeader() {
  return (
    <header className="pointer-events-none fixed left-4 top-4 z-40">
      <div className="rounded-full border border-white/10 bg-[#1E2638]/80 px-4 py-2 shadow-lg backdrop-blur-sm">
        <span className="text-sm font-bold uppercase tracking-[0.32em] text-white">
          TinyQA
        </span>
      </div>
    </header>
  );
}
