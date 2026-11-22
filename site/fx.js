/* Effets visuels : fond en lignes fines par sport, menu déroulant, en-tête au défilement, animations des résultats. */
(function () {
  "use strict";
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const circle = (cx, cy, r, cls, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" class="${cls}" ${extra}/>`;

  /* ---------- Fonds ---------- */
  const BG = {
    // Couloirs d'une piste, un point qui tourne dans le sens de la course
    piste() {
      const cx = 1150, cy = 520, L = 560;
      const lane = (r) => `M${cx - L / 2},${cy + r}h${L}a${r},${r} 0 0 0 0,${-2 * r}h${-L}a${r},${r} 0 0 0 0,${2 * r}Z`;
      let s = `<g transform="rotate(-10 ${cx} ${cy})">`;
      for (let i = 0; i < 4; i++) s += `<path d="${lane(220 + i * 44)}" class="m-line"/>`;
      s += `<circle r="5" class="m-dot"><animateMotion dur="32s" repeatCount="indefinite" path="${lane(242)}"/></circle>`;
      return s + "</g>";
    },
    // Un tracé d'électrocardiogramme et son battement
    coeur() {
      const y = 520;
      let d = `M-320,${y}`;
      for (let x = -320; x < 1920; x += 320)
        d += `H${x + 60}q20,-30 40,0H${x + 130}l10,12l12,-160l12,190l8,-42H${x + 210}q30,-64 60,0H${x + 320}`;
      return `<path d="${d}" class="m-line"/><path d="${d}" pathLength="1000" class="m-pulse"/>`;
    },
    // Un disque de fonte vu de face
    fonte() {
      const cx = 1200, cy = 520;
      return circle(cx, cy, 390, "m-line") + circle(cx, cy, 350, "m-line") + circle(cx, cy, 130, "m-line") + circle(cx, cy, 26, "m-line") +
        `<g class="spin" style="--d:140s">${circle(cx, cy, 250, "m-line", 'stroke-dasharray="2 18" style="stroke-width:3"')}</g>`;
    },
  };

  // Cadran de dépense énergétique, aiguille qui balaie lentement
  BG.jauge = () => {
    const cx = 1180, cy = 760, r = 420;
    let s = `<path d="M${cx - r},${cy}A${r},${r} 0 0 1 ${cx + r},${cy}" class="m-line"/><path d="M${cx - r + 70},${cy}A${r - 70},${r - 70} 0 0 1 ${cx + r - 70},${cy}" class="m-line"/>`;
    for (let i = 0; i <= 40; i++) {
      const a = Math.PI + (i * Math.PI) / 40, r2 = r - (i % 5 ? 16 : 34);
      s += `<path d="M${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}L${(cx + r2 * Math.cos(a)).toFixed(1)},${(cy + r2 * Math.sin(a)).toFixed(1)}" class="m-line"/>`;
    }
    return s + `<g class="needle"><path d="M${cx},${cy}L${cx},${cy - r + 90}"/></g><circle cx="${cx}" cy="${cy}" r="9" class="m-dot"/>`;
  };
  BG.accueil = BG.piste;
  const kind = document.body.dataset.bg;
  if (BG[kind]) {
    const bg = document.createElement("div");
    bg.className = "bg";
    bg.setAttribute("aria-hidden", "true");
    bg.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">${BG[kind]()}</svg>`;
    if (calm) bg.querySelectorAll("animateMotion").forEach((a) => a.remove());
    document.body.prepend(bg);
  }

  /* ---------- Pastille d'intro : reprend l'icône de l'outil dans le menu ---------- */
  const curIcon = $('.menu-panel a[aria-current="page"] svg');
  const eyebrow = $(".intro .eyebrow, .j-intro .eyebrow, .cf-intro .eyebrow");
  if (curIcon && eyebrow && !eyebrow.querySelector("svg")) eyebrow.prepend(curIcon.cloneNode(true));

  /* ---------- En-tête : fond seulement après défilement ---------- */
  const top = $(".top");
  if (top) {
    const onScroll = () => top.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Menu déroulant ---------- */
  const btn = $("#menu-btn"), panel = $("#menu-panel");
  if (btn && panel) {
    const set = (open) => { btn.setAttribute("aria-expanded", String(open)); panel.classList.toggle("open", open); };
    btn.addEventListener("click", (e) => { e.stopPropagation(); set(btn.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("click", (e) => { if (!panel.contains(e.target)) set(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("open")) { set(false); btn.focus(); } });
    panel.addEventListener("focusout", (e) => { if (!panel.contains(e.relatedTarget) && e.relatedTarget !== btn) set(false); });
  }

  /* ---------- Sélecteurs : pastille qui glisse ---------- */
  $$(".seg").forEach((seg) => {
    const ind = document.createElement("span");
    ind.className = "seg-ind";
    seg.prepend(ind);
    seg.classList.add("has-ind");
    const place = () => {
      const b = $('button[aria-pressed="true"]', seg);
      if (!b) return;
      ind.style.width = b.offsetWidth + "px";
      ind.style.height = b.offsetHeight + "px";
      ind.style.transform = `translate(${b.offsetLeft}px, ${b.offsetTop}px)`;
    };
    place();
    requestAnimationFrame(() => requestAnimationFrame(() => seg.classList.add("ready")));
    seg.addEventListener("click", () => requestAnimationFrame(place));
    window.addEventListener("resize", place);
    if (document.fonts) document.fonts.ready.then(place);
  });

  /* ---------- Résultats qui changent ---------- */
  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  $$(".zone .bpm, #r-goal").forEach((el) => {
    let prev = el.textContent;
    new MutationObserver(() => { if (el.textContent !== prev) { prev = el.textContent; replay(el, "tick"); } })
      .observe(el, { childList: true, characterData: true, subtree: true });
  });
  // Dans une liste reconstruite, seules les lignes modifiées s'animent
  $$("tbody[id], #r-weeks").forEach((el) => {
    let prev = $$(":scope > *", el).map((c) => c.textContent);
    new MutationObserver(() => {
      const kids = $$(":scope > *", el), now = kids.map((c) => c.textContent);
      const rebuilt = now.length !== prev.length;
      kids.forEach((c, i) => {
        if (rebuilt) { c.style.setProperty("--i", Math.min(i, 12)); c.classList.add("enter"); }
        else if (now[i] !== prev[i]) c.classList.add("flash");
      });
      prev = now;
    }).observe(el, { childList: true });
  });
})();

/* Arrivée depuis un raccourci de l'accueil (…#ajouter) : le formulaire d'ajout s'ouvre directement */
(function () {
  if (location.hash !== "#ajouter") return;
  const go = () => setTimeout(() => {
    const b = document.querySelector('.j-app [data-a="add"]');
    if (b) { b.click(); try { history.replaceState(null, "", location.pathname); } catch (_) {} }
  }, 200);
  if (document.readyState === "complete") go(); else window.addEventListener("load", go);
})();

/* Onglets d'une page (ex. Calories) : une seule section affichée à la fois, choisie aussi par l'adresse (#sport) */
(function () {
  const nav = document.querySelector(".ptabs"); if (!nav) return;
  const links = Array.from(nav.querySelectorAll("a[href^='#']"));
  const secs = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
  function show(id, scroll) {
    if (!secs.some((s) => s.id === id)) id = secs[0].id;
    secs.forEach((s) => (s.hidden = s.id !== id));
    links.forEach((a) => (a.getAttribute("href") === "#" + id ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    window.dispatchEvent(new Event("resize"));
    if (scroll) { const y = nav.getBoundingClientRect().top + window.scrollY - 76; if (window.scrollY > y) window.scrollTo({ top: y }); }
  }
  nav.addEventListener("click", (e) => { const a = e.target.closest("a"); if (!a) return; e.preventDefault(); const id = a.getAttribute("href").slice(1); try { history.replaceState(null, "", "#" + id); } catch (_) {} show(id, true); });
  window.addEventListener("hashchange", () => show(location.hash.slice(1)));
  show(location.hash.slice(1));
})();
