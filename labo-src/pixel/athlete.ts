// Athlète en pixel art, vu de profil, sur une toile de 48 × 48.
// Chaque exercice = deux poses clés (articulations) interpolées en boucle.
import { PixelCanvas, clamp, ease, hex, lerp, noise } from "./canvas";

type P = readonly [number, number];
type Pose = {
  head: P;
  sh: P;
  el: P;
  wr: P;
  hip: P;
  kn: P;
  an: P;
  bar?: P;
};

export type ExerciseId = "squat" | "bench" | "deadlift" | "pullup" | "ohp" | "curl" | "hipthrust" | "run" | "rugby";

const C = {
  skin: hex("#f0b48a"),
  skinD: hex("#c4805c"),
  hair: hex("#2b1d1a"),
  shirt: hex("#ff6b95"),
  shirtD: hex("#b9426a"),
  short: hex("#3f4890"),
  shortD: hex("#272d5c"),
  shoe: hex("#f1f2fa"),
  shoeD: hex("#9aa0c0"),
  eye: hex("#1a1020"),
  bar: hex("#cfd3e6"),
  plate: hex("#e5484d"),
  plateD: hex("#9e2b30"),
  plateHub: hex("#f1f2fa"),
  bench: hex("#5b6390"),
  benchD: hex("#353c6a"),
  floor: hex("#2a3058"),
  shadow: hex("#12152d"),
  sweat: hex("#7fdcff"),
  ball: hex("#c9773a"),
  ballL: hex("#f1f2fa"),
  dash: hex("#3a4170"),
};

const POSES: Record<Exclude<ExerciseId, "run" | "rugby">, { a: Pose; b: Pose; period: number; plate: number; extra?: "bench" | "pullbar" | "lowbench" }> = {
  squat: {
    period: 2.6,
    plate: 4.5,
    a: { head: [25, 10], sh: [24, 15], el: [19, 18], wr: [22, 14], hip: [23, 27], kn: [24, 35], an: [24, 43], bar: [21, 14] },
    b: { head: [25, 20], sh: [22, 25], el: [18, 28], wr: [21, 24], hip: [18, 36], kn: [26, 35], an: [24, 43], bar: [20, 24] },
  },
  deadlift: {
    period: 2.8,
    plate: 4.5,
    a: { head: [32, 20], sh: [29, 24], el: [29, 31], wr: [28, 38], hip: [21, 31], kn: [28, 36], an: [24, 43], bar: [28, 39] },
    b: { head: [25, 10], sh: [24, 15], el: [25, 23], wr: [25, 30], hip: [23, 27], kn: [24, 35], an: [24, 43], bar: [25, 31] },
  },
  bench: {
    period: 2.4,
    plate: 4.5,
    extra: "bench",
    a: { head: [8, 29], sh: [13, 31], el: [13, 23], wr: [13, 16], hip: [25, 31], kn: [32, 35], an: [33, 43], bar: [13, 16] },
    b: { head: [8, 29], sh: [13, 31], el: [19, 29], wr: [15, 24], hip: [25, 31], kn: [32, 35], an: [33, 43], bar: [15, 24] },
  },
  pullup: {
    period: 2.6,
    plate: 0,
    extra: "pullbar",
    a: { head: [26, 12], sh: [24, 16], el: [24, 11], wr: [24, 6], hip: [23, 28], kn: [26, 35], an: [22, 41], bar: [24, 6] },
    b: { head: [26, 3], sh: [24, 9], el: [20, 12], wr: [24, 6], hip: [23, 21], kn: [26, 28], an: [22, 34], bar: [24, 6] },
  },
  ohp: {
    period: 2.4,
    plate: 3.5,
    a: { head: [25, 10], sh: [24, 15], el: [27, 20], wr: [27, 13], hip: [23, 27], kn: [24, 35], an: [24, 43], bar: [27, 13] },
    b: { head: [24, 10], sh: [24, 15], el: [25, 9], wr: [25, 3], hip: [23, 27], kn: [24, 35], an: [24, 43], bar: [25, 3] },
  },
  curl: {
    period: 2.2,
    plate: 3,
    a: { head: [25, 10], sh: [24, 15], el: [24, 22], wr: [26, 29], hip: [23, 27], kn: [24, 35], an: [24, 43], bar: [26, 29] },
    b: { head: [25, 10], sh: [24, 15], el: [24, 22], wr: [29, 17], hip: [23, 27], kn: [24, 35], an: [24, 43], bar: [29, 17] },
  },
  hipthrust: {
    period: 2.4,
    plate: 4.5,
    extra: "lowbench",
    a: { head: [8, 27], sh: [12, 30], el: [17, 35], wr: [22, 34], hip: [22, 38], kn: [29, 34], an: [30, 43], bar: [22, 34] },
    b: { head: [8, 27], sh: [12, 30], el: [17, 30], wr: [22, 26], hip: [22, 30], kn: [30, 31], an: [30, 43], bar: [22, 26] },
  },
};

