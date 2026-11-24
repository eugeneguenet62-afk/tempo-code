// Mouvements de la bibliothèque d'exercices, en pixel art (poses sur 48 × 48, dessin sur 96 × 96, vue de profil).
// Chaque mouvement = 2 à 4 poses clés interpolées en boucle, un décor (banc, barre, poulie…)
// et un matériel tenu en main (barre, haltère, kettlebell, câble…).
import { PixelCanvas, ease, hex, lerp, mix } from "./canvas";
import type { Color } from "./canvas";
import { C, cycle, mixP } from "./athlete";
import type { P, Pose } from "./athlete";

type Limbs = Pose & { el2?: P; wr2?: P; kn2?: P; an2?: P };
type Scene =
  | "floor" | "bench" | "incline" | "lowbench" | "rearbench" | "pullbar" | "dips" | "seat"
  | "box" | "wall" | "legpress" | "rower" | "bike" | "sled" | "step" | "mat";
type Gear = "none" | "bar" | "db" | "kb" | "ball" | "wheel" | "plate" | "rope" | "wave" | "handle";
type Move = { keys: Limbs[]; period: number; scene?: Scene; gear?: Gear; size?: number; cable?: P; behind?: boolean; hold?: boolean; skip?: "farleg" };

/** Pose en 14 nombres : tête, épaule, coude, poignet, hanche, genou, cheville (x, y). */
function q(n: number[], far: Partial<Record<"el2" | "wr2" | "kn2" | "an2", P>> = {}): Limbs {
  const pt = (i: number): P => [n[i], n[i + 1]];
  return { head: pt(0), sh: pt(2), el: pt(4), wr: pt(6), hip: pt(8), kn: pt(10), an: pt(12), ...far };
}

// Poses de base réutilisées
const STAND = [25, 10, 24, 15, 24, 22, 25, 29, 23, 27, 24, 35, 24, 43];
const at = (base: number[], patch: Record<number, number>) => base.map((v, i) => (i in patch ? patch[i] : v));
// indices : 0-1 tête, 2-3 épaule, 4-5 coude, 6-7 poignet, 8-9 hanche, 10-11 genou, 12-13 cheville
const SQ_LOW = [25, 20, 22, 25, 18, 28, 21, 24, 18, 36, 26, 35, 24, 43];
const HINGE = [33, 19, 29, 22, 29, 29, 29, 36, 18, 27, 25, 35, 24, 43];
const BENCH_UP = [8, 29, 13, 31, 13, 23, 13, 16, 25, 31, 32, 35, 33, 43];
const BENCH_DN = at(BENCH_UP, { 4: 19, 5: 29, 6: 15, 7: 24 });
const PLANK_UP = [38, 28, 33, 31, 33, 38, 33, 45, 19, 36, 12, 40, 5, 43];
const SUPINE = [6, 39, 10, 42, 15, 43, 20, 43, 22, 42, 30, 42, 38, 42];
const SEATED = [23, 13, 22, 18, 22, 25, 24, 31, 21, 31, 29, 31, 30, 43];
const PULL_HANG = [26, 12, 24, 16, 24, 11, 24, 6, 23, 28, 24, 35, 24, 42];

