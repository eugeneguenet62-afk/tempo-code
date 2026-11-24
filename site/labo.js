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

return { C, mixP, cycle, leg, arm, body, plate, shadow, floor, drawAthlete };
})();
const M_pixel_moves = (function(){
const { ease, hex, lerp, mix } = M_pixel_canvas;
const { C, cycle, mixP } = M_pixel_athlete;
function q(n, far = {}) {
    const pt = (i) => [n[i], n[i + 1]];
    return { head: pt(0), sh: pt(2), el: pt(4), wr: pt(6), hip: pt(8), kn: pt(10), an: pt(12), ...far };
}
const STAND = [25, 10, 24, 15, 24, 22, 25, 29, 23, 27, 24, 35, 24, 43];
const at = (base, patch) => base.map((v, i) => (i in patch ? patch[i] : v));
const SQ_LOW = [25, 20, 22, 25, 18, 28, 21, 24, 18, 36, 26, 35, 24, 43];
const HINGE = [33, 19, 29, 22, 29, 29, 29, 36, 18, 27, 25, 35, 24, 43];
const BENCH_UP = [8, 29, 13, 31, 13, 23, 13, 16, 25, 31, 32, 35, 33, 43];
const BENCH_DN = at(BENCH_UP, { 4: 19, 5: 29, 6: 15, 7: 24 });
const PLANK_UP = [38, 28, 33, 31, 33, 38, 33, 45, 19, 36, 12, 40, 5, 43];
const SUPINE = [6, 39, 10, 42, 15, 43, 20, 43, 22, 42, 30, 42, 38, 42];
const SEATED = [23, 13, 22, 18, 22, 25, 24, 31, 21, 31, 29, 31, 30, 43];
const PULL_HANG = [26, 12, 24, 16, 24, 11, 24, 6, 23, 28, 24, 35, 24, 42];
const M = {
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
    curl: { period: 2.2, gear: "bar", size: 3, keys: [q(at(STAND, { 6: 26, 7: 29 })), q(at(STAND, { 6: 29, 7: 17 }))] },
    dbcurl: { period: 2.2, gear: "db", keys: [q(at(STAND, { 6: 26, 7: 29 })), q(at(STAND, { 6: 29, 7: 17 }))] },
    cablecurl: { period: 2.2, gear: "handle", cable: [38, 44], keys: [q(at(STAND, { 6: 26, 7: 29 })), q(at(STAND, { 6: 29, 7: 17 }))] },
    seatcurl: { period: 2.2, scene: "seat", gear: "db", keys: [q(at(SEATED, { 4: 23, 5: 25, 6: 30, 7: 28 })), q(at(SEATED, { 4: 23, 5: 25, 6: 27, 7: 18 }))] },
    wrist: { period: 1.6, scene: "seat", gear: "bar", size: 2.5, keys: [q(at(SEATED, { 4: 23, 5: 27, 6: 31, 7: 29 })), q(at(SEATED, { 4: 23, 5: 27, 6: 31, 7: 26 }))] },
    pushdown: { period: 2.2, gear: "handle", cable: [33, 0], keys: [q(at(STAND, { 6: 30, 7: 18 })), q(at(STAND, { 6: 27, 7: 29 }))] },
    overhead: { period: 2.4, gear: "db", keys: [q(at(STAND, { 4: 25, 5: 8, 6: 19, 7: 12 })), q(at(STAND, { 4: 25, 5: 8, 6: 26, 7: 1 }))] },
    skull: { period: 2.4, scene: "bench", gear: "bar", size: 3, keys: [q(at(BENCH_UP, { 4: 15, 5: 23, 6: 15, 7: 16 })), q(at(BENCH_UP, { 4: 15, 5: 23, 6: 9, 7: 25 }))] },
    kickback: { period: 2.2, gear: "db", keys: [q(at(HINGE, { 4: 24, 5: 25, 6: 25, 7: 32 })), q(at(HINGE, { 4: 24, 5: 25, 6: 17, 7: 26 }))] },
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
};
const MOVES = M;
const BY_NAME = {
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
const RULES = [
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
const BY_MUSCLE = {
    pecs: "bench", dos: "row", trapèzes: "shrug", lombaires: "superman", épaules: "ohp", biceps: "dbcurl", triceps: "pushdown",
    "avant-bras": "wrist", abdos: "crunch", quadriceps: "squat", ischios: "rdl", fessiers: "hipthrust", adducteurs: "abduction",
    mollets: "calf", "corps entier": "burpee", cardio: "jog",
};
function moveFor(name, muscle = "") {
    var _a;
    if (BY_NAME[name])
        return BY_NAME[name];
    const n = name.toLowerCase();
    for (const [re, id] of RULES)
        if (re.test(n))
            return id;
    return (_a = BY_MUSCLE[muscle.toLowerCase().trim()]) !== null && _a !== void 0 ? _a : "squat";
}
function lerpPose(a, b, k) {
    var _a;
    const out = {};
    for (const key of Object.keys(a)) {
        const pa = a[key];
        const pb = (_a = b[key]) !== null && _a !== void 0 ? _a : pa;
        if (pa && pb)
            out[key] = mixP(pa, pb, k);
    }
    for (const key of Object.keys(b))
        if (!out[key])
            out[key] = b[key];
    return out;
}
function poseAt(m, t) {
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
const EX_SIZE = 96;
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
const SHIRT = hex("#b8bdd4");
const SHIRT_D = hex("#7d83a3");
class Half {
    constructor(pc) {
        this.pc = pc;
    }
    rect(x, y, w, h, c) { this.pc.rect(x * K, y * K, w * K, h * K, c); }
    disc(x, y, r, c) { this.pc.disc(x * K, y * K, r * K, c); }
    capsule(x1, y1, x2, y2, r, c) { this.pc.capsule(x1 * K, y1 * K, x2 * K, y2 * K, r * K, c); }
    line(x1, y1, x2, y2, c) { this.pc.capsule(x1 * K, y1 * K, x2 * K, y2 * K, 0.5, c); }
    px(x, y, c) { this.pc.rect(x * K, y * K, K, K, c); }
}
const S = (p) => [p[0] * K, p[1] * K];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const along = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
function nrm(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
}
const ZONES = {
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
const ALIAS = {
    "corps entier": ["quadriceps", "fessiers", "dos", "épaules"],
    obliques: ["abdos"], gainage: ["abdos"], trapèze: ["trapèzes"], pectoraux: ["pecs"], deltoïdes: ["épaules"], épaule: ["épaules"],
    "ischio-jambiers": ["ischios"], fessier: ["fessiers"], mollet: ["mollets"], quadri: ["quadriceps"], cuisses: ["quadriceps"],
};
function litFrom(work) {
    const lit = new Map();
    if (!work)
        return lit;
    const put = (names, lvl) => {
        var _a, _b, _c;
        for (const raw of names) {
            const n = raw.toLowerCase().trim();
            for (const key of (_a = ALIAS[n]) !== null && _a !== void 0 ? _a : [n])
                for (const z of (_b = ZONES[key]) !== null && _b !== void 0 ? _b : []) {
                    const list = (_c = lit.get(z.seg)) !== null && _c !== void 0 ? _c : [];
                    if (!list.some((x) => x.z === z))
                        list.push({ z, lvl });
                    lit.set(z.seg, list);
                }
        }
    };
    put(work.main, 1);
    put(work.sec, 2);
    return lit;
}
function paint(pc, lit, seg, a, b, R, far, strength) {
    const zs = lit.get(seg);
    if (!zs)
        return;
    const n = nrm(a, b);
    for (const { z, lvl } of [...zs].sort((x, y) => y.lvl - x.lvl)) {
        const c1 = lvl === 1 ? (far ? RED_D : RED) : far ? RED_2D : RED_2;
        const c = strength < 1 && lvl === 1 ? mix(far ? RED_2D : RED_2, c1, strength) : c1;
        const o = n.map((v) => v * z.side * z.off * R);
        const p0 = add(along(a, b, Math.max(-0.2, z.a0)), o);
        const p1 = add(along(a, b, Math.min(1.1, z.a1)), o);
        pc.capsule(p0[0], p0[1], p1[0], p1[1], Math.max(1, z.rr * R - 0.3), c);
    }
}
const fig = (p, far) => {
    var _a, _b, _c, _d;
    return ({
        head: S(p.head), sh: S(p.sh), hip: S(p.hip),
        el: S(far ? (_a = p.el2) !== null && _a !== void 0 ? _a : p.el : p.el), wr: S(far ? (_b = p.wr2) !== null && _b !== void 0 ? _b : p.wr : p.wr),
        kn: S(far ? (_c = p.kn2) !== null && _c !== void 0 ? _c : p.kn : p.kn), an: S(far ? (_d = p.an2) !== null && _d !== void 0 ? _d : p.an : p.an),
    });
};
function drawLeg(pc, f, far, lit, k) {
    const o = far ? [-2, 0] : [0, 0];
    const hip = add(f.hip, o), kn = add(f.kn, o), an = add(f.an, o);
    const skin = far ? C.skinD : C.skin;
    pc.capsule(hip[0], hip[1], kn[0], kn[1], 4, skin);
    pc.capsule(kn[0], kn[1], an[0], an[1], 3, skin);
    const nb = nrm(kn, an);
    const cm = add(along(kn, an, 0.3), nb, 1);
    pc.disc(cm[0], cm[1], 3, skin);
    paint(pc, lit, "shin", kn, an, 3.2, far, k);
    const sh2 = along(hip, kn, 0.55);
    pc.capsule(hip[0], hip[1], sh2[0], sh2[1], 4.7, far ? C.shortD : C.short);
    paint(pc, lit, "thigh", hip, kn, 4.2, far, k);
    const fwd = [-nb[0], -nb[1]];
    const toe = add(an, fwd, 6);
    pc.capsule(an[0], an[1], toe[0], toe[1], 2.3, far ? C.shoeD : C.shoe);
    const sole = add(an, nb, 0);
    pc.capsule(add(sole, [nb[0] * 0, 0])[0] + (an[0] - kn[0]) / 10, sole[1] + (an[1] - kn[1]) / 10, toe[0] + (an[0] - kn[0]) / 10, toe[1] + (an[1] - kn[1]) / 10, 0.6, far ? STEEL_D : SHOE_SOLE);
}
function drawArm(pc, f, far, lit, k) {
    const o = far ? [-2, 0] : [0, 0];
    const sh = add(f.sh, o), el = add(f.el, o), wr = add(f.wr, o);
    const skin = far ? C.skinD : C.skin;
    pc.capsule(sh[0], sh[1], el[0], el[1], 3, skin);
    pc.capsule(el[0], el[1], wr[0], wr[1], 2.5, skin);
    paint(pc, lit, "fore", el, wr, 2.6, far, k);
    paint(pc, lit, "upper", sh, el, 3.1, far, k);
    const sl = along(sh, el, 0.38);
    pc.capsule(sh[0], sh[1], sl[0], sl[1], 3.7, far ? SHIRT_D : SHIRT);
    if (lit.has("upper") && lit.get("upper").some((x) => x.z === ZONES.épaules[0]))
        paint(pc, new Map([["upper", lit.get("upper").filter((x) => x.z === ZONES.épaules[0])]]), "upper", sh, el, 3.6, far, k);
    pc.disc(wr[0], wr[1], 2.6, far ? SKIN_S : C.skin);
}
function drawBody(pc, f, lit, k) {
    const { hip, sh, head } = f;
    const n = nrm(hip, sh);
    pc.capsule(hip[0], hip[1], sh[0], sh[1], 5.6, SHIRT);
    const b0 = add(along(hip, sh, 0.2), n, -3.4), b1 = add(along(hip, sh, 0.95), n, -3.4);
    pc.capsule(b0[0], b0[1], b1[0], b1[1], 1.6, SHIRT_D);
    const w = along(hip, sh, 0.2);
    pc.capsule(hip[0], hip[1], w[0], w[1], 6, C.short);
    pc.capsule(add(w, n, -5.4)[0], add(w, n, -5.4)[1], add(w, n, 5.4)[0], add(w, n, 5.4)[1], 0.6, C.shortD);
    paint(pc, lit, "torso", hip, sh, 5.6, false, k);
    pc.capsule(sh[0], sh[1], head[0], head[1], 2.3, C.skin);
    const u = (() => { const l = Math.hypot(head[0] - sh[0], head[1] - sh[1]) || 1; return [(head[0] - sh[0]) / l, (head[1] - sh[1]) / l]; })();
    const fr = [-u[1], u[0]];
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
function outline(pc) {
    const { w, h, buf } = pc;
    const src = buf.slice();
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            if (src[y * w + x])
                continue;
            if ((x > 0 && src[y * w + x - 1]) || (x < w - 1 && src[y * w + x + 1]) || (y > 0 && src[(y - 1) * w + x]) || (y < h - 1 && src[(y + 1) * w + x]))
                buf[y * w + x] = INK;
        }
}
function shadowAt(h, x, w) {
    h.pc.ellipse(x * K, 45 * K + 1, w * K, 1.5, C.shadow);
}
function scene(h, s) {
    switch (s) {
        case "bench":
            h.rect(5, 33, 28, 3, C.bench);
            h.rect(5, 35.5, 28, 0.5, C.benchD);
            h.rect(7, 36, 2, 9, C.benchD);
            h.rect(29, 36, 2, 9, C.benchD);
            shadowAt(h, 19, 15);
            break;
        case "incline":
            h.capsule(12, 24, 22, 34, 1.4, C.bench);
            h.rect(20, 34, 14, 3, C.bench);
            h.rect(21, 37, 2, 8, C.benchD);
            h.rect(31, 37, 2, 8, C.benchD);
            h.rect(11, 26, 2, 19, C.benchD);
            shadowAt(h, 22, 13);
            break;
        case "lowbench":
            h.rect(4, 32, 11, 3, C.bench);
            h.rect(5, 35, 2, 10, C.benchD);
            h.rect(12, 35, 2, 10, C.benchD);
            shadowAt(h, 22, 12);
            break;
        case "rearbench":
            h.rect(1, 33, 12, 3, C.bench);
            h.rect(2, 36, 2, 9, C.benchD);
            h.rect(10, 36, 2, 9, C.benchD);
            shadowAt(h, 24, 10);
            break;
        case "pullbar":
            h.rect(6, 5, 36, 1.5, C.bar);
            h.rect(6, 5, 2, 41, C.benchD);
            h.rect(40, 5, 2, 41, C.benchD);
            break;
        case "dips":
            h.rect(12, 22, 22, 1.5, C.bar);
            h.rect(13, 24, 2, 22, C.benchD);
            h.rect(31, 24, 2, 22, C.benchD);
            shadowAt(h, 23, 8);
            break;
        case "seat":
            h.rect(14, 32, 13, 3, C.bench);
            h.rect(19, 35, 3, 10, C.benchD);
            h.rect(15, 44, 11, 1, C.benchD);
            shadowAt(h, 22, 9);
            break;
        case "box":
            h.rect(25, 37, 16, 9, C.benchD);
            h.rect(25, 37, 16, 1, C.bench);
            shadowAt(h, 26, 12);
            break;
        case "wall":
            h.rect(8, 0, 2, 46, C.benchD);
            shadowAt(h, 20, 9);
            break;
        case "legpress":
            h.capsule(3, 25, 12, 39, 1.6, C.bench);
            h.rect(10, 38, 9, 3, C.bench);
            h.rect(13, 41, 2, 4, C.benchD);
            h.capsule(20, 44, 44, 14, 0.6, C.benchD);
            shadowAt(h, 16, 10);
            break;
        case "rower":
            h.rect(8, 41, 36, 2, C.benchD);
            h.disc(43, 36, 4, C.bench);
            h.disc(43, 36, 2, C.benchD);
            h.rect(16, 39, 9, 2, C.bench);
            break;
        case "bike":
            h.rect(14, 26, 8, 2, C.bench);
            h.rect(17, 28, 2, 10, C.benchD);
            h.capsule(18, 38, 34, 30, 0.8, C.benchD);
            h.rect(33, 21, 2, 10, C.benchD);
            h.disc(36, 38, 6, C.bench);
            h.disc(36, 38, 4, C.benchD);
            h.disc(22, 38, 2, C.bar);
            shadowAt(h, 26, 14);
            break;
        case "sled":
            h.rect(39, 16, 2, 22, C.bar);
            h.rect(38, 37, 9, 8, C.benchD);
            h.rect(38, 44, 10, 1, C.bar);
            shadowAt(h, 28, 12);
            break;
        case "step":
            h.rect(17, 44, 14, 2, C.benchD);
            shadowAt(h, 24, 8);
            break;
        case "mat":
            h.rect(2, 45, 44, 1, PAD);
            shadowAt(h, 22, 16);
            break;
        default:
            shadowAt(h, 24, 8);
    }
}
function steelPlate(h, at, r) {
    h.disc(at[0], at[1], r, STEEL_D);
    h.disc(at[0], at[1], r - 0.5, STEEL);
    h.disc(at[0], at[1], Math.max(0.8, r - 2.2), STEEL_D);
    h.disc(at[0], at[1], 0.6, STEEL_L);
    h.px(at[0] - r * 0.45, at[1] - r * 0.55, STEEL_L);
}
function gear(h, m, p, t) {
    var _a;
    const w = p.wr;
    switch (m.gear) {
        case "bar":
            steelPlate(h, w, (_a = m.size) !== null && _a !== void 0 ? _a : 4);
            break;
        case "db":
            h.rect(w[0] - 2.5, w[1] - 1.5, 1.5, 3, STEEL_D);
            h.rect(w[0] + 1, w[1] - 1.5, 1.5, 3, STEEL_D);
            h.rect(w[0] - 1, w[1] - 0.5, 2, 1, STEEL_L);
            h.rect(w[0] - 2.5, w[1] - 1.5, 1.5, 0.5, STEEL);
            break;
        case "kb":
            h.disc(w[0], w[1] + 3, 2.6, C.benchD);
            h.disc(w[0] - 0.6, w[1] + 2.4, 1.2, C.bench);
            h.capsule(w[0] - 1, w[1] + 0.5, w[0] + 1, w[1] + 0.5, 0.5, C.bar);
            break;
        case "ball":
            h.disc(w[0], w[1] - 3, 3.4, C.ball);
            h.rect(w[0] - 2, w[1] - 4.5, 2, 1, C.ballL);
            break;
        case "wheel":
            h.disc(w[0], w[1] + 2, 2.6, C.benchD);
            h.disc(w[0], w[1] + 2, 1.2, C.bar);
            break;
        case "plate":
            steelPlate(h, [w[0] + 1, w[1]], 3);
            break;
        case "handle":
            h.rect(w[0] - 1, w[1] - 1, 2.5, 2.5, C.bar);
            break;
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
function cable(h, m, p) {
    if (!m.cable)
        return;
    const [ax, ay] = m.cable;
    const post = ax < 24 ? Math.max(0, ax - 3) : Math.min(46, ax + 1);
    h.rect(post, 0, 2, 46, C.benchD);
    h.disc(ax, ay, 1.5, C.bench);
    h.disc(ax, ay, 0.6, C.benchD);
    h.line(ax, ay, p.wr[0], p.wr[1], CABLE);
}
function drawMove(pc, id, t, work) {
    var _a, _b;
    const m = (_a = MOVES[id]) !== null && _a !== void 0 ? _a : MOVES.squat;
    const { p, k } = poseAt(m, t);
    const lit = litFrom(work);
    const effort = 0.55 + 0.45 * k;
    const h = new Half(pc);
    pc.clear(0);
    scene(h, m.scene);
    cable(h, m, p);
    const near = fig(p, false), far = fig(p, true);
    const lying = m.scene === "bench" || m.scene === "lowbench" || m.scene === "incline" || m.scene === "legpress";
    if (!lying || p.kn2)
        drawLeg(pc, far, true, lit, effort);
    drawArm(pc, far, true, lit, effort);
    if (m.gear === "bar" && m.behind)
        steelPlate(h, p.wr, (_b = m.size) !== null && _b !== void 0 ? _b : 4);
    drawBody(pc, near, lit, effort);
    drawLeg(pc, near, false, lit, effort);
    if (m.scene === "legpress")
        h.capsule(p.an[0] - 2, p.an[1] + 4, p.an[0] + 3, p.an[1] - 5, 1, C.bench);
    if (m.scene === "rower" || m.scene === "bike")
        h.rect(p.hip[0] - 2, p.hip[1] + 1.5, 6, 1, C.bench);
    drawArm(pc, near, false, lit, effort);
    if (!(m.gear === "bar" && m.behind))
        gear(h, m, p, t);
    outline(pc);
    pc.rect(0, 92, 96, 2, C.floor);
}
function stillOf(id) {
    var _a;
    const m = (_a = MOVES[id]) !== null && _a !== void 0 ? _a : MOVES.squat;
    return m.keys.length === 2 ? m.period * 0.43 : m.period * (1 - 0.15 / m.keys.length);
}

return { MOVES, moveFor, EX_SIZE, drawMove, stillOf };
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
const { EX_SIZE, drawMove, moveFor, stillOf } = M_pixel_moves;
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
const live = new Map();
let exRaf = 0;
const exTick = (now) => {
    let any = false;
    for (const [el, l] of live) {
        if (!el.isConnected) {
            live.delete(el);
            exIO === null || exIO === void 0 ? void 0 : exIO.unobserve(el);
            continue;
        }
        if (l.on) {
            l.draw(now / 1000);
            any = true;
        }
    }
    exRaf = any && !document.hidden ? requestAnimationFrame(exTick) : 0;
};
const exWake = () => { if (!exRaf && !reduce)
    exRaf = requestAnimationFrame(exTick); };
const exIO = "IntersectionObserver" in window
    ? new IntersectionObserver((es) => { for (const e of es) {
        const l = live.get(e.target);
        if (l)
            l.on = e.isIntersecting;
    } exWake(); })
    : null;
document.addEventListener("visibilitychange", exWake);
let bySrc = null;
function exBySrc(src) {
    var _a, _b;
    if (!bySrc) {
        bySrc = new Map();
        const lib = window.TempoExercices;
        for (const e of (_a = lib === null || lib === void 0 ? void 0 : lib.list) !== null && _a !== void 0 ? _a : [])
            for (const f of (_b = e.img) !== null && _b !== void 0 ? _b : [])
                bySrc.set(f.split("/").pop(), e);
    }
    return bySrc.get(decodeURIComponent(src.split("/").pop() || ""));
}
const phase = (s) => { let h = 0; for (const c of s)
    h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0) % 997 / 997; };
const workOf = (muscle = "", sec = "") => ({ main: muscle ? [muscle] : [], sec: sec.split(/,\s*/).filter(Boolean) });
function exCanvas(host, id, key, cls, work) {
    const c = document.createElement("canvas");
    c.className = cls;
    c.setAttribute("aria-hidden", "true");
    host.append(c);
    const pc = new PixelCanvas(c, EX_SIZE, EX_SIZE);
    const off = phase(key) * 3;
    const draw = (t) => { drawMove(pc, id, t + off, work); pc.flush(); };
    draw(stillOf(id));
    if (reduce || !exIO)
        return c;
    live.set(c, { draw, el: c, on: false });
    exIO.observe(c);
    return c;
}
function mountExercises(root = document) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    for (const box of root.querySelectorAll("#carnet .xp-thumb:not(.lb-px), #carnet .exthumb:not(.lb-px)")) {
        const img = box.querySelector("img");
        let info = img ? exBySrc(img.getAttribute("src") || "") : undefined;
        if (!info) {
            const item = box.closest(".xp-item, .excard");
            const name = (_b = (_a = item === null || item === void 0 ? void 0 : item.querySelector(".xp-txt b, h3 .exlink")) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.replace(/\s*ⓘ\s*$/, "").trim();
            if (!name)
                continue;
            info = { name, muscle: (_e = (_d = (_c = item === null || item === void 0 ? void 0 : item.querySelector(".xp-txt small")) === null || _c === void 0 ? void 0 : _c.textContent) === null || _d === void 0 ? void 0 : _d.split("·")[0]) !== null && _e !== void 0 ? _e : "" };
        }
        box.classList.add("lb-px");
        exCanvas(box, moveFor(info.name, info.muscle), info.name, "lb-ex", workOf(info.muscle, info.sec));
    }
    for (const fig of root.querySelectorAll("#carnet .xf-photo:not(.lb-done), #carnet .xf-anim:not(.lb-done)")) {
        fig.classList.add("lb-done");
        const sheet = (_f = fig.closest(".j-sheet, .sheet, [role=dialog]")) !== null && _f !== void 0 ? _f : document;
        const name = ((_h = (_g = sheet.querySelector(".xf-top .h2")) === null || _g === void 0 ? void 0 : _g.textContent) === null || _h === void 0 ? void 0 : _h.trim()) || ((_k = (_j = fig.querySelector("img")) === null || _j === void 0 ? void 0 : _j.getAttribute("alt")) === null || _k === void 0 ? void 0 : _k.split(" : ")[0]) || "";
        const muscle = (_m = (_l = sheet.querySelector(".xf-m1")) === null || _l === void 0 ? void 0 : _l.textContent) !== null && _m !== void 0 ? _m : "";
        const sec = [...sheet.querySelectorAll(".xf-m2")].map((x) => { var _a; return (_a = x.textContent) !== null && _a !== void 0 ? _a : ""; }).join(", ");
        const wrap = document.createElement("div");
        wrap.className = "lb-exfig";
        fig.before(wrap);
        exCanvas(wrap, moveFor(name, muscle), name, "lb-ex", workOf(muscle, sec));
        fig.classList.add("lb-hide");
        const bar = document.createElement("div");
        bar.className = "lb-exbar";
        bar.innerHTML = `<span class="lb-exkey"><i class="k1"></i>Travaille surtout</span>${sec ? `<span class="lb-exkey"><i class="k2"></i>Aide</span>` : ""}`;
        wrap.after(bar);
        if (fig.matches(".xf-photo")) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "lb-exphotos";
            b.textContent = "Voir les photos";
            b.setAttribute("aria-expanded", "false");
            b.onclick = () => {
                const open = fig.classList.toggle("lb-hide") === false;
                b.textContent = open ? "Masquer les photos" : "Voir les photos";
                b.setAttribute("aria-expanded", String(open));
            };
            bar.append(b);
        }
    }
}
function watchExercises() {
    if (!document.getElementById("carnet"))
        return;
    mountExercises();
    let queued = false;
    new MutationObserver(() => {
        if (queued)
            return;
        queued = true;
        requestAnimationFrame(() => { queued = false; mountExercises(); });
    }).observe(document.body, { childList: true, subtree: true });
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
    watchExercises();
    document.addEventListener("pointerdown", sparks, { passive: true });
}
if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
else
    init();

return {  };
})();
})();
