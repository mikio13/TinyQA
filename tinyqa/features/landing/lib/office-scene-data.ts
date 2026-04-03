export const SCENE_W = 1120;
export const SCENE_H = 760;
export const TILE = 48;
export const WALL_COLOR = "#1E2638";

export type Room = {
  x: number;
  y: number;
  w: number;
  h: number;
  tile: string;
  bg: string;
};

export type WallDef = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export const rooms: Room[] = [
  { x: 16, y: 16, w: 640, h: 480, tile: "/pixel-agents/assets/floors/floor_7.png", bg: "#B09060" },
  { x: 672, y: 16, w: 432, h: 224, tile: "/pixel-agents/assets/floors/floor_0.png", bg: "#B0A890" },
  { x: 672, y: 256, w: 432, h: 488, tile: "/pixel-agents/assets/floors/floor_4.png", bg: "#506878" },
  { x: 16, y: 512, w: 320, h: 232, tile: "/pixel-agents/assets/floors/floor_5.png", bg: "#908070" },
  { x: 352, y: 512, w: 304, h: 232, tile: "/pixel-agents/assets/floors/floor_1.png", bg: "#687080" },
];

export const walls: WallDef[] = [
  { x: 0, y: 0, w: SCENE_W, h: 16 },
  { x: 0, y: 744, w: SCENE_W, h: 16 },
  { x: 0, y: 0, w: 16, h: SCENE_H },
  { x: 1104, y: 0, w: 16, h: SCENE_H },
  { x: 656, y: 0, w: 16, h: 200 },
  { x: 656, y: 280, w: 16, h: 232 },
  { x: 656, y: 240, w: 464, h: 16 },
  { x: 0, y: 496, w: 280, h: 16 },
  { x: 380, y: 496, w: 292, h: 16 },
];