const mixP = (a: P, b: P, t: number): P => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
function mixPose(a: Pose, b: Pose, t: number): Pose {
  return {
    head: mixP(a.head, b.head, t),
    sh: mixP(a.sh, b.sh, t),
    el: mixP(a.el, b.el, t),
    wr: mixP(a.wr, b.wr, t),
    hip: mixP(a.hip, b.hip, t),
    kn: mixP(a.kn, b.kn, t),
    an: mixP(a.an, b.an, t),
    bar: a.bar && b.bar ? mixP(a.bar, b.bar, t) : undefined,
  };
}

/** Phase aller-retour : monte, tient, redescend, tient. */
function cycle(u: number) {
  if (u < 0.36) return ease(u / 0.36);
  if (u < 0.5) return 1;
  if (u < 0.86) return 1 - ease((u - 0.5) / 0.36);
  return 0;
}

function leg(pc: PixelCanvas, p: Pose, far: boolean) {
  const o = far ? -1.2 : 0;
  const skin = far ? C.skinD : C.skin;
  pc.capsule(p.hip[0] + o, p.hip[1], p.kn[0] + o, p.kn[1], 2, skin);
  pc.capsule(p.kn[0] + o, p.kn[1], p.an[0] + o, p.an[1], 1.5, skin);
  // short : moitié haute de la cuisse
  pc.capsule(p.hip[0] + o, p.hip[1], lerp(p.hip[0], p.kn[0], 0.55) + o, lerp(p.hip[1], p.kn[1], 0.55), 2.3, far ? C.shortD : C.short);
  // chaussure
  pc.rect(p.an[0] + o - 1, p.an[1], 5, 2, far ? C.shoeD : C.shoe);
}

function arm(pc: PixelCanvas, p: Pose, far: boolean) {
  const o = far ? -1 : 0;
  pc.capsule(p.sh[0] + o, p.sh[1], p.el[0] + o, p.el[1], 1.5, far ? C.skinD : C.skin);
  pc.capsule(p.el[0] + o, p.el[1], p.wr[0] + o, p.wr[1], 1.2, far ? C.skinD : C.skin);
  pc.capsule(p.sh[0] + o, p.sh[1], lerp(p.sh[0], p.el[0], 0.4) + o, lerp(p.sh[1], p.el[1], 0.4), 1.8, far ? C.shirtD : C.shirt);
}

function body(pc: PixelCanvas, p: Pose) {
  pc.capsule(p.hip[0], p.hip[1], p.sh[0], p.sh[1], 2.6, C.shirt);
  pc.capsule(p.hip[0], p.hip[1], lerp(p.hip[0], p.sh[0], 0.18), lerp(p.hip[1], p.sh[1], 0.18), 2.8, C.short);
  // cou + tête
  pc.capsule(p.sh[0], p.sh[1], p.head[0], p.head[1], 1.2, C.skin);
  pc.disc(p.head[0], p.head[1], 3.2, C.hair);
  pc.disc(p.head[0] + 0.8, p.head[1] + 0.7, 2.6, C.skin);
  pc.px(p.head[0] + 2, p.head[1], C.eye);
}

function plate(pc: PixelCanvas, at: P, r: number) {
  if (!r) return;
  pc.disc(at[0], at[1], r, C.plateD);
  pc.disc(at[0], at[1], r - 1, C.plate);
  pc.px(at[0], at[1], C.plateD);
  pc.px(at[0] - 1, at[1] - Math.round(r) + 2, C.plateHub);
}

function shadow(pc: PixelCanvas, x: number, w: number) {
  pc.ellipse(x, 45, w, 1, C.shadow);
}

function floor(pc: PixelCanvas) {
  pc.rect(0, 46, pc.w, 1, C.floor);
}