const M = {
  /* ---------- Pousser ---------- */
  bench: { period: 2.4, scene: "bench", gear: "bar", size: 4.5, keys: [q(BENCH_UP), q(BENCH_DN)] },
  dbbench: { period: 2.4, scene: "bench", gear: "db", keys: [q(BENCH_UP), q(BENCH_DN)] },
  incline: {
    period: 2.4, scene: "incline", gear: "bar", size: 4,
    keys: [q([10, 20, 14, 24, 16, 17, 18, 10, 24, 32, 31, 33, 32, 43]), q([10, 20, 14, 24, 13, 30, 18, 22, 24, 32, 31, 33, 32, 43])],
  },
  dbincline: {
    period: 2.4, scene: "incline", gear: "db",
    keys: [q([10, 20, 14, 24, 16, 17, 18, 10, 24, 32, 31, 33, 32, 43]), q([10, 20, 14, 24, 13, 30, 18, 22, 24, 32, 31, 33, 32, 43])],
  },
  fly: { period: 2.6, scene: "bench", gear: "db", keys: [q(BENCH_UP), q(at(BENCH_UP, { 4: 17, 5: 27, 6: 19, 7: 31 }))] },
  floorpress: { period: 2.4, scene: "mat", gear: "db", keys: [q(at(SUPINE, { 4: 10, 5: 34, 6: 10, 7: 27, 10: 28, 11: 35, 12: 33 })), q(at(SUPINE, { 4: 15, 5: 42, 6: 12, 7: 36, 10: 28, 11: 35, 12: 33 }))] },
  cablefly: {
    period: 2.6, gear: "handle", cable: [6, 10],
    keys: [q(at(STAND, { 4: 20, 5: 19, 6: 16, 7: 16 })), q(at(STAND, { 4: 30, 5: 19, 6: 35, 7: 23 }))],
  },
  pushup: { period: 2.2, keys: [q(PLANK_UP), q([38, 34, 33, 37, 27, 40, 33, 45, 19, 39, 12, 41, 5, 43])] },
  pike: { period: 2.4, keys: [q([33, 38, 31, 33, 32, 39, 33, 45, 21, 23, 15, 33, 9, 43]), q([35, 42, 32, 37, 27, 39, 33, 45, 21, 26, 15, 34, 9, 43])] },
  hspu: {
    period: 2.6, scene: "wall",
    keys: [q([24, 38, 24, 33, 24, 39, 24, 45, 24, 21, 24, 13, 23, 5]), q([25, 42, 24, 37, 19, 40, 24, 45, 24, 25, 24, 17, 23, 9])],
  },
  dips: {
    period: 2.4, scene: "dips",
    keys: [q([25, 6, 24, 11, 24, 16, 24, 21, 23, 23, 26, 30, 21, 34]), q([26, 13, 25, 18, 18, 17, 24, 21, 22, 29, 26, 36, 21, 40])],
  },
  benchdips: {
    period: 2.4, scene: "lowbench",
    keys: [q([17, 16, 15, 21, 14, 26, 13, 31, 17, 32, 27, 33, 34, 43]), q([18, 22, 16, 27, 9, 27, 13, 31, 18, 38, 27, 36, 34, 43])],
  },
  ohp: { period: 2.4, gear: "bar", size: 3.5, keys: [q(at(STAND, { 4: 27, 5: 20, 6: 27, 7: 13 })), q(at(STAND, { 0: 24, 4: 25, 5: 9, 6: 25, 7: 3 }))] },
  dbohp: {
    period: 2.4, scene: "seat", gear: "db",
    keys: [q(at(SEATED, { 4: 26, 5: 24, 6: 26, 7: 17 })), q(at(SEATED, { 4: 24, 5: 11, 6: 24, 7: 4 }))],
  },
  pushpress: {
    period: 2.2, gear: "bar", size: 3.5,
    keys: [q(at(STAND, { 4: 27, 5: 20, 6: 27, 7: 13 })), q(at(STAND, { 0: 25, 1: 13, 2: 24, 3: 18, 4: 27, 5: 23, 6: 27, 7: 16, 8: 21, 9: 30, 10: 26, 11: 36 })), q(at(STAND, { 0: 24, 4: 25, 5: 9, 6: 25, 7: 3 }))],
  },
  raise: { period: 2.4, gear: "db", keys: [q(STAND), q(at(STAND, { 4: 30, 5: 17, 6: 36, 7: 17 }))] },
  cableraise: { period: 2.4, gear: "handle", cable: [16, 44], keys: [q(STAND), q(at(STAND, { 4: 30, 5: 17, 6: 36, 7: 17 }))] },
  reardelt: { period: 2.4, gear: "db", keys: [q(at(HINGE, { 4: 29, 5: 29, 6: 30, 7: 35 })), q(at(HINGE, { 4: 23, 5: 20, 6: 19, 7: 23 }))] },
  facepull: { period: 2.4, gear: "handle", cable: [45, 13], keys: [q(at(STAND, { 4: 30, 5: 17, 6: 36, 7: 15 })), q(at(STAND, { 4: 18, 5: 15, 6: 25, 7: 11 }))] },
  pallof: { period: 2.6, gear: "handle", cable: [3, 21], keys: [q(at(STAND, { 4: 22, 5: 22, 6: 27, 7: 20 })), q(at(STAND, { 4: 30, 5: 20, 6: 36, 7: 20 }))] },
  woodchop: {
    period: 2.4, gear: "handle", cable: [6, 4],
    keys: [q(at(STAND, { 4: 20, 5: 11, 6: 15, 7: 8 })), q(at(STAND, { 0: 27, 1: 12, 2: 26, 3: 17, 4: 30, 5: 23, 6: 34, 7: 29 }))],
  },
  svend: { period: 2.4, gear: "plate", keys: [q(at(STAND, { 4: 21, 5: 21, 6: 27, 7: 20 })), q(at(STAND, { 4: 30, 5: 19, 6: 36, 7: 19 }))] },

  /* ---------- Tirer ---------- */
  pullup: { period: 2.6, scene: "pullbar", keys: [q(PULL_HANG), q([26, 3, 24, 9, 20, 12, 24, 6, 23, 21, 26, 28, 22, 34])] },
  hang: { period: 3, scene: "pullbar", hold: true, keys: [q(PULL_HANG), q(at(PULL_HANG, { 1: 13, 3: 17, 9: 29, 11: 36, 13: 43 }))] },
  latpull: {
    period: 2.4, scene: "seat", gear: "handle", cable: [27, 0],
    keys: [q(at(SEATED, { 4: 25, 5: 11, 6: 26, 7: 5 })), q(at(SEATED, { 4: 19, 5: 24, 6: 24, 7: 17 }))],
  },
  straightarm: {
    period: 2.4, gear: "handle", cable: [42, 1],
    keys: [q(at(STAND, { 0: 27, 2: 25, 4: 31, 5: 11, 6: 36, 7: 7 })), q(at(STAND, { 0: 27, 2: 25, 4: 28, 5: 22, 6: 29, 7: 29 }))],
  },
  cablerow: {
    period: 2.4, scene: "mat", gear: "handle", cable: [46, 38],
    keys: [q([19, 19, 17, 24, 23, 28, 29, 30, 16, 36, 24, 32, 31, 40]), q([16, 19, 16, 24, 11, 28, 19, 30, 16, 36, 24, 32, 31, 40])],
  },
  row: { period: 2.4, gear: "bar", size: 4, keys: [q(HINGE), q(at(HINGE, { 4: 24, 5: 19, 6: 27, 7: 27 }))] },
  dbrow: { period: 2.4, scene: "lowbench", gear: "db", keys: [q(at(HINGE, { 0: 13, 1: 22, 2: 17, 3: 26, 4: 22, 5: 32, 6: 22, 7: 39, 8: 29, 9: 28, 10: 30, 11: 36, 12: 31, 13: 43 })), q(at(HINGE, { 0: 13, 1: 22, 2: 17, 3: 26, 4: 25, 5: 22, 6: 23, 7: 30, 8: 29, 9: 28, 10: 30, 11: 36, 12: 31, 13: 43 }))] },
  invrow: {
    period: 2.4, scene: "pullbar",
    keys: [q([36, 36, 32, 34, 32, 26, 33, 18, 20, 38, 12, 41, 5, 43]), q([35, 23, 31, 25, 24, 24, 31, 18, 19, 34, 12, 39, 5, 43])],
  },
  pullover: { period: 2.6, scene: "bench", gear: "db", keys: [q(at(BENCH_UP, { 4: 7, 5: 29, 6: 2, 7: 26 })), q(BENCH_UP)] },
  shrug: { period: 1.8, gear: "db", keys: [q(STAND), q(at(STAND, { 3: 13, 5: 20, 7: 27 }))] },
  upright: { period: 2.4, gear: "bar", size: 3.5, keys: [q(STAND), q(at(STAND, { 4: 21, 5: 14, 6: 27, 7: 15 }))] },
  deadlift: { period: 2.8, gear: "bar", size: 4.5, keys: [q([32, 20, 29, 24, 29, 31, 28, 38, 21, 31, 28, 36, 24, 43]), q(at(STAND, { 4: 25, 5: 23, 6: 25, 7: 30 }))] },
  rdl: { period: 2.8, gear: "bar", size: 4.5, keys: [q(at(STAND, { 4: 25, 5: 23, 6: 25, 7: 30 })), q([35, 23, 31, 25, 30, 32, 30, 38, 17, 26, 26, 35, 24, 43])] },
  dbrdl: { period: 2.8, gear: "db", keys: [q(at(STAND, { 4: 25, 5: 23, 6: 25, 7: 30 })), q([35, 23, 31, 25, 30, 32, 30, 38, 17, 26, 26, 35, 24, 43])] },
  sldl: {
    period: 2.8, gear: "db",
    keys: [q(at(STAND, { 4: 25, 5: 23, 6: 25, 7: 30 })), q([36, 26, 32, 27, 32, 34, 32, 40, 21, 27, 23, 35, 24, 43], { kn2: [14, 29], an2: [7, 29] })],
  },
  rack: { period: 2.4, gear: "bar", size: 4.5, keys: [q([30, 15, 28, 19, 28, 26, 27, 32, 22, 29, 26, 36, 24, 43]), q(at(STAND, { 4: 25, 5: 23, 6: 25, 7: 30 }))] },
  goodmorning: { period: 2.6, gear: "bar", size: 4, behind: true, keys: [q(at(STAND, { 4: 19, 5: 18, 6: 22, 7: 14 })), q(at(HINGE, { 4: 24, 5: 25, 6: 27, 7: 21 }))] },
  swing: { period: 1.6, gear: "kb", keys: [q([32, 19, 28, 22, 27, 29, 24, 35, 18, 27, 25, 34, 24, 43]), q(at(STAND, { 4: 30, 5: 18, 6: 36, 7: 19 }))] },

  /* ---------- Bras ---------- */
  curl: { period: 2.2, gear: "bar", size: 3, keys: [q(at(STAND, { 6: 26, 7: 29 })), q(at(STAND, { 6: 29, 7: 17 }))] },
  dbcurl: { period: 2.2, gear: "db", keys: [q(at(STAND, { 6: 26, 7: 29 })), q(at(STAND, { 6: 29, 7: 17 }))] },
  cablecurl: { period: 2.2, gear: "handle", cable: [38, 44], keys: [q(at(STAND, { 6: 26, 7: 29 })), q(at(STAND, { 6: 29, 7: 17 }))] },
  seatcurl: { period: 2.2, scene: "seat", gear: "db", keys: [q(at(SEATED, { 4: 23, 5: 25, 6: 30, 7: 28 })), q(at(SEATED, { 4: 23, 5: 25, 6: 27, 7: 18 }))] },
  wrist: { period: 1.6, scene: "seat", gear: "bar", size: 2.5, keys: [q(at(SEATED, { 4: 23, 5: 27, 6: 31, 7: 29 })), q(at(SEATED, { 4: 23, 5: 27, 6: 31, 7: 26 }))] },
  pushdown: { period: 2.2, gear: "handle", cable: [33, 0], keys: [q(at(STAND, { 6: 30, 7: 18 })), q(at(STAND, { 6: 27, 7: 29 }))] },
  overhead: { period: 2.4, gear: "db", keys: [q(at(STAND, { 4: 25, 5: 8, 6: 19, 7: 12 })), q(at(STAND, { 4: 25, 5: 8, 6: 26, 7: 1 }))] },
  skull: { period: 2.4, scene: "bench", gear: "bar", size: 3, keys: [q(at(BENCH_UP, { 4: 15, 5: 23, 6: 15, 7: 16 })), q(at(BENCH_UP, { 4: 15, 5: 23, 6: 9, 7: 25 }))] },
  kickback: { period: 2.2, gear: "db", keys: [q(at(HINGE, { 4: 24, 5: 25, 6: 25, 7: 32 })), q(at(HINGE, { 4: 24, 5: 25, 6: 17, 7: 26 }))] },

  /* ---------- Abdos, gainage ---------- */
  plank: { period: 3, hold: true, keys: [q([38, 34, 33, 36, 33, 43, 38, 43, 20, 38, 12, 40, 5, 43]), q([38, 33, 33, 35, 33, 43, 38, 43, 20, 37, 12, 40, 5, 43])] },
  sideplank: { period: 3, hold: true, keys: [q([37, 29, 33, 32, 32, 38, 33, 44, 20, 37, 12, 40, 5, 43]), q([37, 28, 33, 31, 32, 38, 33, 44, 20, 36, 12, 40, 5, 43])] },
  copenhague: { period: 3, hold: true, scene: "rearbench", keys: [q([37, 30, 33, 33, 32, 39, 33, 45, 21, 36, 13, 34, 6, 32]), q([37, 29, 33, 32, 32, 39, 33, 45, 21, 35, 13, 34, 6, 32])] },
  hollow: { period: 3, hold: true, scene: "mat", keys: [q([8, 37, 11, 40, 6, 38, 1, 36, 22, 43, 30, 42, 38, 39]), q([8, 38, 11, 41, 6, 39, 1, 37, 22, 43, 30, 42, 38, 40])] },
  crunch: {
    period: 2.2, scene: "mat",
    keys: [q([5, 40, 9, 42, 13, 40, 15, 39, 20, 42, 28, 35, 34, 43]), q([9, 33, 12, 36, 15, 36, 17, 37, 20, 42, 28, 35, 34, 43])],
  },
  cablecrunch: {
    period: 2.2, gear: "handle", cable: [30, 0],
    keys: [q([27, 13, 25, 19, 27, 13, 26, 9, 20, 31, 22, 39, 13, 43]), q([33, 27, 30, 27, 32, 22, 31, 19, 20, 31, 22, 39, 13, 43])],
  },
  hangraise: { period: 2.4, scene: "pullbar", keys: [q(PULL_HANG), q(at(PULL_HANG, { 10: 31, 11: 26, 12: 38, 13: 24 }))] },
  kneeraise: { period: 2.4, scene: "pullbar", keys: [q(PULL_HANG), q(at(PULL_HANG, { 10: 31, 11: 25, 12: 30, 13: 33 }))] },
  legraise: { period: 2.6, scene: "mat", keys: [q(SUPINE), q(at(SUPINE, { 10: 28, 11: 35, 12: 32, 13: 28 }))] },
  deadbug: {
    period: 2.4, scene: "mat",
    keys: [
      q([6, 39, 10, 42, 11, 35, 11, 29, 22, 42, 24, 35, 31, 35], { el2: [11, 35], wr2: [11, 29], kn2: [24, 35], an2: [31, 35] }),
      q([6, 39, 10, 42, 5, 39, 1, 37, 22, 42, 30, 41, 37, 40], { el2: [11, 35], wr2: [11, 29], kn2: [24, 35], an2: [31, 35] }),
    ],
  },
  wheel: {
    period: 2.8, gear: "wheel",
    keys: [q([30, 22, 26, 26, 27, 33, 28, 40, 16, 32, 12, 43, 4, 43]), q([39, 34, 34, 36, 38, 39, 42, 41, 20, 38, 12, 43, 4, 43])],
  },
  twist: {
    period: 1.8, scene: "mat", gear: "plate",
    keys: [q([13, 26, 14, 31, 19, 35, 24, 33, 20, 42, 28, 34, 35, 37]), q([13, 26, 14, 31, 16, 37, 18, 41, 20, 42, 28, 34, 35, 37])],
  },
  climber: {
    period: 0.9,
    keys: [
      q(at(PLANK_UP, { 10: 27, 11: 38, 12: 21, 13: 42 }), { kn2: [12, 40], an2: [5, 43] }),
      q(PLANK_UP, { kn2: [27, 38], an2: [21, 42] }),
    ],
  },
  dragon: {
    period: 2.8, scene: "bench",
    keys: [q([6, 30, 10, 31, 6, 26, 4, 31, 18, 22, 24, 14, 30, 7]), q([6, 30, 10, 31, 6, 26, 4, 31, 19, 29, 27, 27, 35, 25])],
  },
  superman: {
    period: 2.4, scene: "mat",
    keys: [q([38, 40, 34, 42, 40, 42, 45, 42, 22, 43, 14, 43, 6, 43]), q([38, 36, 33, 39, 39, 37, 44, 35, 22, 43, 14, 41, 6, 38])],
  },
  birddog: {
    period: 2.6, scene: "mat",
    keys: [
      q([37, 30, 32, 33, 32, 39, 32, 45, 18, 33, 18, 41, 10, 43], { kn2: [18, 41], an2: [10, 43] }),
      q([37, 30, 32, 33, 38, 31, 44, 30, 18, 33, 18, 41, 10, 43], { el2: [32, 39], wr2: [32, 45], kn2: [10, 33], an2: [3, 33] }),
    ],
  },

  /* ---------- Jambes ---------- */
  squat: { period: 2.6, gear: "bar", size: 4.5, behind: true, keys: [q(at(STAND, { 4: 19, 5: 18, 6: 22, 7: 14 })), q(SQ_LOW)] },
  frontsquat: { period: 2.6, gear: "bar", size: 4.5, keys: [q(at(STAND, { 4: 29, 5: 18, 6: 27, 7: 14 })), q(at(SQ_LOW, { 4: 27, 5: 28, 6: 25, 7: 24 }))] },
  goblet: { period: 2.6, gear: "kb", keys: [q(at(STAND, { 4: 26, 5: 21, 6: 28, 7: 17 })), q(at(SQ_LOW, { 4: 24, 5: 30, 6: 26, 7: 26 }))] },
  jumpsquat: {
    period: 1.4,
    keys: [q(at(SQ_LOW, { 4: 21, 5: 31, 6: 27, 7: 31 })), q([25, 4, 24, 9, 27, 4, 29, -1, 23, 21, 24, 29, 23, 37])],
  },
  wallsit: { period: 3, hold: true, scene: "wall", keys: [q([14, 17, 13, 22, 16, 28, 20, 31, 13, 33, 22, 33, 22, 43]), q([14, 18, 13, 23, 16, 29, 20, 32, 13, 33, 22, 33, 22, 43])] },
  legpress: {
    period: 2.4, scene: "legpress",
    keys: [q([5, 22, 7, 27, 11, 33, 15, 37, 14, 36, 22, 25, 29, 31]), q([5, 22, 7, 27, 11, 33, 15, 37, 14, 36, 23, 30, 32, 24])],
  },
  legext: { period: 2.2, scene: "seat", keys: [q(at(SEATED, { 4: 20, 5: 25, 6: 22, 7: 31, 12: 29, 13: 39 })), q(at(SEATED, { 4: 20, 5: 25, 6: 22, 7: 31, 12: 37, 13: 30 }))] },
  legcurl: {
    period: 2.2, scene: "bench",
    keys: [q([37, 28, 33, 31, 36, 35, 38, 34, 21, 31, 13, 31, 5, 31]), q([37, 28, 33, 31, 36, 35, 38, 34, 21, 31, 13, 31, 10, 23])],
  },
  lunge: {
    period: 2.6, gear: "db",
    keys: [q(STAND), q([25, 16, 24, 21, 24, 28, 25, 34, 22, 33, 30, 34, 29, 43], { kn2: [17, 41], an2: [10, 43] })],
  },
  bulgarian: {
    period: 2.6, scene: "rearbench", gear: "db",
    keys: [q([27, 10, 26, 15, 26, 22, 27, 29, 24, 27, 28, 35, 28, 43], { kn2: [17, 31], an2: [8, 31] }), q([27, 16, 26, 21, 26, 28, 27, 34, 23, 33, 31, 34, 28, 43], { kn2: [16, 40], an2: [8, 31] })],
  },
  sidelunge: { period: 2.6, gear: "kb", keys: [q(STAND), q(at(SQ_LOW, { 4: 25, 5: 31, 6: 27, 7: 36 }), { kn2: [24, 35], an2: [16, 43] })] },
  stepup: {
    period: 2.6, scene: "box", gear: "db",
    keys: [q([26, 12, 25, 17, 25, 24, 26, 31, 23, 29, 31, 30, 31, 36], { kn2: [23, 37], an2: [21, 43] }), q([30, 4, 29, 9, 29, 16, 30, 23, 28, 21, 30, 28, 31, 36], { kn2: [27, 29], an2: [25, 35] })],
  },
  pistol: {
    period: 2.8,
    keys: [q(at(STAND, { 4: 29, 5: 19, 6: 35, 7: 18 }), { kn2: [28, 33], an2: [32, 40] }), q([27, 23, 25, 28, 31, 28, 37, 27, 19, 37, 27, 35, 24, 43], { kn2: [27, 36], an2: [35, 36] })],
  },
  sissy: { period: 2.6, keys: [q(STAND), q([20, 18, 20, 23, 25, 27, 30, 26, 22, 33, 31, 37, 25, 43])] },
  hipthrust: {
    period: 2.4, scene: "lowbench", gear: "bar", size: 4.5,
    keys: [q([8, 27, 12, 30, 17, 35, 22, 34, 22, 38, 29, 34, 30, 43]), q([8, 27, 12, 30, 17, 30, 22, 26, 22, 30, 30, 31, 30, 43])],
  },
  bridge: {
    period: 2.2, scene: "mat",
    keys: [q([6, 40, 10, 42, 14, 43, 18, 43, 21, 42, 28, 34, 32, 43]), q([6, 40, 10, 42, 14, 43, 18, 43, 21, 36, 29, 33, 32, 43])],
  },
  bridge1: {
    period: 2.2, scene: "mat",
    keys: [q([6, 40, 10, 42, 14, 43, 18, 43, 21, 42, 28, 34, 32, 43], { kn2: [28, 34], an2: [35, 30] }), q([6, 40, 10, 42, 14, 43, 18, 43, 21, 36, 29, 33, 32, 43], { kn2: [29, 33], an2: [37, 31] })],
  },
  glutekick: { period: 2.2, gear: "handle", cable: [6, 44], keys: [q(at(STAND, { 0: 27, 2: 26, 4: 31, 5: 19, 6: 36, 7: 18 })), q(at(STAND, { 0: 27, 2: 26, 4: 31, 5: 19, 6: 36, 7: 18, 10: 17, 11: 33, 12: 11, 13: 36 }))] },
  abduction: {
    period: 2.2, scene: "mat",
    keys: [q([6, 38, 10, 40, 8, 44, 13, 44, 22, 41, 30, 41, 38, 42]), q([6, 38, 10, 40, 8, 44, 13, 44, 22, 41, 29, 37, 37, 33], { kn2: [30, 41], an2: [38, 42] })],
  },
  calf: { period: 1.8, scene: "step", gear: "db", keys: [q(STAND), q(at(STAND, { 1: 7, 3: 12, 5: 19, 7: 26, 9: 24, 11: 32, 13: 40 }))] },
  seatcalf: { period: 1.8, scene: "seat", keys: [q(at(SEATED, { 4: 23, 5: 25, 6: 28, 7: 30 })), q(at(SEATED, { 1: 11, 3: 16, 4: 23, 5: 23, 6: 28, 7: 28, 9: 29, 11: 28, 13: 40 }))] },
  nordic: {
    period: 3, scene: "mat",
    keys: [q([18, 18, 17, 23, 19, 28, 22, 27, 16, 35, 16, 43, 8, 43]), q([37, 30, 33, 32, 34, 37, 37, 41, 23, 38, 16, 43, 8, 43])],
  },
  farmer: {
    period: 1.2, gear: "kb",
    keys: [q(STAND, { kn2: [22, 35], an2: [18, 42] }), q(at(STAND, { 10: 26, 11: 34, 12: 30, 13: 42 }), { kn2: [24, 35], an2: [24, 43] })],
  },

  /* ---------- Corps entier, cardio ---------- */
  clean: {
    period: 2.8, gear: "bar", size: 4.5,
    keys: [q([32, 20, 29, 24, 29, 31, 28, 38, 21, 31, 28, 36, 24, 43]), q(at(STAND, { 4: 25, 5: 23, 6: 25, 7: 30 })), q(at(STAND, { 4: 29, 5: 18, 6: 27, 7: 14 }))],
  },
  jerk: {
    period: 3.2, gear: "bar", size: 4.5,
    keys: [q([32, 20, 29, 24, 29, 31, 28, 38, 21, 31, 28, 36, 24, 43]), q(at(STAND, { 4: 29, 5: 18, 6: 27, 7: 14 })), q(at(STAND, { 0: 24, 4: 25, 5: 9, 6: 25, 7: 3 }))],
  },
  snatch: {
    period: 2.8, gear: "bar", size: 4.5,
    keys: [q([32, 20, 29, 24, 29, 31, 28, 38, 21, 31, 28, 36, 24, 43]), q(at(STAND, { 4: 25, 5: 23, 6: 25, 7: 30 })), q(at(STAND, { 0: 24, 4: 22, 5: 9, 6: 21, 7: 3 }))],
  },
  kbsnatch: {
    period: 2.4, gear: "kb",
    keys: [q([32, 19, 28, 22, 27, 29, 24, 35, 18, 27, 25, 34, 24, 43]), q(at(STAND, { 0: 24, 4: 25, 5: 9, 6: 25, 7: 3 }))],
  },
  thruster: { period: 2.6, gear: "bar", size: 4, keys: [q(at(SQ_LOW, { 4: 27, 5: 28, 6: 25, 7: 24 })), q(at(STAND, { 0: 24, 4: 25, 5: 9, 6: 25, 7: 3 }))] },
  wallball: { period: 2.2, gear: "ball", keys: [q(at(SQ_LOW, { 4: 25, 5: 29, 6: 26, 7: 24 })), q(at(STAND, { 0: 24, 4: 27, 5: 9, 6: 27, 7: 3 }))] },
  getup: {
    period: 4.2, gear: "kb",
    keys: [
      q([6, 40, 10, 42, 10, 35, 10, 28, 22, 42, 28, 35, 32, 43]),
      q([16, 27, 17, 32, 18, 25, 18, 18, 24, 42, 30, 36, 34, 43]),
      q([24, 14, 23, 19, 23, 12, 23, 5, 22, 31, 29, 33, 29, 43], { kn2: [21, 43], an2: [13, 43] }),
      q(at(STAND, { 4: 24, 5: 8, 6: 24, 7: 1 })),
    ],
  },
  burpee: {
    period: 2.4,
    keys: [
      q([25, 5, 24, 10, 26, 4, 27, -2, 23, 22, 24, 30, 24, 38]),
      q([30, 26, 27, 30, 30, 37, 31, 45, 19, 37, 27, 36, 24, 43]),
      q(PLANK_UP),
    ],
  },
  sled: {
    period: 1, scene: "sled",
    keys: [
      q([33, 18, 29, 22, 34, 24, 39, 22, 18, 30, 25, 37, 22, 43], { kn2: [17, 37], an2: [9, 42] }),
      q([33, 18, 29, 22, 34, 24, 39, 22, 18, 30, 17, 37, 9, 42], { kn2: [25, 37], an2: [22, 43] }),
    ],
  },
  battle: {
    period: 0.7, gear: "wave",
    keys: [q(at(SQ_LOW, { 0: 27, 1: 16, 2: 24, 3: 21, 4: 29, 5: 21, 6: 34, 7: 17, 8: 20, 9: 32, 10: 26, 11: 36 })), q(at(SQ_LOW, { 0: 27, 1: 16, 2: 24, 3: 21, 4: 29, 5: 28, 6: 34, 7: 32, 8: 20, 9: 32, 10: 26, 11: 36 }))],
  },
  rower: {
    period: 2, scene: "rower", gear: "handle", cable: [44, 33],
    keys: [q([28, 20, 25, 25, 30, 29, 36, 32, 18, 38, 26, 28, 33, 38]), q([15, 22, 16, 27, 13, 32, 20, 31, 22, 38, 30, 36, 38, 38])],
  },
  bike: {
    period: 0.8, scene: "bike",
    keys: [
      q([30, 11, 27, 16, 31, 20, 35, 23, 18, 25, 27, 28, 23, 37], { kn2: [24, 31], an2: [21, 39] }),
      q([30, 11, 27, 16, 31, 20, 35, 23, 18, 25, 24, 31, 21, 39], { kn2: [27, 28], an2: [23, 37] }),
    ],
  },
  rope: {
    period: 0.6, gear: "rope",
    keys: [q(at(STAND, { 4: 22, 5: 22, 6: 28, 7: 27 })), q(at(STAND, { 1: 7, 3: 12, 4: 22, 5: 19, 6: 28, 7: 24, 9: 24, 11: 32, 13: 40 }))],
  },
  jog: { period: 0.9, keys: [q(STAND, { kn2: [21, 35], an2: [16, 41] }), q(at(STAND, { 10: 28, 11: 33, 12: 24, 13: 40 }))] },
} satisfies Record<string, Move>;

