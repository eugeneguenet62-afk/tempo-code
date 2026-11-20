/* Tempo : carnet multisport (rugby, natation, vélo…) et charge d'entraînement globale.
   Les séances sont stockées dans « tempo-multi-v1 » ; la charge additionne aussi musculation et course. */
(function () {
  "use strict";
  const TS = window.TempoStore, CH = window.TempoCharge;
  if (!TS || !CH || !document.getElementById("j-view")) return;
  const KEY = "tempo-multi-v1";

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
    return p.length === 1 ? p[0] * 60 : NaN;
  }
  function human(sec) {
    if (!isFinite(sec)) return "–";
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60, out = [];
    if (h) out.push(h + " h");
    if (m || (h && s)) out.push((h ? String(m).padStart(2, "0") : m) + " min");
    if (s && !h) out.push((m ? String(s).padStart(2, "0") : s) + " s");
    return out.join(" ") || "0 min";
  }
  const dKey = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const toDate = (k) => new Date(k + "T12:00");
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const weekStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const dShort = (k) => toDate(k).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const dLong = (k) => toDate(k).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const pace100 = (s) => (s.dist > 0 && s.dur > 0 ? s.dur / (s.dist / 100) : null);
  const mmss = (sec) => Math.floor(sec / 60) + ":" + String(Math.round(sec % 60)).padStart(2, "0");
  const weight = () => { try { return TS.profile().kg || null; } catch (_) { return null; } };
  const sp = (id) => CH.sportOf(id);
  const SPX = (id) => (window.TempoSports && TempoSports.SPEC[id]) || { fields: [], sum: () => [], derive: () => [], tiles: () => [] };
  const nameOf = (s) => (s.sport === "autre" && s.name ? s.name : sp(s.sport).name);
  // Calories : seulement si on a de quoi les estimer (poids du profil, ou puissance mesurée)
  const kcalTxt = (s) => { const k = CH.kcal(s, weight()); return k != null ? "≈ " + r0(k) + " kcal" : null; };
  const NOKCAL = `<a href="compte.html#profil">Ajoutez votre poids dans votre profil</a> pour estimer les calories.`;

  /* ---------- Données ---------- */
  let S = Object.assign({ sessions: [], settings: {} }, TS.get(KEY) || {});
  const sortS = () => S.sessions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.at || 0) - (a.at || 0)));
  sortS();
  const save = () => TS.set(KEY, S);
  const UI = Object.assign({ tab: "home", open: null, filter: "" }, (() => { try { return JSON.parse(sessionStorage.getItem("tempo-multi-ui")) || {}; } catch (_) { return {}; } })());
  const saveUI = () => { try { sessionStorage.setItem("tempo-multi-ui", JSON.stringify({ tab: UI.tab, filter: UI.filter })); } catch (_) {} };
  const loadOf = (s) => ((s.dur || 0) / 60) * (s.rpe || 5);
  // Sports les plus utilisés en premier dans le formulaire
  const usage = () => { const c = {}; S.sessions.forEach((s) => (c[s.sport] = (c[s.sport] || 0) + 1)); return c; };
  const sportsSorted = () => { const u = usage(); return CH.SPORTS.slice().sort((a, b) => (u[b.id] || 0) - (u[a.id] || 0)); };

  /* ---------- Rendu ---------- */
  const ic = (p) => `<svg class="j-i" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const I = {
    home: ic('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>'),
    hist: ic('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
    charge: ic('<path d="M4 19h16"/><rect x="5" y="11" width="3" height="8"/><rect x="10.5" y="7" width="3" height="12"/><rect x="16" y="13" width="3" height="6"/>'),
    stats: ic('<path d="M8 4h8v5a4 4 0 0 1-8 0zM12 13v4M8 20h8M8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3"/>'),
  };
  function render() {
    const tabs = [["home", "Accueil", I.home], ["hist", "Historique", I.hist], ["charge", "Charge", I.charge], ["stats", "Par sport", I.stats]];
    $("#j-tabs").innerHTML = tabs.map(([k, l, i]) => `<button class="j-tab" data-a="tab" data-k="${k}" ${UI.tab === k ? 'aria-current="page"' : ""}>${i}<span>${l}</span></button>`).join("");
    $("#j-view").innerHTML = { home: viewHome, hist: viewHist, charge: viewCharge, stats: viewStats }[UI.tab]();
  }

  const sessFacts = (s) => SPX(s.sport).sum(s).filter(Boolean);
  function sessRow(s) {
    const t = sp(s.sport), open = UI.open === s.id, facts = sessFacts(s);
    let h = `<article class="j-sess" style="--t:${t.color}"><button class="j-sbtn" data-a="toggle" data-id="${esc(s.id)}" aria-expanded="${open}">
      <span class="m-ic">${ICON(s.sport, 20)}</span>
      <span class="j-mid"><span class="j-t1">${esc(nameOf(s))}${facts[0] ? " · " + esc(facts[0]) : ""}</span><span class="j-sub">${esc(dShort(s.date))} · ${human(s.dur)} · effort ${s.rpe}/10</span></span>
      <span class="j-right">${r0(loadOf(s))} <small>pts</small></span></button>`;
    if (open) {
      const src = CH.kcalSrc(s, weight()), kt = kcalTxt(s);
      const rows = SPX(s.sport).derive(s).concat([
        ["Charge", r0(loadOf(s)) + " points (" + Math.round(s.dur / 60) + " min × " + s.rpe + ")"],
        ["Effort ressenti", s.rpe + " / 10 · " + CH.RPE[s.rpe]],
        s.fc && ["FC moyenne", r0(s.fc) + " bpm"],
        s.fcmax && ["FC max", r0(s.fcmax) + " bpm"],
      ]).filter(Boolean);
      h += `<div class="j-detail">${rows.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}
        <div><span>${esc(kt ? CH.KCAL_LABEL[src] : "Calories")}</span><b>${kt ? esc(kt) : `<small class="m-nok">${NOKCAL}</small>`}</b></div>
        ${s.note ? `<p class="j-note">« ${esc(s.note)} »</p>` : ""}${s.route && window.TempoGPX ? TempoGPX.svg(s.route, t.color) : ""}
        <div class="j-row"><button class="j-btn sm" data-a="edit" data-id="${esc(s.id)}">Modifier</button>${window.TempoShare ? `<button class="j-btn sm" data-a="share" data-id="${esc(s.id)}">Partager en image</button>` : ""}<button class="j-btn sm danger" data-a="del" data-id="${esc(s.id)}">Supprimer</button></div></div>`;
    }
    return h + "</article>";
  }

  /* Jauge du rapport charge aiguë / chronique */
  function gauge(a) {
    const W = 300, H = 54, max = 2, x = (v) => 10 + (Math.min(max, Math.max(0, v)) / max) * (W - 20);
    const seg = [[0, 0.8, "var(--z1)"], [0.8, 1.3, "var(--z2)"], [1.3, 1.5, "var(--z4)"], [1.5, 2, "var(--z5)"]];
    return `<svg class="m-gauge" viewBox="0 0 ${W} ${H}" role="img" aria-label="Rapport de charge ${a.ratio != null ? r1(a.ratio) : "inconnu"}">
      ${seg.map(([a0, b0, c]) => `<rect x="${x(a0)}" y="14" width="${x(b0) - x(a0)}" height="10" fill="${c}" opacity=".85"/>`).join("")}
      ${[0.8, 1.3, 1.5].map((v) => `<text x="${x(v)}" y="42" text-anchor="middle">${String(v).replace(".", ",")}</text>`).join("")}
      ${a.ratio != null && a.enough ? `<path d="M${x(a.ratio)} 4 l6 -0 l-6 9 l-6 -9z" transform="translate(0,1)" class="m-needle"/><line x1="${x(a.ratio)}" x2="${x(a.ratio)}" y1="12" y2="26" class="m-needle-l"/>` : ""}
    </svg>`;
  }
  function chargeCard(compact) {
    const E = CH.entries(TS), a = CH.acwr(E), W = CH.weekly(E, 1)[0];
    const by = Object.values(W.by).sort((p, q) => q.load - p.load);
    let h = `<section class="m-charge"><div class="m-ch-head"><div><div class="j-eyebrow">Charge d'entraînement · 7 derniers jours</div><div class="j-big"><b>${r0(a.acute)}</b> <span>points</span></div></div>`;
    h += a.enough && a.zone ? `<span class="m-zone" style="--z:${a.zone.color}">${a.zone.label}</span>` : "";
    h += `</div>`;
    if (a.enough && a.zone) {
      h += gauge(a) + `<p class="m-ch-text"><b>Rapport ${a.ratio.toFixed(2).replace(".", ",")}</b> : ${esc(a.zone.text)}</p>`;
    } else {
      const left = Math.max(1, 21 - a.days);
      h += `<p class="m-ch-text">${E.length ? `Encore ${left} jour${left > 1 ? "s" : ""} de séances notées pour comparer votre semaine à vos habitudes. Notez tous vos sports : musculation, course et les autres ici.` : "Notez vos séances de tous les sports : Tempo calcule votre charge et vous prévient si elle augmente trop vite."}</p>`;
    }
    if (by.length) h += `<div class="m-by">${by.map((b) => `<div class="m-by-row" style="--c:${b.color}"><span>${esc(b.name)}</span><span class="m-by-bar"><span style="width:${(b.load / Math.max(1, by[0].load)) * 100}%"></span></span><b>${r0(b.load)}</b></div>`).join("")}</div><div class="j-muted">Cette semaine, depuis lundi.</div>`;
    if (!compact) h += `<button class="j-link" data-a="tab" data-k="charge">Comment c'est calculé ?</button>`;
    return h + `</section>`;
  }

  function viewHome() {
    const ws = weekStart(new Date()), t = dKey(new Date()), L = ["L", "M", "M", "J", "V", "S", "D"], E = CH.entries(TS);
    let strip = "";
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i), k = dKey(d), ss = E.filter((x) => x.date === k);
      strip += `<div class="j-wd${k === t ? " today" : ""}">${L[i]}<b>${d.getDate()}</b><span class="j-dots">${ss.length ? ss.slice(0, 3).map((x) => `<i style="background:${x.color}"></i>`).join("") : "<i></i>"}</span></div>`;
    }
    let h = `<section><div class="j-week">${strip}</div><div class="j-muted m-legend">Points de couleur : toutes vos activités, musculation et course comprises.</div></section>`;
    h += chargeCard() + `<button class="j-btn primary big" data-a="add">Ajouter une séance</button>`;
    if (S.sessions.length) h += `<section><div class="j-h3">Dernières séances</div>${S.sessions.slice(0, 4).map(sessRow).join("")}</section>`;
    else h += `<section class="j-empty"><b>Rugby, natation, vélo, sports de combat…</b><span>Notez ici tous les sports qui ne sont ni la musculation ni la course : la durée et l'effort ressenti suffisent. Tempo additionne tout pour suivre votre charge d'entraînement globale.</span></section>`;
    return h;
  }

  function viewHist() {
    if (!S.sessions.length) return `<section class="j-empty"><b>Aucune séance</b><span>Les séances enregistrées s'affichent ici, de la plus récente à la plus ancienne.</span></section>`;
    const used = Array.from(new Set(S.sessions.map((s) => s.sport)));
    let h = used.length > 1 ? `<div class="j-chips" role="group" aria-label="Filtrer par sport"><button class="j-chip" data-a="filter" data-v="" aria-pressed="${!UI.filter}">Tous</button>${used.map((id) => `<button class="j-chip" data-a="filter" data-v="${id}" aria-pressed="${UI.filter === id}" style="--t:${sp(id).color}">${esc(sp(id).name)}</button>`).join("")}</div>` : "";
    const list = S.sessions.filter((s) => !UI.filter || s.sport === UI.filter);
    let month = "";
    list.forEach((s) => {
      const m = toDate(s.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      if (m !== month) {
        month = m;
        const ms = list.filter((x) => toDate(x.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) === m);
        h += `<div class="j-month"><span>${esc(m)}</span><span>${ms.length} séance${ms.length > 1 ? "s" : ""} · ${human(sum(ms, (x) => x.dur))}</span></div>`;
      }
      h += sessRow(s);
    });
    return h;
  }

  function viewCharge() {
    const E = CH.entries(TS), W = CH.weekly(E, 8), max = Math.max(1, ...W.map((w) => w.load)), srcs = {};
    W.forEach((w) => Object.entries(w.by).forEach(([k, b]) => (srcs[k] = srcs[k] || { name: b.name, color: b.color })));
    const chart = `<div class="m-weeks">${W.map((w) => {
      const d = toDate(w.start), segs = Object.values(w.by).sort((p, q) => q.load - p.load);
      return `<div class="m-wk" title="${r0(w.load)} points"><small>${w.load ? r0(w.load) : ""}</small><div class="m-wkbar">${segs.map((b) => `<span style="height:${(b.load / max) * 100}%;background:${b.color}"></span>`).join("")}</div><em>${d.getDate()}/${d.getMonth() + 1}</em></div>`;
    }).join("")}</div><div class="m-key">${Object.values(srcs).map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}</div>`;
    const prev = W.slice(0, -1).filter((w) => w.load > 0), last = W[W.length - 2];
    const growth = last && W[W.length - 3] && W[W.length - 3].load > 0 ? (last.load / W[W.length - 3].load - 1) * 100 : null;
    return chargeCard(true) + `<section class="j-stack"><div class="j-h3">Charge par semaine</div>${chart}
        ${prev.length ? `<div class="j-muted">Moyenne des semaines passées : ${r0(sum(prev, (w) => w.load) / prev.length)} points.${growth != null ? ` Semaine dernière : ${growth >= 0 ? "+" : "−"}${r0(Math.abs(growth))} % par rapport à la précédente.` : ""}</div>` : ""}</section>
      <section class="j-stack m-explain"><div class="j-h3">Comment c'est calculé</div>
        <p><b>Charge d'une séance = durée en minutes × effort ressenti de 1 à 10.</b> Une heure de rugby à 7/10 vaut 420 points, 45 minutes de footing à 4/10 en valent 180. C'est la méthode « session-RPE », utilisée dans de nombreux clubs, du rugby au football, parce qu'elle compare des sports très différents avec la même mesure.</p>
        <p><b>Le rapport de charge</b> compare vos 7 derniers jours à votre moyenne des 4 dernières semaines. Entre 0,8 et 1,3, vous êtes dans vos habitudes. Au-delà de 1,5, la charge a grimpé trop vite : c'est la situation où les blessures sont les plus fréquentes, surtout en sport de contact.</p>
        <p><b>Tous vos carnets comptent</b> : les sorties du carnet de course avec leur effort, et les séances de musculation avec l'effort indiqué en fin de séance (7/10 par défaut).</p>
        <p class="j-muted">Un indicateur pour vous aider à doser, pas un diagnostic : écoutez aussi vos sensations, votre sommeil et vos douleurs.</p></section>`;
  }

  function viewStats() {
    if (!S.sessions.length) return `<section class="j-empty"><b>Pas encore de statistiques</b><span>Après quelques séances, vous verrez ici vos totaux par sport : temps, distances, matchs joués.</span></section>`;
    const by = {};
    S.sessions.forEach((s) => (by[s.sport] = by[s.sport] || []).push(s));
    const y0 = new Date().getFullYear() + "-01-01";
    return Object.entries(by).sort((a, b) => b[1].length - a[1].length).map(([id, L]) => {
      const t = sp(id), year = L.filter((s) => s.date >= y0), tiles = [[L.length, "séances"], [human(sum(L, (s) => s.dur)), "au total"], [r0(sum(L, loadOf) / L.length), "points par séance"]].concat(SPX(id).tiles(L));
      return `<section class="j-stack m-sport" style="--t:${t.color}"><div class="m-sport-h"><i></i><b>${esc(t.name)}</b><span class="j-muted">${year.length} séance${year.length > 1 ? "s" : ""} cette année</span></div>
        <div class="j-tiles">${tiles.map(([v, k]) => `<div><div class="j-v">${v}</div><div class="j-muted">${k}</div></div>`).join("")}</div></section>`;
    }).join("");
  }

  /* ---------- Formulaire : les champs viennent de la description de chaque sport (sports.js) ---------- */
  let FORM = null;
  const fid = (k) => "f-x-" + k;
  const shown = (f) => !f.when || f.when(FORM.v);
  const fmtNum = (v) => (v == null || v === "" ? "" : String(v).replace(".", ","));
  const ICON = (id, n) => (window.TempoSportIcons ? TempoSportIcons.icon(id, n) : "");
  const lastOf = (id) => S.sessions.find((x) => x.sport === id) || null;
  const NOCOPY = new Set(["result", "how", "card", "sets", "score", "wod", "name"]);
  // Choix du sport : grandes tuiles, vos sports habituels en premier
  function pickSport(keep) {
    const u = usage(), all = sportsSorted(), mine = all.filter((x) => u[x.id]).slice(0, 6), rest = all.filter((x) => !mine.includes(x));
    const cur = keep && FORM ? FORM.sport : null;
    const tile = (x) => `<button type="button" class="m-tile${x.id === cur ? " on" : ""}" data-a="pick-sport" data-v="${x.id}" style="--t:${x.color}"><span class="m-tile-ic">${ICON(x.id, 30)}</span><span>${esc(x.name)}</span></button>`;
    if (keep && FORM) collect();
    PICK_KEEP = !!keep;
    sheet(`<div class="j-h2">Quel sport ?</div>
      ${mine.length ? `<p class="m-gl">Vos sports</p><div class="m-grid">${mine.map(tile).join("")}</div><p class="m-gl">Tous les sports</p>` : ""}
      <div class="m-grid">${(mine.length ? rest : all).map(tile).join("")}</div>
      <div class="j-row end"><button class="j-btn" data-a="${keep ? "back-form" : "close"}">${keep ? "Retour" : "Annuler"}</button></div>`);
  }
  let PICK_KEEP = false, FORM_HTML_STATE = null;
  function openForm(s, sportId) {
    if (!s && !sportId) { FORM = null; pickSport(false); return; }
    const sport = s ? s.sport : sportId, prev = s ? null : lastOf(sport);
    // Une nouvelle séance reprend vos réglages habituels pour ce sport (format, poste, bassin…), pas les résultats
    const carry = {};
    if (prev) SPX(sport).fields.forEach((f) => { if ((f.type === "seg" || f.type === "select" || f.type === "multi") && !NOCOPY.has(f.k) && prev[f.k] != null) carry[f.k] = prev[f.k]; });
    FORM = { id: s ? s.id : null, sport, rpe: (s && s.rpe) || (prev && prev.rpe) || 6, route: (s && s.route) || null, prevDur: prev ? prev.dur : null,
      v: Object.assign(window.TempoSports ? TempoSports.defaults(sport) : {}, carry, s ? JSON.parse(JSON.stringify(s)) : {}) };
    drawForm(s || { date: dKey(new Date()) }, !!s);
  }
  function drawForm(e, editing) {
    const t = sp(FORM.sport), today = dKey(new Date()), yest = dKey(new Date(Date.now() - 864e5));
    const durs = [["30 min", 1800], ["45 min", 2700], ["1 h", 3600], ["1 h 30", 5400], ["2 h", 7200]];
    if (FORM.prevDur && !durs.some((d) => d[1] === FORM.prevDur)) durs.unshift([human(FORM.prevDur), FORM.prevDur]);
    sheet(`<div class="j-h2">${editing ? "Modifier la séance" : "Nouvelle séance"}</div>
      <button type="button" class="m-pick" data-a="change-sport" style="--t:${t.color}"><span class="m-tile-ic">${ICON(t.id, 28)}</span><b>${esc(t.name)}</b><small>Changer de sport</small></button>
      <div class="j-f"><span>Date</span><div class="m-q">
        <button type="button" class="j-chip" data-a="fdate" data-v="${today}" aria-pressed="${e.date === today}">Aujourd'hui</button>
        <button type="button" class="j-chip" data-a="fdate" data-v="${yest}" aria-pressed="${e.date === yest}">Hier</button>
        <input id="f-date" type="date" value="${e.date}" aria-label="Autre date"></div></div>
      <div class="j-f"><span>Durée totale</span><div class="m-q">${durs.map(([l, v]) => `<button type="button" class="j-chip" data-a="fdur" data-v="${v}" aria-pressed="${editing ? e.dur === v : false}">${l}</button>`).join("")}</div>
        <input id="f-dur" value="${editing ? human(e.dur) : ""}" placeholder="ou tapez : 1h15, 50 min…" aria-label="Durée totale"></div>
      <div id="f-extra" class="m-extra"></div>
      <div class="j-f"><span>Effort ressenti</span><div class="j-rpe" role="group" aria-label="Effort de 1 à 10">${Array.from({ length: 10 }, (_, i) => `<button type="button" data-a="frpe" data-v="${i + 1}" aria-pressed="${i + 1 === FORM.rpe}">${i + 1}</button>`).join("")}</div><small id="f-rpe-t">${FORM.rpe} : ${CH.RPE[FORM.rpe]}. Jugez la séance entière, 30 minutes après.</small></div>
      <div class="j-grid"><label class="j-f" for="f-fc">FC moyenne (bpm)<input id="f-fc" inputmode="numeric" value="${e.fc || ""}" placeholder="optionnel"></label>
        <label class="j-f" for="f-fcmax">FC max (bpm)<input id="f-fcmax" inputmode="numeric" value="${e.fcmax || ""}" placeholder="optionnel"></label></div>
      <div class="j-live" id="f-live" aria-live="polite"></div>
      <label class="j-f" for="f-note">Note<textarea id="f-note" rows="2" placeholder="Sensations, douleurs, adversaire…">${esc(e.note || "")}</textarea></label>
      <div class="j-row end"><button class="j-btn" data-a="close">Annuler</button><button class="j-btn primary" data-a="save">Enregistrer</button></div>`);
    drawExtra();
    live();
  }
  // Valeurs du haut du formulaire, gardées quand on passe par le choix du sport
  const topState = () => ({ date: ($("#f-date") || {}).value, dur: parseDur(($("#f-dur") || {}).value || ""), durTxt: ($("#f-dur") || {}).value, fc: num(($("#f-fc") || {}).value), fcmax: num(($("#f-fcmax") || {}).value), note: ($("#f-note") || {}).value });

  // Lit les champs affichés dans FORM.v (avant de redessiner ou d'enregistrer)
  function collect() {
    SPX(FORM.sport).fields.forEach((f) => {
      if (f.type === "num") { const el = $("#" + fid(f.k)); if (el) FORM.v[f.k] = num(el.value); }
      else if (f.type === "text" || f.type === "select") { const el = $("#" + fid(f.k)); if (el) FORM.v[f.k] = el.value.trim(); }
      else if (f.type === "score") { const a = $("#" + fid(f.k) + "-a"), b = $("#" + fid(f.k) + "-b"); if (a) { FORM.v[f.k + "For"] = num(a.value); FORM.v[f.k + "Ag"] = num(b.value); } }
    });
  }
  function fieldHtml(f) {
    const v = FORM.v[f.k], id = fid(f.k), hint = f.hint ? `<small>${esc(f.hint)}</small>` : "";
    const lbl = esc(f.label) + (f.unit ? ` (${esc(f.unit)})` : "");
    if (f.type === "seg") return `<div class="j-f"><span>${esc(f.label)}</span><div class="j-chips" role="group" aria-label="${esc(f.label)}">${f.opts.map(([k, l]) => `<button type="button" class="j-chip" data-a="fseg" data-k="${f.k}" data-v="${k}" aria-pressed="${v === k}">${esc(l)}</button>`).join("")}</div>${hint}</div>`;
    if (f.type === "multi") return `<div class="j-f"><span>${esc(f.label)} <em class="m-opt">plusieurs choix possibles</em></span><div class="j-chips" role="group" aria-label="${esc(f.label)}">${f.opts.map(([k, l]) => `<button type="button" class="j-chip" data-a="fmulti" data-k="${f.k}" data-v="${k}" aria-pressed="${(v || []).includes(k)}">${esc(l)}</button>`).join("")}</div>${hint}</div>`;
    if (f.type === "select") return `<label class="j-f" for="${id}">${lbl}<select id="${id}">${f.opts.map(([k, l]) => `<option value="${k}" ${v === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>${hint}</label>`;
    if (f.type === "num") return `<label class="j-f" for="${id}">${lbl}<input id="${id}" inputmode="${f.dec ? "decimal" : "numeric"}" value="${fmtNum(v)}" placeholder="${esc(f.ph || "")}">${hint}</label>`;
    if (f.type === "text") return `<label class="j-f wide" for="${id}">${lbl}<input id="${id}" value="${esc(v || "")}" placeholder="${esc(f.ph || "")}">${hint}</label>`;
    if (f.type === "score") return `<div class="j-f"><span>${esc(f.label)}</span><div class="m-score"><label><small>${esc(f.sub[0])}</small><input id="${id}-a" inputmode="numeric" value="${fmtNum(FORM.v[f.k + "For"])}" aria-label="${esc(f.label + " : " + f.sub[0])}"></label><b>–</b><label><small>${esc(f.sub[1])}</small><input id="${id}-b" inputmode="numeric" value="${fmtNum(FORM.v[f.k + "Ag"])}" aria-label="${esc(f.label + " : " + f.sub[1])}"></label></div></div>`;
    if (f.type === "gpx") return window.TempoGPX ? `<div class="j-gpx"><label class="j-btn sm" for="f-gpx">${FORM.route ? "Remplacer le fichier GPX" : "Importer depuis ma montre (GPX)"}</label><input type="file" id="f-gpx" accept=".gpx,application/gpx+xml,application/xml,text/xml" hidden><div id="f-route">${FORM.route ? TempoGPX.svg(FORM.route, sp(FORM.sport).color) : ""}</div></div>` : "";
    return "";
  }
  function drawExtra() {
    const box = $("#f-extra"); if (!box) return;
    let h = "", grid = [];
    const flush = () => { if (grid.length) h += `<div class="j-grid">${grid.join("")}</div>`; grid = []; };
    SPX(FORM.sport).fields.filter(shown).forEach((f) => {
      const x = fieldHtml(f);
      if (f.type === "num" || f.type === "select") grid.push(x); else { flush(); h += x; }
    });
    flush();
    box.innerHTML = h;
  }
  // En changeant de sport : on garde ce qui a un sens, on remet les choix par défaut du nouveau sport
  function switchSport(id) {
    collect(); FORM.sport = id;
    const d = window.TempoSports ? TempoSports.defaults(id) : {};
    SPX(id).fields.forEach((f) => {
      if ((f.type === "seg" || f.type === "select") && !f.opts.some(([k]) => k === FORM.v[f.k])) { if (d[f.k] != null) FORM.v[f.k] = d[f.k]; else delete FORM.v[f.k]; }
      if (f.type === "multi" && !(FORM.v[f.k] || []).every((x) => f.opts.some(([k]) => k === x))) delete FORM.v[f.k];
    });
  }
  function draft() {
    collect();
    const dur = parseDur(($("#f-dur") || {}).value || "");
    const s = Object.assign({}, FORM.v, { sport: FORM.sport, dur, rpe: FORM.rpe, fc: num(($("#f-fc") || {}).value) });
    return s;
  }
  function live() {
    const el = $("#f-live"); if (!el) return;
    const s = draft();
    if (!(s.dur > 0)) { el.innerHTML = ""; return; }
    const k = CH.kcal(s, weight());
    el.innerHTML = `<span><small>Charge</small>${r0(loadOf(s))} pts</span>` + (k != null ? `<span><small>Calories</small>≈ ${r0(k)} kcal</span>` : `<span class="j-muted">${NOKCAL}</span>`);
  }

  /* ---------- Fenêtres ---------- */
  function sheet(html) { const s = $("#m-sheet"); s.innerHTML = `<div class="j-panel" role="dialog" aria-modal="true" aria-labelledby="m-sheet-t">${html.replace('class="j-h2"', 'class="j-h2" id="m-sheet-t"')}</div>`; s.hidden = false; }
  function closeSheet() { $("#m-sheet").hidden = true; $("#m-sheet").innerHTML = ""; }
  $("#m-sheet").addEventListener("click", (e) => { if (e.target.id === "m-sheet") closeSheet(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#m-sheet").hidden) closeSheet(); });
  let toastT;
  function toast(m) { const t = $("#m-toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2800); }

  async function share(s) {
    const t = sp(s.sport), facts = sessFacts(s), kt = kcalTxt(s);
    try {
      const r = await TempoShare.share({ color: t.color, kicker: nameOf(s), title: facts[0] || human(s.dur), date: dLong(s.date),
        stats: [[human(s.dur), "durée"], [s.rpe + "/10", "effort"], [r0(loadOf(s)), "points de charge"]], route: s.route,
        lines: SPX(s.sport).derive(s).slice(0, 4).concat(kt ? [["Calories (estimation)", kt]] : [], s.fc ? [["Fréquence cardiaque moyenne", r0(s.fc) + " bpm"]] : [], s.note ? [[s.note, ""]] : []) }, "tempo-" + t.id + "-" + s.date);
      if (r === "downloaded") toast("Image enregistrée : vous pouvez la partager");
    } catch (_) { toast("Impossible de créer l'image"); }
  }

  /* ---------- Actions ---------- */
  const A = {
    tab(b) { UI.tab = b.dataset.k; UI.open = null; saveUI(); render(); window.scrollTo(0, 0); },
    add() { openForm(null); },
    edit(b) { const s = S.sessions.find((x) => x.id === b.dataset.id); if (s) openForm(s); },
    close() { closeSheet(); },
    toggle(b) { UI.open = UI.open === b.dataset.id ? null : b.dataset.id; render(); },
    filter(b) { UI.filter = b.dataset.v; saveUI(); render(); },
    share(b) { const s = S.sessions.find((x) => x.id === b.dataset.id); if (s) share(s); },
    "pick-sport"(b) {
      if (PICK_KEEP && FORM && FORM_HTML_STATE) { switchSport(b.dataset.v); const st = FORM_HTML_STATE; FORM_HTML_STATE = null; drawForm({ date: st.date, dur: st.dur, fc: st.fc, fcmax: st.fcmax, note: st.note }, !!FORM.id); if (st.durTxt) $("#f-dur").value = st.durTxt; live(); }
      else openForm(null, b.dataset.v);
    },
    "change-sport"() { FORM_HTML_STATE = topState(); pickSport(true); },
    "back-form"() { const st = FORM_HTML_STATE; FORM_HTML_STATE = null; drawForm({ date: st.date, dur: st.dur, fc: st.fc, fcmax: st.fcmax, note: st.note }, !!FORM.id); if (st.durTxt) $("#f-dur").value = st.durTxt; live(); },
    fdate(b) { $("#f-date").value = b.dataset.v; document.querySelectorAll('[data-a="fdate"]').forEach((x) => x.setAttribute("aria-pressed", x === b)); },
    fdur(b) { $("#f-dur").value = human(+b.dataset.v); document.querySelectorAll('[data-a="fdur"]').forEach((x) => x.setAttribute("aria-pressed", x === b)); live(); },
    fseg(b) { collect(); FORM.v[b.dataset.k] = FORM.v[b.dataset.k] === b.dataset.v && !(SPX(FORM.sport).fields.find((f) => f.k === b.dataset.k) || {}).def ? null : b.dataset.v; drawExtra(); live(); },
    fmulti(b) { collect(); const a = new Set(FORM.v[b.dataset.k] || []); a.has(b.dataset.v) ? a.delete(b.dataset.v) : a.add(b.dataset.v); FORM.v[b.dataset.k] = Array.from(a); b.setAttribute("aria-pressed", a.has(b.dataset.v)); live(); },
    frpe(b) {
      FORM.rpe = +b.dataset.v;
      document.querySelectorAll('[data-a="frpe"]').forEach((x) => x.setAttribute("aria-pressed", +x.dataset.v === FORM.rpe));
      $("#f-rpe-t").textContent = FORM.rpe + " : " + CH.RPE[FORM.rpe] + ". Jugez la séance entière, 30 minutes après.";
      live();
    },
    save() {
      const dur = parseDur($("#f-dur").value);
      if (!(dur > 0)) { toast("Indiquez la durée, par exemple 1h15 ou 45 min"); $("#f-dur").focus(); return; }
      collect();
      const t = sp(FORM.sport), old = FORM.id ? S.sessions.find((x) => x.id === FORM.id) : null;
      const s = { id: FORM.id || gid(), at: old ? old.at : Date.now(), date: $("#f-date").value || dKey(new Date()), sport: FORM.sport, dur, rpe: FORM.rpe };
      const fc = num($("#f-fc").value), fcmax = num($("#f-fcmax").value), note = $("#f-note").value.trim();
      if (fc > 0) s.fc = fc; if (fcmax > 0) s.fcmax = fcmax; if (note) s.note = note;
      // Seuls les champs du sport choisi, et visibles, sont gardés
      SPX(FORM.sport).fields.filter(shown).forEach((f) => {
        const v = FORM.v[f.k];
        if (f.type === "gpx") { if (FORM.route) s.route = FORM.route; return; }
        if (f.type === "score") { const a = FORM.v[f.k + "For"], b = FORM.v[f.k + "Ag"]; if (a != null && b != null) { s[f.k + "For"] = a; s[f.k + "Ag"] = b; } return; }
        if (f.type === "multi") { if (v && v.length) s[f.k] = v; return; }
        if (f.type === "num") { if (v != null && v >= 0) s[f.k] = v; return; }
        if (v != null && v !== "") s[f.k] = v;
      });
      S.sessions = S.sessions.filter((x) => x.id !== s.id).concat(s); sortS(); save(); closeSheet(); UI.open = null; render();
      if (old) { toast("Séance modifiée"); return; }
      const a = CH.acwr(CH.entries(TS)), kt = kcalTxt(s);
      sheet(`<div class="j-h2">Séance de ${esc(nameOf(s).toLowerCase())} enregistrée</div>
        <div class="j-end"><span>Charge de la séance</span><b>${r0(loadOf(s))} points</b><small>${Math.round(dur / 60)} min × effort ${s.rpe}${kt ? " · " + esc(kt) : ""}</small></div>
        ${kt ? "" : `<p class="j-muted">${NOKCAL}</p>`}
        ${a.enough && a.zone && a.zone.id !== "ok" ? `<div class="j-alert"><b>${a.zone.label} : rapport ${a.ratio.toFixed(2).replace(".", ",")}</b><span>${esc(a.zone.text)}</span></div>` : ""}
        <div class="j-row end">${window.TempoShare ? `<button class="j-btn" data-a="share" data-id="${esc(s.id)}">Partager en image</button>` : ""}<button class="j-btn primary" data-a="close">Fermer</button></div>`);
    },
    del(b) { sheet(`<div class="j-h2">Supprimer cette séance ?</div><div class="j-muted">Elle disparaîtra de l'historique et de votre charge d'entraînement.</div><div class="j-row end"><button class="j-btn" data-a="close">Annuler</button><button class="j-btn danger solid" data-a="del-ok" data-id="${esc(b.dataset.id)}">Supprimer</button></div>`); },
    "del-ok"(b) { S.sessions = S.sessions.filter((s) => s.id !== b.dataset.id); save(); closeSheet(); UI.open = null; render(); toast("Séance supprimée"); },
  };
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-a]"); if (!b || !A[b.dataset.a] || !b.closest(".j-app, #m-sheet")) return; e.preventDefault(); A[b.dataset.a](b, e); });
  document.addEventListener("input", (e) => {
    if (!(e.target.closest && e.target.closest("#m-sheet"))) return;
    if (e.target.id === "f-dur") document.querySelectorAll('[data-a="fdur"]').forEach((x) => x.setAttribute("aria-pressed", "false"));
    if (e.target.id === "f-date") document.querySelectorAll('[data-a="fdate"]').forEach((x) => x.setAttribute("aria-pressed", x.dataset.v === e.target.value));
    if (e.target.tagName === "INPUT") live();
  });
  document.addEventListener("change", async (e) => {
    if (e.target.tagName === "SELECT" && e.target.closest("#m-sheet")) { collect(); live(); }
    if (e.target.id !== "f-gpx" || !e.target.files || !e.target.files[0]) return;
    try {
      const g = TempoGPX.parse(await e.target.files[0].text());
      if (!(g.km > 0)) throw new Error("vide");
      collect();
      FORM.v.dist = Math.round(g.km * 100) / 100;
      if (g.dplus) FORM.v.dplus = g.dplus;
      if (g.dur > 0) $("#f-dur").value = human(g.dur);
      if (g.date) $("#f-date").value = g.date;
      if (g.fc) $("#f-fc").value = g.fc;
      FORM.route = g.route; drawExtra(); live();
      toast(`Activité importée : ${r1(g.km)} km`);
    } catch (_) { toast("Fichier GPX illisible : exportez l'activité au format GPX"); }
    e.target.value = "";
  });

  render();
  TS.watch(KEY, (v) => { S = Object.assign({ sessions: [], settings: {} }, v || {}); sortS(); if ($("#m-sheet").hidden) render(); });
  ["carnet-fonte-v1", "tempo-course-v1", "tempo-profile-v1"].forEach((k) => TS.watch(k, () => { if ($("#m-sheet").hidden) render(); }));
  const syncEl = $("#m-sync");
  if (syncEl && TS.onStatus) TS.onStatus((s) => { syncEl.dataset.s = s; syncEl.textContent = ({ ok: "Enregistré dans votre compte", saving: "Enregistrement…", offline: "Hors connexion : envoi au retour du réseau", err: "Erreur d'enregistrement" }[s] || "Mode essai"); });
})();
