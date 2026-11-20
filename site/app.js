/* Logique des calculateurs. Chaque outil ne s'initialise que si son formulaire est présent dans la page. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const num = (el) => parseFloat(String(el.value).replace(",", "."));
  const r1 = (x) => (Math.round(x * 10) / 10).toLocaleString("fr-FR");
  const r2 = (x) => (Math.round(x * 100) / 100).toLocaleString("fr-FR");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* "1:45:30", "45:30", "45" (minutes) ou "3h30" → secondes */
  function parseDur(str) {
    const hasH = /\d\s*h/i.test(String(str));
    str =String(str).trim().toLowerCase().replace(/\s/g, "").replace(/h/g, ":").replace(/min|m|'/g, ":").replace(/s|"/g, "").replace(/:+$/, "");
    if (!str) return NaN;
    const p = str.split(":").filter((x, i, a) => x !== "" || i < a.length - 1).map((x) => (x === "" ? 0 : Number(x)));
    if (p.some((x) => isNaN(x) || x < 0)) return NaN;
    if (hasH && p.length === 1) return p[0] * 3600;
    if (hasH && p.length === 2) return p[0] * 3600 + p[1] * 60;
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    if (p.length === 1) return p[0] * 60;
    return NaN;
  }
  /* secondes → "1:05:09" ou "5:09" */
  function fmt(sec, withH) {
    if (!isFinite(sec)) return "–";
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const ss = String(s).padStart(2, "0");
    if (h || withH) return h + ":" + String(m).padStart(2, "0") + ":" + ss;
    return m + ":" + ss;
  }
  /* secondes → "1 h 05 min", "4 min 30 s", "6 s" (html : unités en petit) */
  function human(sec, html) {
    if (!isFinite(sec)) return "–";
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const u = (n, unit, pad) => (pad ? String(n).padStart(2, "0") : n) + (html ? "<small>" + unit + "</small>" : " " + unit);
    const parts = [];
    if (h) parts.push(u(h, "h"));
    if (m || (h && s)) parts.push(u(m, "min", h > 0));
    if (s || (!h && !m)) parts.push(u(s, "s", h > 0 || m > 0));
    return parts.join(" ");
  }
  const humanHTML = (sec) => human(sec, true);
  const riegel = (t1, d1, d2) => t1 * Math.pow(d2 / d1, 1.06);

  /* Fait défiler un chiffre de l'ancienne à la nouvelle valeur */
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function roll(el, value, format, unit) {
    const u = unit ? "<small>" + unit + "</small>" : "";
    const show = (v) => { el.innerHTML = (isFinite(v) ? format(v) : "–") + (isFinite(v) ? u : ""); };
    cancelAnimationFrame(el._raf);
    const from = el._cur;
    if (calm || !isFinite(from) || !isFinite(value) || from === value) { el._cur = value; show(value); return; }
    const t0 = performance.now(), D = 600;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 4);
      el._cur = from + (value - from) * e;
      show(el._cur);
      if (k < 1) el._raf = requestAnimationFrame(step); else el._cur = value;
    };
    el._raf = requestAnimationFrame(step);
  }

  function seg(container, onChange) {
    $$("button", container).forEach((b) =>
      b.addEventListener("click", () => {
        $$("button", container).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        onChange(b.dataset.v);
      })
    );
    const cur = $('button[aria-pressed="true"]', container);
    return cur ? cur.dataset.v : null;
  }

  /* ---------- Profil : les champs liés se remplissent seuls et le mettent à jour ---------- */
  function bindProfile(form, map) {
    const TS = window.TempoStore;
    if (!form || !TS || !TS.profile) return;
    const fill = (fire) => {
      const raw = TS.profile().raw;
      Object.entries(map).forEach(([id, k]) => {
        const el = $("#" + id);
        if (!el || el === document.activeElement || raw[k] == null || raw[k] === "" || el.value === String(raw[k])) return;
        el.value = raw[k];
        if (fire) el.dispatchEvent(new Event("input", { bubbles: true }));
      });
      note.innerHTML = Object.values(map).some((k) => raw[k] != null && raw[k] !== "")
        ? 'Rempli avec <a href="compte.html#profil">votre profil</a>. Ce que vous changez ici le met à jour.'
        : 'Astuce : renseignez <a href="compte.html#profil">votre profil</a> une fois, tous les outils s\'adaptent à vous.';
    };
    const note = document.createElement("p");
    note.className = "hint prof-note";
    form.appendChild(note);
    fill(false);
    Object.entries(map).forEach(([id, k]) => { const el = $("#" + id); if (el) el.addEventListener("input", () => TS.setProfile({ [k]: el.value })); });
    TS.watch("tempo-profile-v1", () => fill(true));
  }

  /* ---------- Allure ---------- */
  const paceForm = $("#pace-form");
  if (paceForm) {
    const dist = $("#p-dist"), time = $("#p-time"), pace = $("#p-pace");
    let mode = seg($("#p-mode"), (v) => { mode = v; sync(); });
    const DISTS = [["5 km", 5], ["10 km", 10], ["Semi", 21.0975], ["Marathon", 42.195]];

    $$("[data-dist]", paceForm).forEach((b) => b.addEventListener("click", () => { dist.value = b.dataset.dist; sync(); }));
    [dist, time, pace].forEach((el) => el.addEventListener("input", sync));

    function sync() {
      dist.disabled = mode === "dist"; time.disabled = mode === "time"; pace.disabled = mode === "pace";
      let d = num(dist), t = parseDur(time.value), p = parseDur(pace.value);
      if (mode === "time") t = d * p;
      if (mode === "pace") p = t / d;
      if (mode === "dist") d = t / p;
      const ok = d > 0 && t > 0 && p > 0 && isFinite(d + t + p);
      if (ok) {
        if (mode === "time") time.value = human(t);
        if (mode === "pace") pace.value = human(p);
        if (mode === "dist") dist.value = r2(d).replace(/\s/g, "");
      }
      $("#p-out").hidden = !ok;
      $("#p-err").hidden = ok;
      if (!ok) return;
      roll($("#r-time"), t, humanHTML);
      roll($("#r-pace"), p, humanHTML, "/km");
      roll($("#r-speed"), 3600 / p, r1, "km/h");

      // Passages
      const step = d > 25 ? 5 : 1;
      let rows = "";
      for (let k = step; k < d - 1e-9; k += step) rows += `<tr><td>${k} km</td><td class="num">${human(k * p)}</td></tr>`;
      if (d > 21.0975 && d < 42.195 + 1e-6 && Math.abs(d - 21.0975) > 0.01)
        rows += `<tr><td>Semi (21,1 km)</td><td class="num">${human(21.0975 * p)}</td></tr>`;
      rows += `<tr class="hl"><td>Arrivée (${r2(d)} km)</td><td class="num">${human(t)}</td></tr>`;
      $("#r-splits").innerHTML = rows;

      // Prédictions
      $("#r-pred").innerHTML = DISTS.map(([name, dd]) => {
        const tt = riegel(t, d, dd);
        return `<tr${Math.abs(dd - d) < 0.01 ? ' class="hl"' : ""}><td>${name}</td><td class="num">${human(tt)}</td><td class="num">${human(tt / dd)}/km</td></tr>`;
      }).join("");
    }
    sync();
  }

  /* ---------- Zones cardiaques ---------- */
  const hrForm = $("#hr-form");
  if (hrForm) {
    bindProfile(hrForm, { "h-age": "n-age", "h-rest": "h-rest", "h-max": "h-max" });
    const age = $("#h-age"), rest = $("#h-rest"), max = $("#h-max");
    const Z = [
      ["Z1", 50, 60, "Récupération active, échauffement", "var(--z1)"],
      ["Z2", 60, 70, "Endurance fondamentale : base aérobie, brûle les graisses", "var(--z2)"],
      ["Z3", 70, 80, "Tempo : allure marathon, endurance active", "var(--z3)"],
      ["Z4", 80, 90, "Seuil : allure 10 km à semi, fractionné long", "var(--z4)"],
      ["Z5", 90, 100, "VO2max : fractionné court, sprints", "var(--z5)"],
    ];
    [age, rest, max].forEach((el) => el.addEventListener("input", calc));
    function calc() {
      const a = num(age), r = num(rest);
      let m = num(max);
      const est = !(m > 0);
      if (est) m = a > 0 ? 208 - 0.7 * a : NaN;
      const karv = r > 0 && r < m;
      const ok = m > 80 && m < 240;
      $("#h-out").hidden = !ok; $("#h-err").hidden = ok;
      if (!ok) return;
      roll($("#r-max"), m, Math.round, "bpm");
      $("#r-max-k").textContent = est ? "FC max estimée (Tanaka)" : "FC max saisie";
      roll($("#r-res"), karv ? m - r : NaN, Math.round, "bpm");
      $("#r-method").textContent = karv
        ? "Méthode de Karvonen : % de la réserve cardiaque (FC max − FC repos) + FC repos."
        : "Méthode simple : % de la FC max. Ajoutez votre FC de repos pour des zones plus précises (Karvonen).";
      const bpm = (pct) => Math.round(karv ? r + (m - r) * pct / 100 : m * pct / 100);
      // Barres sur un axe fixe 40–210 bpm : elles glissent quand l'âge ou la FC changent
      const zc = $("#r-zones");
      if (!zc.children.length)
        zc.innerHTML = Z.map(([n, lo, hi, d, c]) =>
          `<div class="zone"><b>${n}</b><div class="bar" aria-hidden="true"><span style="background:${c}"></span></div>` +
          `<div class="bpm"></div><div class="desc">${lo}–${hi} % · ${d}</div></div>`).join("");
      const pos = (b) => Math.max(0, Math.min(100, ((b - 40) / 170) * 100));
      Z.forEach(([, lo, hi], i) => {
        const z = zc.children[i], s = z.querySelector(".bar span");
        s.style.left = pos(bpm(lo)) + "%";
        s.style.width = pos(bpm(hi)) - pos(bpm(lo)) + "%";
        z.querySelector(".bpm").textContent = bpm(lo) + "–" + bpm(hi);
      });
    }
    calc();
  }

  /* ---------- Musculation ---------- */
  const liftForm = $("#lift-form");
  if (liftForm) {
    const w = $("#l-w"), reps = $("#l-reps"), bar = $("#l-bar"), target = $("#l-target");
    const PCT = [100, 95, 93, 90, 87, 85, 83, 80, 77, 75, 72, 70];
    const platesSel = $("#l-plates");
    let PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
    const readPlates = () => { if (platesSel) PLATES = platesSel.value.split(",").map(Number).sort((a, b) => b - a); };
    readPlates();
    if (platesSel) platesSel.addEventListener("input", () => { readPlates(); plates(); });
    [w, reps, bar].forEach((el) => el.addEventListener("input", calc));
    target.addEventListener("input", plates);
    function calc() {
      const W = num(w), n = Math.round(num(reps));
      const ok = W > 0 && n >= 1 && n <= 15;
      $("#l-out").hidden = !ok; $("#l-err").hidden = ok;
      if (!ok) return;
      const epley = n === 1 ? W : W * (1 + n / 30);
      const brzycki = n === 1 ? W : W * 36 / (37 - n);
      const rm = (epley + brzycki) / 2;
      roll($("#r-1rm"), rm, r1, "kg");
      roll($("#r-ep"), epley, r1, "kg");
      roll($("#r-br"), brzycki, r1, "kg");
      const goal = (i) => (i <= 5 ? "Force" : i <= 12 ? "Hypertrophie" : "Endurance");
      $("#r-pct").innerHTML = PCT.map((p, i) => {
        const kg = Math.round((rm * p) / 100 / 1.25) * 1.25;
        return `<tr${i + 1 === n ? ' class="hl"' : ""}><td>${i + 1} rép.</td><td class="num">${p} %</td><td class="num">${kg.toLocaleString("fr-FR")} kg</td><td>${goal(i + 1)}</td></tr>`;
      }).join("");
      if (!target.dataset.touched) target.value = Math.round((rm * 0.8) / 2.5) * 2.5;
      plates();
    }
    function plates() {
      target.dataset.touched = document.activeElement === target ? "1" : target.dataset.touched || "";
      const T = num(target), B = num(bar);
      const out = $("#r-plates");
      if (!(T > 0 && B >= 0)) { out.textContent = "–"; return; }
      if (T < B) { out.textContent = "La charge visée est inférieure au poids de la barre."; return; }
      let side = (T - B) / 2;
      const used = [];
      PLATES.forEach((p) => { while (side >= p - 1e-9) { used.push(p); side -= p; } });
      const real = B + 2 * used.reduce((s, x) => s + x, 0);
      out.innerHTML = (used.length ? "Par côté : <strong>" + used.map((x) => x.toLocaleString("fr-FR")).join(" + ") + " kg</strong>" : "Barre seule") +
        (Math.abs(real - T) > 0.01 ? ` · charge réelle ${real.toLocaleString("fr-FR")} kg (au plus près)` : "");
    }
    calc();
  }

  /* ---------- Plan d'entraînement ---------- */
  const planForm = $("#plan-form");
  if (planForm) {
    const goal = $("#t-goal"), level = $("#t-level"), weeks = $("#t-weeks"), days = $("#t-days"), target = $("#t-target");
    const GOALS = {
      "5": { d: 5, name: "5 km", long: [6, 10], taper: 1, def: { rep: "38:00", deb: "32:00", int: "25:00", conf: "20:00", exp: "17:30" } },
      "10": { d: 10, name: "10 km", long: [8, 14], taper: 1, def: { rep: "1:15:00", deb: "1:05:00", int: "52:00", conf: "42:00", exp: "36:00" } },
      "15": { d: 15, name: "15 km", long: [10, 16], taper: 1, def: { rep: "1:55:00", deb: "1:40:00", int: "1:20:00", conf: "1:05:00", exp: "56:00" } },
      "16": { d: 16.0934, name: "10 miles", long: [10, 17], taper: 1, def: { rep: "2:05:00", deb: "1:48:00", int: "1:27:00", conf: "1:10:00", exp: "1:00:00" } },
      "20": { d: 20, name: "20 km", long: [10, 19], taper: 2, def: { rep: "2:40:00", deb: "2:15:00", int: "1:48:00", conf: "1:28:00", exp: "1:16:00" } },
      "21": { d: 21.0975, name: "semi-marathon", long: [10, 20], taper: 2, def: { rep: "2:45:00", deb: "2:20:00", int: "1:55:00", conf: "1:35:00", exp: "1:20:00" } },
      "30": { d: 30, name: "30 km", long: [12, 26], taper: 2, def: { rep: "4:05:00", deb: "3:30:00", int: "2:50:00", conf: "2:20:00", exp: "2:00:00" } },
      "42": { d: 42.195, name: "marathon", long: [14, 32], taper: 3, def: { rep: "5:30:00", deb: "4:45:00", int: "4:00:00", conf: "3:20:00", exp: "2:55:00" } },
      "trail20": { d: 20, name: "trail court", long: [10, 22], taper: 1, def: { rep: "3:30:00", deb: "3:00:00", int: "2:30:00", conf: "2:05:00", exp: "1:50:00" } },
      "trail40": { d: 40, name: "trail long", long: [15, 32], taper: 2, def: { rep: "8:00:00", deb: "7:00:00", int: "5:45:00", conf: "4:45:00", exp: "4:10:00" } },
    };
    const LV = { rep: 0.65, deb: 0.8, int: 1, conf: 1.2, exp: 1.35 };
    const raceIn = $("#t-date"), TS = window.TempoStore, PLAN_KEY = "tempo-plan-v1";
    const dKey = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const toDate = (k) => new Date(k + "T12:00");
    const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    const weekStart = (d) => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
    const dayFmt = (k) => toDate(k).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
    const longFmt = (k) => toDate(k).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const DOFF = { Lundi: 0, Mardi: 1, Mercredi: 2, Jeudi: 3, Vendredi: 4, Samedi: 5, Dimanche: 6 };
    // Le plan démarre lundi prochain (ou ce lundi si l'on est lundi ou mardi)
    const startMonday = () => weekStart(addDays(new Date(), 5));
    const weeksUntil = (k) => Math.round((weekStart(toDate(k)) - startMonday()) / 864e5 / 7) + 1;
    const defaultRace = (n) => dKey(addDays(startMonday(), (n - 1) * 7 + 6));

    // Reprendre le plan suivi s'il existe
    const followed = () => { try { const p = TS && TS.get(PLAN_KEY); return p && p.weeks ? p : null; } catch (_) { return null; } };
    const fp0 = followed();
    if (fp0 && fp0.form) {
      const f = fp0.form;
      if (GOALS[f.goal]) goal.value = f.goal;
      if (f.level) level.value = f.level;
      target.value = f.target || ""; weeks.value = f.weeks; days.value = f.days;
    }
    raceIn.value = fp0 && fp0.raceDate ? fp0.raceDate : defaultRace(Math.round(num(weeks)) || 10);
    raceIn.min = dKey(addDays(new Date(), 1));

    [goal, level, days, target].forEach((el) => el.addEventListener("input", build));
    weeks.addEventListener("input", () => { const n = Math.round(num(weeks)); if (n >= 6 && n <= 24) raceIn.value = defaultRace(n); build(); });
    raceIn.addEventListener("change", () => {
      if (raceIn.value) { const n = weeksUntil(raceIn.value); if (n >= 6 && n <= 24) weeks.value = n; else if (n > 24) weeks.value = 24; }
      build();
    });
    goal.addEventListener("change", () => { target.value = ""; build(); });
    level.addEventListener("change", () => { target.value = ""; build(); });
    $("#t-print").addEventListener("click", () => window.print());

    let current = null;
    function build() {
      const G = GOALS[goal.value], L = level.value, N = Math.round(num(weeks)), D = Math.round(num(days));
      target.placeholder = human(parseDur(G.def[L]));
      let T = parseDur(target.value || G.def[L]);
      const raceK = raceIn.value;
      const ok = T > 0 && N >= 6 && N <= 24 && D >= 3 && D <= 6 && /^\d{4}-\d\d-\d\d$/.test(raceK);
      const left = raceK ? weeksUntil(raceK) : 0;
      const errEl = $("#t-err");
      errEl.textContent = !raceK ? "Choisissez la date de votre course." :
        left < 6 && ok ? `Votre course est dans ${Math.max(0, left)} semaine${left > 1 ? "s" : ""} : un plan sérieux demande au moins 6 semaines. Choisissez une date plus lointaine.` :
        "Choisissez entre 6 et 24 semaines, 3 à 6 séances, et un temps comme 52 min ou 1h45.";
      const good = ok && left >= 6;
      $("#t-out").hidden = !good; errEl.hidden = good;
      if (!good) { current = null; renderFollow(); return; }

      const race = T / G.d, p10 = riegel(T, G.d, 10) / 10;
      const P = { ef: p10 * 1.3, tempo: (riegel(T, G.d, 42.195) / 42.195), seuil: p10 * 1.04, vma: p10 * 0.93, race };
      const fp = (x) => human(x) + "/km";
      const kmOf = (min) => Math.round((min * 60) / P.ef * 2) / 2;
      $("#r-paces").innerHTML = [
        ["Endurance fondamentale (EF)", P.ef * 1.05, P.ef], ["Allure marathon / tempo", P.tempo, P.tempo],
        ["Seuil", P.seuil, P.seuil], ["Fractionné (VMA)", P.vma, P.vma], ["Allure objectif " + G.name, race, race],
      ].map(([n, a, b]) => `<tr><td>${n}</td><td class="num">${a === b ? fp(a) : human(b) + " à " + fp(a)}</td></tr>`).join("");
      $("#r-goal").textContent = `${G.name} en ${human(T)} · ${N} semaines · ${D} séances/sem.`;

      const raceDay = toDate(raceK), raceMon = weekStart(raceDay);
      const firstMon = addDays(raceMon, -(N - 1) * 7);
      $("#r-dates").textContent = `Du ${longFmt(dKey(firstMon))} au ${longFmt(raceK)}`;

      const isTrail = String(goal.value).startsWith("trail");
      const taper = G.taper, build = N - taper;
      const baseEnd = Math.round(build * 0.4);
      const [l0, l1] = G.long.map((x) => x * LV[L]);
      const W = [];
      for (let w = 1; w <= N; w++) {
        const isRace = w === N;
        const isTaper = w > build;
        const isRec = !isTaper && w % 4 === 0;
        const phase = isRace ? "Course" : isTaper ? "Affûtage" : isRec ? "Assimilation" : w <= baseEnd ? "Fondation" : "Développement";
        const prog = Math.min(1, (w - 1) / Math.max(1, build - 1));
        let longKm = l0 + (l1 - l0) * prog;
        if (isRec) longKm *= 0.75;
        if (isTaper) longKm = l1 * (isRace ? 0 : 0.6 - 0.1 * (w - build - 1));
        longKm = Math.max(5, Math.round(longKm));
        const longMin = Math.round((longKm * P.ef) / 60);

        const S = []; // [jour, type, texte, km]
        if (isRace) S.push(["Mardi", "ef", "30 min EF + 4 × 1 min allure course", kmOf(34)]);
        else if (isRec) S.push(["Mardi", "ef", "40 min EF + 6 lignes droites", kmOf(42)]);
        else if (isTrail) S.push(["Mardi", "cotes", `${Math.min(12, 5 + w)} × 1 min en côte à effort soutenu, retour en trottinant + 10 min de renforcement (fentes, mollets)`]);
        else if (w <= baseEnd) S.push(["Mardi", "frac", `${8 + w} × 30 s vite / 30 s lent à ${fp(P.vma)}`]);
        else if (isTaper) S.push(["Mardi", "vma", `${Math.max(3, 6 - 2 * (w - build - 1))} × 1000 m à ${fp(P.vma)}, récup 2 min`]);
        else S.push(["Mardi", "vma", `${Math.min(8, 4 + Math.floor((w - baseEnd) / 2))} × 1000 m à ${fp(P.vma)}, récup 2 min`]);
        const efMin = Math.round(35 * LV[L] + (isRec ? 0 : 5));
        S.push(isRace ? ["Jeudi", "ef", "25 min EF très facile", kmOf(25)] : ["Jeudi", "ef", `${efMin} min en endurance fondamentale (${fp(P.ef)})`, kmOf(efMin)]);
        if (D >= 4) {
          if (isRace || isRec) S.push(["Vendredi", "ef", "30 min EF", kmOf(30)]);
          else if (isTaper) S.push(["Vendredi", "seuil", `30 min EF dont 10 min à allure objectif (${fp(race)})`]);
          else if (w <= baseEnd) S.push(["Vendredi", "seuil", `2 × 10 min au seuil (${fp(P.seuil)}), récup 3 min`]);
          else S.push(["Vendredi", "seuil", `${G.d >= 21 ? 3 : 2} × ${G.d >= 21 ? 15 : 10} min à allure objectif (${fp(race)})`]);
        }
        if (D >= 5) S.push(["Lundi", "recup", "30 min récupération très lente (optionnel : vélo)", kmOf(30) - 0.5]);
        if (D >= 6) S.push(["Mercredi", "ef", "30 min EF + gainage 15 min", kmOf(30)]);
        if (!isRace) {
          const extra = !isRec && !isTaper && w > baseEnd && G.d >= 21 ? `, dont les ${Math.round(longKm / 4)} derniers km à allure objectif` : "";
          S.push(isTrail
            ? ["Dimanche", "trail", `Sortie longue ${longKm} km (≈ ${human(longMin * 60)}) sur sentier avec dénivelé, à l'effort (marchez dans les montées raides)`, longKm]
            : ["Dimanche", "long", `Sortie longue ${longKm} km (≈ ${human(longMin * 60)}) en EF${extra}`, longKm]);
        }
        const mon = addDays(firstMon, (w - 1) * 7);
        let sessions = S.map(([day, type, text, km]) => ({ date: dKey(addDays(mon, DOFF[day])), type, text, km: km || null }));
        if (isRace) {
          sessions = sessions.filter((s) => s.date < raceK);
          sessions.push({ date: raceK, type: "race", text: `Jour J : ${G.name} à ${fp(race)}`, km: Math.round(G.d * 10) / 10, race: true });
        }
        sessions.sort((a, b) => (a.date < b.date ? -1 : 1));
        W.push({ w, phase, sessions });
      }
      const today = dKey(new Date());
      $("#r-weeks").innerHTML = W.map(({ w, phase, sessions }) => {
        const pillCls = phase === "Course" ? "pill race" : phase === "Assimilation" ? "pill rest" : "pill";
        const mon = sessions.length ? weekStart(toDate(sessions[0].date)) : null;
        const range = mon ? ` <span class="week-dates">${toDate(dKey(mon)).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${addDays(mon, 6).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>` : "";
        return `<article class="week"><header><h3>Semaine ${w}${range}</h3><span class="${pillCls}">${phase}</span></header><div class="sessions">` +
          sessions.map((s) => `<div class="session${s.race ? " is-race" : ""}${s.date === today ? " is-today" : ""}"><strong>${dayFmt(s.date)}</strong><span>${esc(s.text)}</span></div>`).join("") + "</div></article>";
      }).join("");
      current = {
        v: 1, created: Date.now(), goal: goal.value, name: G.name, level: L, T, raceDate: raceK, days: D,
        form: { goal: goal.value, level: L, target: target.value.trim(), weeks: N, days: D },
        title: `${G.name[0].toUpperCase() + G.name.slice(1)} en ${human(T)}`, weeks: W, done: {},
      };
      renderFollow();
    }

    /* Suivre le plan dans le carnet de course */
    const sig = (p) => p ? JSON.stringify([p.goal, p.level, p.T, p.raceDate, p.days, p.weeks.length]) : "";
    function renderFollow() {
      const box = $("#t-follow"); if (!box) return;
      const f = followed();
      if (!current) { box.hidden = true; return; }
      box.hidden = false;
      const same = f && sig(f) === sig(current);
      if (same) {
        box.innerHTML = `<div><b>Vous suivez ce plan</b><span>Chaque jour, votre carnet de course affiche la séance prévue. Cochez-la une fois faite, ou notez votre sortie : elle est reconnue automatiquement.</span></div>
          <div class="follow-actions"><a class="btn" href="carnet-course.html">Ouvrir le carnet de course</a><button type="button" class="btn ghost" data-plan="stop">Arrêter de suivre</button></div>`;
      } else {
        box.innerHTML = `<div><b>${f ? "Remplacer votre plan actuel ?" : "Suivez ce plan au jour le jour"}</b><span>${f
          ? `Vous suivez déjà « ${esc(f.title || "un plan")} » (course le ${esc(longFmt(f.raceDate))}). Le remplacer efface les séances cochées de l'ancien plan.`
          : "Votre carnet de course affichera la séance du jour, les séances de la semaine et votre taux de réalisation. Vos sorties notées sont reconnues automatiquement."}</span></div>
          <div class="follow-actions"><button type="button" class="btn" data-plan="follow">${f ? "Remplacer et suivre ce plan" : "Suivre ce plan"}</button></div>`;
      }
    }
    const followBox = $("#t-follow");
    if (followBox) followBox.addEventListener("click", (e) => {
      const b = e.target.closest("[data-plan]"); if (!b || !TS) return;
      if (b.dataset.plan === "follow" && current) {
        TS.set(PLAN_KEY, Object.assign({}, current, { created: Date.now(), done: {} }));
        renderFollow();
      } else if (b.dataset.plan === "stop") {
        TS.set(PLAN_KEY, null);
        renderFollow();
      }
    });
    if (TS && TS.watch) TS.watch(PLAN_KEY, renderFollow);
    build();
  }
  /* ---------- Calories ---------- */
  const r0 = (x) => Math.round(x).toLocaleString("fr-FR");
  // MET (Compendium des activités physiques) pour facile / modérée / soutenue
  const MET = { course: [8.3, 9.8, 11.8], velo: [6.8, 8, 10], muscu: [3.5, 5, 6], natation: [5.8, 8.3, 9.8], marche: [3, 3.5, 5],
    rando: [5.3, 6, 7.8], rameur: [4.8, 7, 8.5], hiit: [6, 8, 10], yoga: [2.5, 3, 4] };

  /* ---------- Calories : tout part du profil (page Compte) ---------- */
  const PROF = () => (window.TempoStore && TempoStore.profile ? TempoStore.profile() : { raw: {} });
  const calProf = $("#cal-prof");
  function renderProf() {
    if (!calProf) return;
    const p = PROF();
    calProf.innerHTML = p.age && p.cm && p.kg && p.sex
      ? `Calculé pour ${p.sex === "f" ? "une femme" : "un homme"} de ${p.age} ans, ${p.cm} cm, ${r1(p.kg)} kg. <a href="compte.html#profil">Modifier mon profil</a>`
      : `Pour des chiffres justes, <a href="compte.html#profil">renseignez votre profil</a> : sexe, âge, taille, poids.`;
  }
  const needsBox = $("#needs");
  function renderNeeds() {
    if (!needsBox) return;
    const p = PROF(), goal = p.goal || "keep", f = p.act || 1.55;
    const ok = p.age && p.cm && p.kg && p.sex;
    $("#n-out").hidden = !ok; $("#n-err").hidden = !!ok;
    const ACT = { 1.2: "sédentaire", 1.3: "peu actif", 1.375: "activité légère", 1.55: "activité modérée", 1.725: "activité élevée", 1.9: "activité très élevée" };
    $("#n-src").innerHTML = `Objectif : <b>${{ cut: "perdre du poids", keep: "maintenir", bulk: "prendre du muscle" }[goal]}</b> · ${ACT[f] || "activité modérée"}${p.act ? "" : " (par défaut)"}. <a href="compte.html#profil">Changer</a>`;
    if (!ok) return;
    const w = p.kg, bmr = 10 * w + 6.25 * p.cm - 5 * p.age + (p.sex === "h" ? 5 : -161);
    const tdee = bmr * f, target = tdee * { cut: 0.85, keep: 1, bulk: 1.1 }[goal];
    roll($("#r-target"), target, r0, "kcal");
    roll($("#r-tdee"), tdee, r0, "kcal");
    roll($("#r-bmr"), bmr, r0, "kcal");
    $("#r-target-k").textContent = { cut: "Pour perdre du poids", keep: "Pour garder votre poids", bulk: "Pour prendre du muscle" }[goal];
    const M = [["Protéines", "var(--z4)"], ["Glucides", "var(--z3)"], ["Lipides", "var(--z1)"]];
    const pG = w * { cut: 2, keep: 1.6, bulk: 1.8 }[goal], pK = pG * 4, fK = target * 0.27, cK = Math.max(0, target - pK - fK);
    const vals = [[pG, pK], [cK / 4, cK], [fK / 9, fK]];
    const box = $("#r-macros");
    if (!box.children.length) box.innerHTML = M.map(([n, c]) => `<div class="macro"><div class="macro-top"><span><i style="background:${c}"></i>${n}</span><b></b></div><div class="macro-bar"><span style="background:${c}"></span></div><small></small></div>`).join("");
    vals.forEach(([g, k], i) => {
      const el = box.children[i];
      roll(el.querySelector("b"), g, r0, "g");
      el.querySelector(".macro-bar span").style.width = (k / target) * 100 + "%";
      el.querySelector(":scope > small").textContent = r0(k) + " kcal · " + Math.round((k / target) * 100) + " %";
    });
    renderProt(pG, goal);
    const kgWeek = ((target - tdee) * 7) / 7700;
    $("#r-macro-hint").textContent = goal === "keep"
      ? `Protéines : ${r1(pG / w)} g par kilo de poids. Le reste se répartit entre glucides et lipides.`
      : `Rythme attendu : environ ${r1(Math.abs(kgWeek))} kg ${kgWeek < 0 ? "perdus" : "pris"} par semaine. Protéines : ${r1(pG / w)} g par kilo.`;
  }
  /* Protéines : objectif du jour, par repas, et équivalents en aliments */
  const FOODS = [["Blanc de poulet ou dinde", 100, "g", 31], ["Thon au naturel (égoutté)", 100, "g", 25], ["Steak haché 5 %", 100, "g", 21], ["Saumon", 100, "g", 22],
    ["Œufs", 1, "œuf", 6.5], ["Fromage blanc ou skyr", 100, "g", 9], ["Tofu ferme", 100, "g", 13], ["Lentilles ou pois chiches cuits", 100, "g", 8.5], ["Jambon blanc", 100, "g", 20], ["Protéine en poudre (whey)", 1, "dose", 24]];
  let lastProt = null;
  function renderProt(pG, goal) {
    const box = $("#prot"); if (!box) return;
    lastProt = [pG, goal];
    const sel = $("#p-meals"), n = +(sel && sel.value) || 4, meal = pG / n;
    $("#p-day").textContent = r0(pG) + " g";
    $("#p-meal").textContent = r0(meal) + " g";
    $("#p-why").textContent = goal === "bulk" ? "Pour prendre du muscle : environ 1,8 g par kilo de poids et par jour, réparti sur la journée."
      : goal === "cut" ? "En perte de poids, un apport élevé (environ 2 g par kilo) aide à garder vos muscles."
      : "Pour un sportif qui garde son poids, environ 1,6 g par kilo et par jour suffit.";
    $("#p-foods").innerHTML = FOODS.map(([name, base, unit, p]) => {
      const q = meal / p * base;
      const qty = unit === "œuf" ? Math.max(1, Math.round(q)) + (Math.round(q) > 1 ? " œufs" : " œuf") : unit === "dose" ? (Math.round(q * 2) / 2 || 0.5).toString().replace(".", ",") + (q > 1.25 ? " doses" : " dose") + " de 30 g" : Math.round(q / 10) * 10 + " " + unit;
      return `<li><span>${name}</span><b>${qty}</b></li>`;
    }).join("");
  }
  const pMeals = $("#p-meals");
  if (pMeals) {
    try { const v = localStorage.getItem("tempo-meals"); if (v) pMeals.value = v; } catch (_) {}
    pMeals.addEventListener("change", () => { try { localStorage.setItem("tempo-meals", pMeals.value); } catch (_) {} if (lastProt) renderProt(...lastProt); });
  }

  if (calProf || needsBox) {
    renderProf(); renderNeeds();
    if (window.TempoStore) TempoStore.watch("tempo-profile-v1", () => { renderProf(); renderNeeds(); });
  }

  /* ---------- Bilan de la journée : métabolisme + vie quotidienne + séances des carnets ---------- */
  const dayBox = $("#day");
  if (dayBox) {
    const LABEL = { course: "Course à pied", velo: "Vélo", muscu: "Musculation", natation: "Natation", marche: "Marche", rando: "Randonnée", rameur: "Rameur", hiit: "HIIT", yoga: "Yoga" };
    const SRC = { course: ["var(--c-course)", "Carnet de course"], muscu: ["var(--c-muscu)", "Carnet de séances"], extra: ["var(--c-food)", "Ajout manuel"] };
    const KEY = "tempo-day-v1";
    const TS = window.TempoStore;
    const get = (k) => TS.get(k);
    let extra = get(KEY) || {};
    const saveExtra = () => TS.set(KEY, extra);
    const STEPS = "tempo-steps-v1";
    let steps = get(STEPS) || {};
    const saveSteps = () => TS.set(STEPS, steps);
    const stepsIn = $("#d-steps");
    const dk = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const shift = (k, n) => { const d = new Date(k + "T12:00"); d.setDate(d.getDate() + n); return dk(d); };
    const sum = (a, f) => a.reduce((t, x) => t + (f(x) || 0), 0);
    const dateIn = $("#d-date"), life = $("#d-life");
    dateIn.value = dk(new Date());
    // Type de journée : gardé dans le profil
    const lifeP = PROF().raw["d-life"];
    if (lifeP) life.value = lifeP;
    life.addEventListener("input", () => TS.setProfile({ "d-life": life.value }));

    function profile() {
      const p = PROF();
      if (!(p.age && p.cm && p.kg && p.sex)) return null;
      return { w: p.kg, h: p.cm, goal: p.goal || "keep", bmr: 10 * p.kg + 6.25 * p.cm - 5 * p.age + (p.sex === "h" ? 5 : -161) };
    }
    // Séances du jour, lues dans les carnets du site (même navigateur) + ajouts manuels
    function sessions(day, w) {
      const out = [];
      const course = get("tempo-course-v1"), fonte = get("carnet-fonte-v1");
      ((course && course.sessions) || []).filter((s) => s.date === day).forEach((s) => out.push({
        src: "course", name: "Course · " + r1(s.dist) + " km", sub: human(s.dur), dur: s.dur,
        kcal: w * s.dist * (s.type === "trail" ? 1.1 : 1) + (s.dplus || 0) * w * 0.0015 }));
      const allMuscu = ((fonte && fonte.sessions) || []).map((x) => Object.assign({}, x, { date: dk(new Date(x.date)) }));
      allMuscu.filter((s) => s.date === day).forEach((s) => {
        const m = window.TempoKcal.muscuKcal(s, w, allMuscu);
        out.push({ src: "muscu", name: "Musculation · " + s.dayName, dur: m.dur,
          sub: human(m.dur) + " · " + m.sets + " séries · " + r1(m.tonnage / 1000) + " t soulevées · " + m.zone, kcal: m.kcal });
      });
      (extra[day] || []).forEach((x) => out.push({ src: "extra", id: x.id, act: x.act, name: LABEL[x.act], sub: human(x.dur) + " · " + ["facile", "modérée", "soutenue"][x.lvl], dur: x.dur, kcal: (MET[x.act][x.lvl] * w * x.dur) / 3600 }));
      return out;
    }
    function total(day, p) {
      const ss = sessions(day, p.w), lf = num(life);
      // Le repos pendant la séance est déjà dans le métabolisme : on ne compte que le surplus du sport
      const sport = sum(ss, (s) => Math.max(0, s.kcal - (p.bmr / 86400) * s.dur));
      /* Pas : foulée de marche ≈ taille × 0,415, dépense nette ≈ 0,5 kcal par kg et par km.
         Les pas des sorties de course du carnet sont retirés (foulée de course ≈ taille × 0,65) pour ne pas compter deux fois. */
      const st = steps[day] || 0;
      const course = get("tempo-course-v1");
      const runKm = sum(((course && course.sessions) || []).filter((x) => x.date === day), (x) => x.dist);
      const runSteps = Math.min(st, (runKm * 1000) / (p.h * 0.0065));
      const walkSteps = st - runSteps, walkKm = (walkSteps * p.h * 0.00415) / 1000, stepsK = 0.5 * p.w * walkKm;
      // Avec des pas : digestion et petits mouvements (~15 %) + supplément métier physique + pas.
      // Sans pas : estimation selon le type de journée (une journée assise ≈ 3 000 pas, donc pas de saut à la saisie).
      const daily = st > 0 ? p.bmr * 0.15 + Math.max(0, lf - 1.2) * p.bmr + stepsK : p.bmr * (lf - 1);
      return { ss, sport, daily, st, runSteps, walkSteps, walkKm, stepsK, base: p.bmr, all: p.bmr + daily + sport };
    }

    function render() {
      const p = profile();
      if (!p) { $("#d-out").hidden = true; $("#d-err").hidden = false; return; }
      $("#d-out").hidden = false; $("#d-err").hidden = true;
      const day = dateIn.value || dk(new Date()), T = total(day, p);
      roll($("#r-day"), T.all, r0, "kcal");
      roll($("#r-sport"), T.sport, r0, "kcal");
      roll($("#r-rest"), T.base + T.daily, r0, "kcal");
      if (document.activeElement !== stepsIn) stepsIn.value = T.st ? T.st.toLocaleString("fr-FR") : "";
      $("#d-steps-info").textContent = T.st
        ? `Environ ${r1(T.walkKm)} km de marche : +${r0(T.stepsK)} kcal.` + (T.runSteps > 0 ? ` Les ${r0(T.runSteps)} pas de votre course ne sont pas comptés deux fois.` : "")
        : "Indiquez vos pas (montre ou téléphone) : la dépense du jour s'ajuste. Sans eux, elle est estimée d'après votre type de journée.";
      const parts = [["Métabolisme de base", T.base, "var(--z1)"], [T.st ? "Pas et vie quotidienne" : "Vie quotidienne", T.daily, "var(--z3)"], ["Sport", T.sport, "var(--accent)"]];
      const bar = $("#d-bar");
      if (!bar.children.length) bar.innerHTML = parts.map(([, , c]) => `<span style="background:${c}"></span>`).join("");
      parts.forEach(([, v], i) => (bar.children[i].style.width = (v / T.all) * 100 + "%"));
      $("#d-legend").innerHTML = parts.map(([n, v, c]) => `<span><i style="background:${c}"></i>${n} <b>${r0(v)}</b></span>`).join("");
      $("#d-list").innerHTML = T.ss.length
        ? T.ss.map((s) => `<div class="d-sess" style="--t:${SRC[s.src][0]}"><i></i><span><b>${esc(s.name)}</b><small>${esc(s.sub)} · ${SRC[s.src][1]}</small></span><strong>${r0(s.kcal)} kcal</strong>${s.id ? `<button type="button" class="d-del" data-del="${s.id}" aria-label="Retirer ${esc(s.name)}">×</button>` : ""}</div>`).join("")
        : `<p class="hint">Aucune séance ce jour-là. Les sorties du <a href="carnet-course.html">carnet de course</a> et les séances du <a href="carnet.html">carnet de musculation</a> apparaissent ici automatiquement.</p>`;
      const k = { cut: 0.85, keep: 1, bulk: 1.1 }[p.goal];
      $("#d-advice").textContent = p.goal === "keep"
        ? `Pour garder votre poids, mangez environ ${r0(T.all)} kcal ce jour-là.`
        : `Pour votre objectif (${p.goal === "cut" ? "perte de poids" : "prise de muscle"}), visez environ ${r0(T.all * k)} kcal ce jour-là, contre ${r0(T.all)} kcal pour maintenir.`;
      // 7 jours se terminant au jour choisi
      const days = Array.from({ length: 7 }, (_, i) => shift(day, i - 6)).map((d) => ({ d, t: total(d, p) }));
      const max = Math.max(...days.map((x) => x.t.all));
      $("#d-week").innerHTML = days.map(({ d, t }) => {
        const dt = new Date(d + "T12:00");
        return `<button type="button" class="d-col${d === day ? " on" : ""}" data-go="${d}" title="${r0(t.all)} kcal"><small>${(Math.round(t.all / 100) / 10).toLocaleString("fr-FR")}k</small><span class="d-stack" style="height:${(t.all / max) * 100}%"><span style="height:${(t.sport / t.all) * 100}%"></span></span><em>${"DLMMJVS"[dt.getDay()]}</em></button>`;
      }).join("");
      $("#d-week-total").textContent = `${r0(sum(days, (x) => x.t.all))} kcal sur 7 jours, dont ${r0(sum(days, (x) => x.t.sport))} kcal de sport.`;
    }

    $("#d-prev").addEventListener("click", () => { dateIn.value = shift(dateIn.value || dk(new Date()), -1); render(); });
    $("#d-next").addEventListener("click", () => { dateIn.value = shift(dateIn.value || dk(new Date()), 1); render(); });
    [dateIn, life].forEach((el) => el.addEventListener("input", render));
    stepsIn.addEventListener("input", () => {
      const day = dateIn.value || dk(new Date()), n = parseInt(stepsIn.value.replace(/\D/g, ""), 10);
      if (n > 0 && n < 200000) steps[day] = n; else delete steps[day];
      saveSteps(); render();
    });
    stepsIn.addEventListener("blur", render);
    TS.watch("tempo-profile-v1", () => { const l = PROF().raw["d-life"]; if (l && document.activeElement !== life) life.value = l; render(); });
    dayBox.addEventListener("click", (e) => {
      const del = e.target.closest("[data-del]"), go = e.target.closest("[data-go]");
      if (del) { const day = dateIn.value; extra[day] = (extra[day] || []).filter((x) => x.id !== del.dataset.del); saveExtra(); render(); }
      if (go) { dateIn.value = go.dataset.go; render(); }
    });
    render();
    TS.watch(KEY, (v) => { extra = v || {}; render(); });
    TS.watch(STEPS, (v) => { steps = v || {}; render(); });
    TS.watch("tempo-course-v1", render);
    TS.watch("carnet-fonte-v1", render);

    /* ---------- Total des calories dépensées en sport ---------- */
    const per = { v: "30" };
    seg($("#s-per"), (v) => { per.v = v; renderSport(); });
    function allDays() {
      const set = new Set(Object.keys(extra).filter((d) => (extra[d] || []).length));
      const course = get("tempo-course-v1"), fonte = get("carnet-fonte-v1");
      ((course && course.sessions) || []).forEach((s) => s.date && set.add(s.date));
      ((fonte && fonte.sessions) || []).forEach((s) => s.date && set.add(dk(new Date(s.date))));
      return Array.from(set).sort();
    }
    function renderSport() {
      const prof = window.TempoStore && TempoStore.profile ? TempoStore.profile() : {};
      const w = prof.kg || 70;
      $("#s-weight").innerHTML = prof.kg
        ? `Calculé pour ${r1(w)} kg, d'après <a href="compte.html#profil">votre profil</a>.`
        : `Poids par défaut : 70 kg. Renseignez <a href="compte.html#profil">votre profil</a> pour un calcul juste.`;
      const today = dk(new Date());
      const from = per.v === "all" ? "0000" : shift(today, -(+per.v - 1));
      const days = allDays().filter((d) => d >= from && d <= today);
      const groups = {}, weeks = {};
      let kcal = 0, n = 0, time = 0;
      const monday = (d) => { const x = new Date(d + "T12:00"); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return dk(x); };
      days.forEach((d) => sessions(d, w).forEach((s) => {
        const key = s.src === "extra" ? (LABEL[s.act] || "Autre") : s.src === "course" ? "Course à pied" : "Musculation";
        const color = s.src === "extra" ? SRC.extra[0] : SRC[s.src][0];
        const g = (groups[key] = groups[key] || { kcal: 0, n: 0, time: 0, color });
        g.kcal += s.kcal; g.n++; g.time += s.dur || 0;
        kcal += s.kcal; n++; time += s.dur || 0;
        const wk = monday(d); weeks[wk] = (weeks[wk] || 0) + s.kcal;
      }));
      roll($("#r-sp-kcal"), kcal, r0, "kcal");
      roll($("#r-sp-n"), n, r0);
      const hm = (t) => human(Math.round(t / 60) * 60).replace(/ 0 min$/, "");
      $("#r-sp-time").textContent = time ? hm(time) : "0 min";
      const list = Object.entries(groups).sort((a, b) => b[1].kcal - a[1].kcal);
      const top = list.length ? list[0][1].kcal : 1;
      $("#sp-break").innerHTML = list.length
        ? list.map(([name, g]) => `<div class="sp-row" style="--t:${g.color}"><span class="sp-name"><b>${esc(name)}</b><small>${g.n} séance${g.n > 1 ? "s" : ""} · ${hm(g.time)}</small></span><span class="sp-bar"><span style="width:${(g.kcal / top) * 100}%"></span></span><strong>${r0(g.kcal)} kcal</strong></div>`).join("")
        : `<p class="hint">Aucune séance sur cette période. Notez vos sorties dans le <a href="carnet-course.html">carnet de course</a> et vos séances dans le <a href="carnet.html">carnet de musculation</a>.</p>`;
      // 8 dernières semaines (ou moins selon la période)
      const nW = per.v === "7" ? 1 : per.v === "30" ? 5 : 8;
      const wkList = Array.from({ length: nW }, (_, i) => shift(monday(today), -7 * (nW - 1 - i)));
      const wMax = Math.max(1, ...wkList.map((k) => weeks[k] || 0));
      $("#sp-weeks").innerHTML = wkList.map((k) => {
        const v = weeks[k] || 0, d = new Date(k + "T12:00");
        return `<div class="sp-wk" title="Semaine du ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} : ${r0(v)} kcal"><small>${v ? r0(v) : "–"}</small><span style="height:${Math.max(2, (v / wMax) * 100)}%"></span><em>${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "")}</em></div>`;
      }).join("");
      $("#sp-eq").textContent = kcal > 0
        ? `C'est l'équivalent d'environ ${r0(kcal / 230)} croissants, ou ${r1(kcal / 7700)} kg de graisse.`
        : "";
    }
    renderSport();
    [KEY, STEPS, "tempo-course-v1", "carnet-fonte-v1", "tempo-profile-v1"].forEach((k) => TS.watch(k, renderSport));
    dayBox.addEventListener("click", (e) => { if (e.target.closest("[data-del]")) renderSport(); });
  }
})();
/* Ouvre le lexique quand on arrive avec #lexique */
(function () { const l = document.getElementById("lexique"); if (l && location.hash === "#lexique") { l.open = true; setTimeout(() => l.scrollIntoView({ block: "start" }), 300); } })();