export type MoveId = keyof typeof M;
export const MOVES: Record<MoveId, Move> = M;

/* ---------- Choix du mouvement pour un exercice ---------- */

const BY_NAME: Record<string, MoveId> = {
  "Développé couché": "bench", "Développé couché haltères": "dbbench", "Développé incliné barre": "incline",
  "Développé incliné haltères": "dbincline", "Développé décliné": "bench", "Développé couché prise serrée": "bench",
  "Développé couché Smith": "bench", "Développé machine convergente": "dbbench", "Développé sol haltères": "floorpress",
  "Écarté couché haltères": "fly", "Écarté incliné haltères": "fly", "Écarté poulie": "cablefly", "Écarté poulie basse": "cablefly",
  "Pec deck": "cablefly", "Pompes": "pushup", "Pompes lestées": "pushup", "Pompes déclinées": "pushup", "Pompes diamant": "pushup",
  "Dips buste penché": "dips", "Pull-over haltère": "pullover", "Svend press": "svend",
  "Tractions": "pullup", "Tractions lestées": "pullup", "Tractions supination": "pullup", "Tractions prise neutre": "pullup",
  "Tractions assistées": "pullup", "Tirage vertical": "latpull", "Tirage vertical prise serrée": "latpull",
  "Tirage bras tendus": "straightarm", "Tirage horizontal": "cablerow", "Rowing barre": "row", "Rowing Pendlay": "row",
  "Rowing haltère un bras": "dbrow", "Rowing T-bar": "row", "Rowing poitrine appuyée": "dbrow", "Rowing machine": "cablerow",
  "Rowing inversé": "invrow", "Rowing Meadows": "row", "Seal row": "row", "Pull-over poulie": "straightarm",
  "Soulevé de terre": "deadlift", "Rack pull": "rack",
  "Shrugs barre": "shrug", "Shrugs haltères": "shrug", "Shrugs trap bar": "shrug", "Tirage menton": "upright",
  "Farmer walk": "farmer", "Y-raise incliné": "reardelt",
  "Extension lombaire": "superman", "Good morning": "goodmorning", "Superman": "superman", "Bird dog": "birddog",
  "Développé militaire": "ohp", "Développé haltères assis": "dbohp", "Développé Arnold": "dbohp",
  "Développé machine épaules": "dbohp", "Push press": "pushpress", "Landmine press": "ohp",
  "Élévations latérales": "raise", "Élévations latérales poulie": "cableraise", "Élévations latérales machine": "raise",
  "Élévations frontales": "raise", "Oiseau": "reardelt", "Reverse pec deck": "reardelt", "Face pull": "facepull",
  "Rotation externe poulie": "facepull", "Pompes piquées": "pike", "Pompes en équilibre": "hspu",
  "Curl barre": "curl", "Curl barre EZ": "curl", "Curl haltères": "dbcurl", "Curl marteau": "dbcurl", "Curl incliné": "seatcurl",
  "Curl pupitre": "seatcurl", "Curl concentré": "seatcurl", "Curl poulie": "cablecurl", "Curl araignée": "dbcurl",
  "Curl Bayesian": "cablecurl", "Curl machine": "seatcurl",
  "Dips": "dips", "Dips lestés": "dips", "Dips sur banc": "benchdips", "Barre au front": "skull",
  "Extension triceps poulie": "pushdown", "Extension triceps corde": "pushdown", "Extension nuque haltère": "overhead",
  "Extension nuque poulie": "overhead", "Kickback": "kickback", "Extension unilatérale poulie": "pushdown", "JM press": "skull",
  "Curl poignets": "wrist", "Curl poignets inversé": "wrist", "Curl inversé": "curl", "Suspension barre": "hang", "Pince disques": "farmer",
  "Crunch": "crunch", "Crunch poulie": "cablecrunch", "Crunch machine": "crunch", "Relevé de jambes suspendu": "hangraise",
  "Relevé de genoux chaise romaine": "kneeraise", "Relevé de jambes au sol": "legraise", "Gainage": "plank",
  "Gainage latéral": "sideplank", "Roue abdominale": "wheel", "Russian twist": "twist", "Pallof press": "pallof",
  "Bûcheron poulie": "woodchop", "Dead bug": "deadbug", "Hollow hold": "hollow", "Mountain climbers": "climber", "Dragon flag": "dragon",
  "Squat": "squat", "Squat avant": "frontsquat", "Squat Smith": "squat", "Squat gobelet": "goblet", "Hack squat": "squat",
  "Pendulum squat": "squat", "Presse à cuisses": "legpress", "Leg extension": "legext", "Fentes marchées": "lunge",
  "Fentes arrière": "lunge", "Fentes bulgares": "bulgarian", "Step-up": "stepup", "Sissy squat": "sissy", "Squat sauté": "jumpsquat",
  "Chaise": "wallsit", "Squat pistol": "pistol",
  "Soulevé de terre roumain": "rdl", "Soulevé de terre jambes tendues": "rdl", "Soulevé de terre roumain haltères": "dbrdl",
  "Soulevé de terre une jambe": "sldl", "Leg curl": "legcurl", "Leg curl assis": "legcurl", "Leg curl allongé": "legcurl",
  "Nordic curl": "nordic", "Glute ham raise": "nordic", "Kettlebell swing": "swing",
  "Hip thrust": "hipthrust", "Hip thrust machine": "hipthrust", "Pont fessier": "bridge", "Pont fessier une jambe": "bridge1",
  "Kickback poulie": "glutekick", "Abduction machine": "abduction", "Abduction élastique": "abduction",
  "Marche latérale élastique": "abduction", "Soulevé de terre sumo": "deadlift", "Soulevé de terre trap bar": "deadlift",
  "Frog pump": "bridge", "Reverse hyper": "superman", "Adduction machine": "abduction", "Copenhague": "copenhague",
  "Squat sumo haltère": "goblet", "Fente latérale": "sidelunge",
  "Mollets debout": "calf", "Mollets assis": "seatcalf", "Mollets presse": "legpress", "Mollets une jambe": "calf",
  "Mollets Smith": "calf", "Tibial raise": "calf",
  "Épaulé": "clean", "Épaulé-jeté": "jerk", "Arraché": "snatch", "Thruster": "thruster", "Burpees": "burpee",
  "Kettlebell snatch": "kbsnatch", "Turkish get-up": "getup", "Wall ball": "wallball", "Sled push": "sled",
  "Corde ondulatoire": "battle", "Rameur (fractionné)": "rower", "Assault bike": "bike", "Corde à sauter": "rope",
};

