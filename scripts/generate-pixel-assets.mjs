import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PNG } from "pngjs";

const OUT_DIR = resolve("public/assets");
const CAT_FRAME_WIDTH = 128;
const CAT_FRAME_HEIGHT = 96;
const CAT_FRAMES = ["idle", "walk-a", "walk-b", "jump", "sniff", "eat", "knock", "angry", "sleep", "tail-flick", "ear-twitch", "loaf", "suspicious", "land"];
const CAT_COATS = ["gray", "black", "orange", "white", "tabby", "calico"];
const CAT_EYE_PALETTES = {
  gray: ["green", "amber"],
  black: ["yellow", "green", "copper"],
  orange: ["gold", "amber"],
  white: ["blue", "green", "amber", "odd"],
  tabby: ["green", "amber", "hazel"],
  calico: ["green", "gold", "copper", "odd"]
};
const CAT_PALETTES = {
  gray: { body: 0x7a7f8d, mid: 0x8e95a3, light: 0xb7bdc9, dark: 0x5b6270, accent: 0xdde2ec },
  black: { body: 0x1b1b22, mid: 0x292934, light: 0x4b4a59, dark: 0x0f1016, accent: 0x7a788a },
  orange: { body: 0xd17a2f, mid: 0xe58b3b, light: 0xffc579, dark: 0x8f4b1f, accent: 0xffe0a7, stripe: 0x9c5527 },
  white: { body: 0xf0eadf, mid: 0xfff7eb, light: 0xffffff, dark: 0xbab2aa, accent: 0xd8d2ca },
  tabby: { body: 0x8a7252, mid: 0xa38a63, light: 0xd4bb85, dark: 0x4f3a2d, accent: 0xe2d1a5, stripe: 0x4f3a2d },
  calico: { body: 0xf0eadf, mid: 0xfff6e8, light: 0xffffff, dark: 0xb9b0a7, accent: 0x27242a, patch: 0xd17a2f, patchLight: 0xffbd66 }
};
const EYE_COLORS = { green: 0x8ee06f, amber: 0xf0b44b, yellow: 0xffdf5d, copper: 0xc8743d, gold: 0xf4c95d, blue: 0x80c7ff, hazel: 0x9cad63, odd: 0x80c7ff };
const PLANT_IDS = ["cat-grass", "oat-grass", "wheat-grass", "barley-grass", "spider-plant", "boston-fern", "moth-orchid", "ficus-benjamina", "rose", "rosemary", "sunflower", "lavender", "lily", "aloe-vera", "pothos", "snake-plant"];
const POT_PALETTES = {
  "cat-grass": { dark: 0x2f4956, base: 0x5c8fa3, light: 0x98ddf2 },
  "oat-grass": { dark: 0x5b4b2f, base: 0xb08a46, light: 0xf4c95d },
  "wheat-grass": { dark: 0x684338, base: 0xc27a48, light: 0xffbd66 },
  "barley-grass": { dark: 0x3f5b3e, base: 0x6aa064, light: 0xa5df83 },
  "spider-plant": { dark: 0x493c53, base: 0x8a5c80, light: 0xd69adf },
  "boston-fern": { dark: 0x3e4f48, base: 0x6f8f78, light: 0xa5c68f },
  "moth-orchid": { dark: 0x5d3d5f, base: 0xb56d9a, light: 0xf2b7df },
  lily: { dark: 0x5b392b, base: 0x9c613d, light: 0xf0b46a },
  "aloe-vera": { dark: 0x4e5c51, base: 0x7b8d69, light: 0xb8dfa2 },
  pothos: { dark: 0x3e5a49, base: 0x5f8a5a, light: 0xe0d66a },
  "snake-plant": { dark: 0x34404d, base: 0x596b82, light: 0x8ee6ff },
  "ficus-benjamina": { dark: 0x4a3f31, base: 0x8a6a45, light: 0xdcc98f },
  rose: { dark: 0x5d3d5f, base: 0xb56d9a, light: 0xf2b7df },
  rosemary: { dark: 0x34404d, base: 0x5c8fa3, light: 0x98ddf2 },
  sunflower: { dark: 0x5b4b2f, base: 0xc27a48, light: 0xffbd66 },
  lavender: { dark: 0x493c53, base: 0x8a5c80, light: 0xd69adf }
};

