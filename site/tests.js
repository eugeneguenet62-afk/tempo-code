/* Tempo : tests physiques (rugby et sports collectifs).
   Données : « tempo-tests-v1 » = { results: [{ id, test, date, v }], group: "fwd" | "back" }.
   Les repères sont indicatifs (joueur senior amateur) et dépendent beaucoup de l'âge, du niveau et du poste précis. */
(function () {
  "use strict";
  const KEY = "tempo-tests-v1";
  const TS = window.TempoStore;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const dk = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const today = () => dk(new Date());
  const nf = (x, d) => Number(x).toLocaleString("fr-FR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const mmss = (s) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");
  const dShort = (d) => new Date(d + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* Tests : sens (lower = plus petit c'est mieux), unité, format, repères [correct, bon, très bon] avants / arrières.
     Pour les charges, les repères sont en multiple du poids de corps. */
  const TESTS = [
    { id: "s10", name: "Sprint 10 m", short: "10 m", unit: "s", lower: true, dec: 2, ref: { fwd: [1.95, 1.85, 1.76], back: [1.86, 1.77, 1.69] },
      how: "Départ arrêté, un pied devant la ligne. Chronomètre déclenché au premier mouvement (ou par un partenaire), arrêté à 10 m. Meilleur de 3 essais, 2 à 3 minutes de récupération entre chaque.", what: "L'accélération : percuter, plaquer, prendre l'intervalle." },
    { id: "s40", name: "Sprint 40 m", short: "40 m", unit: "s", lower: true, dec: 2, ref: { fwd: [5.9, 5.6, 5.35], back: [5.5, 5.25, 5.05] },
      how: "Même départ que le 10 m, chronomètre arrêté à 40 m. Meilleur de 2 essais, récupération complète (3 à 4 min).", what: "La vitesse maximale : les courses de soutien et les percées." },
    { id: "bronco", name: "Bronco", short: "Bronco", unit: "time", lower: true, ref: { fwd: [345, 320, 300], back: [320, 300, 285] },
      how: "Plots à 0, 20, 40 et 60 m. Aller-retour 0-20, 0-40, 0-60 = une série (240 m). Enchaînez 5 séries (1 200 m) sans pause, le plus vite possible. Notez le temps total (par exemple 5:10).", what: "L'endurance spécifique au rugby : répéter les efforts avec des changements de direction." },
    { id: "yoyo", name: "Yo-yo test (niveau 1)", short: "Yo-yo", unit: "m", lower: false, dec: 0, ref: { fwd: [1000, 1400, 1800], back: [1300, 1700, 2100] },
      how: "Allers-retours de 20 m au rythme des bips (bande sonore Yo-yo intermittent recovery niveau 1), 10 s de récupération active après chaque aller-retour. Arrêt après deux bips manqués. Notez la distance totale parcourue.", what: "La capacité à répéter des courses rapides avec peu de récupération." },
    { id: "cmj", name: "Saut vertical", short: "Saut", unit: "cm", lower: false, dec: 0, ref: { fwd: [38, 45, 52], back: [42, 50, 57] },
      how: "Saut sans élan, mains sur les hanches, flexion rapide puis extension (contre-mouvement). Mesure avec une appli de saut, une plateforme, ou la différence entre la marque bras tendu et la marque au sommet du saut. Meilleur de 3 essais.", what: "L'explosivité des jambes : impact au contact, touche, démarrage." },
    { id: "pullup", name: "Tractions maximum", short: "Tractions", unit: "reps", lower: false, dec: 0, ref: { fwd: [6, 10, 15], back: [8, 12, 18] },
      how: "Prise en pronation, départ bras tendus, menton au-dessus de la barre à chaque répétition, sans balancer. Une seule série, jusqu'à ne plus pouvoir.", what: "La force du haut du corps en tirage : grattage, lutte au sol, maul." },
    { id: "sq1rm", name: "Squat (1RM)", short: "Squat", unit: "kg", lower: false, dec: 1, rel: true, lift: "squat", ref: { fwd: [1.4, 1.8, 2.2], back: [1.3, 1.6, 2.0] },
      how: "La charge maximale sur une répétition, cuisses au moins parallèles au sol. Sans pareur, ne testez pas le vrai maximum : notez le 1RM estimé de votre carnet de musculation.", what: "La force des jambes, base de la mêlée, des rucks et de l'accélération." },
    { id: "bp1rm", name: "Développé couché (1RM)", short: "Développé", unit: "kg", lower: false, dec: 1, rel: true, lift: "developpe-couche", ref: { fwd: [1.0, 1.3, 1.6], back: [0.9, 1.2, 1.45] },
      how: "La charge maximale sur une répétition, barre touchant la poitrine. Toujours avec un pareur, ou utilisez le 1RM estimé de votre carnet.", what: "La force de poussée : raffut, plaquage, déblayage." },
  ];
  const LEVELS = ["À travailler", "Correct", "Bon", "Très bon"];
  const T = (id) => TESTS.find((t) => t.id === id);

  const load = () => { const d = TS.get(KEY); return d && Array.isArray(d.results) ? d : { results: [] }; };
  const save = (d) => TS.set(KEY, d);
  const weight = () => { try { const p = TS.profile(); return p && p.kg > 0 ? p.kg : null; } catch (_) { return null; } };

  // Avant ou arrière : choix de la personne, sinon le poste du dernier match de rugby noté
  const FWD = ["pil", "tal", "l2", "l3a", "l3c"];
  function group(D) {
    if (D.group) return D.group;
    const m = TS.get("tempo-multi-v1");
    const s = ((m && m.sessions) || []).find((x) => x.sport === "rugby" && x.poste);
    return s ? (FWD.includes(s.poste) ? "fwd" : "back") : "fwd";
  }
  const fmt = (t, v) => v == null ? "—" : t.unit === "time" ? mmss(v) : nf(v, t.dec) + (t.unit === "reps" ? "" : " " + t.unit);
  const unitLabel = (t) => ({ s: "secondes", time: "min:s", m: "mètres", cm: "cm", reps: "répétitions", kg: "kg" }[t.unit]);
  function parse(t, raw) {
    raw = String(raw || "").trim().replace(",", ".");
    if (!raw) return null;
    if (t.unit === "time") { const m = raw.match(/^(\d+)\s*[:'m]\s*(\d{1,2})/); if (m) return +m[1] * 60 + +m[2]; const n = parseFloat(raw); return n > 0 ? (n < 20 ? Math.round(n * 60) : n) : null; }
    const n = parseFloat(raw); return isFinite(n) && n > 0 ? n : null;
  }
  // Niveau atteint selon les repères (0 à 3)
  function level(t, v, g) {
    const w = weight(); let x = v;
    if (t.rel) { if (!w) return null; x = v / w; }
    const r = t.ref[g];
    let l = 0; r.forEach((th, i) => { if (t.lower ? x <= th : x >= th) l = i + 1; });
    return l;
  }
  const better = (t, a, b) => (t.lower ? a < b : a > b);

  // 1RM estimé dans le carnet de musculation (8 dernières semaines) : aide à remplir squat et développé
  function liftE1rm(exId) {
    const f = TS.get("carnet-fonte-v1"); if (!f || !f.sessions) return null;
    const since = Date.now() - 56 * 864e5; let best = 0;
    f.sessions.forEach((s) => { if (new Date(s.date).getTime() < since) return; (s.exercises || []).forEach((e) => { if (e.exId !== exId) return; (e.sets || []).forEach((x) => { if (x.reps > 0 && x.reps <= 12 && x.kg > 0) best = Math.max(best, x.kg * (1 + x.reps / 30)); }); }); });
    return best ? Math.round(best * 2) / 2 : null;
  }

  function spark(t, list) {
    if (list.length < 2) return "";
    const W = 120, H = 34, vs = list.map((r) => r.v), lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
    const pts = list.map((r, i) => [i / (list.length - 1) * (W - 6) + 3, t.lower ? 3 + (r.v - lo) / span * (H - 6) : H - 3 - (r.v - lo) / span * (H - 6)]);
    return `<svg class="ts-spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline points="${pts.map((p) => p.join(",")).join(" ")}"/><circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="3"/></svg>`;
  }

  /* ---------- Vue principale ---------- */
  function render() {
    const D = load(), g = group(D), w = weight();
    const by = {}; D.results.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((r) => { (by[r.test] = by[r.test] || []).push(r); });
    const last = D.results.reduce((a, r) => (!a || r.date > a ? r.date : a), null);
    const weeks = last ? Math.floor((Date.now() - new Date(last + "T12:00")) / (7 * 864e5)) : null;
    let html = `<section class="ts-top">
      <div class="ts-g"><span class="j-muted" style="margin:0">Repères pour</span><div class="j-seg2" role="group" aria-label="Poste">
        <button type="button" data-a="group" data-v="fwd" aria-pressed="${g === "fwd"}">Avants</button><button type="button" data-a="group" data-v="back" aria-pressed="${g === "back"}">Arrières</button></div></div>
      <p class="j-muted" style="margin:0">${last ? `Dernière série de tests : ${dShort(last)}${weeks >= 6 ? ". <b>Il est temps de vous retester</b> : tous les 6 à 8 semaines, c'est l'idéal." : weeks != null ? `. Prochaine dans ${Math.max(1, 6 - weeks)} à ${8 - weeks} semaines.` : ""}` : "Faites les tests en début de préparation, puis toutes les 6 à 8 semaines pour voir vos progrès."}</p>
      <button type="button" class="j-btn primary big" data-a="campaign">Noter une série de tests</button>
      ${!w ? `<p class="j-muted" style="margin:0">Indiquez votre poids dans <a href="compte.html#profil">votre profil</a> pour comparer vos charges (squat, développé) à votre poids de corps.</p>` : ""}
    </section>`;
    html += `<section class="ts-grid-wrap"><div class="ts-grid">${TESTS.map((t) => {
      const L = by[t.id] || [], cur = L[L.length - 1], prev = L[L.length - 2];
      const lv = cur ? level(t, cur.v, g) : null;
      const d = cur && prev ? cur.v - prev.v : null, up = d != null && d !== 0 && better(t, cur.v, prev.v);
      return `<button type="button" class="ts-card" data-a="open" data-id="${t.id}">
        <span class="ts-name">${esc(t.name)}</span>
        <b class="ts-val">${cur ? fmt(t, cur.v) : '<span class="ts-none">Pas encore testé</span>'}</b>
        ${lv != null ? `<span class="ts-lv l${lv}">${LEVELS[lv]}</span>` : ""}
        ${d != null && d !== 0 ? `<span class="ts-d ${up ? "up" : "down"}">${d > 0 ? "+" : "−"}${t.unit === "time" ? Math.abs(Math.round(d)) + " s" : nf(Math.abs(d), t.dec) + (t.unit === "reps" ? "" : " " + t.unit)} ${up ? "mieux" : "moins bien"}</span>` : ""}
        ${spark(t, L.slice(-6))}</button>`;
    }).join("")}</div>
    <p class="j-muted">Repères indicatifs pour un joueur senior de niveau amateur. Ils varient beaucoup avec l'âge, le niveau de jeu et le poste exact : l'important, c'est votre propre progression.</p></section>`;
    $("#j-view").innerHTML = html;
  }

  /* ---------- Fenêtres ---------- */
  const sheetEl = () => $("#t-sheet");
  function sheet(html) { const s = sheetEl(); s.innerHTML = `<div class="j-panel" role="dialog" aria-modal="true">${html}</div>`; s.hidden = false; const f = s.querySelector("input,button"); if (f) f.focus({ preventScroll: true }); }
  function closeSheet() { sheetEl().hidden = true; sheetEl().innerHTML = ""; }
  let toastT;
  function toast(m) { const t = $("#t-toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3000); }

  function hint(t) {
    if (t.lift) { const e = liftE1rm(t.lift); if (e) return { ph: nf(e, 1), note: `≈ ${nf(e, 1)} kg d'après votre carnet de musculation` }; }
    return { ph: t.unit === "time" ? "5:10" : t.unit === "s" ? (t.id === "s10" ? "1,85" : "5,40") : "", note: "" };
  }
  function field(t, val) {
    const h = hint(t);
    return `<label class="j-f">${esc(t.name)} <small>(${unitLabel(t)})</small><input data-t="${t.id}" inputmode="${t.unit === "time" ? "text" : "decimal"}" placeholder="${esc(h.ph)}" value="${esc(val || "")}" autocomplete="off">${h.note ? `<small>${esc(h.note)}</small>` : ""}</label>`;
  }
  function campaign() {
    sheet(`<div class="j-h2">Nouvelle série de tests</div>
      <p class="j-muted" style="margin:0">Remplissez seulement les tests que vous avez faits. Pour bien comparer : même terrain, même échauffement, même moment de la semaine (loin d'un match).</p>
      <label class="j-f">Date<input type="date" id="t-date" value="${today()}" max="${today()}"></label>
      <div class="j-grid">${TESTS.map((t) => field(t)).join("")}</div>
      <div class="j-row end"><button type="button" class="j-btn" data-a="close">Annuler</button><button type="button" class="j-btn primary" data-a="save-camp">Enregistrer</button></div>`);
  }
  function saveFrom(root, onlyId) {
    const date = ($("#t-date", root) || {}).value || today();
    const D = load(); let n = 0, bad = null;
    root.querySelectorAll("input[data-t]").forEach((inp) => {
      if (onlyId && inp.dataset.t !== onlyId) return;
      const t = T(inp.dataset.t); if (!inp.value.trim()) return;
      const v = parse(t, inp.value); if (v == null) { bad = t; return; }
      D.results = D.results.filter((r) => !(r.test === t.id && r.date === date));   // un résultat par test et par jour
      D.results.push({ id: uid(), test: t.id, date, v }); n++;
    });
    if (bad) { toast(`${bad.name} : valeur non reconnue (${unitLabel(bad)})`); return false; }
    if (!n) { toast("Remplissez au moins un test"); return false; }
    save(D); return n;
  }
  function open(id) {
    const t = T(id), D = load(), g = group(D), w = weight();
    const L = D.results.filter((r) => r.test === id).sort((a, b) => (a.date < b.date ? 1 : -1));
    const best = L.reduce((a, r) => (!a || better(t, r.v, a.v) ? r : a), null);
    const refRow = t.ref[g].map((th, i) => `<tr><td><span class="ts-lv l${i + 1}">${LEVELS[i + 1]}</span></td><td class="n">${t.lower ? "≤" : "≥"} ${t.rel ? nf(th, 2) + " × poids" + (w ? ` (${nf(th * w, 0)} kg)` : "") : fmt(t, th)}</td></tr>`).join("");
    sheet(`<div class="ts-sh"><div class="j-h2">${esc(t.name)}</div><button type="button" class="j-btn sm" data-a="close" aria-label="Fermer">Fermer</button></div>
      <p style="margin:0">${esc(t.what)}</p>
      <details class="ts-how" ${L.length ? "" : "open"}><summary>Comment faire le test</summary><p>${esc(t.how)}</p></details>
      <div class="ts-add"><label class="j-f">Date<input type="date" id="t-date" value="${today()}" max="${today()}"></label>${field(t)}<button type="button" class="j-btn primary" data-a="save-one" data-id="${t.id}">Ajouter</button></div>
      ${L.length ? `<div><b>Vos résultats</b>${best ? ` <span class="j-muted">· record : ${fmt(t, best.v)}</span>` : ""}<div class="ts-hist">${L.map((r) => `<div><span>${dShort(r.date)}</span><b>${fmt(t, r.v)}</b>${level(t, r.v, g) != null ? `<span class="ts-lv l${level(t, r.v, g)}">${LEVELS[level(t, r.v, g)]}</span>` : "<span></span>"}<button type="button" class="ts-del" data-a="del" data-rid="${r.id}" data-id="${t.id}" aria-label="Supprimer le résultat du ${dShort(r.date)}">×</button></div>`).join("")}</div></div>` : ""}
      <div><b>Repères ${g === "fwd" ? "avants" : "arrières"}</b><table class="ts-ref"><tbody>${refRow}</tbody></table></div>`);
  }

  /* ---------- Actions ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]"); if (!b || !b.closest("#j-view, #t-sheet")) return;
    const a = b.dataset.a;
    if (a === "group") { const D = load(); D.group = b.dataset.v; save(D); render(); }
    else if (a === "campaign") campaign();
    else if (a === "close") closeSheet();
    else if (a === "save-camp") { const n = saveFrom(sheetEl()); if (n) { closeSheet(); render(); toast(n > 1 ? `${n} résultats enregistrés` : "Résultat enregistré"); } }
    else if (a === "open") open(b.dataset.id);
    else if (a === "save-one") { const n = saveFrom(sheetEl(), b.dataset.id); if (n) { render(); open(b.dataset.id); toast("Résultat enregistré"); } }
    else if (a === "del") { const D = load(); D.results = D.results.filter((r) => r.id !== b.dataset.rid); save(D); render(); open(b.dataset.id); toast("Résultat supprimé"); }
  });
  sheetEl().addEventListener("click", (e) => { if (e.target === sheetEl()) closeSheet(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheetEl().hidden) closeSheet(); });
  TS.watch(KEY, () => { if (sheetEl().hidden) render(); });
  TS.watch("tempo-profile-v1", () => { if (sheetEl().hidden) render(); });
  render();
  window.TempoTests = { TESTS, level, parse };
})();