/** Mots-clés pour un exercice créé par l'utilisateur (ordre = priorité). */
const RULES: [RegExp, MoveId][] = [
  [/traction|chin|pull-?up/, "pullup"], [/tirage vertical|lat ?pull|pulldown/, "latpull"], [/tirage horizontal|rowing machine/, "cablerow"],
  [/rowing|row\b/, "row"], [/pull-?over/, "pullover"], [/face pull/, "facepull"],
  [/incliné/, "incline"], [/écarté|pec deck|fly/, "fly"], [/développé (militaire|épaules?)|militaire|overhead press|\bohp\b/, "ohp"],
  [/développé|bench|press/, "bench"], [/pompe|push-?up/, "pushup"], [/dips/, "dips"],
  [/élévation|raise latéral|oiseau/, "raise"], [/shrug/, "shrug"],
  [/curl (poignet|wrist)/, "wrist"], [/leg curl|ischio/, "legcurl"], [/nordic/, "nordic"], [/curl/, "dbcurl"],
  [/barre au front|skull/, "skull"], [/extension (triceps|poulie)|pushdown|triceps/, "pushdown"], [/extension nuque|french/, "overhead"],
  [/hip thrust/, "hipthrust"], [/pont|bridge/, "bridge"], [/roumain|rdl|jambes tendues/, "rdl"], [/soulevé|deadlift/, "deadlift"],
  [/swing/, "swing"], [/front squat|squat avant/, "frontsquat"], [/gobelet|goblet/, "goblet"], [/squat sauté|saut|jump/, "jumpsquat"],
  [/squat/, "squat"], [/presse|leg press/, "legpress"], [/leg extension/, "legext"], [/bulgare/, "bulgarian"], [/fente|lunge/, "lunge"],
  [/step/, "stepup"], [/chaise|wall sit/, "wallsit"], [/mollet|calf/, "calf"], [/gainage latéral|side plank/, "sideplank"],
  [/gainage|planche|plank/, "plank"], [/crunch|abdo/, "crunch"], [/relevé de jambes|leg raise/, "legraise"], [/twist|rotation/, "twist"],
  [/burpee/, "burpee"], [/épaulé|clean/, "clean"], [/arraché|snatch/, "snatch"], [/thruster/, "thruster"], [/corde à sauter|rope/, "rope"],
  [/rameur|aviron/, "rower"], [/vélo|bike|cycl/, "bike"], [/course|run|footing|jog/, "jog"], [/traîneau|sled/, "sled"],
  [/abduct|adduct/, "abduction"], [/lombaire|superman/, "superman"], [/farmer|marche/, "farmer"], [/suspension|hang/, "hang"],
];

