/* Tempo : bilan de la semaine (lundi → dimanche), comparé à la semaine d'avant.
   Affiché sur l'accueil en début de semaine (lundi à mercredi) pour la semaine écoulée ; ensuite, un lien permet de le rouvrir. */
(function () {
  "use strict";
  const TS = () => window.TempoStore;
  const get = (k) => { try { return TS().get(k); } catch (_) { return null; } };
  const dk = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const monday = (d) => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const nf = (x, d) => Number(x).toLocaleString("fr-FR", { maximumFractionDigits: d || 0 });
  const e1 = (kg, r) => (r > 0 ? kg * (1 + r / 30) : 0);
  const hm = (min) => { min = Math.round(min); const h = Math.floor(min / 60); return h ? h + " h " + String(min % 60).padStart(2, "0") : min + " min"; };

  function week(a) {   // a = lundi (Date)
    const from = dk(a), to = dk(addDays(a, 7));
    const inW = (d) => d >= from && d < to;
    const f = get("carnet-fonte-v1"), c = get("tempo-course-v1"), m = get("tempo-multi-v1"), food = get("tempo-food-v1"), fm = get("tempo-forme-v1");
    const lifts = ((f && f.sessions) || []).filter((s) => inW(dk(new Date(s.date))));
    const runs = ((c && c.sessions) || []).filter((s) => inW(s.date));
    const other = ((m && m.sessions) || []).filter((s) => inW(s.date));
    const tonnage = lifts.reduce((t, s) => t + (s.exercises || []).reduce((u, e) => u + (e.sets || []).reduce((v, x) => v + (x.kg || 0) * (x.reps || 0), 0), 0), 0);
    const min = lifts.reduce((t, s) => t + (s.duration || 0), 0) + runs.reduce((t, s) => t + (s.dur || 0) / 60, 0) + other.reduce((t, s) => t + (s.dur || 0) / 60, 0);
    // Records de musculation battus cette semaine (1RM estimé au-dessus de tout ce qui précède)
    const all = ((f && f.sessions) || []).slice().sort((x, y) => (x.date < y.date ? -1 : 1));
    const best = {}, prs = [];
    all.forEach((s) => {
      const d = dk(new Date(s.date));
      (s.exercises || []).forEach((e) => {
        const k = e.exId || e.name, v = Math.max(0, ...(e.sets || []).map((x) => e1(x.kg || 0, x.reps || 0)));
        if (!v) return;
        if (inW(d) && best[k] && v > best[k] + 0.01 && !prs.includes(e.name)) prs.push(e.name);
        if (d < to) best[k] = Math.max(best[k] || 0, v);
      });
    });
    // Repas : moyenne sur les jours notés
    const days = {}; ((food && food.sessions) || []).filter((x) => inW(x.date)).forEach((x) => { const g = (x.g || 0) / 100; const d = (days[x.date] = days[x.date] || { k: 0, p: 0 }); d.k += x.kcal * g; d.p += x.p * g; });
    const fd = Object.values(days);
    // Forme du jour : moyenne
    const sc = []; for (let i = 0; i < 7; i++) { const e = fm && fm.days && fm.days[dk(addDays(a, i))]; if (e && e.sleep) sc.push(((e.sleep + e.energy + e.sore + e.mood) / 4 - 1) / 4 * 100); }
    const rugby = other.filter((s) => s.sport === "rugby"), match = rugby.find((s) => s.kind === "match");
    return {
      from, n: lifts.length + runs.length + other.length, lifts: lifts.length, runs: runs.length, other: other.length, min, tonnage,
      km: runs.reduce((t, s) => t + (s.dist || 0), 0), prs, foodDays: fd.length,
      kcal: fd.length ? fd.reduce((t, d) => t + d.k, 0) / fd.length : null, prot: fd.length ? fd.reduce((t, d) => t + d.p, 0) / fd.length : null,
      forme: sc.length ? Math.round(sc.reduce((x, y) => x + y, 0) / sc.length) : null, rugby: rugby.length,
      match: match ? { res: match.result, sf: match.scoreFor, sa: match.scoreAg, tries: match.tries || 0, tackles: match.tackles } : null,
    };
  }
  const delta = (a, b, unit, dec) => { if (b == null || a == null || !b) return ""; const d = a - b; if (Math.abs(d) < (dec ? 0.05 : 0.5)) return `<em class="bl-eq">=</em>`; return `<em class="${d > 0 ? "bl-up" : "bl-down"}">${d > 0 ? "+" : "−"}${nf(Math.abs(d), dec)}${unit || ""}</em>`; };

  function html(w, p) {
    const label = new Date(w.from + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    if (!w.n && !w.foodDays && w.forme == null) return `<div class="bl-head"><h3>Bilan de la semaine du ${label}</h3></div><p class="bl-empty">Rien de noté cette semaine-là. Ce n'est pas grave : notez votre prochaine séance, le bilan se remplira tout seul.</p>`;
    const tiles = [
      [nf(w.n), "séance" + (w.n > 1 ? "s" : ""), delta(w.n, p.n)],
      [hm(w.min), "d'entraînement", delta(w.min / 60, p.min / 60, " h", 1)],
    ];
    if (w.km || p.km) tiles.push([nf(w.km, 1) + " km", "courus", delta(w.km, p.km, " km", 1)]);
    if (w.tonnage || p.tonnage) tiles.push([nf(w.tonnage / 1000, 1) + " t", "soulevées", delta(w.tonnage / 1000, p.tonnage / 1000, " t", 1)]);
    const lines = [];
    if (w.prs.length) lines.push(`<li class="bl-pr"><b>${w.prs.length} record${w.prs.length > 1 ? "s" : ""}</b> : ${w.prs.slice(0, 4).join(", ")}${w.prs.length > 4 ? "…" : ""}</li>`);
    if (w.match) lines.push(`<li><b>Match ${w.match.res === "win" ? "gagné" : w.match.res === "loss" ? "perdu" : "nul"}</b>${w.match.sf != null ? ` ${w.match.sf} à ${w.match.sa}` : ""}${w.match.tackles ? ` · ${w.match.tackles} plaquages` : ""}${w.match.tries ? ` · ${w.match.tries} essai${w.match.tries > 1 ? "s" : ""}` : ""}</li>`);
    if (w.forme != null) lines.push(`<li><b>Forme moyenne ${w.forme} / 100</b>${p.forme != null ? ` ${delta(w.forme, p.forme)}` : ""}</li>`);
    if (w.kcal != null) lines.push(`<li><b>${nf(w.kcal)} kcal</b> et <b>${nf(w.prot)} g de protéines</b> par jour en moyenne (${w.foodDays} jour${w.foodDays > 1 ? "s" : ""} noté${w.foodDays > 1 ? "s" : ""})</li>`);
    // Un conseil pour la semaine qui commence
    let tip = "";
    if (p.n && w.n >= p.n * 1.5 && w.min > p.min * 1.3) tip = "Grosse hausse par rapport à la semaine d'avant : gardez une ou deux séances faciles cette semaine pour digérer.";
    else if (w.n === 0) tip = "Semaine sans séance : reprenez en douceur, une séance courte suffit pour relancer la machine.";
    else if (w.forme != null && w.forme < 50) tip = "Forme basse toute la semaine : priorité au sommeil, et allégez si ça continue.";
    else if (w.prs.length) tip = "Des records : la progression est là. Continuez sur le même rythme.";
    else tip = "Semaine régulière : c'est la régularité qui fait progresser.";
    return `<div class="bl-head"><h3>Bilan de la semaine du ${label}</h3><button type="button" class="fm-link" data-bl="hide">Masquer</button></div>
      <div class="bl-tiles">${tiles.map(([v, l, d]) => `<div><b>${v}</b><span>${l} ${d}</span></div>`).join("")}</div>
      ${lines.length ? `<ul class="bl-lines">${lines.join("")}</ul>` : ""}<p class="bl-tip">${tip}</p>
      <p class="bl-cmp">Comparé à la semaine précédente.</p>`;
  }

  function mount(el, link) {
    if (!el) return;
    const thisMon = monday(new Date()), lastMon = addDays(thisMon, -7), prevMon = addDays(thisMon, -14);
    const key = "tempo-bilan-hidden";
    const hidden = () => { try { return localStorage.getItem(key) === dk(lastMon); } catch (_) { return false; } };
    const early = new Date().getDay() >= 1 && new Date().getDay() <= 3;   // lundi, mardi, mercredi
    const draw = (force) => {
      const w = week(lastMon), p = week(prevMon);
      const has = w.n || p.n || w.foodDays;
      if (!has) { el.hidden = true; if (link) link.hidden = true; return; }
      const show = force || (early && !hidden());
      el.innerHTML = html(w, p); el.hidden = !show;
      if (link) link.hidden = show;
    };
    el.addEventListener("click", (e) => { if (e.target.closest('[data-bl="hide"]')) { try { localStorage.setItem(key, dk(lastMon)); } catch (_) {} el.hidden = true; if (link) link.hidden = false; } });
    if (link) link.addEventListener("click", () => { draw(true); el.scrollIntoView({ block: "nearest", behavior: "smooth" }); });
    draw(false);
  }
  window.TempoBilan = { mount, week };
})();
