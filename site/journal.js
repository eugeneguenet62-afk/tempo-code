/* Carnet d'entraînement course à pied (moteur générique : le sport vient de <body data-journal>).
   Stockage via TempoStore : temporaire sans compte, enregistré avec un compte. */
(function () {
  "use strict";
  const SPORT = document.body.dataset.journal;
  const CONFIG = {
    course: {
      key: "tempo-course-v1", speed: false, goal: 30, goalStep: 5,
      types: [["ef", "Footing", "var(--z2)"], ["recup", "Récupération", "var(--z1)"], ["long", "Sortie longue", "var(--z1)"],
        ["frac", "Fractionné", "var(--z5)"], ["vma", "VMA / piste", "var(--z5)"], ["seuil", "Seuil / tempo", "var(--z4)"],
        ["fartlek", "Fartlek", "var(--z4)"], ["cotes", "Côtes", "var(--z4)"], ["trail", "Trail", "var(--z3)"],
        ["tapis", "Tapis", "var(--z2)"], ["race", "Course / compétition", "var(--c-muscu)"], ["marche", "Marche active", "var(--z1)"]],
      easy: ["ef", "long", "recup", "marche"],
      gearName: "Chaussures", gearOne: "paire", gearLimit: 700, gearPh: "Ex. Pegasus 41",
      gearHint: "On remplace généralement une paire entre 600 et 800 km.",
      verb: "couru", word: "sortie",
    },
  };
  const C = CONFIG[SPORT];
  if (!C) return;

  /* ---------- Outils ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const num = (v) => { if (v == null || v === "") return null; const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : null; };
  const r1 = (x) => (Math.round(x * 10) / 10).toLocaleString("fr-FR");
  const r0 = (x) => Math.round(x).toLocaleString("fr-FR");
  const sum = (a, f) => a.reduce((t, x) => t + (f(x) || 0), 0);

  function parseDur(str) {
    const hasH = /\d\s*h/i.test(String(str));
    str = String(str).trim().toLowerCase().replace(/\s/g, "").replace(/h/g, ":").replace(/min|m|'/g, ":").replace(/s|"/g, "").replace(/:+$/, "");
    if (!str) return NaN;
    const p = str.split(":").map((x) => (x === "" ? 0 : Number(x)));
    if (p.some((x) => isNaN(x) || x < 0)) return NaN;
    if (hasH && p.length === 1) return p[0] * 3600;
    if (hasH && p.length === 2) return p[0] * 3600 + p[1] * 60;
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    if (p.length === 1) return p[0] * 60;
    return NaN;
  }
  function human(sec) {
    if (!isFinite(sec)) return "–";
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const parts = [];
    if (h) parts.push(h + " h");
    if (m || (h && s)) parts.push((h ? String(m).padStart(2, "0") : m) + " min");
    if (s || (!h && !m)) parts.push((h || m ? String(s).padStart(2, "0") : s) + " s");
    return parts.join(" ");
  }
  const dKey = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const toDate = (k) => new Date(k + "T12:00");
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const weekStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const dShort = (k) => toDate(k).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const dLong = (k) => toDate(k).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const typeOf = (id) => C.types.find((t) => t[0] === id) || C.types[0];
  const TYPE_INFO = {
    ef: "Endurance fondamentale : allure facile où vous pouvez parler (65 à 75 % de la FC max). La base de tout entraînement.",
    recup: "Footing très lent et court, le lendemain d'une séance dure ou d'une course, pour récupérer sans fatigue.",
    long: "La sortie la plus longue de la semaine, en endurance : elle développe l'endurance et prépare aux longues distances.",
    frac: "Alternance d'efforts rapides et de récupérations (ex. 8 × 400 m, 5 × 1000 m). Améliore la vitesse et la VO2max.",
    vma: "Fractionné court à vitesse maximale aérobie (30/30, 200 à 400 m), souvent sur piste. Séance la plus intense.",
    seuil: "Effort soutenu mais tenable 20 à 40 min (80 à 90 % de la FC max), allure semi ou 10 km. Repousse la fatigue.",
    fartlek: "« Jeu de vitesse » : accélérations libres pendant un footing, au feeling (un lampadaire, une côte…).",
    cotes: "Répétitions en montée (30 s à 2 min) : renforce les jambes et le cœur, prépare au trail.",
    trail: "Course en nature avec dénivelé : notez le D+ pour un calcul plus juste des calories.",
    tapis: "Course sur tapis : mettez 1 % de pente pour compenser l'absence de vent.",
    race: "Compétition ou test chronométré : vos records sont mis en avant.",
    marche: "Marche rapide ou randonnée : environ 0,5 à 0,7 kcal par kilo et par kilomètre.",
  };
  const speedOf = (s) => s.dist / (s.dur / 3600);
  const rate = (s) => (C.speed ? r1(speedOf(s)) + " km/h" : human(s.dur / s.dist) + "/km");
  /* Calories estimées. Course : ~1 kcal par kg et par km. Vélo : puissance (kJ ≈ kcal) ou MET selon la vitesse. */
  const profKg = () => { try { return window.TempoStore.profile().kg; } catch (e) { return null; } };
  const weight = () => profKg() || S.settings.weight || 70;
  function kcal(s) {
    if (!(s.dist > 0 && s.dur > 0)) return 0;
    const w = weight();
    if (!C.speed) return w * s.dist * (s.type === "trail" ? 1.1 : 1) + (s.dplus || 0) * w * 0.0015;
    if (s.watts) return (s.watts * s.dur) / 1000;
    const v = speedOf(s), met = s.type === "ht" ? 7 : v < 16 ? 4.5 : v < 19 ? 5.8 : v < 22 ? 6.8 : v < 25 ? 8 : v < 28 ? 9 : v < 32 ? 10.3 : 12;
    return (met * w * s.dur) / 3600;
  }
  const inRange = (a, b) => S.sessions.filter((s) => s.date >= dKey(a) && s.date < dKey(b));

  const ic = (p) => `<svg class="j-i" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const I = {
    home: ic('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>'),
    hist: ic('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
    prog: ic('<path d="M4 19h16M5 15l4.5-4.5 3.5 3.5 6-7"/>'),
    rec: ic('<path d="M8 4h8v5a4 4 0 0 1-8 0zM12 13v4M8 20h8M8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3"/>'),
    set: ic('<path d="M5 6h14M5 12h14M5 18h9"/>'),
  };

  /* ---------- Données ---------- */
  const TS = window.TempoStore;
  const lsGet = (k) => TS.get(k);
  const lsSet = (k, v) => TS.set(k, v);
  const S = Object.assign({ sessions: [], gear: [], settings: {} }, lsGet(C.key) || {});
  S.settings = Object.assign({ goal: C.goal }, S.settings);
  const UI = Object.assign({ tab: "home", open: null }, lsGet(C.key + "-ui") || {});
  const sortS = () => S.sessions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.at || 0) - (a.at || 0)));
  const save = () => lsSet(C.key, S);
  const saveUI = () => lsSet(C.key + "-ui", { tab: UI.tab });
  const gearKm = (id) => sum(S.sessions.filter((s) => s.gear === id), (s) => s.dist);
  sortS();

  /* ---------- Rendu ---------- */
  function render() {
    const tabs = [["home", "Accueil", I.home], ["hist", "Historique", I.hist], ["prog", "Progrès", I.prog], ["rec", "Records", I.rec], ["set", "Réglages", I.set]];
    $("#j-tabs").innerHTML = tabs.map(([k, l, i]) => `<button class="j-tab" data-a="tab" data-k="${k}" ${UI.tab === k ? 'aria-current="page"' : ""}>${i}<span>${l}</span></button>`).join("");
    $("#j-view").innerHTML = { home: viewHome, hist: viewHist, prog: viewProg, rec: viewRec, set: viewSet }[UI.tab]();
  }

  function sessRow(s) {
    const t = typeOf(s.type), open = UI.open === s.id, g = S.gear.find((x) => x.id === s.gear);
    let h = `<article class="j-sess" style="--t:${t[2]}"><button class="j-sbtn" data-a="toggle" data-id="${esc(s.id)}" aria-expanded="${open}">
      <span class="j-dot"></span>
      <span class="j-mid"><span class="j-t1">${esc(t[1])} · ${r1(s.dist)} km</span><span class="j-sub">${esc(dShort(s.date))} · ${human(s.dur)} · ${rate(s)}</span></span>
      <span class="j-right">${s.dplus ? r0(s.dplus) + " m D+" : ""}</span></button>`;
    if (open) {
      const facts = [
        s.fc && ["FC moyenne", r0(s.fc) + " bpm"],
        s.watts && ["Puissance moyenne", r0(s.watts) + " W"],
        ["Calories (estimation)", "≈ " + r0(kcal(s)) + " kcal"],
        s.rpe && ["Ressenti", s.rpe + " / 10"],
        g && [C.gearName, g.name],
        !C.speed && ["Vitesse", r1(speedOf(s)) + " km/h"],
        C.speed && ["Durée", human(s.dur)],
      ].filter(Boolean);
      h += `<div class="j-detail">${facts.map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join("")}
        ${s.note ? `<p class="j-note">« ${esc(s.note)} »</p>` : ""}${routeSVG(s.route, t[2])}
        <div class="j-row"><button class="j-btn sm" data-a="edit" data-id="${esc(s.id)}">Modifier</button>${window.TempoShare ? `<button class="j-btn sm" data-a="share" data-id="${esc(s.id)}">Partager en image</button>` : ""}<button class="j-btn sm danger" data-a="del" data-id="${esc(s.id)}">Supprimer</button></div></div>`;
    }
    return h + "</article>";
  }

  /* ---------- Plan d'entraînement suivi ---------- */
  const PLAN_KEY = "tempo-plan-v1";
  const getPlan = () => { if (SPORT !== "course") return null; try { const p = TS.get(PLAN_KEY); return p && Array.isArray(p.weeks) && p.weeks.length ? p : null; } catch (_) { return null; } };
  const planList = (p) => [].concat(...p.weeks.map((w) => w.sessions.map((x) => Object.assign({ w: w.w, phase: w.phase }, x))));
  // "auto" : une sortie est notée ce jour-là ; "manual" : cochée à la main
  const planState = (p, x) => (p.done && p.done[x.date] ? "manual" : S.sessions.some((r) => r.date === x.date && r.type !== "marche") ? "auto" : "");
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  function planRow(p, x, today) {
    const st = planState(p, x), done = !!st, past = x.date < today, t = typeOf(x.type);
    const label = done ? (st === "auto" ? "Sortie notée" : "Faite") : past ? "Non faite" : x.date === today ? "Aujourd'hui" : "";
    return `<div class="j-prow${done ? " done" : ""}${!done && past ? " missed" : ""}${x.date === today ? " today" : ""}">
      <button type="button" class="j-pcheck" data-a="plan-check" data-d="${x.date}" aria-pressed="${done}" ${st === "auto" ? 'disabled title="Une sortie est notée ce jour-là"' : ""} aria-label="${done ? "Séance faite" : "Marquer la séance comme faite"} : ${esc(dShort(x.date))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>
      <div><div class="j-prow-top"><span>${esc(dShort(x.date))}</span><i style="--t:${t[2]}">${esc(t[1])}</i>${label ? `<em>${label}</em>` : ""}</div><p>${esc(x.text)}</p></div>
    </div>`;
  }
  function viewPlan() {
    const p = getPlan();
    if (!p) return SPORT === "course" ? `<section class="j-plan-cta"><div><b>Vous préparez une course ?</b><span>Créez un plan d'entraînement adapté à votre niveau, puis suivez-le ici séance par séance.</span></div><a class="j-btn sm" href="plan-entrainement.html">Créer un plan</a></section>` : "";
    const today = dKey(new Date()), all = planList(p), ws = dKey(weekStart(new Date())), we = dKey(addDays(weekStart(new Date()), 7));
    const first = all[0], race = p.raceDate, dLeft = Math.round((toDate(race) - toDate(today)) / 864e5);
    const wk = all.filter((x) => x.date >= ws && x.date < we), wkDone = wk.filter((x) => planState(p, x)).length;
    const sofar = all.filter((x) => x.date <= today), sofarDone = sofar.filter((x) => planState(p, x)).length;
    const curW = wk.length ? wk[0].w : null;
    const title = esc(p.title || "Mon plan");
    let h = `<section class="j-plan"><div class="j-plan-head"><div><div class="j-eyebrow">${curW ? `Mon plan · semaine ${curW} sur ${p.weeks.length}${wk[0].phase ? " · " + esc(wk[0].phase) : ""}` : "Mon plan"}</div><b>${title}</b></div>`;
    h += dLeft > 0 ? `<span class="j-plan-count"><b>J-${dLeft}</b><small>${esc(dShort(race))}</small></span>` : dLeft === 0 ? `<span class="j-plan-count race"><b>Jour J</b><small>Bonne course</small></span>` : "";
    h += `</div>`;
    if (dLeft < 0) {
      const tot = all.length, d = all.filter((x) => planState(p, x)).length;
      h += `<p class="j-plan-end"><b>Plan terminé.</b> Vous avez réalisé ${d} séance${d > 1 ? "s" : ""} sur ${tot} (${pct(d, tot)} %). Bravo pour le travail accompli.</p>
        <div class="j-row"><a class="j-btn sm" href="plan-entrainement.html">Préparer une autre course</a><button class="j-btn sm" data-a="plan-stop">Retirer ce plan</button></div></section>`;
      return h;
    }
    if (today < first.date) {
      h += `<p class="j-plan-today rest"><b>Votre plan commence ${esc(dLong(first.date))}.</b> D'ici là, courez en endurance facile.</p>`;
      h += `<div class="j-h3" style="margin:14px 0 4px">Première semaine</div>` + all.filter((x) => x.w === 1).map((x) => planRow(p, x, today)).join("");
    } else {
      const td = all.find((x) => x.date === today);
      if (td) {
        const st = planState(p, td), t = typeOf(td.type);
        h += `<div class="j-plan-today${st ? " done" : ""}" style="--t:${t[2]}"><div class="j-eyebrow">Aujourd'hui · ${esc(t[1])}</div><p>${esc(td.text)}</p>` +
          (st ? `<span class="j-plan-ok">${st === "auto" ? "Sortie notée : séance faite" : "Séance faite"}</span>` :
            `<div class="j-row"><button class="j-btn primary sm" data-a="plan-log" data-d="${td.date}">Noter cette sortie</button><button class="j-btn sm" data-a="plan-check" data-d="${td.date}">Marquer comme faite</button></div>`) + `</div>`;
      } else {
        const nx = all.find((x) => x.date > today);
        h += `<p class="j-plan-today rest"><b>Pas de séance prévue aujourd'hui.</b> Repos ou marche légère.${nx ? ` Prochaine séance ${esc(dLong(nx.date))} : ${esc(nx.text.charAt(0).toLowerCase() + nx.text.slice(1))}.` : ""}</p>`;
      }
      if (wk.length) h += `<div class="j-h3" style="margin:16px 0 4px">Cette semaine · ${wkDone} sur ${wk.length}</div>` + wk.map((x) => planRow(p, x, today)).join("");
    }
    if (sofar.length) h += `<div class="j-plan-rate"><div><span>Taux de réalisation depuis le début</span><b>${pct(sofarDone, sofar.length)} %</b></div><div class="j-bar"><span style="width:${pct(sofarDone, sofar.length)}%"></span></div><small>${sofarDone} séance${sofarDone > 1 ? "s" : ""} faite${sofarDone > 1 ? "s" : ""} sur ${sofar.length} prévue${sofar.length > 1 ? "s" : ""} jusqu'à aujourd'hui</small></div>`;
    h += `<div class="j-row j-plan-links"><span><a href="plan-entrainement.html">Voir le plan complet</a> · <a href="plan-entrainement.html#lexique">Que veulent dire EF, VMA, seuil ?</a></span><button class="j-link" data-a="plan-stop">Arrêter de suivre</button></div></section>`;
    return h;
  }

  function viewHome() {
    const ws = weekStart(new Date()), t = dKey(new Date()), L = ["L", "M", "M", "J", "V", "S", "D"];
    const pl = getPlan(), planned = new Set(pl ? planList(pl).map((x) => x.date) : []);
    let strip = "";
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i), k = dKey(d), ss = S.sessions.filter((s) => s.date === k);
      strip += `<div class="j-wd${k === t ? " today" : ""}${planned.has(k) && !ss.length ? " planned" : ""}"${planned.has(k) ? ' title="Séance prévue par votre plan"' : ""}>${L[i]}<b>${d.getDate()}</b><span class="j-dots">${ss.length ? ss.slice(0, 3).map((s) => `<i style="background:${typeOf(s.type)[2]}"></i>`).join("") : "<i></i>"}</span></div>`;
    }
    const wk = inRange(ws, addDays(ws, 7)), km = sum(wk, (s) => s.dist), goal = S.settings.goal;
    let h = `<section><div class="j-week">${strip}</div></section>${viewPlan()}
      <section class="j-goal"><div class="j-eyebrow">Cette semaine</div>
        <div class="j-big"><b>${r1(km)}</b> <span>/ ${r0(goal)} km</span></div>
        <div class="j-bar"><span style="width:${Math.min(100, (km / goal) * 100)}%"></span></div>
        <div class="j-muted">${wk.length} ${C.word}${wk.length > 1 ? "s" : ""} · ${wk.length ? human(sum(wk, (s) => s.dur)) : "0 min"} · ${r0(sum(wk, (s) => s.dplus))} m D+ · ${r0(sum(wk, kcal))} kcal${km >= goal ? " · objectif atteint" : ""}</div></section>
      <button class="j-btn primary big" data-a="add">Ajouter une ${C.word}</button>`;
    const worn = S.gear.filter((g) => !g.retired && gearKm(g.id) >= g.limit * 0.85);
    worn.forEach((g) => { h += `<section class="j-alert"><b>${esc(g.name)} : ${r0(gearKm(g.id))} km</b><span>${gearKm(g.id) >= g.limit ? "Durée de vie conseillée dépassée" : "Bientôt en fin de vie"} (${r0(g.limit)} km). Pensez à ${SPORT === "course" ? "les remplacer" : "vérifier la chaîne"}.</span></section>`; });
    if (S.sessions.length) h += `<section><div class="j-h3">Dernières ${C.word}s</div>${S.sessions.slice(0, 3).map(sessRow).join("")}</section>`;
    else h += `<section class="j-empty"><b>Votre carnet est vide</b><span>Après chaque ${C.word}, notez la distance et la durée : l'${C.speed ? "vitesse" : "allure"} se calcule seule. Votre semaine, vos progrès et vos records se remplissent au fil des ${C.word}s.</span></section>`;
    return h;
  }

  function viewHist() {
    if (!S.sessions.length) return empty("Aucune " + C.word, `Les ${C.word}s enregistrées s'affichent ici, de la plus récente à la plus ancienne.`);
    let h = "", month = "";
    S.sessions.forEach((s) => {
      const m = toDate(s.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      if (m !== month) {
        month = m;
        const ms = S.sessions.filter((x) => toDate(x.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) === m);
        h += `<div class="j-month"><span>${esc(m)}</span><span>${r1(sum(ms, (x) => x.dist))} km · ${ms.length} ${C.word}${ms.length > 1 ? "s" : ""}</span></div>`;
      }
      h += sessRow(s);
    });
    return h;
  }

  function viewProg() {
    if (!S.sessions.length) return empty("Pas encore de données", `Enregistrez une ${C.word} pour voir vos kilomètres par semaine, la répartition de vos séances et l'évolution de votre ${C.speed ? "vitesse" : "allure"}.`);
    const now = new Date(), ws = weekStart(now), goal = S.settings.goal;
    const wk = inRange(ws, addDays(ws, 7)), m30 = inRange(addDays(now, -29), addDays(now, 1));
    let h = `<section class="j-tiles">
      <div><div class="j-eyebrow">Semaine</div><div class="j-v">${r1(sum(wk, (s) => s.dist))}<small> / ${r0(goal)} km</small></div></div>
      <div><div class="j-eyebrow">30 jours</div><div class="j-v">${r0(sum(m30, (s) => s.dist))}<small> km</small></div><div class="j-muted">${m30.length} ${C.word}${m30.length > 1 ? "s" : ""}</div></div>
      <div><div class="j-eyebrow">Temps 30 j</div><div class="j-v">${human(sum(m30, (s) => s.dur)).replace(/ \d+ s$/, "")}</div><div class="j-muted">≈ ${r0(sum(m30, kcal))} kcal</div></div></section>`;
    // 12 semaines
    const weeks = [];
    for (let i = 11; i >= 0; i--) { const a = addDays(ws, -7 * i); weeks.push({ a, km: sum(inRange(a, addDays(a, 7)), (s) => s.dist) }); }
    const max = Math.max(goal * 1.25, ...weeks.map((w) => w.km));
    h += `<section><div class="j-h3">Kilomètres · 12 dernières semaines</div><div class="j-weeks">${weeks.map((w, i) =>
      `<div class="j-wk" title="${r1(w.km)} km"><div class="j-wkbar"><span class="${w.km >= goal ? "hit" : ""}" style="height:${(w.km / max) * 100}%"></span><i style="bottom:${(goal / max) * 100}%"></i></div><small>${i === 11 ? "cette" : w.a.getDate() + "/" + (w.a.getMonth() + 1)}</small></div>`).join("")}</div>
      <div class="j-muted">Pointillés : objectif de ${r0(goal)} km par semaine.</div></section>`;
    // Répartition
    const tot = sum(m30, (s) => s.dur) || 1;
    const rows = C.types.map((t) => ({ t, d: sum(m30.filter((s) => s.type === t[0]), (s) => s.dur) })).filter((x) => x.d > 0);
    const easy = sum(m30.filter((s) => C.easy.includes(s.type)), (s) => s.dur) / tot;
    h += `<section><div class="j-h3">Répartition du temps · 30 jours</div><div class="j-types">${rows.map((x) =>
      `<div class="j-type"><span><i style="background:${x.t[2]}"></i>${esc(x.t[1])}</span><div class="j-bar thin"><span style="width:${(x.d / tot) * 100}%;background:${x.t[2]}"></span></div><b>${Math.round((x.d / tot) * 100)} %</b></div>`).join("") || '<div class="j-muted">Aucune sortie ces 30 derniers jours.</div>'}</div>
      ${rows.length ? `<div class="j-muted">${Math.round(easy * 100)} % du temps en endurance facile. La plupart des plans visent environ 80 %.</div>` : ""}</section>`;
    // Courbe
    const pts = S.sessions.filter((s) => C.easy.includes(s.type)).slice(0, 30).reverse()
      .map((s) => ({ x: toDate(s.date).getTime(), y: C.speed ? speedOf(s) : s.dur / s.dist, date: s.date }));
    h += `<section><div class="j-h3">${C.speed ? "Vitesse moyenne" : "Allure"} en ${typeOf(C.easy[0])[1].toLowerCase()} et sortie longue</div>
      ${chart(pts, C.speed ? (v) => r1(v) : (v) => human(v).replace(/ /g, ""), !C.speed)}
      <div class="j-muted">${C.speed ? "Une vitesse qui monte à effort égal" : "Une allure qui baisse à effort égal"} : votre endurance progresse.</div></section>`;
    return h;
  }

  function chart(pts, f, invert) {
    if (pts.length < 2) return `<div class="j-muted">La courbe apparaît à partir de deux sorties de ce type.</div>`;
    const W = 340, H = 160, L = 52, R = 14, T = 12, B = 22;
    let x0 = pts[0].x, x1 = pts[pts.length - 1].x; if (x1 === x0) { x0 -= 864e5; x1 += 864e5; }
    const ys = pts.map((p) => p.y); let lo = Math.min(...ys), hi = Math.max(...ys);
    const pad = (hi - lo || hi * 0.1) * 0.15; lo -= pad; hi += pad;
    const sx = (x) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
    const sy = (y) => { const k = (y - lo) / (hi - lo); return T + (invert ? k : 1 - k) * (H - T - B); };
    let g = "";
    for (let i = 0; i <= 3; i++) { const v = lo + ((hi - lo) * i) / 3; g += `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" class="g"/><text x="${L - 6}" y="${sy(v) + 3.5}" text-anchor="end">${esc(f(v))}</text>`; }
    const d = pts.map((p, i) => (i ? "L" : "M") + sx(p.x).toFixed(1) + " " + sy(p.y).toFixed(1)).join(" ");
    const e = pts[pts.length - 1];
    return `<svg class="j-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe">${g}<path d="${d}" class="ln"/>
      ${pts.map((p) => `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="2.6" class="pt"/>`).join("")}<circle cx="${sx(e.x)}" cy="${sy(e.y)}" r="4.5" class="end"/>
      <text x="${L}" y="${H - 5}">${esc(dShort(pts[0].date))}</text><text x="${W - R}" y="${H - 5}" text-anchor="end">${esc(dShort(e.date))}</text></svg>`;
  }

  function viewRec() {
    if (!S.sessions.length) return empty("Aucun record pour l'instant", `Vos meilleures ${C.word}s apparaîtront ici dès la première enregistrée.`);
    const best = (list, f) => list.reduce((a, s) => (!a || f(s) > f(a) ? s : a), null);
    const rows = [];
    if (!C.speed) {
      [[5, "5 km"], [10, "10 km"], [21.0975, "Semi-marathon"], [42.195, "Marathon"]].forEach(([D, n]) => {
        const ok = S.sessions.filter((s) => s.dist >= D * 0.98);
        const b = best(ok, (s) => -s.dur / s.dist);
        if (b) rows.push([n, human((b.dur / b.dist) * D), `allure ${human(b.dur / b.dist)}/km · ${dShort(b.date)}`]);
      });
    } else {
      const ok = S.sessions.filter((s) => s.dist >= 30 && s.type !== "ht");
      const b = best(ok, speedOf);
      if (b) rows.push(["Vitesse moyenne (30 km et plus)", r1(speedOf(b)) + " km/h", `${r1(b.dist)} km · ${dShort(b.date)}`]);
      const p = best(S.sessions.filter((s) => s.watts), (s) => s.watts);
      if (p) rows.push(["Puissance moyenne", r0(p.watts) + " W", `${human(p.dur)} · ${dShort(p.date)}`]);
    }
    const lg = best(S.sessions, (s) => s.dist); rows.push([`Plus longue ${C.word}`, r1(lg.dist) + " km", `${human(lg.dur)} · ${dShort(lg.date)}`]);
    const du = best(S.sessions, (s) => s.dur); rows.push([`Plus longue durée`, human(du.dur), `${r1(du.dist)} km · ${dShort(du.date)}`]);
    const dp = best(S.sessions, (s) => s.dplus || 0); if (dp.dplus) rows.push(["Plus gros dénivelé", r0(dp.dplus) + " m D+", `${r1(dp.dist)} km · ${dShort(dp.date)}`]);
    const wks = {}; S.sessions.forEach((s) => { const k = dKey(weekStart(toDate(s.date))); wks[k] = (wks[k] || 0) + s.dist; });
    const bw = Object.entries(wks).sort((a, b) => b[1] - a[1])[0];
    rows.push(["Plus grosse semaine", r1(bw[1]) + " km", "semaine du " + dShort(bw[0])]);
    return `<section class="j-recs">${rows.map(([k, v, s]) => `<div class="j-rec"><span>${esc(k)}<small>${esc(s)}</small></span><b>${esc(v)}</b></div>`).join("")}</section>
      ${!C.speed ? '<div class="j-muted">Temps estimés à partir de votre meilleure allure moyenne sur une sortie au moins aussi longue.</div>' : ""}`;
  }

  function viewSet() {
    const active = S.gear.filter((g) => !g.retired), old = S.gear.filter((g) => g.retired);
    const gearRow = (g) => { const km = gearKm(g.id), pct = Math.min(100, (km / g.limit) * 100);
      return `<div class="j-gear${g.retired ? " retired" : ""}"><div class="j-gtop"><b>${esc(g.name)}</b><span>${r0(km)} / ${r0(g.limit)} km</span></div>
        <div class="j-bar thin${pct >= 85 ? " warn" : ""}"><span style="width:${pct}%"></span></div>
        <div class="j-row"><button class="j-btn sm" data-a="gear-retire" data-id="${esc(g.id)}">${g.retired ? "Remettre en service" : "Mettre à la retraite"}</button><button class="j-btn sm danger" data-a="gear-del" data-id="${esc(g.id)}">Supprimer</button></div></div>`; };
    return `<section class="j-stack"><div class="j-h3">Objectif et poids</div>
        <div class="j-grid"><label class="j-f" for="j-goal">Kilomètres par semaine<input id="j-goal" type="number" inputmode="numeric" min="1" step="${C.goalStep}" value="${S.settings.goal}" data-f="goal"></label>
        <label class="j-f" for="j-weight">Votre poids (kg)<input id="j-weight" type="number" inputmode="decimal" min="30" max="250" value="${profKg() || S.settings.weight || ""}" placeholder="70" data-f="weight"></label></div>
        <div class="j-muted">Le poids sert à estimer les calories de chaque sortie. <a href="calories.html">Calculer mes besoins journaliers →</a></div></section>
      <section class="j-stack"><div class="j-h3">${C.gearName}</div><div class="j-muted">${C.gearHint}</div>
        ${active.map(gearRow).join("") || `<div class="j-muted">Aucun matériel. Ajoutez votre ${C.gearOne} pour suivre ses kilomètres.</div>`}
        <div class="j-grid"><label class="j-f" for="g-name">Nom<input id="g-name" placeholder="${esc(C.gearPh)}"></label><label class="j-f" for="g-limit">Durée de vie (km)<input id="g-limit" type="number" inputmode="numeric" value="${C.gearLimit}"></label></div>
        <button class="j-btn" data-a="gear-add">Ajouter</button>
        ${old.length ? `<details class="j-old"><summary>À la retraite (${old.length})</summary>${old.map(gearRow).join("")}</details>` : ""}</section>
      <section class="j-stack"><div class="j-h3">Sauvegarde</div><div class="j-muted">Sans compte (mode essai), rien n'est gardé après la visite ; avec un compte, vos sorties sont enregistrées et retrouvées partout. Copiez une sauvegarde pour les transférer.</div>
        <div class="j-row"><button class="j-btn sm" data-a="export">Copier la sauvegarde</button><button class="j-btn sm" data-a="import">Importer</button></div></section>`;
  }
  const empty = (t, s) => `<section class="j-empty"><b>${esc(t)}</b><span>${esc(s)}</span></section>`;

  /* ---------- Fenêtre, message ---------- */
  function sheet(html) { const s = $("#j-sheet"); s.innerHTML = `<div class="j-panel" role="dialog" aria-modal="true" aria-labelledby="j-sheet-t">${html.replace('class="j-h2"', 'class="j-h2" id="j-sheet-t"')}</div>`; s.hidden = false; }
  function closeSheet() { $("#j-sheet").hidden = true; $("#j-sheet").innerHTML = ""; }
  $("#j-sheet").addEventListener("click", (e) => { if (e.target.id === "j-sheet") closeSheet(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#j-sheet").hidden) closeSheet(); });
  let toastT;
  function toast(m) { const t = $("#j-toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2800); }

  /* ---------- Formulaire de sortie ---------- */
  let FORM = null;
  const parseGPX = (t) => window.TempoGPX.parse(t), routeSVG = (r, c) => (window.TempoGPX ? window.TempoGPX.svg(r, c) : "");
  async function shareRun(s) {
    if (!window.TempoShare) return;
    const t = typeOf(s.type);
    const facts = [s.fc && ["Fréquence cardiaque moyenne", r0(s.fc) + " bpm"], s.dplus && ["Calories (estimation)", "≈ " + r0(kcal(s)) + " kcal"], s.note && [s.note, ""]].filter(Boolean);
    try {
      const r = await TempoShare.share({ color: "#2350d9", kicker: t[1], title: r1(s.dist) + " km", date: toDate(s.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
        stats: [[human(s.dur), "durée"], [rate(s), C.speed ? "vitesse" : "allure"], [s.dplus ? r0(s.dplus) + " m" : r0(kcal(s)) + " kcal", s.dplus ? "dénivelé" : "dépensées"]],
        route: s.route, lines: facts }, "tempo-" + s.date);
      if (r === "downloaded") toast("Image enregistrée : vous pouvez la partager");
    } catch (_) { toast("Impossible de créer l'image"); }
  }

  function openForm(s, pre) {
    const e = s || Object.assign({ date: dKey(new Date()), type: C.types[0][0], rpe: 5, gear: (S.gear.find((g) => !g.retired) || {}).id || "" }, pre || {});
    FORM = { id: s ? s.id : null, type: e.type, rpe: e.rpe || 5, route: s ? s.route || null : null };
    const gears = S.gear.filter((g) => !g.retired || g.id === e.gear);
    sheet(`<div class="j-h2">${s ? "Modifier la " + C.word : "Nouvelle " + C.word}</div>${pre && pre.plan ? `<p class="j-muted j-pre">Séance prévue : ${esc(pre.plan)}. Ajustez la distance et indiquez la durée réelle.</p>` : ""}
      ${SPORT === "course" ? `<div class="j-gpx"><label class="j-btn sm" for="f-gpx">${FORM.route ? "Remplacer le fichier GPX" : "Importer depuis ma montre (GPX)"}</label><input type="file" id="f-gpx" accept=".gpx,application/gpx+xml,application/xml,text/xml" hidden>
        <details><summary>Où trouver ce fichier ?</summary><p>Strava : ouvrez l'activité sur strava.com, menu « … » puis « Exporter GPX ». Garmin Connect : ouvrez l'activité, roue dentée puis « Exporter au format GPX ». Coros, Suunto et Polar proposent aussi l'export GPX dans leur application. Distance, durée, dénivelé, date et fréquence cardiaque se remplissent seuls.</p></details>
        <div id="f-route">${routeSVG(FORM.route, typeOf(e.type)[2])}</div></div>` : ""}
      <div class="j-chips" role="group" aria-label="Type">${C.types.map((t) => `<button type="button" class="j-chip" data-a="ftype" data-v="${t[0]}" aria-pressed="${t[0] === e.type}" style="--t:${t[2]}">${t[1]}</button>`).join("")}</div>
      <p class="j-muted j-typeinfo" id="f-typeinfo">${esc(TYPE_INFO[e.type] || "")}</p>
      <div class="j-grid">
        <label class="j-f" for="f-dist">Distance (km)<input id="f-dist" inputmode="decimal" value="${s ? String(s.dist).replace(".", ",") : pre && pre.km ? String(pre.km).replace(".", ",") : ""}" placeholder="${SPORT === "course" ? "10" : "60"}"></label>
        <label class="j-f" for="f-dur">Durée<input id="f-dur" value="${s ? human(s.dur) : ""}" placeholder="${SPORT === "course" ? "52 min" : "2h10"}"></label>
      </div>
      <div class="j-live" id="f-live" aria-live="polite"></div>
      <div class="j-grid">
        <label class="j-f" for="f-date">Date<input id="f-date" type="date" value="${e.date}"></label>
        <label class="j-f" for="f-dplus">Dénivelé + (m)<input id="f-dplus" inputmode="numeric" value="${e.dplus || ""}" placeholder="optionnel"></label>
        <label class="j-f" for="f-fc">FC moyenne (bpm)<input id="f-fc" inputmode="numeric" value="${e.fc || ""}" placeholder="optionnel"></label>
        ${C.power ? `<label class="j-f" for="f-watts">Puissance moy. (W)<input id="f-watts" inputmode="numeric" value="${e.watts || ""}" placeholder="optionnel"></label>` : ""}
      </div>
      <div class="j-f"><span>Ressenti de l'effort</span><div class="j-rpe" role="group" aria-label="Ressenti de 1 à 10">${Array.from({ length: 10 }, (_, i) => `<button type="button" data-a="frpe" data-v="${i + 1}" aria-pressed="${i + 1 === FORM.rpe}">${i + 1}</button>`).join("")}</div><small>1 très facile · 10 effort maximal</small></div>
      ${gears.length ? `<label class="j-f" for="f-gear">${C.gearName}<select id="f-gear"><option value="">Aucun</option>${gears.map((g) => `<option value="${esc(g.id)}" ${g.id === e.gear ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select></label>` : ""}
      <label class="j-f" for="f-note">Note<textarea id="f-note" rows="2" placeholder="Parcours, météo, sensations…">${esc(e.note || "")}</textarea></label>
      <div class="j-row end"><button class="j-btn" data-a="close">Annuler</button><button class="j-btn primary" data-a="save">Enregistrer</button></div>`);
    live();
    if (!s) setTimeout(() => { const d = $(pre && pre.km ? "#f-dur" : "#f-dist"); d && d.focus({ preventScroll: true }); }, 60);
  }
  function live() {
    const el = $("#f-live"); if (!el) return;
    const d = num($("#f-dist").value), t = parseDur($("#f-dur").value);
    el.innerHTML = d > 0 && t > 0
      ? (C.speed ? "" : `<span><small>Allure</small>${human(t / d)}/km</span>`) + `<span><small>Vitesse moyenne</small>${r1(d / (t / 3600))} km/h</span>` +
        `<span><small>Calories</small>≈ ${r0(kcal({ dist: d, dur: t, type: FORM.type, dplus: num(($("#f-dplus") || {}).value), watts: C.power ? num(($("#f-watts") || {}).value) : null }))} kcal</span>`
      : `<span class="j-muted">Distance et durée : l'${C.speed ? "vitesse" : "allure"} se calcule ici.</span>`;
  }

  /* ---------- Actions ---------- */
  const A = {
    tab(b) { UI.tab = b.dataset.k; UI.open = null; saveUI(); render(); const v = $("#j-view"); v.classList.remove("swap"); void v.offsetWidth; v.classList.add("swap"); window.scrollTo({ top: 0, behavior: "smooth" }); },
    add() { openForm(null); },
    "plan-log"(b) { const p = getPlan(); const x = p && planList(p).find((y) => y.date === b.dataset.d); if (x) openForm(null, { date: x.date, type: x.type, km: x.km, plan: x.text }); },
    "plan-check"(b) {
      const p = getPlan(); if (!p) return;
      p.done = Object.assign({}, p.done); const d = b.dataset.d;
      if (p.done[d]) delete p.done[d]; else p.done[d] = 1;
      TS.set(PLAN_KEY, p); render(); if (p.done[d]) toast("Séance cochée");
    },
    "plan-stop"() { sheet(`<div class="j-h2">Arrêter de suivre ce plan ?</div><p class="j-muted">Le plan disparaît du carnet. Vos sorties enregistrées ne sont pas touchées.</p><div class="j-row end"><button class="j-btn" data-a="close">Annuler</button><button class="j-btn primary" data-a="plan-stop-ok">Arrêter</button></div>`); },
    "plan-stop-ok"() { TS.set(PLAN_KEY, null); closeSheet(); render(); toast("Plan retiré"); },
    edit(b) { openForm(S.sessions.find((s) => s.id === b.dataset.id)); },
    close() { closeSheet(); },
    toggle(b) { UI.open = UI.open === b.dataset.id ? null : b.dataset.id; render(); },
    ftype(b) { FORM.type = b.dataset.v; b.parentNode.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); const ti = $("#f-typeinfo"); if (ti) ti.textContent = TYPE_INFO[FORM.type] || ""; live(); },
    frpe(b) { FORM.rpe = +b.dataset.v; b.parentNode.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); },
    save() {
      const dist = num($("#f-dist").value), dur = parseDur($("#f-dur").value);
      if (!(dist > 0)) { toast("Indiquez la distance en km"); $("#f-dist").focus(); return; }
      if (!(dur > 0)) { toast("Indiquez la durée, par exemple 52 min ou 1h10"); $("#f-dur").focus(); return; }
      const prevMax = Math.max(0, ...S.sessions.filter((s) => s.id !== FORM.id).map((s) => s.dist));
      const old = FORM.id ? S.sessions.find((s) => s.id === FORM.id) : null;
      const s = {
        id: FORM.id || gid(), at: old ? old.at : Date.now(), date: $("#f-date").value || dKey(new Date()), type: FORM.type,
        dist, dur, dplus: num($("#f-dplus").value), fc: num($("#f-fc").value), rpe: FORM.rpe,
        watts: C.power ? num($("#f-watts").value) : null, gear: $("#f-gear") ? $("#f-gear").value : "", note: $("#f-note").value.trim(),
      };
      if (FORM.route) s.route = FORM.route;
      S.sessions = S.sessions.filter((x) => x.id !== s.id).concat(s); sortS(); save(); closeSheet();
      UI.open = null; render();
      if (old) { toast("Sortie modifiée"); return; }
      // Récapitulatif de fin de sortie avec les calories
      const k = kcal(s), isRec = S.sessions.length > 1 && dist > prevMax;
      sheet(`<div class="j-h2">${C.word[0].toUpperCase() + C.word.slice(1)} enregistrée</div>
        <div class="j-end"><span>Calories dépensées</span><b>≈ ${r0(k)} kcal</b>
          <small>${r1(dist)} km · ${human(dur)} · ${rate(s)} · soit ≈ ${r1(k / 285)} parts de pizza</small>
          <small>Poids utilisé : ${r1(weight())} kg${profKg() ? " (votre profil)" : S.settings.weight ? "" : " (par défaut : renseignez votre profil dans Compte)"}</small></div>
        ${isRec ? `<div class="j-alert"><b>Nouveau record</b><span>${C.word[0].toUpperCase() + C.word.slice(1)} la plus longue : ${r1(dist)} km</span></div>` : ""}
        <div class="j-row end">${window.TempoShare ? `<button class="j-btn" data-a="share" data-id="${esc(s.id)}">Partager en image</button>` : ""}<button class="j-btn primary" data-a="close">Fermer</button></div>`);
    },
    share(b) { const s = S.sessions.find((x) => x.id === b.dataset.id); if (s) shareRun(s); },
    del(b) { sheet(`<div class="j-h2">Supprimer cette ${C.word} ?</div><div class="j-muted">Elle disparaîtra de l'historique, des progrès et des records.</div><div class="j-row end"><button class="j-btn" data-a="close">Annuler</button><button class="j-btn danger solid" data-a="del-ok" data-id="${esc(b.dataset.id)}">Supprimer</button></div>`); },
    "del-ok"(b) { S.sessions = S.sessions.filter((s) => s.id !== b.dataset.id); save(); closeSheet(); UI.open = null; render(); toast("Sortie supprimée"); },
    "gear-add"() {
      const n = $("#g-name").value.trim(), l = num($("#g-limit").value) || C.gearLimit;
      if (!n) { toast("Donnez un nom à votre matériel"); $("#g-name").focus(); return; }
      S.gear.push({ id: gid(), name: n, limit: l, retired: false }); save(); render(); toast(n + " ajouté");
    },
    "gear-retire"(b) { const g = S.gear.find((x) => x.id === b.dataset.id); g.retired = !g.retired; save(); render(); },
    "gear-del"(b) { sheet(`<div class="j-h2">Supprimer ce matériel ?</div><div class="j-muted">Les ${C.word}s restent dans l'historique, elles ne seront simplement plus rattachées à ce matériel.</div><div class="j-row end"><button class="j-btn" data-a="close">Annuler</button><button class="j-btn danger solid" data-a="gear-del-ok" data-id="${esc(b.dataset.id)}">Supprimer</button></div>`); },
    "gear-del-ok"(b) { S.gear = S.gear.filter((g) => g.id !== b.dataset.id); S.sessions.forEach((s) => { if (s.gear === b.dataset.id) s.gear = ""; }); save(); closeSheet(); render(); },
    export() {
      const txt = JSON.stringify({ app: "tempo-" + SPORT, v: 1, sessions: S.sessions, gear: S.gear, settings: S.settings });
      const fall = () => { sheet(`<div class="j-h2">Sauvegarde</div><div class="j-muted">Copiez ce texte et gardez-le dans vos notes.</div><textarea id="j-exp" rows="8" readonly>${esc(txt)}</textarea><div class="j-row end"><button class="j-btn" data-a="close">Fermer</button></div>`); setTimeout(() => { const t = $("#j-exp"); t && t.select(); }, 50); };
      try { navigator.clipboard.writeText(txt).then(() => toast(`Sauvegarde copiée (${S.sessions.length} ${C.word}s)`), fall); } catch (e) { fall(); }
    },
    import() { sheet(`<div class="j-h2">Importer une sauvegarde</div><div class="j-muted">Collez le texte d'une sauvegarde. Les ${C.word}s sont ajoutées à votre historique.</div><textarea id="j-imp" rows="8" placeholder='{"app":"tempo-${SPORT}",…}'></textarea><div class="j-row end"><button class="j-btn" data-a="close">Annuler</button><button class="j-btn primary" data-a="import-ok">Importer</button></div>`); },
    "import-ok"() {
      let o; try { o = JSON.parse($("#j-imp").value); } catch (e) { toast("Texte illisible : vérifiez que tout est collé"); return; }
      if (!o || o.app !== "tempo-" + SPORT || !Array.isArray(o.sessions)) { toast("Ce n'est pas une sauvegarde de ce carnet"); return; }
      const ids = new Set(S.sessions.map((s) => s.id)), add = o.sessions.filter((s) => s && s.id && !ids.has(s.id));
      S.sessions = S.sessions.concat(add); sortS();
      const gids = new Set(S.gear.map((g) => g.id)); (o.gear || []).forEach((g) => { if (!gids.has(g.id)) S.gear.push(g); });
      save(); closeSheet(); render(); toast(`${add.length} ${C.word}s importées`);
    },
  };
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-a]"); if (!b || !A[b.dataset.a]) return; e.preventDefault(); A[b.dataset.a](b, e); });
  document.addEventListener("input", (e) => {
    if (["f-dist", "f-dur", "f-dplus", "f-watts"].includes(e.target.id)) live();
    if (e.target.dataset.f === "weight") { const w = num(e.target.value); if (w > 25 && w < 300) { S.settings.weight = w; save(); try { TS.setProfile({ "n-kg": String(w) }); } catch (_) {} } }
    if (e.target.dataset.f === "goal") { const g = num(e.target.value); if (g > 0) { S.settings.goal = g; save(); } }
  });

  document.addEventListener("change", async (e) => {
    if (e.target.id !== "f-gpx" || !e.target.files || !e.target.files[0]) return;
    const f = e.target.files[0];
    try {
      if (f.size > 25e6) throw new Error("taille");
      const g = parseGPX(await f.text());
      if (!(g.km > 0)) throw new Error("vide");
      $("#f-dist").value = String(g.km).replace(".", ",");
      if (g.dur > 0) $("#f-dur").value = human(g.dur);
      if (g.date) $("#f-date").value = g.date;
      if (g.dplus) $("#f-dplus").value = g.dplus;
      if (g.fc) $("#f-fc").value = g.fc;
      if (g.name && !$("#f-note").value.trim()) $("#f-note").value = g.name;
      FORM.route = g.route;
      $("#f-route").innerHTML = routeSVG(g.route, typeOf(FORM.type)[2]);
      live();
      toast(`Sortie importée : ${r1(g.km)} km${g.dur ? " en " + human(g.dur) : ""}`);
    } catch (err) {
      toast(err && err.message === "taille" ? "Fichier trop lourd" : "Fichier GPX illisible : exportez l'activité au format GPX");
    }
    e.target.value = "";
  });

  render();
  // Données arrivées depuis votre compte (autre appareil ou nouvelle session)
  if (SPORT === "course") TS.watch(PLAN_KEY, () => { if (UI.tab === "home") render(); });
  TS.watch("tempo-profile-v1", () => { if (!document.activeElement || document.activeElement.id !== "j-weight") render(); });
  TS.watch(C.key, (v) => {
    if (!v) return;
    S.sessions = v.sessions || []; S.gear = v.gear || [];
    S.settings = Object.assign({ goal: C.goal }, v.settings || {});
    sortS(); render();
  });
  const syncEl = document.getElementById("j-sync");
  if (syncEl) TS.onStatus((s) => { syncEl.dataset.s = s; syncEl.textContent = ({ anon: "Mode essai", ok: "Enregistré dans votre compte", saving: "Enregistrement…", offline: "Hors connexion : envoi au retour du réseau", err: "Erreur d'enregistrement" }[s] || "Mode essai"); });
})();