const BY_MUSCLE: Record<string, MoveId> = {
  pecs: "bench", dos: "row", trapèzes: "shrug", lombaires: "superman", épaules: "ohp", biceps: "dbcurl", triceps: "pushdown",
  "avant-bras": "wrist", abdos: "crunch", quadriceps: "squat", ischios: "rdl", fessiers: "hipthrust", adducteurs: "abduction",
  mollets: "calf", "corps entier": "burpee", cardio: "jog",
};

export function moveFor(name: string, muscle = ""): MoveId {
  if (BY_NAME[name]) return BY_NAME[name];
  const n = name.toLowerCase();
  for (const [re, id] of RULES) if (re.test(n)) return id;
  return BY_MUSCLE[muscle.toLowerCase().trim()] ?? "squat";
}

function lerpPose(a: Limbs, b: Limbs, k: number): Limbs {
  const out = {} as Record<string, P>;
  for (const key of Object.keys(a) as (keyof Limbs)[]) {
    const pa = a[key] as P | undefined;
    const pb = (b[key] as P | undefined) ?? pa;
    if (pa && pb) out[key] = mixP(pa, pb, k);
  }
  for (const key of Object.keys(b) as (keyof Limbs)[]) if (!out[key]) out[key] = b[key] as P;
  return out as unknown as Limbs;
}

