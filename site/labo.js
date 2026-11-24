/* Tempo Labo : généré par labo-src/build.cjs, ne pas modifier à la main. */
(function(){"use strict";
const M_pixel_canvas = (function(){
function hex(h, a = 255) {
    const n = parseInt(h.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}
function mix(c1, c2, t) {
    const r = (c1 & 255) + ((c2 & 255) - (c1 & 255)) * t;
    const g = ((c1 >> 8) & 255) + (((c2 >> 8) & 255) - ((c1 >> 8) & 255)) * t;
    const b = ((c1 >> 16) & 255) + (((c2 >> 16) & 255) - ((c1 >> 16) & 255)) * t;
    return ((255 << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0;
}
function noise(x, y, seed = 0) {
    let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
class PixelCanvas {
    constructor(canvas, w, h) {
        this.w = w;
        this.h = h;
        canvas.width = w;
        canvas.height = h;
        this.ctx = canvas.getContext("2d");
        this.img = this.ctx.createImageData(w, h);
        this.buf = new Uint32Array(this.img.data.buffer);
    }
    clear(c = 0) {
        this.buf.fill(c);
    }
    px(x, y, c) {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || y < 0 || x >= this.w || y >= this.h)
            return;
        this.buf[y * this.w + x] = c;
    }
    get(x, y) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h)
            return 0;
        return this.buf[y * this.w + x];
    }
    rect(x, y, w, h, c) {
        const x0 = Math.round(x);
        const y0 = Math.round(y);
        for (let j = 0; j < Math.round(h); j++)
            for (let i = 0; i < Math.round(w); i++)
                this.px(x0 + i, y0 + j, c);
    }
    disc(cx, cy, r, c) {
        const R = Math.ceil(r);
        for (let j = -R; j <= R; j++)
            for (let i = -R; i <= R; i++)
                if (i * i + j * j <= r * r + r * 0.6)
                    this.px(cx + i, cy + j, c);
    }
    ellipse(cx, cy, rx, ry, c) {
        for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++)
            for (let i = -Math.ceil(rx); i <= Math.ceil(rx); i++)
                if ((i * i) / (rx * rx) + (j * j) / (ry * ry) <= 1.05)
                    this.px(cx + i, cy + j, c);
    }
    capsule(x1, y1, x2, y2, r, c) {
        const len = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.max(1, Math.ceil(len * 1.5));
        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            this.disc(lerp(x1, x2, t), lerp(y1, y2, t), r, c);
        }
    }
    line(x1, y1, x2, y2, c) {
        this.capsule(x1, y1, x2, y2, 0, c);
    }
    sprite(rows, pal, x, y, opts = {}) {
        const { flip = false, reveal = 1, seed = 0 } = opts;
        const w = rows[0].length;
        for (let j = 0; j < rows.length; j++)
            for (let i = 0; i < w; i++) {
                const ch = rows[j][flip ? w - 1 - i : i];
                if (ch === "." || !pal[ch])
                    continue;
                if (reveal < 1 && noise(i, j, seed) > reveal)
                    continue;
                this.px(x + i, y + j, pal[ch]);
            }
    }
    flush() {
        this.ctx.putImageData(this.img, 0, 0);
    }
}

return { hex, mix, noise, ease, clamp, lerp, PixelCanvas };
})();
const M_pixel_athlete = (function(){
const { clamp, ease, hex, lerp, noise } = M_pixel_canvas;
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
const POSES = {
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
const mixP = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
function mixPose(a, b, t) {
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
function cycle(u) {
    if (u < 0.36)
        return ease(u / 0.36);
    if (u < 0.5)
        return 1;
    if (u < 0.86)
        return 1 - ease((u - 0.5) / 0.36);
    return 0;
}
function leg(pc, p, far) {
    const o = far ? -1.2 : 0;
    const skin = far ? C.skinD : C.skin;
    pc.capsule(p.hip[0] + o, p.hip[1], p.kn[0] + o, p.kn[1], 2, skin);
    pc.capsule(p.kn[0] + o, p.kn[1], p.an[0] + o, p.an[1], 1.5, skin);
    pc.capsule(p.hip[0] + o, p.hip[1], lerp(p.hip[0], p.kn[0], 0.55) + o, lerp(p.hip[1], p.kn[1], 0.55), 2.3, far ? C.shortD : C.short);
    pc.rect(p.an[0] + o - 1, p.an[1], 5, 2, far ? C.shoeD : C.shoe);
}
function arm(pc, p, far) {
    const o = far ? -1 : 0;
    pc.capsule(p.sh[0] + o, p.sh[1], p.el[0] + o, p.el[1], 1.5, far ? C.skinD : C.skin);
    pc.capsule(p.el[0] + o, p.el[1], p.wr[0] + o, p.wr[1], 1.2, far ? C.skinD : C.skin);
    pc.capsule(p.sh[0] + o, p.sh[1], lerp(p.sh[0], p.el[0], 0.4) + o, lerp(p.sh[1], p.el[1], 0.4), 1.8, far ? C.shirtD : C.shirt);
}
function body(pc, p) {
    pc.capsule(p.hip[0], p.hip[1], p.sh[0], p.sh[1], 2.6, C.shirt);
    pc.capsule(p.hip[0], p.hip[1], lerp(p.hip[0], p.sh[0], 0.18), lerp(p.hip[1], p.sh[1], 0.18), 2.8, C.short);
    pc.capsule(p.sh[0], p.sh[1], p.head[0], p.head[1], 1.2, C.skin);
    pc.disc(p.head[0], p.head[1], 3.2, C.hair);
    pc.disc(p.head[0] + 0.8, p.head[1] + 0.7, 2.6, C.skin);
    pc.px(p.head[0] + 2, p.head[1], C.eye);
}
function plate(pc, at, r) {
    if (!r)
        return;
    pc.disc(at[0], at[1], r, C.plateD);
    pc.disc(at[0], at[1], r - 1, C.plate);
    pc.px(at[0], at[1], C.plateD);
    pc.px(at[0] - 1, at[1] - Math.round(r) + 2, C.plateHub);
}
function shadow(pc, x, w) {
    pc.ellipse(x, 45, w, 1, C.shadow);
}
function floor(pc) {
    pc.rect(0, 46, pc.w, 1, C.floor);
}
function drawLift(pc, id, t, onRep) {
    const def = POSES[id];
    const u = (t / def.period) % 1;
    const k = cycle(u);
    const p = mixPose(def.a, def.b, k);
    floor(pc);
    if (def.extra === "bench") {
        pc.rect(5, 33, 28, 3, C.bench);
        pc.rect(7, 36, 2, 9, C.benchD);
        pc.rect(29, 36, 2, 9, C.benchD);
        pc.rect(9, 10, 1, 35, C.benchD);
        shadow(pc, 19, 15);
    }
    else if (def.extra === "pullbar") {
        pc.rect(6, 5, 36, 2, C.bar);
        pc.rect(6, 5, 2, 41, C.benchD);
        pc.rect(40, 5, 2, 41, C.benchD);
    }
    else if (def.extra === "lowbench") {
        pc.rect(4, 32, 11, 3, C.bench);
        pc.rect(5, 35, 2, 10, C.benchD);
        pc.rect(12, 35, 2, 10, C.benchD);
        shadow(pc, 22, 12);
    }
    else {
        shadow(pc, 24, 8);
    }
    if (def.extra !== "bench" && def.extra !== "lowbench")
        leg(pc, p, true);
    arm(pc, p, true);
    body(pc, p);
    leg(pc, p, false);
    if (id === "squat")
        plate(pc, p.bar, def.plate);
    arm(pc, p, false);
    if (id !== "squat" && p.bar)
        plate(pc, p.bar, def.plate);
    if (u > 0.36 && u < 0.62) {
        const f = (u - 0.36) / 0.26;
        for (let i = 0; i < 2; i++) {
            const x = p.head[0] - 3 + i * 6;
            const y = p.head[1] - 4 - f * 5 - i;
            if (noise(i, Math.floor(t / def.period)) > 0.3)
                pc.px(x, y, C.sweat);
        }
    }
    onRep === null || onRep === void 0 ? void 0 : onRep(Math.floor(t / def.period) % 12 + 1);
}
function drawRun(pc, t, ball) {
    const phi = t * Math.PI * 2 * 1.5;
    const bob = -Math.abs(Math.sin(phi)) * 1.2;
    const hip = [24, 26 + bob];
    const sh = [26, 14.5 + bob];
    const head = [27.5, 9.5 + bob];
    floor(pc);
    for (let i = 0; i < 6; i++) {
        const x = ((i * 11 - t * 38) % 66 + 66) % 66 - 9;
        pc.rect(x, 46, 5, 1, C.dash);
    }
    shadow(pc, 24, 7);
    const legPose = (ph) => {
        const th = Math.sin(ph) * 0.75;
        const bend = 0.25 + 1.25 * clamp(0.5 - 0.5 * Math.cos(ph + 1.9));
        const kn = [hip[0] + 8 * Math.sin(th), hip[1] + 8 * Math.cos(th)];
        const an = [kn[0] + 8 * Math.sin(th - bend), kn[1] + 8 * Math.cos(th - bend)];
        return { kn, an };
    };
    const armPose = (ph) => {
        const a = -Math.sin(ph) * 0.9;
        const el = [sh[0] + 6 * Math.sin(a), sh[1] + 6 * Math.cos(a)];
        const wr = [el[0] + 5 * Math.sin(a + 1.6), el[1] + 5 * Math.cos(a + 1.6)];
        return { el, wr };
    };
    const base = { head, sh, hip };
    const far = { ...base, ...legPose(phi + Math.PI), ...armPose(phi + Math.PI) };
    const near = { ...base, ...legPose(phi), ...armPose(phi) };
    leg(pc, far, true);
    if (!ball)
        arm(pc, far, true);
    body(pc, near);
    leg(pc, near, false);
    if (ball) {
        const bx = sh[0] + 3;
        const by = sh[1] + 6;
        pc.ellipse(bx, by, 3.5, 2.2, C.ball);
        pc.rect(bx - 1, by - 1, 3, 1, C.ballL);
        pc.capsule(sh[0], sh[1], bx - 1, by + 2, 1.5, C.skin);
        pc.capsule(sh[0], sh[1], sh[0] + 0.8, sh[1] + 2, 1.8, C.shirt);
    }
    else
        arm(pc, near, false);
}
function drawAthlete(pc, id, t, onRep) {
    pc.clear(0);
    if (id === "run")
        drawRun(pc, t, false);
    else if (id === "rugby")
        drawRun(pc, t, true);
    else
        drawLift(pc, id, t, onRep);
}

return { drawAthlete };
})();
const M_pixel_food = (function(){
const { clamp, hex, noise } = M_pixel_canvas;
const S = {
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
const MEALS = [
    { name: "Déjeuner", kcal: "840 kcal", items: [["riz", 22, 37], ["poulet", 37, 37], ["brocoli", 51, 35], ["tomate", 31, 33]] },
    { name: "Petit-déjeuner", kcal: "520 kcal", items: [["pain", 21, 37], ["avocat", 33, 36], ["oeuf", 45, 37], ["banane", 50, 32]] },
];
const PLATE = hex("#d9dcec");
const PLATE_IN = hex("#f1f2fa");
const PLATE_SH = hex("#9aa0c0");
const TABLE = hex("#12152d");
const STEAM = hex("#a3a8c3");
const SPARK = hex("#ffd166");
const MEAL_PERIOD = 7;
function drawPlate(pc, t) {
    const mi = Math.floor(t / MEAL_PERIOD) % MEALS.length;
    const meal = MEALS[mi];
    const u = t % MEAL_PERIOD;
    pc.clear(0);
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
        if (local < 0)
            return;
        const fall = 0.42;
        let yy;
        if (local < fall) {
            const k = local / fall;
            yy = -h + (y - h + 2 + h) * k * k;
        }
        else {
            const b = local - fall;
            yy = y - h + 2 - (b < 0.22 ? Math.sin((b / 0.22) * Math.PI) * 2.2 : 0);
        }
        pc.sprite(sp.rows, sp.pal, x - Math.floor(sp.rows[0].length / 2), Math.round(yy), { reveal: fade, seed: i + 1 });
        if (sp.hot && local > fall + 0.3 && fade === 1) {
            for (let k = 0; k < 3; k++) {
                const ph = (t * 0.9 + k * 0.33) % 1;
                const sx = x - 3 + k * 3 + Math.round(Math.sin(t * 3 + k) * 0.8);
                const sy = y - h - 1 - ph * 8;
                if (noise(k, Math.floor(t * 6)) > 0.25)
                    pc.px(sx, sy, STEAM);
            }
        }
    });
    const done = 0.25 + meal.items.length * 0.42 + 0.3;
    if (u > done && u < done + 0.8) {
        const k = (u - done) / 0.8;
        for (let s = 0; s < 8; s++) {
            const a = (s / 8) * Math.PI * 2;
            const r = 14 + k * 16;
            if (noise(s, 3) > 0.2)
                pc.px(36 + Math.cos(a) * r * 1.6, 26 + Math.sin(a) * r * 0.6, SPARK);
        }
    }
}
function mealAt(t) {
    return MEALS[Math.floor(t / MEAL_PERIOD) % MEALS.length];
}

return { MEALS, MEAL_PERIOD, drawPlate, mealAt };
})();
const M_labo = (function(){
const { PixelCanvas } = M_pixel_canvas;
const { drawAthlete } = M_pixel_athlete;
const { drawPlate } = M_pixel_food;
const byPage = {
    "index.html": "squat",
    "carnet.html": "deadlift",
    "musculation.html": "bench",
    "carnet-course.html": "run",
    "plan-entrainement.html": "run",
    "allure.html": "run",
    "zones-cardiaques.html": "run",
    "tests.html": "run",
    "multisport.html": "rugby",
    "nutrition.html": "plate",
    "calories.html": "plate",
    "compte.html": "curl",
    "apropos.html": "pullup",
};
const bySport = { fonte: "bench", piste: "run", coeur: "run", velo: "run", jauge: "plate", accueil: "squat" };
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
function mountBadge() {
    var _a, _b, _c;
    const h1 = document.querySelector(".intro h1, .j-intro h1, .cf-intro h1");
    if (!h1 || h1.closest(".lb-head"))
        return;
    const last = location.pathname.split("/").pop() || "index";
    const page = /\.html$/.test(last) ? last : last + ".html";
    const kind = (_c = (_a = byPage[page]) !== null && _a !== void 0 ? _a : bySport[(_b = document.body.dataset.bg) !== null && _b !== void 0 ? _b : ""]) !== null && _c !== void 0 ? _c : "squat";
    const row = document.createElement("div");
    row.className = "lb-head";
    h1.replaceWith(row);
    row.append(h1);
    const badge = document.createElement("div");
    badge.className = "lb-badge";
    badge.setAttribute("aria-hidden", "true");
    const canvas = document.createElement("canvas");
    badge.append(canvas);
    row.append(badge);
    animate(canvas, badge, kind, 1.2);
}
function animate(canvas, watch, kind, still) {
    const w = kind === "plate" ? 72 : 48;
    const pc = new PixelCanvas(canvas, w, 48);
    const draw = (t) => {
        if (kind === "plate")
            drawPlate(pc, t);
        else
            drawAthlete(pc, kind, t);
        pc.flush();
    };
    draw(reduce ? still : 0);
    if (reduce)
        return;
    let raf = 0;
    let t = 0;
    let last = 0;
    const frame = (now) => {
        t += last ? Math.min(0.05, (now - last) / 1000) : 0;
        last = now;
        draw(t);
        raf = requestAnimationFrame(frame);
    };
    const start = () => {
        if (raf || document.hidden)
            return;
        last = 0;
        raf = requestAnimationFrame(frame);
    };
    const stop = () => {
        cancelAnimationFrame(raf);
        raf = 0;
    };
    let visible = false;
    new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible)
            start();
        else
            stop();
    }).observe(watch);
    document.addEventListener("visibilitychange", () => (document.hidden || !visible ? stop() : start()));
}
function mountHomeTiles() {
    for (const [sel, kind] of [[".h-tile-run", "run"], [".h-tile-lift", "squat"]]) {
        const tile = document.querySelector(sel);
        if (!tile || tile.querySelector("canvas"))
            continue;
        const c = document.createElement("canvas");
        c.className = "lb-tile";
        tile.classList.add("lb-pixel");
        tile.append(c);
        animate(c, tile, kind, kind === "run" ? 0.3 : 1.3);
    }
}
function mountQuick() {
    var _a;
    const kinds = [["carnet.html", "bench"], ["carnet-course.html", "run"], ["multisport.html", "rugby"], ["nutrition.html", "plate"]];
    for (const a of document.querySelectorAll(".h-quick a")) {
        if (a.querySelector("canvas"))
            continue;
        const href = (_a = a.getAttribute("href")) !== null && _a !== void 0 ? _a : "";
        const k = kinds.find(([h]) => href.startsWith(h));
        if (!k)
            continue;
        const c = document.createElement("canvas");
        c.className = "lb-quick";
        c.setAttribute("aria-hidden", "true");
        a.append(c);
        animate(c, a, k[1], 1.1);
    }
}
const SPARK = ".btn, .j-btn.primary, .j-fab, #carnet .btn.primary, .gnav a";
const colors = ["var(--accent)", "#ffffff", "#ffa557", "#9a83ff"];
function sparks(e) {
    var _a, _b;
    if (reduce)
        return;
    const target = (_b = (_a = e.target) === null || _a === void 0 ? void 0 : _a.closest) === null || _b === void 0 ? void 0 : _b.call(_a, SPARK);
    if (!target)
        return;
    for (let i = 0; i < 8; i++) {
        const s = document.createElement("span");
        s.className = "lb-spark";
        s.style.left = `${e.clientX - 2}px`;
        s.style.top = `${e.clientY - 2}px`;
        s.style.background = colors[i % colors.length];
        document.body.append(s);
        const a = (i / 8) * Math.PI * 2 + 0.4;
        const r = 18 + (i % 3) * 8;
        s.animate([{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px)`, opacity: 0 }], {
            duration: 480,
            easing: "cubic-bezier(.22,1,.36,1)",
        }).onfinish = () => s.remove();
    }
}
function init() {
    mountBadge();
    mountHomeTiles();
    mountQuick();
    document.addEventListener("pointerdown", sparks, { passive: true });
}
if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
else
    init();

return {  };
})();
})();