function drawLift(pc: PixelCanvas, id: keyof typeof POSES, t: number, onRep?: (n: number) => void) {
  const def = POSES[id];
  const u = (t / def.period) % 1;
  const k = cycle(u);
  const p = mixPose(def.a, def.b, k);
  floor(pc);

  if (def.extra === "bench") {
    pc.rect(5, 33, 28, 3, C.bench);
    pc.rect(7, 36, 2, 9, C.benchD);
    pc.rect(29, 36, 2, 9, C.benchD);
    pc.rect(9, 10, 1, 35, C.benchD); // support de barre
    shadow(pc, 19, 15);
  } else if (def.extra === "pullbar") {
    pc.rect(6, 5, 36, 2, C.bar);
    pc.rect(6, 5, 2, 41, C.benchD);
    pc.rect(40, 5, 2, 41, C.benchD);
  } else if (def.extra === "lowbench") {
    pc.rect(4, 32, 11, 3, C.bench);
    pc.rect(5, 35, 2, 10, C.benchD);
    pc.rect(12, 35, 2, 10, C.benchD);
    shadow(pc, 22, 12);
  } else {
    shadow(pc, 24, 8);
  }

  // côté éloigné, corps, côté proche
  if (def.extra !== "bench" && def.extra !== "lowbench") leg(pc, p, true);
  arm(pc, p, true);
  body(pc, p);
  leg(pc, p, false);
  if (id === "squat") plate(pc, p.bar!, def.plate); // barre derrière la nuque : disque avant le bras
  arm(pc, p, false);
  if (id !== "squat" && p.bar) plate(pc, p.bar, def.plate);

  // gouttes d'effort pendant la tenue
  if (u > 0.36 && u < 0.62) {
    const f = (u - 0.36) / 0.26;
    for (let i = 0; i < 2; i++) {
      const x = p.head[0] - 3 + i * 6;
      const y = p.head[1] - 4 - f * 5 - i;
      if (noise(i, Math.floor(t / def.period)) > 0.3) pc.px(x, y, C.sweat);
    }
  }
  onRep?.(Math.floor(t / def.period) % 12 + 1);
}

function drawRun(pc: PixelCanvas, t: number, ball: boolean) {
  const phi = t * Math.PI * 2 * 1.5;
  const bob = -Math.abs(Math.sin(phi)) * 1.2;
  const hip: P = [24, 26 + bob];
  const sh: P = [26, 14.5 + bob];
  const head: P = [27.5, 9.5 + bob];

  // sol qui défile
  floor(pc);
  for (let i = 0; i < 6; i++) {
    const x = ((i * 11 - t * 38) % 66 + 66) % 66 - 9;
    pc.rect(x, 46, 5, 1, C.dash);
  }
  shadow(pc, 24, 7);

  const legPose = (ph: number) => {
    const th = Math.sin(ph) * 0.75;
    const bend = 0.25 + 1.25 * clamp(0.5 - 0.5 * Math.cos(ph + 1.9));
    const kn: P = [hip[0] + 8 * Math.sin(th), hip[1] + 8 * Math.cos(th)];
    const an: P = [kn[0] + 8 * Math.sin(th - bend), kn[1] + 8 * Math.cos(th - bend)];
    return { kn, an };
  };
  const armPose = (ph: number) => {
    const a = -Math.sin(ph) * 0.9;
    const el: P = [sh[0] + 6 * Math.sin(a), sh[1] + 6 * Math.cos(a)];
    const wr: P = [el[0] + 5 * Math.sin(a + 1.6), el[1] + 5 * Math.cos(a + 1.6)];
    return { el, wr };
  };

  const base = { head, sh, hip } as const;
  const far = { ...base, ...legPose(phi + Math.PI), ...armPose(phi + Math.PI) } as Pose;
  const near = { ...base, ...legPose(phi), ...armPose(phi) } as Pose;

  leg(pc, far, true);
  if (!ball) arm(pc, far, true);
  body(pc, near);
  leg(pc, near, false);
  if (ball) {
    // ballon de rugby calé sous le bras
    const bx = sh[0] + 3;
    const by = sh[1] + 6;
    pc.ellipse(bx, by, 3.5, 2.2, C.ball);
    pc.rect(bx - 1, by - 1, 3, 1, C.ballL);
    pc.capsule(sh[0], sh[1], bx - 1, by + 2, 1.5, C.skin);
    pc.capsule(sh[0], sh[1], sh[0] + 0.8, sh[1] + 2, 1.8, C.shirt);
  } else arm(pc, near, false);
}

export function drawAthlete(pc: PixelCanvas, id: ExerciseId, t: number, onRep?: (n: number) => void) {
  pc.clear(0);
  if (id === "run") drawRun(pc, t, false);
  else if (id === "rugby") drawRun(pc, t, true);
  else drawLift(pc, id, t, onRep);
}