function makePng(width, height) {
  const png = new PNG({ width, height, colorType: 6 });
  png.data.fill(0);
  return png;
}
function rgba(color, alpha = 255) { return { r: (color >> 16) & 255, g: (color >> 8) & 255, b: color & 255, a: alpha }; }
function mix(a, b, t) {
  const ac = rgba(a); const bc = rgba(b);
  return (Math.round(ac.r + (bc.r - ac.r) * t) << 16) | (Math.round(ac.g + (bc.g - ac.g) * t) << 8) | Math.round(ac.b + (bc.b - ac.b) * t);
}
function put(png, x, y, color, alpha = 255) {
  const px = Math.round(x); const py = Math.round(y);
  if (px < 0 || py < 0 || px >= png.width || py >= png.height || alpha <= 0) return;
  const index = (py * png.width + px) * 4; const source = rgba(color, alpha);
  if (alpha >= 255 || png.data[index + 3] === 0) {
    png.data[index] = source.r; png.data[index + 1] = source.g; png.data[index + 2] = source.b; png.data[index + 3] = source.a; return;
  }
  const oldA = png.data[index + 3] / 255; const newA = source.a / 255; const outA = newA + oldA * (1 - newA);
  png.data[index] = Math.round((source.r * newA + png.data[index] * oldA * (1 - newA)) / outA);
  png.data[index + 1] = Math.round((source.g * newA + png.data[index + 1] * oldA * (1 - newA)) / outA);
  png.data[index + 2] = Math.round((source.b * newA + png.data[index + 2] * oldA * (1 - newA)) / outA);
  png.data[index + 3] = Math.round(outA * 255);
}
function rect(png, x, y, width, height, color, alpha = 255) {
  for (let yy = Math.round(y); yy < Math.round(y + height); yy += 1) for (let xx = Math.round(x); xx < Math.round(x + width); xx += 1) put(png, xx, yy, color, alpha);
}
function ellipse(png, cx, cy, rx, ry, color, alpha = 255) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
    const nx = (x - cx) / rx; const ny = (y - cy) / ry; if (nx * nx + ny * ny <= 1) put(png, x, y, color, alpha);
  }
}
function line(png, x0, y0, x1, y1, color, thickness = 1, alpha = 255) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); const radius = Math.max(0, Math.floor(thickness / 2));
  for (let i = 0; i <= steps; i += 1) {
    const x = x0 + (x1 - x0) * (i / steps); const y = y0 + (y1 - y0) * (i / steps);
    for (let yy = -radius; yy <= radius; yy += 1) for (let xx = -radius; xx <= radius; xx += 1) put(png, x + xx, y + yy, color, alpha);
  }
}
function poly(png, points, color, alpha = 255) {
  const minX = Math.floor(Math.min(...points.map((point) => point[0]))); const maxX = Math.ceil(Math.max(...points.map((point) => point[0])));
  const minY = Math.floor(Math.min(...points.map((point) => point[1]))); const maxY = Math.ceil(Math.max(...points.map((point) => point[1])));
  for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
      const xi = points[i][0]; const yi = points[i][1]; const xj = points[j][0]; const yj = points[j][1];
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1) + xi;
      if (intersect) inside = !inside;
    }
    if (inside) put(png, x, y, color, alpha);
  }
}
function writePng(relativePath, png) {
  const filePath = resolve(OUT_DIR, relativePath); mkdirSync(dirname(filePath), { recursive: true }); writeFileSync(filePath, PNG.sync.write(png));
}
function drawTail(png, ox, oy, frame, palette, outline) {
  const lift = frame === "jump" ? -12 : frame === "tail-flick" ? -13 : frame === "land" ? 3 : 0;
  const side = frame === "walk-a" ? -1 : frame === "walk-b" ? 1 : frame === "tail-flick" ? -1 : 0;
  const tipX = frame === "tail-flick" ? -8 : side * 7;
  const midX = side * 2;
  const tipY = frame === "tail-flick" ? -6 : 0;
  const points = [
    [ox + 34, oy + 50 + lift],
    [ox + 24, oy + 43 + lift],
    [ox + 19 + midX, oy + 32 + lift],
    [ox + 25 + tipX, oy + 23 + lift + tipY],
    [ox + 34 + Math.round(tipX * 0.45), oy + 26 + lift + tipY]
  ];
  for (let i = 0; i < points.length - 1; i += 1) line(png, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], outline, 8);
  for (let i = 0; i < points.length - 1; i += 1) line(png, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], palette.body, 5);
  ellipse(png, points[4][0], points[4][1], 4, 4, outline);
  ellipse(png, points[4][0], points[4][1], 3, 3, palette.body);
  line(png, points[2][0] + 2, points[2][1] - 1, points[4][0] - 2, points[4][1] - 1, palette.light, 2, 185);
}
function drawLegs(png, ox, bodyY, frame, palette, outline) {
  const walkingA = frame === "walk-a"; const walkingB = frame === "walk-b"; const jump = frame === "jump"; const land = frame === "land";
  const legs = [
    { x: 41, y: walkingA ? 5 : walkingB ? 1 : jump ? -4 : land ? 3 : 0, h: jump ? 10 : 18 },
    { x: 52, y: walkingA ? 1 : walkingB ? 5 : jump ? -2 : land ? 2 : 0, h: jump ? 11 : 18 },
    { x: 66, y: walkingA ? 4 : walkingB ? 0 : jump ? -5 : land ? 3 : 0, h: jump ? 9 : 18 },
    { x: 76, y: walkingA ? 0 : walkingB ? 4 : jump ? -3 : land ? 2 : 0, h: jump ? 10 : 18 }
  ];
  legs.forEach((leg, index) => {
    const top = bodyY + 18 + leg.y; const pawY = top + leg.h;
    rect(png, ox + leg.x - 2, top - 1, 7, leg.h + 5, outline);
    rect(png, ox + leg.x, top, 4, leg.h, index % 2 === 0 ? palette.body : palette.mid);
    rect(png, ox + leg.x - 1, pawY, 9, 4, outline);
    rect(png, ox + leg.x, pawY, 7, 2, palette.accent);
  });
}
function drawStandingCatFrame(png, variant, frame, frameIndex) {
  const ox = frameIndex * CAT_FRAME_WIDTH; const oy = 0; const palette = CAT_PALETTES[variant.coat]; const outline = 0x1f2635;
  const lift = frame === "jump" ? -9 : frame === "land" ? 4 : frame === "walk-a" ? -1 : frame === "walk-b" ? 1 : 0; const bodyY = oy + 42 + lift; const headY = oy + 25 + lift;
  const eyeLeft = variant.eyeColor === "odd" ? EYE_COLORS.blue : EYE_COLORS[variant.eyeColor]; const eyeRight = variant.eyeColor === "odd" ? EYE_COLORS.green : EYE_COLORS[variant.eyeColor];
  ellipse(png, ox + 62, oy + 76, 39, 6, 0x111827, 96); drawTail(png, ox, oy, frame, palette, outline); drawLegs(png, ox, bodyY, frame, palette, outline);
  rect(png, ox + 31, bodyY + 4, 52, 26, outline); rect(png, ox + 36, bodyY, 42, 5, outline); rect(png, ox + 35, bodyY + 7, 45, 20, palette.body);
  rect(png, ox + 39, bodyY + 3, 35, 5, palette.mid); rect(png, ox + 42, bodyY + 8, 29, 6, mix(palette.body, palette.light, 0.25)); rect(png, ox + 37, bodyY + 22, 40, 4, palette.dark, 190);
  rect(png, ox + 44, bodyY + 10, 9, 3, palette.light, 180); rect(png, ox + 57, bodyY + 13, 7, 3, palette.light, 125);
  poly(png, [[ox + 76, headY + 6], [ox + 81, headY - 7], [ox + 88, headY + 7]], outline); poly(png, [[ox + 94, headY + 6], [ox + 101, headY - 7], [ox + 105, headY + 8]], outline);
  ellipse(png, ox + 91, headY + 20, 19, 16, outline); rect(png, ox + 75, headY + 9, 32, 17, outline); rect(png, ox + 81, headY + 31, 20, 3, outline);
  ellipse(png, ox + 91, headY + 20, 15, 13, palette.body); rect(png, ox + 79, headY + 10, 26, 16, palette.body); rect(png, ox + 82, headY + 29, 18, 3, palette.body);
  poly(png, [[ox + 80, headY + 5], [ox + 83, headY - 2], [ox + 87, headY + 7]], palette.body); poly(png, [[ox + 96, headY + 6], [ox + 100, headY - 2], [ox + 102, headY + 8]], palette.body);
  poly(png, [[ox + 82, headY + 4], [ox + 84, headY], [ox + 86, headY + 6]], 0xf4b0a8, 220); poly(png, [[ox + 97, headY + 5], [ox + 100, headY], [ox + 101, headY + 7]], 0xf4b0a8, 220);
  rect(png, ox + 80, headY + 9, 14, 5, palette.mid); rect(png, ox + 81, headY + 11, 10, 3, palette.light, 130);
  if (palette.stripe) {
    [45, 55, 66].forEach((x, index) => line(png, ox + x, bodyY + 4, ox + x - 2, bodyY + 18, palette.stripe, 2, 220 - index * 25));
    line(png, ox + 82, headY + 8, ox + 79, headY + 15, palette.stripe, 2); line(png, ox + 91, headY + 7, ox + 91, headY + 15, palette.stripe, 2); line(png, ox + 100, headY + 8, ox + 103, headY + 15, palette.stripe, 2);
    rect(png, ox + 46, bodyY + 13, 9, 2, palette.stripe, 210); rect(png, ox + 62, bodyY + 18, 9, 2, palette.stripe, 210);
  }
  if (variant.coat === "calico") {
    rect(png, ox + 42, bodyY + 7, 16, 13, palette.patch, 245); rect(png, ox + 43, bodyY + 9, 10, 4, palette.patchLight, 180); rect(png, ox + 65, bodyY + 8, 12, 16, palette.accent, 245);
    rect(png, ox + 67, bodyY + 10, 5, 5, 0x4a4654, 170); rect(png, ox + 78, headY + 8, 10, 12, palette.patch, 245); rect(png, ox + 97, headY + 7, 8, 10, palette.accent, 245); rect(png, ox + 80, headY + 10, 5, 3, palette.patchLight, 200);
  }
  if (variant.coat === "white") { rect(png, ox + 42, bodyY + 19, 30, 4, 0xded8d0, 170); rect(png, ox + 85, headY + 20, 13, 3, 0xe6ded6, 170); }
  if (variant.coat === "black") { rect(png, ox + 43, bodyY + 6, 18, 2, palette.light, 150); rect(png, ox + 82, headY + 10, 10, 2, palette.light, 130); }
  const angry = frame === "angry";
  rect(png, ox + 84, headY + 17, 4, 5, outline); rect(png, ox + 97, headY + 17, 4, 5, outline); rect(png, ox + 85, headY + 18, 2, 3, angry ? 0xff4f4f : eyeLeft); rect(png, ox + 98, headY + 18, 2, 3, angry ? 0xff4f4f : eyeRight);
  put(png, ox + 85, headY + 18, 0xffffff); put(png, ox + 98, headY + 18, 0xffffff);
  if (frame === "suspicious") { rect(png, ox + 82, headY + 15, 8, 2, outline); rect(png, ox + 95, headY + 15, 8, 2, outline); }
  if (angry) { line(png, ox + 82, headY + 15, ox + 90, headY + 13, outline, 2); line(png, ox + 96, headY + 13, ox + 104, headY + 15, outline, 2); }
  ellipse(png, ox + 88, headY + 26, 6, 5, 0xf9e8c8, 245); ellipse(png, ox + 96, headY + 26, 6, 5, 0xf9e8c8, 245); ellipse(png, ox + 92, headY + 29, 8, 4, 0xf9e8c8, 245);
  rect(png, ox + 90, headY + 24, 5, 3, 0xf49aa8); rect(png, ox + 92, headY + 27, 2, 3, outline);
  line(png, ox + 88, headY + 30, ox + 83, headY + 29, outline, 1, 220); line(png, ox + 96, headY + 30, ox + 102, headY + 29, outline, 1, 220);
  line(png, ox + 80, headY + 25, ox + 68, headY + 22, 0xf9e8c8, 1, 190); line(png, ox + 101, headY + 25, ox + 112, headY + 22, 0xf9e8c8, 1, 190); line(png, ox + 80, headY + 29, ox + 68, headY + 31, 0xf9e8c8, 1, 190); line(png, ox + 101, headY + 29, ox + 112, headY + 31, 0xf9e8c8, 1, 190);
  if (frame === "sniff") { rect(png, ox + 110, headY + 20, 3, 3, 0x8ee6ff, 210); rect(png, ox + 115, headY + 15, 2, 2, 0xd9fff1, 190); rect(png, ox + 116, headY + 25, 2, 2, 0xd9fff1, 180); }
  if (frame === "eat") { rect(png, ox + 101, headY + 27, 10, 4, 0x77c15f); line(png, ox + 106, headY + 27, ox + 110, headY + 21, 0x397848, 2); }
  if (frame === "knock") { rect(png, ox + 78, bodyY + 23, 27, 7, outline); rect(png, ox + 80, bodyY + 24, 22, 4, palette.body); rect(png, ox + 101, bodyY + 23, 5, 3, palette.accent); }
  if (frame === "ear-twitch") rect(png, ox + 96, headY - 5, 7, 3, palette.light, 190);
}
function drawSleepingCatFrame(png, variant, frame, frameIndex) {
  const ox = frameIndex * CAT_FRAME_WIDTH; const oy = 0; const palette = CAT_PALETTES[variant.coat]; const outline = 0x1f2635;
  ellipse(png, ox + 63, oy + 76, 42, 7, 0x111827, 95); rect(png, ox + 31, oy + 50, 64, 23, outline); rect(png, ox + 36, oy + 47, 50, 6, outline); rect(png, ox + 36, oy + 53, 54, 17, palette.body);
  rect(png, ox + 43, oy + 49, 34, 4, palette.mid); rect(png, ox + 29, oy + 57, 21, 18, outline); rect(png, ox + 31, oy + 59, 17, 13, palette.body);
  poly(png, [[ox + 31, oy + 58], [ox + 35, oy + 49], [ox + 39, oy + 59]], outline); poly(png, [[ox + 44, oy + 58], [ox + 50, oy + 50], [ox + 52, oy + 60]], outline);
  poly(png, [[ox + 34, oy + 58], [ox + 36, oy + 53], [ox + 38, oy + 59]], palette.body); poly(png, [[ox + 46, oy + 58], [ox + 49, oy + 54], [ox + 50, oy + 60]], palette.body);
  line(png, ox + 83, oy + 57, ox + 103, oy + 50, outline, 7); line(png, ox + 83, oy + 57, ox + 101, oy + 51, palette.body, 4);
  rect(png, ox + 35, oy + 66, 12, 3, palette.accent); rect(png, ox + 54, oy + 68, 13, 3, palette.accent); line(png, ox + 35, oy + 66, ox + 44, oy + 66, outline, 1); line(png, ox + 36, oy + 64, ox + 40, oy + 64, outline, 1); rect(png, ox + 33, oy + 64, 2, 2, 0xf49aa8);
  if (variant.coat === "calico") { rect(png, ox + 50, oy + 54, 17, 11, palette.patch); rect(png, ox + 74, oy + 55, 13, 11, palette.accent); rect(png, ox + 32, oy + 59, 9, 6, palette.patch); }
  if (frame === "loaf") { rect(png, ox + 39, oy + 67, 38, 5, palette.accent, 190); rect(png, ox + 33, oy + 70, 54, 3, outline, 210); }
}
function drawCatSheet(coat, eyeColor) {
  const png = makePng(CAT_FRAME_WIDTH * CAT_FRAMES.length, CAT_FRAME_HEIGHT); const variant = { coat, eyeColor };
  CAT_FRAMES.forEach((frame, index) => { if (frame === "sleep" || frame === "loaf") drawSleepingCatFrame(png, variant, frame, index); else drawStandingCatFrame(png, variant, frame, index); });
  writePng("cats/" + coat + "-" + eyeColor + ".png", png);
}
function drawPot(png, id) {
  const pot = POT_PALETTES[id] || POT_PALETTES["wheat-grass"];
  ellipse(png, 46, 90, 24, 4, 0x111827, 72); rect(png, 27, 70, 38, 7, 0x1f2635); rect(png, 30, 73, 32, 20, pot.dark); rect(png, 32, 75, 28, 15, pot.base); rect(png, 34, 76, 11, 4, pot.light, 220); rect(png, 51, 78, 7, 12, mix(pot.base, pot.dark, 0.35)); rect(png, 25, 66, 42, 8, pot.dark); rect(png, 29, 65, 34, 5, pot.light); rect(png, 31, 66, 27, 2, 0xf9e8c8, 135); rect(png, 32, 92, 28, 2, 0x1f2635, 180);
}
function blade(png, x0, y0, x1, y1, color, light = 0xb7f28b) { line(png, x0, y0, x1, y1, 0x20382f, 3); line(png, x0, y0, x1, y1, color, 2); line(png, x0 + 1, y0 - 1, x1 + 1, y1, light, 1, 190); }
function leaf(png, cx, cy, rx, ry, color, outline = 0x20382f, light = 0xb7f28b) { ellipse(png, cx, cy, rx + 1, ry + 1, outline); ellipse(png, cx, cy, rx, ry, color); line(png, cx - Math.floor(rx * 0.5), cy, cx + Math.floor(rx * 0.55), cy, light, 1, 165); }
function drawGrass(png, id, style) {
  const base = style === "wheat" ? 0x87c75d : style === "barley" ? 0x7fc16b : 0x68b65e; const light = style === "oat" ? 0xd4e67a : 0xb7f28b; const starts = [31, 35, 39, 43, 47, 51, 55, 59, 63];
  starts.forEach((x, index) => { const height = 24 + ((index * 7) % 18); const lean = [-9, -4, 2, 7, -2, 5, 10, -6, 3][index]; blade(png, x, 67, x + lean, 67 - height, mix(base, 0x315c45, index % 3 * 0.12), light);
    if (style === "wheat" && index % 3 === 1) { rect(png, x + lean - 2, 63 - height, 4, 8, 0xf4c95d); rect(png, x + lean - 1, 62 - height, 2, 3, 0xffe08a); }
    if (style === "barley" && index % 2 === 0) { line(png, x + lean, 64 - height, x + lean + 7, 54 - height, 0xdcc98f, 1); line(png, x + lean, 64 - height, x + lean - 7, 55 - height, 0xdcc98f, 1); rect(png, x + lean - 1, 62 - height, 3, 8, 0xa5df83); }
  }); drawPot(png, id);
}
function drawPlant(id) {
  const png = makePng(92, 96);
  if (id === "cat-grass") drawGrass(png, id, "cat");
  if (id === "oat-grass") drawGrass(png, id, "oat");
  if (id === "wheat-grass") drawGrass(png, id, "wheat");
  if (id === "barley-grass") drawGrass(png, id, "barley");
  if (id === "spider-plant") { [[45, 66, 22, 31], [45, 66, 66, 31], [44, 67, 28, 43], [48, 67, 62, 45], [46, 66, 46, 30]].forEach(([x0, y0, x1, y1], index) => { blade(png, x0, y0, x1, y1, index % 2 ? 0x5fb35f : 0x76c56d, 0xe1ffd1); line(png, x0, y0, x1, y1, 0xf2ffe4, 1, 210); }); line(png, 61, 46, 74, 33, 0x5fb35f, 1); leaf(png, 76, 32, 4, 3, 0x8fd37b); drawPot(png, id); }
  if (id === "boston-fern") { for (let i = -4; i <= 4; i += 1) { const angle = i / 4; const x1 = 46 + angle * 29; const y1 = 30 + Math.abs(i) * 4; line(png, 46, 66, x1, y1, 0x2f6d45, 2); for (let k = 0; k < 6; k += 1) { const t = (k + 1) / 7; const sx = 46 + (x1 - 46) * t; const sy = 66 + (y1 - 66) * t; leaf(png, sx - 4, sy, 3, 2, 0x74b76e); leaf(png, sx + 4, sy + 1, 3, 2, 0x6aa064); } } drawPot(png, id); }
  if (id === "moth-orchid") { leaf(png, 36, 63, 13, 7, 0x5f8a5a); leaf(png, 55, 63, 14, 8, 0x6aa064); line(png, 46, 65, 47, 30, 0x315c45, 2); line(png, 48, 45, 61, 32, 0x315c45, 1); [[47, 27], [60, 31], [40, 35]].forEach(([cx, cy], index) => { ellipse(png, cx - 5, cy, 6, 4, 0xf2b7df); ellipse(png, cx + 5, cy, 6, 4, 0xf2b7df); ellipse(png, cx, cy - 4, 5, 5, 0xffd7ee); ellipse(png, cx, cy + 3, 4, 4, 0xd96aae); rect(png, cx - 1, cy, 3, 3, index === 1 ? 0xffd56f : 0xf4c95d); }); drawPot(png, id); }
  if (id === "ficus-benjamina") { line(png, 46, 67, 44, 26, 0x5b392b, 4); line(png, 45, 44, 26, 28, 0x5b392b, 3); line(png, 46, 39, 65, 24, 0x5b392b, 3); line(png, 45, 54, 30, 45, 0x5b392b, 2); line(png, 48, 53, 65, 44, 0x5b392b, 2); [[28,27],[39,25],[56,24],[65,28],[30,43],[61,44],[43,35],[53,36],[36,52],[58,55],[47,20]].forEach(([cx, cy], index) => leaf(png, cx, cy, 6, 4, index % 2 ? 0x5f8a5a : 0x4f8f55, 0x20382f, 0xa5df83)); drawPot(png, id); }
  if (id === "rose") { line(png, 46, 66, 46, 28, 0x315c45, 2); line(png, 46, 50, 34, 42, 0x315c45, 1); line(png, 47, 52, 60, 44, 0x315c45, 1); leaf(png, 35, 42, 7, 4, 0x5f8a5a); leaf(png, 60, 44, 7, 4, 0x6aa064); [[46,25],[40,30],[52,31]].forEach(([cx, cy], index) => { ellipse(png, cx, cy, 8, 7, 0xd64f63); ellipse(png, cx - 3, cy - 2, 4, 3, 0xf2b7df, 220); ellipse(png, cx + 3, cy + 1, 4, 3, 0xb54660, 210); rect(png, cx - 1, cy - 1, 3, 2, 0xffd7ee, 190); }); drawPot(png, id); }
  if (id === "rosemary") { [[28,24,5],[33,19,-3],[38,22,4],[43,16,-2],[48,21,3],[53,18,-4],[58,24,4],[63,27,-2]].forEach(([x, top, lean], index) => { line(png, 46, 67, x + lean, top, 0x315c45, 3); for (let y = top + 8; y < 66; y += 6) { const side = index % 2 === 0 ? -1 : 1; rect(png, x - 7, y, 9, 2, 0x8fb6a8); rect(png, x + side, y + 2, 9, 2, 0xa7c7b7); } }); leaf(png, 35, 61, 11, 4, 0x7fa091); leaf(png, 57, 62, 12, 4, 0x8fb6a8); drawPot(png, id); }
  if (id === "sunflower") { line(png, 46, 67, 46, 29, 0x315c45, 3); leaf(png, 35, 51, 10, 6, 0x6aa064); leaf(png, 57, 48, 10, 6, 0x5f8a5a); [[46,24],[32,37],[61,38]].forEach(([cx, cy]) => { for (let i = 0; i < 10; i += 1) { const angle = (Math.PI * 2 * i) / 10; ellipse(png, cx + Math.cos(angle) * 9, cy + Math.sin(angle) * 9, 4, 7, 0xffd56f); } ellipse(png, cx, cy, 8, 8, 0x5b392b); rect(png, cx - 3, cy - 2, 2, 2, 0xdcc98f, 180); rect(png, cx + 2, cy + 1, 2, 2, 0xdcc98f, 160); }); drawPot(png, id); }
  if (id === "lavender") { [34,39,44,49,54,59].forEach((x, index) => { const top = 25 + (index % 2) * 5; line(png, x, 67, x - 2 + (index % 2) * 4, top, 0x6f8f78, 2); for (let y = top; y < top + 20; y += 5) { ellipse(png, x - 2, y, 4, 3, 0xb56dff); ellipse(png, x + 2, y + 2, 4, 3, 0xd69adf); } }); leaf(png, 38, 62, 10, 4, 0x8aa082); leaf(png, 54, 62, 10, 4, 0x9aae8f); drawPot(png, id); }
  if (id === "lily") { line(png, 46, 66, 45, 30, 0x315c45, 2); line(png, 46, 58, 31, 45, 0x315c45, 2); line(png, 46, 58, 62, 44, 0x315c45, 2); [[43, 27], [31, 43], [63, 42]].forEach(([cx, cy]) => { [[0, -11], [-11, -3], [11, -3], [-7, 8], [7, 8]].forEach(([dx, dy], index) => { ellipse(png, cx + dx, cy + dy, index === 0 ? 5 : 7, index === 0 ? 11 : 5, 0xf9c3df); ellipse(png, cx + dx, cy + dy, index === 0 ? 3 : 4, index === 0 ? 8 : 3, 0xffeef7, 185); }); rect(png, cx - 2, cy - 2, 4, 7, 0xf4c95d); line(png, cx, cy + 2, cx - 5, cy + 9, 0xffd56f, 1); line(png, cx, cy + 2, cx + 5, cy + 9, 0xffd56f, 1); }); drawPot(png, id); }
  if (id === "aloe-vera") { [[46, 66, 46, 27], [43, 66, 27, 42], [49, 66, 67, 41], [42, 67, 36, 31], [51, 67, 57, 33]].forEach(([x0, y0, x1, y1], index) => { line(png, x0, y0, x1, y1, 0x20382f, 8); line(png, x0, y0, x1, y1, index % 2 ? 0x6aa064 : 0x7fb06f, 6); line(png, x0 + 1, y0, x1 + 1, y1 + 4, 0xb8dfa2, 2, 185); }); [34, 41, 49, 57].forEach((x, index) => rect(png, x, 45 + index * 4, 3, 2, 0xe8ffe0, 190)); drawPot(png, id); }
  if (id === "pothos") { line(png, 46, 66, 38, 38, 0x315c45, 2); line(png, 48, 66, 62, 34, 0x315c45, 2); line(png, 43, 66, 29, 53, 0x315c45, 2); [[36, 38], [62, 35], [29, 53], [50, 46], [58, 55]].forEach(([cx, cy], index) => { ellipse(png, cx, cy, 8, 7, index % 2 ? 0x6aa064 : 0x4f8f55); rect(png, cx - 1, cy - 6, 3, 12, 0xe0d66a, 180); rect(png, cx + 2, cy - 2, 3, 2, 0xf7ed92, 190); }); drawPot(png, id); }
  if (id === "snake-plant") { [[35, 68, 31, 26], [43, 68, 43, 18], [51, 68, 55, 25], [59, 68, 67, 34]].forEach(([x0, y0, x1, y1], index) => { line(png, x0, y0, x1, y1, 0x20382f, 9); line(png, x0, y0, x1, y1, index % 2 ? 0x5f8a5a : 0x6d9d67, 7); line(png, x0 + 1, y0 - 4, x1 + 1, y1 + 5, 0xb7f28b, 2, 190); for (let k = 0; k < 4; k += 1) rect(png, x0 - 2 + k, y0 - 9 - k * 8, 6, 2, 0xd9c56b, 170); }); drawPot(png, id); }
  writePng("plants/" + id + ".png", png);
}
function drawTeaSet() {
  const png = makePng(150, 64);
  rect(png, 12, 58, 126, 4, 0x1f2635, 120);

  rect(png, 12, 53, 30, 4, 0xdcc98f);
  ellipse(png, 27, 50, 14, 4, 0xfff0b5);
  rect(png, 18, 38, 18, 14, 0x1f2635);
  rect(png, 20, 35, 14, 5, 0xf9e8c8);
  rect(png, 21, 41, 12, 10, 0x8ee6ff);
  rect(png, 23, 43, 7, 2, 0xd9fff1);
  line(png, 35, 42, 43, 47, 0x1f2635, 2);
  line(png, 35, 42, 42, 47, 0xf9e8c8, 1);
  line(png, 26, 33, 23, 27, 0xf9e8c8, 1, 170);
  line(png, 31, 33, 33, 27, 0xf9e8c8, 1, 150);

  rect(png, 54, 29, 40, 27, 0x1f2635);
  ellipse(png, 74, 31, 17, 6, 0x1f2635);
  ellipse(png, 74, 53, 20, 5, 0x405674);
  rect(png, 57, 33, 34, 21, 0x5c8fa3);
  ellipse(png, 74, 33, 17, 6, 0x8ee6ff);
  rect(png, 65, 25, 19, 7, 0x1f2635);
  rect(png, 68, 21, 13, 5, 0xf9e8c8);
  line(png, 57, 38, 47, 34, 0x1f2635, 4);
  line(png, 58, 38, 48, 34, 0x8ee6ff, 2);
  line(png, 91, 39, 103, 34, 0x1f2635, 4);
  line(png, 90, 39, 102, 34, 0x8ee6ff, 2);
  rect(png, 65, 38, 18, 3, 0xd9fff1, 210);
  rect(png, 81, 46, 6, 4, 0xd9fff1, 170);

  rect(png, 103, 53, 34, 4, 0x5f4b68);
  poly(png, [[108, 40], [133, 44], [116, 54]], 0x1f2635);
  poly(png, [[110, 41], [130, 44], [116, 52]], 0xf9e8c8);
  poly(png, [[110, 41], [130, 44], [126, 47], [111, 45]], 0xf2b7df);
  line(png, 113, 48, 123, 50, 0xffbd66, 2);
  rect(png, 109, 42, 8, 2, 0xffe0a7, 210);

  writePng("decor/kitchen-tea-set.png", png);
}
CAT_COATS.forEach((coat) => CAT_EYE_PALETTES[coat].forEach((eyeColor) => drawCatSheet(coat, eyeColor)));
PLANT_IDS.forEach(drawPlant);
drawTeaSet();
console.log("Generated detailed pixel assets");