/** Pose à l'instant t : aller-retour pour 2 poses, enchaînement pour 3 ou plus. k = avancée de l'effort (0 à 1). */
function poseAt(m: Move, t: number): { p: Limbs; k: number } {
  const u = ((t / m.period) % 1 + 1) % 1;
  const n = m.keys.length;
  if (n === 2) {
    const k = m.hold ? 0.5 - 0.5 * Math.cos(u * Math.PI * 2) : cycle(u);
    return { p: lerpPose(m.keys[0], m.keys[1], k), k: m.hold ? 1 : k };
  }
  const f = u * n;
  const i = Math.floor(f);
  const local = f - i;
  const k = local < 0.7 ? ease(local / 0.7) : 1;
  return { p: lerpPose(m.keys[i], m.keys[(i + 1) % n], k), k: (i + k) / n };
}

/* ---------- Dessin (toile 96 × 96 : les poses, pensées sur 48, sont doublées) ---------- */

export const EX_SIZE = 96;
const K = 2;

const STEEL = hex("#5b6390");
const STEEL_D = hex("#353c6a");
const STEEL_L = hex("#cfd3e6");
const CABLE = hex("#8a90b0");
const PAD = hex("#454c78");
const INK = hex("#0a0b12");
const SKIN_S = hex("#d99a72");
const RED = hex("#ff3b3b");
const RED_D = hex("#c42a32");
const RED_2 = hex("#ff8a80");
const RED_2D = hex("#c9625e");
const SHOE_SOLE = hex("#9aa0c0");
// Tenue neutre ici : le rouge doit ressortir seul.
const SHIRT = hex("#b8bdd4");
const SHIRT_D = hex("#7d83a3");

/** Toile « à l'échelle 48 » pour les décors : coordonnées et rayons doublés. */
class Half {
  constructor(readonly pc: PixelCanvas) {}
  rect(x: number, y: number, w: number, h: number, c: Color) { this.pc.rect(x * K, y * K, w * K, h * K, c); }
  disc(x: number, y: number, r: number, c: Color) { this.pc.disc(x * K, y * K, r * K, c); }
  capsule(x1: number, y1: number, x2: number, y2: number, r: number, c: Color) { this.pc.capsule(x1 * K, y1 * K, x2 * K, y2 * K, r * K, c); }
  line(x1: number, y1: number, x2: number, y2: number, c: Color) { this.pc.capsule(x1 * K, y1 * K, x2 * K, y2 * K, 0.5, c); }
  px(x: number, y: number, c: Color) { this.pc.rect(x * K, y * K, K, K, c); }
}

type V = [number, number];
const S = (p: P): V => [p[0] * K, p[1] * K];
const add = (a: V, b: V, k = 1): V => [a[0] + b[0] * k, a[1] + b[1] * k];
const along = (a: V, b: V, t: number): V => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
function nrm(a: V, b: V): V {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [-dy / l, dx / l];
}

/* ---------- Muscles ---------- */

type Seg = "torso" | "upper" | "fore" | "thigh" | "shin";
type Zone = { seg: Seg; a0: number; a1: number; side: number; off: number; rr: number };
// side : +1 = devant du buste / arrière du bras, de la cuisse et du mollet (voir nrm) ; 0 = centré.
const ZONES: Record<string, Zone[]> = {
  pecs: [{ seg: "torso", a0: 0.56, a1: 0.9, side: 1, off: 0.42, rr: 0.58 }],
  abdos: [{ seg: "torso", a0: 0.14, a1: 0.56, side: 1, off: 0.45, rr: 0.5 }],
  dos: [{ seg: "torso", a0: 0.36, a1: 0.9, side: -1, off: 0.42, rr: 0.58 }],
  lombaires: [{ seg: "torso", a0: 0.08, a1: 0.38, side: -1, off: 0.45, rr: 0.5 }],
  trapèzes: [{ seg: "torso", a0: 0.86, a1: 1.05, side: -1, off: 0.3, rr: 0.6 }],
  fessiers: [{ seg: "torso", a0: -0.12, a1: 0.1, side: -1, off: 0.35, rr: 0.65 }],
  épaules: [{ seg: "upper", a0: 0.02, a1: 0.3, side: 0, off: 0, rr: 1.05 }],
  biceps: [{ seg: "upper", a0: 0.32, a1: 0.85, side: -1, off: 0.4, rr: 0.6 }],
  triceps: [{ seg: "upper", a0: 0.32, a1: 0.85, side: 1, off: 0.4, rr: 0.6 }],
  "avant-bras": [{ seg: "fore", a0: 0.08, a1: 0.7, side: 0, off: 0, rr: 0.85 }],
  quadriceps: [{ seg: "thigh", a0: 0.18, a1: 0.88, side: -1, off: 0.4, rr: 0.6 }],
  ischios: [{ seg: "thigh", a0: 0.18, a1: 0.88, side: 1, off: 0.4, rr: 0.6 }],
  adducteurs: [{ seg: "thigh", a0: 0.12, a1: 0.62, side: 0, off: 0, rr: 0.55 }],
  mollets: [{ seg: "shin", a0: 0.1, a1: 0.55, side: 1, off: 0.35, rr: 0.65 }],
};
const ALIAS: Record<string, string[]> = {
  "corps entier": ["quadriceps", "fessiers", "dos", "épaules"],
  obliques: ["abdos"], gainage: ["abdos"], trapèze: ["trapèzes"], pectoraux: ["pecs"], deltoïdes: ["épaules"], épaule: ["épaules"],
  "ischio-jambiers": ["ischios"], fessier: ["fessiers"], mollet: ["mollets"], quadri: ["quadriceps"], cuisses: ["quadriceps"],
};

