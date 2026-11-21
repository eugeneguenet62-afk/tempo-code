/* Tempo : journal alimentaire.
   Trois façons d'ajouter un aliment : chercher (table Ciqual de l'ANSES et produits de marque d'Open Food Facts),
   scanner un code-barres, ou photographier l'assiette sous plusieurs angles (analyse par Claude Haiku, compte requis).
   Les repas sont stockés dans « tempo-food-v1 » (une entrée par aliment, valeurs pour 100 g + quantité). */
(function () {
  "use strict";
  const TS = window.TempoStore;
  if (!TS || !document.getElementById("j-view")) return;
  const KEY = "tempo-food-v1";

  /* ---------- Outils ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const num = (v) => { if (v == null || v === "") return null; const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : null; };
  const r0 = (x) => Math.round(x).toLocaleString("fr-FR");
  const r1 = (x) => (Math.round(x * 10) / 10).toLocaleString("fr-FR");
  const sum = (a, f) => a.reduce((t, x) => t + (f(x) || 0), 0);
  const dKey = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const toDate = (k) => new Date(k + "T12:00");
  const addDays = (k, n) => { const x = toDate(k); x.setDate(x.getDate() + n); return dKey(x); };
  const today = () => dKey(new Date());
  const dLong = (k) => toDate(k).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

  /* ---------- Données ---------- */
  let S = Object.assign({ sessions: [], recents: [] }, TS.get(KEY) || {});
  const save = () => TS.set(KEY, S);
  const MEALS = [["bf", "Petit-déjeuner"], ["lunch", "Déjeuner"], ["snack", "Collation"], ["dinner", "Dîner"]];
  const mealName = (m) => (MEALS.find((x) => x[0] === m) || MEALS[1])[1];
  const mealNow = () => { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 4 ? "snack" : h < 10.5 ? "bf" : h < 15 ? "lunch" : h < 18.5 ? "snack" : "dinner"; };
  const UI = { tab: "day", date: today(), meal: null };
  // Valeurs d'une entrée pour sa quantité
  const tot = (e) => { const k = (e.g || 0) / 100; return { kcal: (e.kcal || 0) * k, p: (e.p || 0) * k, c: (e.c || 0) * k, f: (e.f || 0) * k }; };
  const dayItems = (d) => S.sessions.filter((e) => e.date === d);
  const dayTot = (d) => { const L = dayItems(d).map(tot); return { kcal: sum(L, (x) => x.kcal), p: sum(L, (x) => x.p), c: sum(L, (x) => x.c), f: sum(L, (x) => x.f) }; };

  /* Besoins : mêmes formules que la page Calories (Mifflin-St Jeor × activité, ajusté à l'objectif) */
  function targets() {
    let p = {}; try { p = TS.profile() || {}; } catch (_) {}
    if (!(p.kg && p.cm && p.age && p.sex)) return null;
    const goal = p.goal || "keep", act = p.act || 1.55;
    const bmr = 10 * p.kg + 6.25 * p.cm - 5 * p.age + (p.sex === "h" ? 5 : -161);
    const kcal = bmr * act * { cut: 0.85, keep: 1, bulk: 1.1 }[goal];
    const prot = p.kg * { cut: 2, keep: 1.6, bulk: 1.8 }[goal], fat = (kcal * 0.27) / 9, carb = Math.max(0, kcal - prot * 4 - fat * 9) / 4;
    return { kcal, p: prot, c: carb, f: fat, goal };
  }

  /* ---------- Bases d'aliments ---------- */
  let CIQ = null;
  async function ciqual() {
    if (CIQ) return CIQ;
    const r = await fetch("foods-ciqual.json"); const j = await r.json();
    CIQ = j.f.map(([name, cat, kcal, p, c, f]) => ({ name, cat, kcal, p: p || 0, c: c || 0, f: f || 0, src: "ciqual", n: norm(name) }));
    return CIQ;
  }
  function searchLocal(q) {
    const words = norm(q).split(" ").filter(Boolean);
    if (!words.length || !CIQ) return [];
    const out = [];
    for (const x of CIQ) {
      if (!words.every((w) => x.n.includes(w))) continue;
      // Les noms qui commencent par le mot cherché, et les plus courts, d'abord ; « cuit » avant « cru » pour les féculents
      const score = (x.n.startsWith(words[0]) ? 0 : 10) + x.n.length / 40 + (/\bcru\b/.test(x.n) ? 1 : 0);
      out.push([score, x]);
    }
    return out.sort((a, b) => a[0] - b[0]).slice(0, 25).map((x) => x[1]);
  }
  // Produits de marque : Open Food Facts (base collaborative, licence ODbL), appelée depuis le navigateur
  const OFF = "https://world.openfoodfacts.org";
  const offItem = (p) => {
    const n = p.nutriments || {};
    const kcal = n["energy-kcal_100g"] ?? (n.energy_100g ? n.energy_100g / 4.184 : null);
    if (kcal == null || !p.product_name) return null;
    return { name: p.product_name.trim(), brand: (p.brands || "").split(",")[0].trim(), code: p.code, kcal: +kcal, p: +(n.proteins_100g || 0), c: +(n.carbohydrates_100g || 0), f: +(n.fat_100g || 0), serving: +p.serving_quantity || null, src: "off" };
  };
  let offCtl = null;
  async function searchOFF(q) {
    if (offCtl) offCtl.abort();
    offCtl = new AbortController();
    const u = `${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,brands,nutriments,serving_quantity&lc=fr&cc=fr`;
    const r = await fetch(u, { signal: offCtl.signal });
    const j = await r.json();
    return (j.products || []).map(offItem).filter(Boolean);
  }
  async function byBarcode(code) {
    const r = await fetch(`${OFF}/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,brands,nutriments,serving_quantity`);
    const j = await r.json();
    return j.status === 1 && j.product ? offItem(Object.assign({ code }, j.product)) : null;
  }

  /* ---------- Icônes ---------- */
  const svg = (d, n = 20) => `<svg viewBox="0 0 24 24" width="${n}" height="${n}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    day: svg('<circle cx="12" cy="12" r="8"/><path d="M12 4v8l5 3"/>'),
    week: svg('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'),
    cam: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
    code: svg('<path d="M4 6v12M7 6v12M11 6v12M14 6v12M18 6v12M20 6v12"/>'),
    search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>', 18),
    prev: svg('<path d="m15 6-6 6 6 6"/>', 18), next: svg('<path d="m9 6 6 6-6 6"/>', 18),
    bf: svg('<path d="M5 11h12v3a6 6 0 0 1-12 0zM17 12h1.5a2 2 0 0 1 0 4H17M8 4c-.6 1 .6 2 0 3M12 4c-.6 1 .6 2 0 3"/>'),
    lunch: svg('<circle cx="12" cy="13" r="7"/><circle cx="12" cy="13" r="3.5"/><path d="M3 4v5M5 4v5M4 9v11M20 4c-1.6 1-2 3-2 5h2v11"/>'),
    snack: svg('<path d="M12 8c-3-2.4-7-1-7 3.6C5 16 8 20 10 20c1 0 1.4-.6 2-.6s1 .6 2 .6c2 0 5-4 5-8.4C19 7 15 5.6 12 8zM12 8c0-2 .8-3.4 2.4-4"/>'),
    dinner: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  };

  /* ---------- Rendu ---------- */
  function render() {
    const tabs = [["day", "Journée", I.day], ["week", "Semaine", I.week]];
    $("#j-tabs").innerHTML = tabs.map(([k, l, i]) => `<button class="j-tab" data-a="tab" data-k="${k}" ${UI.tab === k ? 'aria-current="page"' : ""}>${i}<span>${l}</span></button>`).join("");
    $("#j-view").innerHTML = UI.tab === "week" ? viewWeek() : viewDay();
  }
  const bar = (v, t, cls) => `<span class="n-bar ${cls || ""}"><span style="width:${t ? Math.min(100, (v / t) * 100) : 0}%"></span></span>`;
  function viewDay() {
    const d = UI.date, T = targets(), t = dayTot(d), isToday = d === today();
    let h = `<div class="n-date"><button class="j-btn sm" data-a="day-prev" aria-label="Jour précédent">${I.prev}</button>
      <b>${isToday ? "Aujourd'hui" : d === addDays(today(), -1) ? "Hier" : esc(dLong(d))}</b>
      <button class="j-btn sm" data-a="day-next" aria-label="Jour suivant" ${isToday ? "disabled" : ""}>${I.next}</button></div>`;
    // Bilan du jour
    h += `<section class="n-sum">`;
    if (T) {
      const left = T.kcal - t.kcal;
      h += `<div class="n-kcal"><div><span class="j-eyebrow">Mangé</span><b>${r0(t.kcal)}</b><small>sur ${r0(T.kcal)} kcal</small></div>
        <div class="n-left"><span class="j-eyebrow">${left >= 0 ? "Reste" : "Au-dessus de"}</span><b class="${left < 0 ? "over" : ""}">${r0(Math.abs(left))}</b><small>kcal</small></div></div>
        ${bar(t.kcal, T.kcal, "big")}
        <div class="n-macros">${[["Protéines", t.p, T.p, "p"], ["Glucides", t.c, T.c, "c"], ["Lipides", t.f, T.f, "f"]].map(([l, v, g, k]) => `<div class="n-m n-${k}"><span>${l}</span><b>${r0(v)}<small> / ${r0(g)} g</small></b>${bar(v, g)}</div>`).join("")}</div>`;
    } else {
      h += `<div class="n-kcal"><div><span class="j-eyebrow">Mangé</span><b>${r0(t.kcal)}</b><small>kcal</small></div></div>
        <div class="n-macros">${[["Protéines", t.p, "p"], ["Glucides", t.c, "c"], ["Lipides", t.f, "f"]].map(([l, v, k]) => `<div class="n-m n-${k}"><span>${l}</span><b>${r0(v)}<small> g</small></b></div>`).join("")}</div>
        <p class="j-muted"><a href="compte.html#profil">Complétez votre profil</a> (âge, taille, poids, objectif) pour voir vos besoins du jour.</p>`;
    }
    h += `</section>`;
    // Trois façons d'ajouter
    h += `<div class="n-ways"><button class="n-way" data-a="photo">${I.cam}<b>Photo de l'assiette</b><small>2 angles ou plus</small></button>
      <button class="n-way" data-a="add">${I.search}<b>Chercher</b><small>Aliment ou produit</small></button>
      <button class="n-way" data-a="scan">${I.code}<b>Code-barres</b><small>Produit emballé</small></button></div>`;
    // Repas
    MEALS.forEach(([m, name]) => {
      const L = dayItems(d).filter((e) => (e.meal || "lunch") === m), mt = sum(L.map(tot), (x) => x.kcal);
      h += `<section class="n-meal"><div class="n-mh"><span class="n-mi">${I[m]}</span><b>${name}</b><span class="n-mk">${L.length ? r0(mt) + " kcal" : ""}</span>
        <button class="j-btn sm" data-a="add" data-m="${m}" aria-label="Ajouter au ${esc(name.toLowerCase())}">${I.plus}</button></div>
        ${L.length ? L.map((e) => { const x = tot(e); return `<button class="n-item" data-a="edit" data-id="${esc(e.id)}"><span><b>${esc(e.name)}</b><small>${r0(e.g)} g${e.brand ? " · " + esc(e.brand) : ""}${e.src === "photo" ? " · photo" : ""}</small></span><span>${r0(x.kcal)} <small>kcal</small></span></button>`; }).join("") : `<p class="j-muted">Rien de noté.</p>`}</section>`;
    });
    return h;
  }
  function viewWeek() {
    const T = targets(), end = UI.date, days = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6));
    const vals = days.map((d) => dayTot(d)), filled = vals.filter((v) => v.kcal > 0);
    const max = Math.max(T ? T.kcal * 1.15 : 0, ...vals.map((v) => v.kcal), 1);
    let h = `<section><div class="j-eyebrow">7 derniers jours</div>
      <div class="n-week">${days.map((d, i) => { const v = vals[i].kcal; return `<div class="n-wd${d === today() ? " today" : ""}"><small>${v ? r0(v) : "–"}</small><span><i style="height:${(v / max) * 100}%"></i>${T ? `<em style="bottom:${(T.kcal / max) * 100}%"></em>` : ""}</span><b>${toDate(d).toLocaleDateString("fr-FR", { weekday: "narrow" })}</b></div>`; }).join("")}</div>
      ${T ? `<p class="j-muted">Trait : votre besoin du jour (${r0(T.kcal)} kcal).</p>` : ""}</section>`;
    if (filled.length) {
      const avg = (k) => sum(filled, (v) => v[k]) / filled.length;
      h += `<section><div class="j-eyebrow">Moyenne des ${filled.length} jour${filled.length > 1 ? "s" : ""} notés</div>
        <div class="n-macros wk">${[["Calories", avg("kcal"), T && T.kcal, "kcal", "k"], ["Protéines", avg("p"), T && T.p, "g", "p"], ["Glucides", avg("c"), T && T.c, "g", "c"], ["Lipides", avg("f"), T && T.f, "g", "f"]].map(([l, v, g, u, k]) => `<div class="n-m n-${k}"><span>${l}</span><b>${r0(v)}<small>${g ? " / " + r0(g) : ""} ${u}</small></b>${g ? bar(v, g) : ""}</div>`).join("")}</div></section>`;
    } else h += `<section class="j-empty"><p class="j-muted">Aucun repas noté sur ces 7 jours.</p></section>`;
    return h;
  }

  /* ---------- Fenêtres ---------- */
  const sheetEl = () => $("#n-sheet");
  function sheet(html) { const s = sheetEl(); s.innerHTML = `<div class="j-panel" role="dialog" aria-modal="true" aria-labelledby="n-sheet-t">${html.replace('class="j-h2"', 'class="j-h2" id="n-sheet-t"')}</div>`; s.hidden = false; }
  function closeSheet() { stopScan(); sheetEl().hidden = true; sheetEl().innerHTML = ""; }
  sheetEl().addEventListener("click", (e) => { if (e.target === sheetEl()) closeSheet(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheetEl().hidden) closeSheet(); });
  let toastT;
  function toast(m) { const t = $("#n-toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3200); }
  const mealChips = (cur) => `<div class="m-q n-meals" role="group" aria-label="Repas">${MEALS.map(([k, l]) => `<button type="button" class="j-chip" data-a="meal" data-v="${k}" aria-pressed="${k === cur}">${l}</button>`).join("")}</div>`;

  /* ---------- Chercher un aliment ---------- */
  let PICK = null;   // aliment choisi, en attente de quantité
  function openSearch(meal) {
    UI.meal = meal || UI.meal || mealNow();
    sheet(`<div class="j-h2">Ajouter un aliment</div>
      ${mealChips(UI.meal)}
      <label class="n-search">${I.search}<input id="n-q" type="search" placeholder="Pâtes, yaourt, banane…" autocomplete="off" enterkeyhint="search" aria-label="Chercher un aliment"></label>
      <div class="j-row"><button class="j-btn sm" data-a="scan">${I.code} Code-barres</button><button class="j-btn sm" data-a="photo">${I.cam} Photo</button><button class="j-btn sm" data-a="manual">Saisie libre</button></div>
      <div id="n-res" class="n-res" aria-live="polite"></div>
      <div class="j-row end"><button class="j-btn" data-a="close">Fermer</button></div>`);
    drawResults("");
    ciqual().then(() => drawResults(($("#n-q") || {}).value || "")).catch(() => {});
    setTimeout(() => { const q = $("#n-q"); if (q && matchMedia("(hover: hover)").matches) q.focus(); }, 60);
  }
  let RES = [], offT = null;
  const resRow = (x, i) => `<button class="n-r" data-a="pick" data-i="${i}"><span><b>${esc(x.name)}</b><small>${x.src === "off" ? esc(x.brand || "Produit de marque") : x.src === "recent" ? "Récent" : esc(x.cat || "")}</small></span><span>${r0(x.kcal)} <small>kcal/100 g</small></span></button>`;
  function drawResults(q) {
    const box = $("#n-res"); if (!box) return;
    if (!q.trim()) {
      RES = S.recents.slice(0, 15).map((x) => Object.assign({}, x, { src0: x.src, src: "recent" }));
      box.innerHTML = RES.length ? `<p class="m-gl">Récents</p>${RES.map(resRow).join("")}` : `<p class="j-muted">Tapez le nom d'un aliment. Les aliments génériques viennent de la table Ciqual de l'ANSES, les produits de marque d'Open Food Facts.</p>`;
      return;
    }
    const loc = searchLocal(q);
    RES = loc.slice();
    box.innerHTML = (CIQ ? (loc.length ? `<p class="m-gl">Aliments</p>${loc.map(resRow).join("")}` : `<p class="j-muted">Aucun aliment générique trouvé.</p>`) : `<p class="j-muted">Chargement des aliments…</p>`) + `<div id="n-off"><p class="m-gl">Produits de marque</p><p class="j-muted">${navigator.onLine ? "Recherche…" : "Hors connexion : produits de marque indisponibles."}</p></div>`;
    clearTimeout(offT);
    if (!navigator.onLine || norm(q).length < 3) { const o = $("#n-off"); if (o && norm(q).length < 3) o.remove(); return; }
    offT = setTimeout(async () => {
      try {
        const L = await searchOFF(q), o = $("#n-off");
        if (!o || ($("#n-q") || {}).value !== q) return;
        const base = RES.length;
        RES = RES.concat(L);
        o.innerHTML = `<p class="m-gl">Produits de marque</p>` + (L.length ? L.map((x, i) => resRow(x, base + i)).join("") : `<p class="j-muted">Aucun produit trouvé.</p>`);
      } catch (e) { if (e.name !== "AbortError") { const o = $("#n-off"); if (o) o.innerHTML = `<p class="m-gl">Produits de marque</p><p class="j-muted">Open Food Facts ne répond pas pour le moment.</p>`; } }
    }, 450);
  }
  // Quantité
  function openQty(x, edit) {
    PICK = Object.assign({}, x);
    if (PICK.src === "recent") PICK.src = PICK.src0 || "ciqual";
    const g0 = edit ? edit.g : PICK.lastG || PICK.serving || 100;
    const portions = [[50], [100], [150], [200], [250]];
    if (PICK.serving && !portions.some((p) => p[0] === PICK.serving)) portions.unshift([PICK.serving, "1 portion"]);
    sheet(`<div class="j-h2">${edit ? "Modifier" : "Quantité"}</div>
      <div class="n-food"><b>${esc(PICK.name)}</b><small>${PICK.brand ? esc(PICK.brand) + " · " : ""}pour 100 g : ${r0(PICK.kcal)} kcal · P ${r1(PICK.p)} g · G ${r1(PICK.c)} g · L ${r1(PICK.f)} g</small></div>
      ${mealChips(edit ? edit.meal : UI.meal)}
      <div class="j-f"><span>Quantité</span><div class="m-q">${portions.map(([g, l]) => `<button type="button" class="j-chip" data-a="qty" data-v="${g}" aria-pressed="${g === g0}">${l || g + " g"}</button>`).join("")}</div>
        <input id="n-g" inputmode="decimal" value="${r0(g0)}" aria-label="Quantité en grammes"></div>
      <div class="j-live" id="n-live"></div>
      <div class="j-row end">${edit ? `<button class="j-btn danger" data-a="del" data-id="${esc(edit.id)}">Supprimer</button>` : `<button class="j-btn" data-a="back-search">Retour</button>`}
        <button class="j-btn primary" data-a="${edit ? "save-edit" : "save-food"}" ${edit ? `data-id="${esc(edit.id)}"` : ""}>${edit ? "Enregistrer" : "Ajouter"}</button></div>`);
    liveQty();
  }
  function liveQty() {
    const el = $("#n-live"); if (!el || !PICK) return;
    const g = num(($("#n-g") || {}).value) || 0, t = tot(Object.assign({}, PICK, { g }));
    el.innerHTML = `<span><small>Calories</small>${r0(t.kcal)} kcal</span><span><small>Protéines</small>${r1(t.p)} g</span><span><small>Glucides</small>${r1(t.c)} g</span><span><small>Lipides</small>${r1(t.f)} g</span>`;
  }
  const curMeal = () => { const b = $('[data-a="meal"][aria-pressed="true"]'); return b ? b.dataset.v : UI.meal || mealNow(); };
  function addEntries(list, meal) {
    list.forEach((x) => {
      S.sessions.push({ id: gid(), at: Date.now(), date: UI.date, meal, name: x.name, brand: x.brand || undefined, code: x.code || undefined, g: Math.round(x.g), kcal: x.kcal, p: x.p, c: x.c, f: x.f, src: x.src });
      if (x.src !== "photo") {
        S.recents = [{ name: x.name, brand: x.brand, code: x.code, kcal: x.kcal, p: x.p, c: x.c, f: x.f, src: x.src, cat: x.cat, serving: x.serving, lastG: Math.round(x.g) }].concat(S.recents.filter((r) => !(r.name === x.name && (r.brand || "") === (x.brand || "")))).slice(0, 40);
      }
    });
    save(); closeSheet(); render();
  }

  /* ---------- Saisie libre ---------- */
  function openManual() {
    sheet(`<div class="j-h2">Saisie libre</div>
      <p class="j-muted">Pour un plat maison ou une étiquette : recopiez les valeurs pour 100 g.</p>
      ${mealChips(UI.meal || mealNow())}
      <label class="j-f" for="mf-name">Nom<input id="mf-name" placeholder="Ex. Lasagnes maison"></label>
      <div class="j-grid"><label class="j-f" for="mf-g">Quantité (g)<input id="mf-g" inputmode="decimal" placeholder="Ex. 300"></label>
        <label class="j-f" for="mf-kcal">Calories pour 100 g<input id="mf-kcal" inputmode="decimal" placeholder="Ex. 160"></label>
        <label class="j-f" for="mf-p">Protéines pour 100 g<input id="mf-p" inputmode="decimal" placeholder="g, optionnel"></label>
        <label class="j-f" for="mf-c">Glucides pour 100 g<input id="mf-c" inputmode="decimal" placeholder="g, optionnel"></label>
        <label class="j-f" for="mf-f">Lipides pour 100 g<input id="mf-f" inputmode="decimal" placeholder="g, optionnel"></label></div>
      <div class="j-row end"><button class="j-btn" data-a="back-search">Retour</button><button class="j-btn primary" data-a="save-manual">Ajouter</button></div>`);
  }

  /* ---------- Code-barres ---------- */
  let stream = null, scanLoop = null, zx = null;
  function stopScan() { if (scanLoop) { cancelAnimationFrame(scanLoop); scanLoop = null; } if (zx) { try { zx.reset(); } catch (_) {} zx = null; } if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } }
  function openScan() {
    UI.meal = UI.meal || mealNow();
    sheet(`<div class="j-h2">Scanner un code-barres</div>
      <div class="n-cam"><video id="n-video" playsinline muted></video><span class="n-aim"></span></div>
      <p class="j-muted" id="n-scan-t">Visez le code-barres du produit, bien à plat et éclairé.</p>
      <label class="j-f" for="n-code">Ou tapez les chiffres sous le code-barres<input id="n-code" inputmode="numeric" placeholder="Ex. 3017620422003"></label>
      <div class="j-row end"><button class="j-btn" data-a="back-search">Retour</button><button class="j-btn primary" data-a="code-go">Chercher ce code</button></div>`);
    startScan();
  }
  async function startScan() {
    const video = $("#n-video"), info = $("#n-scan-t");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { info.textContent = "La caméra n'est pas disponible ici : tapez les chiffres du code-barres."; return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false });
      video.srcObject = stream; await video.play();
    } catch (_) { info.textContent = "Accès à la caméra refusé : tapez les chiffres du code-barres."; return; }
    const found = (code) => { if (!code) return; stopScan(); if (navigator.vibrate) try { navigator.vibrate(40); } catch (_) {} lookup(code); };
    if ("BarcodeDetector" in window) {
      const det = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
      const tick = async () => { if (!stream) return; try { const r = await det.detect(video); if (r[0]) return found(r[0].rawValue); } catch (_) {} scanLoop = requestAnimationFrame(tick); };
      tick();
    } else {
      // Safari (iPhone) n'a pas de lecteur intégré : bibliothèque ZXing, chargée seulement ici
      try {
        if (!window.ZXing) await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "vendor/zxing.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
        const hints = new Map(); hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E]);
        zx = new ZXing.BrowserMultiFormatReader(hints);
        zx.decodeFromVideoElementContinuously ? zx.decodeFromVideoElementContinuously(video, (res) => { if (res) found(res.getText()); })
          : zx.decodeFromStream(stream, video, (res) => { if (res) found(res.getText()); });
      } catch (_) { info.textContent = "Lecture automatique indisponible : tapez les chiffres du code-barres."; }
    }
  }
  async function lookup(code) {
    code = String(code).replace(/\D/g, "");
    if (code.length < 8) { toast("Ce code semble incomplet"); return; }
    sheet(`<div class="j-h2">Code ${esc(code)}</div><p class="j-muted">Recherche du produit…</p>`);
    try {
      const x = await byBarcode(code);
      if (x) { openQty(x); return; }
      sheet(`<div class="j-h2">Produit inconnu</div><p class="j-muted">Le code ${esc(code)} n'est pas encore dans Open Food Facts. Vous pouvez recopier les valeurs de l'étiquette.</p>
        <div class="j-row end"><button class="j-btn" data-a="scan">Réessayer</button><button class="j-btn primary" data-a="manual">Saisie libre</button></div>`);
    } catch (_) { sheet(`<div class="j-h2">Pas de réseau</div><p class="j-muted">La recherche par code-barres demande une connexion.</p><div class="j-row end"><button class="j-btn primary" data-a="back-search">Retour</button></div>`); }
  }

  /* ---------- Photo de l'assiette ---------- */
  const SHOTS = [["Vue de dessus", "Téléphone au-dessus de l'assiette, à plat.", true], ["Vue de côté", "À hauteur de table, pour voir l'épaisseur et ce qui est caché.", true], ["Autre angle", "Conseillé : de l'autre côté, ou de plus près.", false]];
  let PH = [null, null, null], PRES = null;
  function openPhoto() {
    UI.meal = UI.meal || mealNow();
    if (!TS.account || !TS.account.current()) {
      sheet(`<div class="j-h2">Photo de l'assiette</div>
        <p>L'analyse des photos est réservée aux comptes : elle passe par une intelligence artificielle, et le compte évite les abus. C'est gratuit.</p>
        <div class="j-row end"><button class="j-btn" data-a="close">Plus tard</button><a class="j-btn primary" href="compte.html">Créer un compte</a></div>`);
      return;
    }
    PH = [null, null, null];
    drawPhoto();
  }
  function drawPhoto() {
    const n = PH.filter(Boolean).length;
    sheet(`<div class="j-h2">Photo de l'assiette</div>
      <p class="j-muted">Prenez au moins <b>2 photos sous des angles différents</b> : un aliment caché sur une photo (sous la sauce, derrière un autre) se voit sur l'autre. Laissez une fourchette dans le cadre pour l'échelle.</p>
      ${mealChips(UI.meal)}
      <div class="n-shots">${SHOTS.map(([l, tip, req], i) => `<label class="n-shot${PH[i] ? " has" : ""}" for="n-ph-${i}">
        ${PH[i] ? `<img src="${PH[i].url}" alt="${esc(l)}">` : `<span class="n-shot-ic">${I.cam}</span>`}
        <b>${l}${req ? "" : " <small>(conseillé)</small>"}</b><small>${PH[i] ? "Toucher pour reprendre" : tip}</small>
        <input type="file" id="n-ph-${i}" accept="image/*" capture="environment" data-shot="${i}" hidden></label>`).join("")}</div>
      <label class="j-f" for="n-note">Précision (optionnel)<input id="n-note" placeholder="Ex. cuit à l'huile d'olive, sauce à part" maxlength="200"></label>
      <div class="j-row end"><button class="j-btn" data-a="close">Annuler</button><button class="j-btn primary" data-a="analyse" ${n >= 2 ? "" : "disabled"}>${n >= 2 ? "Analyser" : `Encore ${2 - n} photo${2 - n > 1 ? "s" : ""}`}</button></div>`);
  }
  // Réduit chaque photo à 1024 px en JPEG : envoi rapide, coût minime, et les données de localisation de l'appareil photo disparaissent
  async function shrink(file) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1024 / Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.getContext("2d").drawImage(bmp, 0, 0, w, h);
    const url = cv.toDataURL("image/jpeg", 0.82);
    return { url, b64: url.split(",")[1] };
  }
  const AI_ERR = { not_configured: "L'analyse photo n'est pas encore activée sur ce site.", not_signed_in: "Reconnectez-vous à votre compte, puis réessayez.", need_angles: "Il faut au moins 2 photos sous des angles différents.", busy: "Le service d'analyse est très demandé : réessayez dans une minute.", too_large: "Les photos sont trop lourdes.", bad_image: "Une des photos n'a pas pu être lue." };
  async function analyse() {
    const imgs = PH.filter(Boolean).map((x) => x.b64), note = ($("#n-note") || {}).value || "";
    UI.meal = curMeal();
    sheet(`<div class="j-h2">Analyse en cours…</div><div class="n-wait"><span class="n-spin"></span><p class="j-muted">L'IA repère les aliments sur vos ${imgs.length} photos et estime les quantités. Comptez une dizaine de secondes.</p></div>`);
    try {
      const token = await TS.account.token();
      const r = await fetch("/api/repas", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ images: imgs, note }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(AI_ERR[j.error] || "L'analyse n'a pas abouti. Réessayez, ou ajoutez les aliments à la main.");
      PRES = { items: j.items.map((x) => ({ name: x.nom, g: x.g, kcal: x.kcal, p: x.p, c: x.c, f: x.f, conf: x.conf, on: true, src: "photo" })), rem: j.remarques };
      drawPhotoRes();
    } catch (e) {
      sheet(`<div class="j-h2">Analyse impossible</div><p>${esc(navigator.onLine ? e.message : "Pas de connexion : l'analyse photo demande du réseau.")}</p>
        <div class="j-row end"><button class="j-btn" data-a="close">Fermer</button><button class="j-btn primary" data-a="photo-retry">Réessayer</button></div>`);
    }
  }
  function drawPhotoRes() {
    const L = PRES.items, on = L.filter((x) => x.on), t = { kcal: sum(on.map(tot), (x) => x.kcal), p: sum(on.map(tot), (x) => x.p) };
    sheet(`<div class="j-h2">${L.length ? "Voici ce que j'ai repéré" : "Rien de reconnu"}</div>
      ${L.length ? `<p class="j-muted">Vérifiez et corrigez les quantités : c'est une estimation, souvent à 20 % près. Décochez ce qui n'est pas dans l'assiette.</p>` : ""}
      ${PRES.rem ? `<p class="n-rem">${esc(PRES.rem)}</p>` : ""}
      <div class="n-pres">${L.map((x, i) => `<div class="n-pi${x.on ? "" : " off"}">
        <label class="n-pc"><input type="checkbox" data-pres="${i}" ${x.on ? "checked" : ""} aria-label="Garder ${esc(x.name)}"></label>
        <span><b>${esc(x.name)}</b><small>${r0(tot(x).kcal)} kcal · ${x.conf === "basse" ? "<em>à vérifier</em>" : x.conf === "haute" ? "bien visible" : "estimation"}</small></span>
        <label class="n-pg"><input inputmode="decimal" value="${r0(x.g)}" data-presg="${i}" aria-label="Grammes de ${esc(x.name)}"><small>g</small></label></div>`).join("")}</div>
      ${L.length ? `<div class="j-live"><span><small>Total</small>${r0(t.kcal)} kcal</span><span><small>Protéines</small>${r0(t.p)} g</span></div>` : ""}
      ${mealChips(UI.meal)}
      <div class="j-row end"><button class="j-btn" data-a="photo-retry">Reprendre les photos</button>${on.length ? `<button class="j-btn primary" data-a="photo-save">Ajouter ${on.length} aliment${on.length > 1 ? "s" : ""}</button>` : ""}</div>`);
  }

  /* ---------- Actions ---------- */
  const A = {
    tab(b) { UI.tab = b.dataset.k; render(); window.scrollTo({ top: 0 }); },
    "day-prev"() { UI.date = addDays(UI.date, -1); render(); },
    "day-next"() { if (UI.date < today()) { UI.date = addDays(UI.date, 1); render(); } },
    add(b) { openSearch(b && b.dataset.m); },
    scan() { openScan(); },
    photo() { openPhoto(); },
    manual() { openManual(); },
    close() { closeSheet(); },
    "back-search"() { stopScan(); openSearch(UI.meal); },
    meal(b) { UI.meal = b.dataset.v; document.querySelectorAll('[data-a="meal"]').forEach((x) => x.setAttribute("aria-pressed", x === b)); },
    pick(b) { const x = RES[+b.dataset.i]; if (x) openQty(x); },
    qty(b) { $("#n-g").value = b.dataset.v; document.querySelectorAll('[data-a="qty"]').forEach((x) => x.setAttribute("aria-pressed", x === b)); liveQty(); },
    "save-food"() { const g = num($("#n-g").value); if (!(g > 0)) { toast("Indiquez une quantité en grammes"); return; } const m = curMeal(); addEntries([Object.assign({}, PICK, { g })], m); toast(`Ajouté au ${mealName(m).toLowerCase()}`); },
    edit(b) { const e = S.sessions.find((x) => x.id === b.dataset.id); if (e) { UI.meal = e.meal; openQty(e, e); } },
    "save-edit"(b) { const e = S.sessions.find((x) => x.id === b.dataset.id), g = num($("#n-g").value); if (!e || !(g > 0)) return; e.g = Math.round(g); e.meal = curMeal(); save(); closeSheet(); render(); },
    del(b) { S.sessions = S.sessions.filter((x) => x.id !== b.dataset.id); save(); closeSheet(); render(); toast("Aliment supprimé"); },
    "save-manual"() {
      const name = $("#mf-name").value.trim(), g = num($("#mf-g").value), kcal = num($("#mf-kcal").value);
      if (!name || !(g > 0) || kcal == null) { toast("Nom, quantité et calories pour 100 g sont nécessaires"); return; }
      addEntries([{ name, g, kcal, p: num($("#mf-p").value) || 0, c: num($("#mf-c").value) || 0, f: num($("#mf-f").value) || 0, src: "manual" }], curMeal());
    },
    "code-go"() { lookup(($("#n-code") || {}).value || ""); },
    analyse() { analyse(); },
    "photo-retry"() { PH = [null, null, null]; drawPhoto(); },
    "photo-save"() { const L = PRES.items.filter((x) => x.on && x.g > 0); addEntries(L, curMeal()); toast(`${L.length} aliment${L.length > 1 ? "s" : ""} ajouté${L.length > 1 ? "s" : ""}`); },
  };
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-a]"); if (!b || !A[b.dataset.a] || !b.closest(".j-app")) return; if (b.tagName !== "A") e.preventDefault(); A[b.dataset.a](b, e); });
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "n-q") drawResults(t.value);
    if (t.id === "n-g") { document.querySelectorAll('[data-a="qty"]').forEach((x) => x.setAttribute("aria-pressed", x.dataset.v === t.value)); liveQty(); }
    if (t.dataset && t.dataset.presg != null && PRES) { PRES.items[+t.dataset.presg].g = num(t.value) || 0; const live = t.closest(".j-panel").querySelector(".j-live"); if (live) { const on = PRES.items.filter((x) => x.on); live.innerHTML = `<span><small>Total</small>${r0(sum(on.map(tot), (x) => x.kcal))} kcal</span><span><small>Protéines</small>${r0(sum(on.map(tot), (x) => x.p))} g</span>`; } }
  });
  document.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.pres != null && PRES) { PRES.items[+t.dataset.pres].on = t.checked; drawPhotoRes(); return; }
    if (t.dataset && t.dataset.shot != null && t.files && t.files[0]) {
      try { UI.meal = curMeal(); const note = ($("#n-note") || {}).value; PH[+t.dataset.shot] = await shrink(t.files[0]); drawPhoto(); if (note) $("#n-note").value = note; }
      catch (_) { toast("Cette photo n'a pas pu être lue"); }
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "n-code") { e.preventDefault(); lookup(e.target.value); } });

  TS.watch(KEY, (v) => { S = Object.assign({ sessions: [], recents: [] }, v || {}); if (sheetEl().hidden) render(); });
  TS.watch("tempo-profile-v1", () => { if (sheetEl().hidden) render(); });
  const syncEl = $("#n-sync");
  if (syncEl && TS.onStatus) TS.onStatus((s) => { syncEl.dataset.s = s; syncEl.textContent = ({ ok: "Enregistré dans votre compte", saving: "Enregistrement…", offline: "Hors connexion : envoi au retour du réseau", err: "Erreur d'enregistrement" }[s] || "Mode essai"); });
  if (location.hash === "#photo") setTimeout(openPhoto, 300);
  render();
})();
