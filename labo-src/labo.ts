// Tempo « Labo » : petites touches visuelles, indépendantes de la logique de l'app.
// 1. Un badge animé en pixels à côté du titre de chaque page (le sport de la page).
// 2. Des étincelles carrées quand on touche un bouton.
// Compilé en labo.js (voir README-LABO.md). Rien n'est enregistré, rien n'est envoyé.
import { PixelCanvas } from "./pixel/canvas";
import { drawAthlete, type ExerciseId } from "./pixel/athlete";
import { drawPlate } from "./pixel/food";
import { EX_SIZE, drawMove, moveFor, stillOf, type MoveId, type Work } from "./pixel/moves";

type Kind = ExerciseId | "plate";

const byPage: Record<string, Kind> = {
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
const bySport: Record<string, Kind> = { fonte: "bench", piste: "run", coeur: "run", velo: "run", jauge: "plate", accueil: "squat" };

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

function mountBadge() {
  const h1 = document.querySelector<HTMLElement>(".intro h1, .j-intro h1, .cf-intro h1");
  if (!h1 || h1.closest(".lb-head")) return;
  // Cloudflare Pages sert /carnet pour /carnet.html : on remet l'extension pour retrouver la page
  const last = location.pathname.split("/").pop() || "index";
  const page = /\.html$/.test(last) ? last : last + ".html";
  const kind: Kind = byPage[page] ?? bySport[document.body.dataset.bg ?? ""] ?? "squat";

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

/** Anime une toile en pixels tant qu'elle est visible ; image fixe si l'utilisateur limite les animations. */
function animate(canvas: HTMLCanvasElement, watch: Element, kind: Kind, still: number) {
  const w = kind === "plate" ? 72 : 48;
  const pc = new PixelCanvas(canvas, w, 48);
  const draw = (t: number) => {
    if (kind === "plate") drawPlate(pc, t);
    else drawAthlete(pc, kind, t);
    pc.flush();
  };
  draw(reduce ? still : 0);
  if (reduce) return;

  let raf = 0;
  let t = 0;
  let last = 0;
  const frame = (now: number) => {
    t += last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    draw(t);
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (raf || document.hidden) return;
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
    if (visible) start();
    else stop();
  }).observe(watch);
  document.addEventListener("visibilitychange", () => (document.hidden || !visible ? stop() : start()));
}


/** Accueil : les deux illustrations deviennent des scènes en pixels. */
function mountHomeTiles() {
  for (const [sel, kind] of [[".h-tile-run", "run"], [".h-tile-lift", "squat"]] as const) {
    const tile = document.querySelector<HTMLElement>(sel);
    if (!tile || tile.querySelector("canvas")) continue;
    const c = document.createElement("canvas");
    c.className = "lb-tile";
    tile.classList.add("lb-pixel");
    tile.append(c);
    animate(c, tile, kind, kind === "run" ? 0.3 : 1.3);
  }
}

/** Accueil : un athlète en pixels dans chaque raccourci. */
function mountQuick() {
  const kinds: [string, Kind][] = [["carnet.html", "bench"], ["carnet-course.html", "run"], ["multisport.html", "rugby"], ["nutrition.html", "plate"]];
  for (const a of document.querySelectorAll<HTMLAnchorElement>(".h-quick a")) {
    if (a.querySelector("canvas")) continue;
    const href = a.getAttribute("href") ?? "";
    const k = kinds.find(([h]) => href.startsWith(h));
    if (!k) continue;
    const c = document.createElement("canvas");
    c.className = "lb-quick";
    c.setAttribute("aria-hidden", "true");
    a.append(c);
    animate(c, a, k[1], 1.1);
  }
}

/* ---------- Exercices du carnet : athlètes en pixels à la place des photos ---------- */

type Live = { draw: (t: number) => void; el: Element; on: boolean };
const live = new Map<Element, Live>();
let exRaf = 0;
const exTick = (now: number) => {
  let any = false;
  for (const [el, l] of live) {
    if (!el.isConnected) { live.delete(el); exIO?.unobserve(el); continue; }
    if (l.on) { l.draw(now / 1000); any = true; }
  }
  exRaf = any && !document.hidden ? requestAnimationFrame(exTick) : 0;
};
const exWake = () => { if (!exRaf && !reduce) exRaf = requestAnimationFrame(exTick); };
const exIO = "IntersectionObserver" in window
  ? new IntersectionObserver((es) => { for (const e of es) { const l = live.get(e.target); if (l) l.on = e.isIntersecting; } exWake(); })
  : null;
document.addEventListener("visibilitychange", exWake);

type ExInfo = { name: string; muscle?: string; sec?: string; img?: string[] };
let bySrc: Map<string, ExInfo> | null = null;
function exBySrc(src: string): ExInfo | undefined {
  if (!bySrc) {
    bySrc = new Map();
    const lib = (window as unknown as { TempoExercices?: { list: ExInfo[] } }).TempoExercices;
    for (const e of lib?.list ?? []) for (const f of e.img ?? []) bySrc.set(f.split("/").pop()!, e);
  }
  return bySrc.get(decodeURIComponent(src.split("/").pop() || ""));
}

/** Petit décalage propre à chaque exercice, pour que la liste ne bouge pas d'un bloc. */
const phase = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0) % 997 / 997; };