export type Work = { main: string[]; sec: string[] };
type Lit = Map<Seg, { z: Zone; lvl: 1 | 2 }[]>;

function litFrom(work?: Work): Lit {
  const lit: Lit = new Map();
  if (!work) return lit;
  const put = (names: string[], lvl: 1 | 2) => {
    for (const raw of names) {
      const n = raw.toLowerCase().trim();
      for (const key of ALIAS[n] ?? [n])
        for (const z of ZONES[key] ?? []) {
          const list = lit.get(z.seg) ?? [];
          if (!list.some((x) => x.z === z)) list.push({ z, lvl });
          lit.set(z.seg, list);
        }
    }
  };
  put(work.main, 1);
  put(work.sec, 2);
  return lit;
}

/** Peint les muscles qui travaillent sur un segment, sans dépasser du membre. */
function paint(pc: PixelCanvas, lit: Lit, seg: Seg, a: V, b: V, R: number, far: boolean, strength: number) {
  const zs = lit.get(seg);
  if (!zs) return;
  const n = nrm(a, b);
  // le secondaire d'abord, le principal par-dessus
  for (const { z, lvl } of [...zs].sort((x, y) => y.lvl - x.lvl)) {
    const c1 = lvl === 1 ? (far ? RED_D : RED) : far ? RED_2D : RED_2;
    const c = strength < 1 && lvl === 1 ? mix(far ? RED_2D : RED_2, c1, strength) : c1;
    const o = n.map((v) => v * z.side * z.off * R) as V;
    const p0 = add(along(a, b, Math.max(-0.2, z.a0)), o);
    const p1 = add(along(a, b, Math.min(1.1, z.a1)), o);
    pc.capsule(p0[0], p0[1], p1[0], p1[1], Math.max(1, z.rr * R - 0.3), c);
  }
}

/* ---------- Athlète ---------- */

type Fig = { head: V; sh: V; el: V; wr: V; hip: V; kn: V; an: V };
const fig = (p: Limbs, far: boolean): Fig => ({
  head: S(p.head), sh: S(p.sh), hip: S(p.hip),
  el: S(far ? p.el2 ?? p.el : p.el), wr: S(far ? p.wr2 ?? p.wr : p.wr),
  kn: S(far ? p.kn2 ?? p.kn : p.kn), an: S(far ? p.an2 ?? p.an : p.an),
});

function drawLeg(pc: PixelCanvas, f: Fig, far: boolean, lit: Lit, k: number) {
  const o: V = far ? [-2, 0] : [0, 0];
  const hip = add(f.hip, o), kn = add(f.kn, o), an = add(f.an, o);
  const skin = far ? C.skinD : C.skin;
  pc.capsule(hip[0], hip[1], kn[0], kn[1], 4, skin);
  pc.capsule(kn[0], kn[1], an[0], an[1], 3, skin);
  // mollet un peu plus épais en haut
  const nb = nrm(kn, an);
  const cm = add(along(kn, an, 0.3), nb, 1);
  pc.disc(cm[0], cm[1], 3, skin);
  paint(pc, lit, "shin", kn, an, 3.2, far, k);
  // short
  const sh2 = along(hip, kn, 0.55);
  pc.capsule(hip[0], hip[1], sh2[0], sh2[1], 4.7, far ? C.shortD : C.short);
  paint(pc, lit, "thigh", hip, kn, 4.2, far, k);
  // chaussure, orientée vers l'avant du tibia
  const fwd: V = [-nb[0], -nb[1]];
  const toe = add(an, fwd, 6);
  pc.capsule(an[0], an[1], toe[0], toe[1], 2.3, far ? C.shoeD : C.shoe);
  const sole = add(an, nb, 0);
  pc.capsule(add(sole, [nb[0] * 0, 0])[0] + (an[0] - kn[0]) / 10, sole[1] + (an[1] - kn[1]) / 10, toe[0] + (an[0] - kn[0]) / 10, toe[1] + (an[1] - kn[1]) / 10, 0.6, far ? STEEL_D : SHOE_SOLE);
}

function drawArm(pc: PixelCanvas, f: Fig, far: boolean, lit: Lit, k: number) {
  const o: V = far ? [-2, 0] : [0, 0];
  const sh = add(f.sh, o), el = add(f.el, o), wr = add(f.wr, o);
  const skin = far ? C.skinD : C.skin;
  pc.capsule(sh[0], sh[1], el[0], el[1], 3, skin);
  pc.capsule(el[0], el[1], wr[0], wr[1], 2.5, skin);
  paint(pc, lit, "fore", el, wr, 2.6, far, k);
  paint(pc, lit, "upper", sh, el, 3.1, far, k);
  const sl = along(sh, el, 0.38);
  pc.capsule(sh[0], sh[1], sl[0], sl[1], 3.7, far ? SHIRT_D : SHIRT);
  if (lit.has("upper") && lit.get("upper")!.some((x) => x.z === ZONES.épaules[0])) paint(pc, new Map([["upper", lit.get("upper")!.filter((x) => x.z === ZONES.épaules[0])]]) as Lit, "upper", sh, el, 3.6, far, k);
  pc.disc(wr[0], wr[1], 2.6, far ? SKIN_S : C.skin);
}

function drawBody(pc: PixelCanvas, f: Fig, lit: Lit, k: number) {
  const { hip, sh, head } = f;
  const n = nrm(hip, sh);
  pc.capsule(hip[0], hip[1], sh[0], sh[1], 5.6, SHIRT);
  // ombre du dos
  const b0 = add(along(hip, sh, 0.2), n, -3.4), b1 = add(along(hip, sh, 0.95), n, -3.4);
  pc.capsule(b0[0], b0[1], b1[0], b1[1], 1.6, SHIRT_D);
  const w = along(hip, sh, 0.2);
  pc.capsule(hip[0], hip[1], w[0], w[1], 6, C.short);
  pc.capsule(add(w, n, -5.4)[0], add(w, n, -5.4)[1], add(w, n, 5.4)[0], add(w, n, 5.4)[1], 0.6, C.shortD);
  paint(pc, lit, "torso", hip, sh, 5.6, false, k);
  // cou et tête
  pc.capsule(sh[0], sh[1], head[0], head[1], 2.3, C.skin);
  const u: V = (() => { const l = Math.hypot(head[0] - sh[0], head[1] - sh[1]) || 1; return [(head[0] - sh[0]) / l, (head[1] - sh[1]) / l]; })();
  const fr: V = [-u[1], u[0]]; // avant du visage
  pc.disc(head[0], head[1], 6.4, C.hair);
  const face = add(add(head, fr, 1.6), u, -0.8);
  pc.disc(face[0], face[1], 5.2, C.skin);
  const hair = add(add(head, fr, -1.8), u, 2.2);
  pc.disc(hair[0], hair[1], 4, C.hair);
  const eye = add(add(head, fr, 3.6), u, 0.6);
  pc.rect(eye[0], eye[1], 1, 2, C.eye);
  const ear = add(head, fr, -0.6);
  pc.disc(ear[0], ear[1], 1.2, SKIN_S);
  const mouth = add(add(head, fr, 4.2), u, -2.6);
  pc.px(mouth[0], mouth[1], SKIN_S);
}

/** Contour sombre d'un pixel autour de tout ce qui est dessiné : la silhouette reste lisible en petit. */
function outline(pc: PixelCanvas) {
  const { w, h, buf } = pc;
  const src = buf.slice();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (src[y * w + x]) continue;
      if ((x > 0 && src[y * w + x - 1]) || (x < w - 1 && src[y * w + x + 1]) || (y > 0 && src[(y - 1) * w + x]) || (y < h - 1 && src[(y + 1) * w + x])) buf[y * w + x] = INK;
    }
}

/* ---------- Décors et matériel ---------- */

function shadowAt(h: Half, x: number, w: number) {
  h.pc.ellipse(x * K, 45 * K + 1, w * K, 1.5, C.shadow);
}

