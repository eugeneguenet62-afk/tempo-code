/* Tempo : forme du jour.
   Chaque matin, 4 questions notées de 1 à 5 (sommeil, énergie, courbatures, moral), comme les questionnaires de bien-être
   des clubs. Le score est croisé avec la charge d'entraînement (7 jours / 28 jours) pour conseiller : pousser, séance normale
   ou récupérer. Données : « tempo-forme-v1 » = { days: { "2026-11-23": { sleep, energy, sore, mood } } }. */
(function () {
  "use strict";
  const KEY = "tempo-forme-v1";
  const Q = [
    { k: "sleep", name: "Sommeil", lo: "Très mal dormi", hi: "Très bien dormi" },
    { k: "energy", name: "Énergie", lo: "Épuisé", hi: "En pleine forme" },
    { k: "sore", name: "Courbatures", lo: "Partout", hi: "Aucune" },
    { k: "mood", name: "Moral", lo: "Au plus bas", hi: "Excellent" },
  ];
  const TS = () => window.TempoStore;
  const dk = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const load = () => { try { const d = TS().get(KEY); return d && d.days ? d : { days: {} }; } catch (_) { return { days: {} }; } };
  const save = (d) => { try { TS().set(KEY, d); } catch (_) {} };

  // Score sur 100 : moyenne des réponses (1 → 0, 5 → 100)
  const score = (e) => { if (!e) return null; const v = Q.map((q) => e[q.k]).filter((x) => x >= 1); return v.length === Q.length ? Math.round(((v.reduce((a, b) => a + b, 0) / v.length) - 1) / 4 * 100) : null; };

  function charge() {
    const CH = window.TempoCharge; if (!CH) return null;
    try { return CH.acwr(CH.entries(TS())); } catch (_) { return null; }
  }

  /* Conseil du jour : la forme d'abord, puis la charge récente, puis l'écart avec vos habitudes */
  function verdict(sc, base, ch) {
    const z = ch && ch.enough && ch.zone ? ch.zone.id : null;
    const drop = base != null && sc < base - 15;
    if (sc < 45 || z === "high") return { id: "rest", title: "Jour de récupération",
      text: z === "high" ? "Votre charge des 7 derniers jours est bien plus forte que d'habitude. Restez léger aujourd'hui : mobilité, vélo ou marche faciles, et dormez bien." : "Vous êtes à plat. Aujourd'hui, repos ou séance très légère (mobilité, marche, vélo facile). Un bon sommeil vous fera plus progresser qu'une séance forcée." };
    if (sc < 60 || z === "warn" || drop) return { id: "easy", title: "Séance normale, sans forcer",
      text: z === "warn" ? "Votre charge monte vite. Faites votre séance, mais sans chercher de record ni aller à l'échec." : drop ? "Vous êtes en dessous de votre forme habituelle. Gardez la séance prévue, en restant 1 ou 2 répétitions loin de l'échec." : "Forme moyenne : séance prévue, sans chercher le record." };
    if (sc >= 70 && z !== "warn") return { id: "go", title: "Feu vert : vous pouvez pousser",
      text: z === "low" ? "Bonne forme et charge en baisse : c'est le bon moment pour une grosse séance ou retenter un record." : "Bonne forme et charge sous contrôle : jour idéal pour une séance intense ou un record." };
    return { id: "easy", title: "Séance normale", text: "Forme correcte : faites la séance prévue normalement." };
  }

  function view(el, edit) {
    const D = load(), today = dk(new Date()), e = D.days[today];
    const sc = score(e);
    // Moyenne des 28 derniers jours (hors aujourd'hui) : votre forme habituelle
    const past = []; for (let i = 1; i <= 28; i++) { const s = score(D.days[dk(addDays(new Date(), -i))]); if (s != null) past.push(s); }
    const base = past.length >= 5 ? Math.round(past.reduce((a, b) => a + b, 0) / past.length) : null;
    const ch = charge();
    let html = `<div class="fm-head"><h3>Forme du jour</h3>${sc != null && !edit ? '<button type="button" class="fm-link" data-fm="edit">Modifier</button>' : ""}</div>`;
    if (sc == null || edit) {
      html += `<p class="fm-sub">Quatre touches, chaque matin : Tempo vous dit si c'est un jour pour pousser ou pour récupérer.</p>`;
      html += Q.map((q) => `<fieldset class="fm-q"><legend>${q.name}</legend><div class="fm-scale">${[1, 2, 3, 4, 5].map((v) =>
        `<button type="button" data-fm="set" data-k="${q.k}" data-v="${v}" aria-pressed="${!!(e && e[q.k] === v)}" aria-label="${q.name} : ${v} sur 5${v === 1 ? " (" + q.lo + ")" : v === 5 ? " (" + q.hi + ")" : ""}">${v}</button>`).join("")}</div>
        <div class="fm-ends"><span>${q.lo}</span><span>${q.hi}</span></div></fieldset>`).join("");
    } else {
      const v = verdict(sc, base, ch);
      // 14 derniers jours
      const bars = []; for (let i = 13; i >= 0; i--) { const d = addDays(new Date(), -i), s = score(D.days[dk(d)]); bars.push({ s, d }); }
      html += `<div class="fm-res fm-${v.id}"><div class="fm-score"><b>${sc}</b><small>/ 100</small></div><div><strong>${esc(v.title)}</strong><p>${esc(v.text)}</p></div></div>
        <div class="fm-bars" role="img" aria-label="Forme des 14 derniers jours">${bars.map((b) => `<i style="height:${b.s == null ? 4 : Math.max(8, b.s)}%" class="${b.s == null ? "none" : b.s < 45 ? "lo" : b.s < 70 ? "mid" : "hi"}" title="${b.d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })} : ${b.s == null ? "non noté" : b.s + " / 100"}"></i>`).join("")}</div>
        <p class="fm-foot">${base != null ? `Votre forme habituelle : ${base} / 100. ` : ""}${ch && ch.enough && ch.zone ? `Charge des 7 derniers jours : ${esc(ch.zone.label.toLowerCase())}.` : "La charge d'entraînement s'ajoute au conseil après 3 semaines de séances notées."}</p>`;
    }
    el.innerHTML = html;
    el.hidden = false;
  }

  function mount(el) {
    if (!el) return;
    let edit = false;
    view(el, edit);
    el.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-fm]"); if (!b) return;
      if (b.dataset.fm === "edit") { edit = true; view(el, true); return; }
      if (b.dataset.fm === "set") {
        const D = load(), t = dk(new Date()); D.days[t] = Object.assign({}, D.days[t], { [b.dataset.k]: +b.dataset.v, at: Date.now() });
        // On ne garde qu'un an
        const old = dk(addDays(new Date(), -366)); Object.keys(D.days).forEach((k) => { if (k < old) delete D.days[k]; });
        save(D);
        const done = score(D.days[t]) != null;
        if (done && edit) edit = false;
        view(el, edit);
        if (!done) { const nx = [...el.querySelectorAll(".fm-q")].find((f) => !f.querySelector('[aria-pressed="true"]')); if (nx) nx.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
      }
    });
    try { TS().watch(KEY, () => view(el, edit)); } catch (_) {}
  }

  window.TempoForme = { mount, score, verdict, load, KEY, Q };
})();
