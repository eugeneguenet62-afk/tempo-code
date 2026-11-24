// Assiette en pixel art : les aliments tombent un par un, rebondissent,
// fument, puis s'effacent en pixels pour laisser place au repas suivant.
import { PixelCanvas, clamp, hex, noise } from "./canvas";

type Sprite = { rows: readonly string[]; pal: Record<string, number>; hot?: boolean };

const S: Record<string, Sprite> = {
  poulet: {
    hot: true,
    rows: [
      "...bbbbbbb...",
      ".bbBBBBBBBbb.",
      "bBBkBBBkBBBBb",
      "bBBBkBBBkBBBb",
      "bBBBBkBBBkBBb",
      ".bBBBBBBBBBb.",
      "..bbbbbbbbb..",
    ],
    pal: { b: hex("#9c5427"), B: hex("#d98b4a"), k: hex("#6e3a1c") },
  },
  riz: {
    hot: true,
    rows: ["....wwwww....", "..wwWwwwwWw..", ".wwwwwWwwwwww", "wwWwwwwwwWwww", "wwwwwWwwwwwWw", ".wwwwwwwwwww."],
    pal: { w: hex("#f4f2ea"), W: hex("#c9c6d8") },
  },
  brocoli: {
    rows: ["..gGg.gGg..", ".gGGgGGGgg.", "gGGgGGgGGGg", "gGgGGGgGGgg", ".gGGgGGgGg.", "..gg.l.gg..", "....lll....", "....lll....", ".....l....."],
    pal: { g: hex("#2c8a50"), G: hex("#4fd19e"), l: hex("#a7d98a") },
  },
  tomate: {
    rows: ["..gGg..", ".rrgrr.", "rrRRrrr", "rRRrrrr", "rrrrrrr", ".rrrrr.", "..rrr.."],
    pal: { r: hex("#e5484d"), R: hex("#ff9a9e"), g: hex("#2c8a50"), G: hex("#4fd19e") },
  },
  oeuf: {
    rows: ["..wwwwww..", ".wwwwwwwww", "wwwwyyywww", "wwwyYyyyww", "wwwyyyyyww", ".wwwyyyww.", "..wwwwwww.", "...wwww..."],
    pal: { w: hex("#f4f2ea"), y: hex("#ffb13b"), Y: hex("#ffe08a") },
  },
  avocat: {
    rows: ["..gggg..", ".gGGGGg.", "gGllllGg", "gGlbblGg", "gGlbBlGg", "gGlbblGg", "gGllllGg", ".gGllGg.", "..gGGg..", "...gg..."],
    pal: { g: hex("#2f5d2a"), G: hex("#5e9a3c"), l: hex("#cfe58a"), b: hex("#8a5a2c"), B: hex("#b9824a") },
  },
  banane: {
    rows: ["...........k", ".........yy.", "yy.....yyYy.", ".yyyyyyyYy..", "..yyYYYyy...", "....yyy....."],
    pal: { y: hex("#ffd166"), Y: hex("#fff0b8"), k: hex("#6e4a1c") },
  },
  pain: {
    rows: [".bbbbbbbb.", "bBBBBBBBBb", "bBccccccBb", "bBccCcccBb", "bBcccccCBb", "bBccccccBb", "bBBBBBBBBb", ".bbbbbbbb."],
    pal: { b: hex("#8a5226"), B: hex("#c98a4a"), c: hex("#f2d9a8"), C: hex("#fff1d1") },
  },
};

export const MEALS = [
  { name: "Déjeuner", kcal: "840 kcal", items: [["riz", 22, 37], ["poulet", 37, 37], ["brocoli", 51, 35], ["tomate", 31, 33]] },
  { name: "Petit-déjeuner", kcal: "520 kcal", items: [["pain", 21, 37], ["avocat", 33, 36], ["oeuf", 45, 37], ["banane", 50, 32]] },
] as const;

const PLATE = hex("#d9dcec");
const PLATE_IN = hex("#f1f2fa");
const PLATE_SH = hex("#9aa0c0");
const TABLE = hex("#12152d");
const STEAM = hex("#a3a8c3");
const SPARK = hex("#ffd166");

export const MEAL_PERIOD = 7;

export function drawPlate(pc: PixelCanvas, t: number) {
  const mi = Math.floor(t / MEAL_PERIOD) % MEALS.length;
  const meal = MEALS[mi];
  const u = t % MEAL_PERIOD;
  pc.clear(0);

  // assiette
  pc.ellipse(36, 39, 30, 6.5, TABLE);
  pc.ellipse(36, 36, 29, 8, PLATE_SH);
  pc.ellipse(36, 35, 29, 7.5, PLATE);
  pc.ellipse(36, 35, 22, 5.5, PLATE_IN);

  const fade = u > 5.7 ? 1 - clamp((u - 5.7) / 0.8) : 1;
  meal.items.forEach(([key, x, y], i) => {
    const sp = S[key];
    const h = sp.rows.length;
    const start = 0.25 + i * 0.42;
    const local = u - start;
    if (local < 0) return;
    const fall = 0.42;
    let yy: number;
    if (local < fall) {
      const k = local / fall;
      yy = -h + (y - h + 2 + h) * k * k; // chute accélérée
    } else {
      const b = local - fall;
      yy = y - h + 2 - (b < 0.22 ? Math.sin((b / 0.22) * Math.PI) * 2.2 : 0);
    }
    pc.sprite(sp.rows, sp.pal, x - Math.floor(sp.rows[0].length / 2), Math.round(yy), { reveal: fade, seed: i + 1 });

    // vapeur
    if (sp.hot && local > fall + 0.3 && fade === 1) {
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.9 + k * 0.33) % 1;
        const sx = x - 3 + k * 3 + Math.round(Math.sin(t * 3 + k) * 0.8);
        const sy = y - h - 1 - ph * 8;
        if (noise(k, Math.floor(t * 6)) > 0.25) pc.px(sx, sy, STEAM);
      }
    }
  });

  // étincelles quand le repas est complet
  const done = 0.25 + meal.items.length * 0.42 + 0.3;
  if (u > done && u < done + 0.8) {
    const k = (u - done) / 0.8;
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * Math.PI * 2;
      const r = 14 + k * 16;
      if (noise(s, 3) > 0.2) pc.px(36 + Math.cos(a) * r * 1.6, 26 + Math.sin(a) * r * 0.6, SPARK);
    }
  }
}

export function mealAt(t: number) {
  return MEALS[Math.floor(t / MEAL_PERIOD) % MEALS.length];
}
