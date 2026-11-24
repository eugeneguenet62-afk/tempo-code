// Tempo « Labo » : petites touches visuelles, indépendantes de la logique de l'app.
// 1. Un badge animé en pixels à côté du titre de chaque page (le sport de la page).
// 2. Des étincelles carrées quand on touche un bouton.
// Compilé en labo.js (voir README-LABO.md). Rien n'est enregistré, rien n'est envoyé.
import { PixelCanvas } from "./pixel/canvas";
import { drawAthlete, type ExerciseId } from "./pixel/athlete";
import { drawPlate } from "./pixel/food";

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
  document.addEventListener("pointerdown", sparks, { passive: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
