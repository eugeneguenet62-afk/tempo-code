/* Tempo : visite guidée de l'exemple.
   Lancée par « Voir un exemple ». Elle passe de page en page, éclaire l'endroit où cliquer et explique quoi faire.
   L'étape en cours est gardée dans sessionStorage (« tempo-tour ») : elle survit au changement de page, pas à la fermeture. */
(function () {
  "use strict";
  if (window.TempoTour) return;
  const KEY = "tempo-tour";
  const STEPS = [
    { page: "index.html", sel: [".gnav"], t: "Tout part de cette barre",
      x: "Cinq rubriques : l'accueil, la musculation, la course, vos autres sports et la nutrition. Touchez-en une pour y aller." },
    { page: "index.html", sel: [".h-quick"], t: "Noter en un geste",
      x: "Ces raccourcis ouvrent directement le bon formulaire : séance de muscu, sortie de course, autre sport ou repas." },
    { page: "index.html", sel: ["#h-week", ".h-today"], t: "Votre semaine",
      x: "Le bilan se remplit tout seul à partir de vos carnets : séances, kilomètres, records battus." },
    { page: "carnet.html", sel: ['[data-a="start"]'], t: "Lancer une séance de muscu",
      x: "Le carnet propose la séance du jour avec la charge à viser. Notez le poids et les répétitions : le chrono de repos démarre tout seul." },
    { page: "carnet.html", sel: ["#carnet .tabs .in"], t: "Voir ses progrès",
      x: "Historique de vos séances, Progrès (courbes et records), Corps (poids, mensurations) et Programme (vos jours d'entraînement à modifier)." },
    { page: "carnet-course.html", sel: ['.j-btn.big[data-a="add"]', ".j-fab"], t: "Noter une sortie",
      x: "Distance et temps suffisent : Tempo calcule l'allure, le total de la semaine et vos records." },
    { page: "multisport.html", sel: [".m-charge .m-ch-head", ".m-charge"], t: "Rugby et autres sports",
      x: "Chaque sport a ses propres questions (poste, temps de jeu, plaquages…). Ce score compare vos 7 derniers jours à vos habitudes : en « zone idéale », vous progressez sans trop en faire." },
    { page: "nutrition.html", sel: [".n-sum"], t: "Ce qu'il faut manger",
      x: "L'objectif du jour suit vos séances : il monte les jours d'entraînement ou de match, il baisse les jours de repos." },
    { page: "nutrition.html", sel: [".n-ways"], t: "Ajouter un repas",
      x: "Photographiez l'assiette sous plusieurs angles, cherchez un aliment, ou scannez le code-barres d'un produit." },
    { page: "nutrition.html", sel: ['.guest-bar a[href="compte.html"]', ".acct"], t: "À vous de jouer", end: true,
      x: "Tout ce que vous avez vu est un exemple, effacé à la fermeture du site. Créez un compte gratuit pour enregistrer vos propres séances." },
  ];

  // Cloudflare Pages retire « .html » des adresses (/carnet.html devient /carnet) : on compare sans l'extension
  const bare = (x) => (String(x || "").split("/").pop().replace(/\.html$/, "") || "index");
  const here = () => bare(location.pathname);
  const onPage = (s) => bare(s.page) === here();
  const getStep = () => { try { const v = sessionStorage.getItem(KEY); return v == null ? null : +v; } catch (_) { return null; } };
  const setStep = (i) => { try { if (i == null) sessionStorage.removeItem(KEY); else sessionStorage.setItem(KEY, String(i)); } catch (_) {} };

  let ring, card, target, idx = null, raf = 0;
  const visible = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; };
  const find = (s) => { for (const q of s.sel) { const el = [...document.querySelectorAll(q)].find(visible); if (el) return el; } return null; };

  function build() {
    if (ring) return;
    const st = document.createElement("style");
    st.textContent = `
.tour-ring{position:fixed;z-index:1000;border-radius:16px;pointer-events:none;box-shadow:0 0 0 3px #ff8fb0,0 0 0 9999px rgba(6,8,22,.74);transition:top .3s,left .3s,width .3s,height .3s}
.tour-block{position:fixed;inset:0;z-index:999}
.tour-card{position:fixed;z-index:1001;width:min(360px,calc(100vw - 24px));background:#1e2344;color:#f1f2fa;border:1px solid #3a4170;border-radius:18px;padding:16px 18px 14px;box-shadow:0 20px 50px -12px rgba(0,0,0,.7);font:400 15px/1.5 var(--body,system-ui)}
.tour-card small{display:block;color:#a3a8c3;font-size:12.5px;margin-bottom:2px}
.tour-card h2{font:800 18px/1.25 var(--display,system-ui);margin:0 0 6px;letter-spacing:-.01em;color:#f1f2fa}
.tour-card p{margin:0;color:#d5d8ea}
.tour-dots{display:flex;gap:4px;margin:12px 0 0}
.tour-dots i{flex:1;height:4px;border-radius:4px;background:#3a4170}
.tour-dots i.on{background:#ff8fb0}
.tour-act{display:flex;gap:8px;justify-content:flex-end;align-items:center;margin-top:12px}
.tour-act button,.tour-act a{font:700 14.5px/1 var(--body,system-ui);border:0;border-radius:999px;padding:11px 16px;cursor:pointer;text-decoration:none}
.tour-skip{background:none;color:#a3a8c3;margin-right:auto;padding-left:0!important}
.tour-prev{background:#2a3058;color:#f1f2fa}
.tour-next{background:linear-gradient(120deg,#9a83ff,#ff6b95 55%,#ffa557);color:#0d1024}
.tour-card :focus-visible{outline:2px solid #fff;outline-offset:2px}
@media (prefers-reduced-motion:reduce){.tour-ring{transition:none}}`;
    document.head.appendChild(st);
    const block = document.createElement("div"); block.className = "tour-block";
    ring = document.createElement("div"); ring.className = "tour-ring";
    card = document.createElement("div"); card.className = "tour-card"; card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true"); card.setAttribute("aria-labelledby", "tour-t");
    document.body.append(block, ring, card);
    card.addEventListener("click", (e) => {
      const b = e.target.closest("[data-t]"); if (!b) return;
      if (b.dataset.t === "next") go(idx + 1);
      else if (b.dataset.t === "prev") go(idx - 1);
      else if (b.dataset.t === "skip") stop();
      else if (b.dataset.t === "signup") { setStep(null); }
    });
    block.addEventListener("click", () => card.querySelector(".tour-next").focus());
    document.addEventListener("keydown", (e) => {
      if (!ring) return;
      if (e.key === "Escape") stop();
      else if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft" && idx > 0) go(idx - 1);
    });
    addEventListener("resize", place); addEventListener("scroll", place, { passive: true });
  }

  function place() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      if (!ring || !target) return;
      const r = target.getBoundingClientRect(), pad = 6, vw = innerWidth, vh = innerHeight;
      Object.assign(ring.style, { top: r.top - pad + "px", left: r.left - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
      // La bulle va du côté où il y a le plus de place, sans sortir de l'écran
      const ch = card.offsetHeight, cw = card.offsetWidth, gap = 14;
      const below = vh - r.bottom, above = r.top;
      let top = below >= ch + gap + 10 || below >= above ? r.bottom + pad + gap : r.top - pad - gap - ch;
      top = Math.max(10, Math.min(vh - ch - 10, top));
      let left = Math.max(12, Math.min(vw - cw - 12, r.left + r.width / 2 - cw / 2));
      Object.assign(card.style, { top: top + "px", left: left + "px" });
    });
  }

  function show(i) {
    const s = STEPS[i];
    const el = find(s);
    if (!el) { if (i + 1 < STEPS.length) return go(i + 1); return stop(); }   // élément absent : étape suivante
    build(); idx = i; target = el; setStep(i);
    const last = i === STEPS.length - 1;
    card.innerHTML = `<small>Visite guidée · ${i + 1} sur ${STEPS.length}</small><h2 id="tour-t"></h2><p></p>
      <div class="tour-dots">${STEPS.map((_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div>
      <div class="tour-act"><button type="button" class="tour-skip" data-t="skip">${last ? "Fermer" : "Quitter la visite"}</button>
      ${i > 0 ? '<button type="button" class="tour-prev" data-t="prev">Retour</button>' : ""}
      ${last ? '<a class="tour-next" data-t="signup" href="compte.html">Créer mon compte</a>' : '<button type="button" class="tour-next" data-t="next">Suivant</button>'}</div>`;
    card.querySelector("h2").textContent = s.t;
    card.querySelector("p").textContent = s.x;
    el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    place(); setTimeout(place, 350); setTimeout(place, 800);
    card.querySelector(".tour-next").focus({ preventScroll: true });
  }

  function go(i) {
    if (i < 0) return;
    if (i >= STEPS.length) return stop();
    const s = STEPS[i];
    if (!onPage(s)) { setStep(i); location.href = s.page; return; }
    show(i);
  }

  function stop() {
    setStep(null); target = null;
    document.querySelectorAll(".tour-ring,.tour-card,.tour-block").forEach((x) => x.remove());
    ring = card = null;
  }

  // Démarrage : on attend que la page ait dessiné ses carnets
  function resume() {
    const i = getStep(); if (i == null || !STEPS[i]) return;
    if (!onPage(STEPS[i])) { setStep(null); return; }   // on a quitté la visite en changeant de page
    let tries = 0;
    const wait = () => { if (find(STEPS[i]) || tries++ > 20) show(i); else setTimeout(wait, 150); };
    setTimeout(wait, 250);
  }
  window.TempoTour = { start: () => { setStep(0); go(0); }, resume, stop };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", resume); else resume();
})();
