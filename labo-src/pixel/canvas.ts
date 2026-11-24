// Toile de pixel art : un tampon basse résolution (Uint32, un mot par pixel)
// que le CSS agrandit sans lissage (`image-rendering: pixelated`).

export type Color = number;

/** "#rrggbb" → mot ABGR (ordre mémoire d'ImageData en petit-boutiste). */
export function hex(h: string, a = 255): Color {
  const n = parseInt(h.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/** Mélange deux couleurs (t entre 0 et 1). */
export function mix(c1: Color, c2: Color, t: number): Color {
  const r = (c1 & 255) + ((c2 & 255) - (c1 & 255)) * t;
  const g = ((c1 >> 8) & 255) + (((c2 >> 8) & 255) - ((c1 >> 8) & 255)) * t;
  const b = ((c1 >> 16) & 255) + (((c2 >> 16) & 255) - ((c1 >> 16) & 255)) * t;
  return ((255 << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0;
}

/** Bruit déterministe par pixel, entre 0 et 1. */
export function noise(x: number, y: number, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class PixelCanvas {
  readonly w: number;
  readonly h: number;
  readonly buf: Uint32Array;
  private img: ImageData;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, w: number, h: number) {
    this.w = w;
    this.h = h;
    canvas.width = w;
    canvas.height = h;
    this.ctx = canvas.getContext("2d")!;
    this.img = this.ctx.createImageData(w, h);
    this.buf = new Uint32Array(this.img.data.buffer);
  }

  clear(c: Color = 0) {
    this.buf.fill(c);
  }

  px(x: number, y: number, c: Color) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.buf[y * this.w + x] = c;
  }

  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.buf[y * this.w + x];
  }

  rect(x: number, y: number, w: number, h: number, c: Color) {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    for (let j = 0; j < Math.round(h); j++) for (let i = 0; i < Math.round(w); i++) this.px(x0 + i, y0 + j, c);
  }

  disc(cx: number, cy: number, r: number, c: Color) {
    const R = Math.ceil(r);
    for (let j = -R; j <= R; j++)
      for (let i = -R; i <= R; i++) if (i * i + j * j <= r * r + r * 0.6) this.px(cx + i, cy + j, c);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: Color) {
    for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++)
      for (let i = -Math.ceil(rx); i <= Math.ceil(rx); i++) if ((i * i) / (rx * rx) + (j * j) / (ry * ry) <= 1.05) this.px(cx + i, cy + j, c);
  }

  /** Segment épais (capsule) entre deux points. */
  capsule(x1: number, y1: number, x2: number, y2: number, r: number, c: Color) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.ceil(len * 1.5));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      this.disc(lerp(x1, x2, t), lerp(y1, y2, t), r, c);
    }
  }

  line(x1: number, y1: number, x2: number, y2: number, c: Color) {
    this.capsule(x1, y1, x2, y2, 0, c);
  }

  /** Sprite en texte : un caractère par pixel, « . » transparent. */
  sprite(rows: readonly string[], pal: Record<string, Color>, x: number, y: number, opts: { flip?: boolean; reveal?: number; seed?: number } = {}) {
    const { flip = false, reveal = 1, seed = 0 } = opts;
    const w = rows[0].length;
    for (let j = 0; j < rows.length; j++)
      for (let i = 0; i < w; i++) {
        const ch = rows[j][flip ? w - 1 - i : i];
        if (ch === "." || !pal[ch]) continue;
        if (reveal < 1 && noise(i, j, seed) > reveal) continue;
        this.px(x + i, y + j, pal[ch]);
      }
  }

  flush() {
    this.ctx.putImageData(this.img, 0, 0);
  }
}