const workOf = (muscle = "", sec = ""): Work => ({ main: muscle ? [muscle] : [], sec: sec.split(/,\s*/).filter(Boolean) });

function exCanvas(host: Element, id: MoveId, key: string, cls: string, work: Work) {
  const c = document.createElement("canvas");
  c.className = cls;
  c.setAttribute("aria-hidden", "true");
  host.append(c);
  const pc = new PixelCanvas(c, EX_SIZE, EX_SIZE);
  const off = phase(key) * 3;
  const draw = (t: number) => { drawMove(pc, id, t + off, work); pc.flush(); };
  draw(stillOf(id));
  if (reduce || !exIO) return c;
  live.set(c, { draw, el: c, on: false });
  exIO.observe(c);
  return c;
}

function mountExercises(root: ParentNode = document) {
  // vignettes (liste de choix, cartes de séance)
  for (const box of root.querySelectorAll<HTMLElement>("#carnet .xp-thumb:not(.lb-px), #carnet .exthumb:not(.lb-px)")) {
    const img = box.querySelector("img");
    let info = img ? exBySrc(img.getAttribute("src") || "") : undefined;
    if (!info) {
      const item = box.closest(".xp-item, .excard");
      const name = item?.querySelector(".xp-txt b, h3 .exlink")?.textContent?.replace(/\s*ⓘ\s*$/, "").trim();
      if (!name) continue;
      info = { name, muscle: item?.querySelector(".xp-txt small")?.textContent?.split("·")[0] ?? "" };
    }
    box.classList.add("lb-px");
    exCanvas(box, moveFor(info.name, info.muscle), info.name, "lb-ex", workOf(info.muscle, info.sec));
  }
  // fiche d'un exercice : grande animation, photos sur demande
  for (const fig of root.querySelectorAll<HTMLElement>("#carnet .xf-photo:not(.lb-done), #carnet .xf-anim:not(.lb-done)")) {
    fig.classList.add("lb-done");
    const sheet = fig.closest(".j-sheet, .sheet, [role=dialog]") ?? document;
    const name = sheet.querySelector(".xf-top .h2")?.textContent?.trim() || fig.querySelector("img")?.getAttribute("alt")?.split(" : ")[0] || "";
    const muscle = sheet.querySelector(".xf-m1")?.textContent ?? "";
    const sec = [...sheet.querySelectorAll(".xf-m2")].map((x) => x.textContent ?? "").join(", ");
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
  if (!document.getElementById("carnet")) return;
  mountExercises();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; mountExercises(); });
  }).observe(document.body, { childList: true, subtree: true });
}

const SPARK = ".btn, .j-btn.primary, .j-fab, #carnet .btn.primary, .gnav a";
const colors = ["var(--accent)", "#ffffff", "#ffa557", "#9a83ff"];

function sparks(e: PointerEvent) {
  if (reduce) return;
  const target = (e.target as Element | null)?.closest?.(SPARK);
  if (!target) return;
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

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