function scene(h: Half, s: Scene | undefined) {
  switch (s) {
    case "bench":
      h.rect(5, 33, 28, 3, C.bench); h.rect(5, 35.5, 28, 0.5, C.benchD); h.rect(7, 36, 2, 9, C.benchD); h.rect(29, 36, 2, 9, C.benchD); shadowAt(h, 19, 15); break;
    case "incline":
      h.capsule(12, 24, 22, 34, 1.4, C.bench); h.rect(20, 34, 14, 3, C.bench);
      h.rect(21, 37, 2, 8, C.benchD); h.rect(31, 37, 2, 8, C.benchD); h.rect(11, 26, 2, 19, C.benchD); shadowAt(h, 22, 13); break;
    case "lowbench":
      h.rect(4, 32, 11, 3, C.bench); h.rect(5, 35, 2, 10, C.benchD); h.rect(12, 35, 2, 10, C.benchD); shadowAt(h, 22, 12); break;
    case "rearbench":
      h.rect(1, 33, 12, 3, C.bench); h.rect(2, 36, 2, 9, C.benchD); h.rect(10, 36, 2, 9, C.benchD); shadowAt(h, 24, 10); break;
    case "pullbar":
      h.rect(6, 5, 36, 1.5, C.bar); h.rect(6, 5, 2, 41, C.benchD); h.rect(40, 5, 2, 41, C.benchD); break;
    case "dips":
      h.rect(12, 22, 22, 1.5, C.bar); h.rect(13, 24, 2, 22, C.benchD); h.rect(31, 24, 2, 22, C.benchD); shadowAt(h, 23, 8); break;
    case "seat":
      h.rect(14, 32, 13, 3, C.bench); h.rect(19, 35, 3, 10, C.benchD); h.rect(15, 44, 11, 1, C.benchD); shadowAt(h, 22, 9); break;
    case "box":
      h.rect(25, 37, 16, 9, C.benchD); h.rect(25, 37, 16, 1, C.bench); shadowAt(h, 26, 12); break;
    case "wall":
      h.rect(8, 0, 2, 46, C.benchD); shadowAt(h, 20, 9); break;
    case "legpress":
      h.capsule(3, 25, 12, 39, 1.6, C.bench); h.rect(10, 38, 9, 3, C.bench); h.rect(13, 41, 2, 4, C.benchD);
      h.capsule(20, 44, 44, 14, 0.6, C.benchD); shadowAt(h, 16, 10); break;
    case "rower":
      h.rect(8, 41, 36, 2, C.benchD); h.disc(43, 36, 4, C.bench); h.disc(43, 36, 2, C.benchD); h.rect(16, 39, 9, 2, C.bench); break;
    case "bike":
      h.rect(14, 26, 8, 2, C.bench); h.rect(17, 28, 2, 10, C.benchD); h.capsule(18, 38, 34, 30, 0.8, C.benchD);
      h.rect(33, 21, 2, 10, C.benchD); h.disc(36, 38, 6, C.bench); h.disc(36, 38, 4, C.benchD); h.disc(22, 38, 2, C.bar); shadowAt(h, 26, 14); break;
    case "sled":
      h.rect(39, 16, 2, 22, C.bar); h.rect(38, 37, 9, 8, C.benchD); h.rect(38, 44, 10, 1, C.bar); shadowAt(h, 28, 12); break;
    case "step":
      h.rect(17, 44, 14, 2, C.benchD); shadowAt(h, 24, 8); break;
    case "mat":
      h.rect(2, 45, 44, 1, PAD); shadowAt(h, 22, 16); break;
    default:
      shadowAt(h, 24, 8);
  }
}

/** Disque de barre vu de face, en acier (le rouge est réservé aux muscles). */
function steelPlate(h: Half, at: P, r: number) {
  h.disc(at[0], at[1], r, STEEL_D);
  h.disc(at[0], at[1], r - 0.5, STEEL);
  h.disc(at[0], at[1], Math.max(0.8, r - 2.2), STEEL_D);
  h.disc(at[0], at[1], 0.6, STEEL_L);
  h.px(at[0] - r * 0.45, at[1] - r * 0.55, STEEL_L);
}

function gear(h: Half, m: Move, p: Limbs, t: number) {
  const w = p.wr;
  switch (m.gear) {
    case "bar":
      steelPlate(h, w, m.size ?? 4); break;
    case "db":
      h.rect(w[0] - 2.5, w[1] - 1.5, 1.5, 3, STEEL_D); h.rect(w[0] + 1, w[1] - 1.5, 1.5, 3, STEEL_D);
      h.rect(w[0] - 1, w[1] - 0.5, 2, 1, STEEL_L); h.rect(w[0] - 2.5, w[1] - 1.5, 1.5, 0.5, STEEL); break;
    case "kb":
      h.disc(w[0], w[1] + 3, 2.6, C.benchD); h.disc(w[0] - 0.6, w[1] + 2.4, 1.2, C.bench); h.capsule(w[0] - 1, w[1] + 0.5, w[0] + 1, w[1] + 0.5, 0.5, C.bar); break;
    case "ball":
      h.disc(w[0], w[1] - 3, 3.4, C.ball); h.rect(w[0] - 2, w[1] - 4.5, 2, 1, C.ballL); break;
    case "wheel":
      h.disc(w[0], w[1] + 2, 2.6, C.benchD); h.disc(w[0], w[1] + 2, 1.2, C.bar); break;
    case "plate":
      steelPlate(h, [w[0] + 1, w[1]], 3); break;
    case "handle":
      h.rect(w[0] - 1, w[1] - 1, 2.5, 2.5, C.bar); break;
    case "rope": {
      const a = ((t / m.period) % 1) * Math.PI * 2;
      const cy = 23 + Math.cos(a) * 22;
      const cx = 22 + Math.sin(a) * 5;
      h.line(w[0], w[1], cx, cy, CABLE);
      h.line(w[0] - 1, w[1], cx - 1, cy, CABLE);
      break;
    }
    case "wave":
      for (let x = w[0] * K; x < 96; x++) {
        const d = x / K - w[0];
        h.pc.rect(x, (w[1] + 3 + Math.sin(d * 0.45 - t * 14) * 2.5 * (d / 14 + 0.2)) * K, 1, 2, CABLE);
      }
      break;
  }
}

function cable(h: Half, m: Move, p: Limbs) {
  if (!m.cable) return;
  const [ax, ay] = m.cable;
  const post = ax < 24 ? Math.max(0, ax - 3) : Math.min(46, ax + 1);
  h.rect(post, 0, 2, 46, C.benchD);
  h.disc(ax, ay, 1.5, C.bench);
  h.disc(ax, ay, 0.6, C.benchD);
  h.line(ax, ay, p.wr[0], p.wr[1], CABLE);
}

/** Dessine l'exercice à l'instant t (secondes), muscles qui travaillent en rouge. */
export function drawMove(pc: PixelCanvas, id: MoveId, t: number, work?: Work) {
  const m = MOVES[id] ?? MOVES.squat;
  const { p, k } = poseAt(m, t);
  const lit = litFrom(work);
  const effort = 0.55 + 0.45 * k; // le rouge s'avive pendant l'effort
  const h = new Half(pc);
  pc.clear(0);
  scene(h, m.scene);
  cable(h, m, p);
  const near = fig(p, false), far = fig(p, true);
  const lying = m.scene === "bench" || m.scene === "lowbench" || m.scene === "incline" || m.scene === "legpress";
  if (!lying || p.kn2) drawLeg(pc, far, true, lit, effort);
  drawArm(pc, far, true, lit, effort);
  if (m.gear === "bar" && m.behind) steelPlate(h, p.wr, m.size ?? 4);
  drawBody(pc, near, lit, effort);
  drawLeg(pc, near, false, lit, effort);
  if (m.scene === "legpress") h.capsule(p.an[0] - 2, p.an[1] + 4, p.an[0] + 3, p.an[1] - 5, 1, C.bench);
  if (m.scene === "rower" || m.scene === "bike") h.rect(p.hip[0] - 2, p.hip[1] + 1.5, 6, 1, C.bench);
  drawArm(pc, near, false, lit, effort);
  if (!(m.gear === "bar" && m.behind)) gear(h, m, p, t);
  outline(pc);
  pc.rect(0, 92, 96, 2, C.floor);
}

/** Instant « parlant » pour l'image fixe (animations réduites) : milieu du mouvement. */
export function stillOf(id: MoveId) {
  const m = MOVES[id] ?? MOVES.squat;
  return m.keys.length === 2 ? m.period * 0.43 : m.period * (1 - 0.15 / m.keys.length);
}
