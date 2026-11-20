/* Tempo : sports du carnet multisport, calories et charge d'entraînement globale.
   Charge d'une séance = durée en minutes × effort ressenti (1 à 10), la méthode « session-RPE » de Foster,
   utilisée en préparation physique. On l'additionne pour toutes les activités : musculation, course, autres sports. */
(function () {
  "use strict";
  // [id, nom, couleur, MET à effort moyen, champs : team | swim | dist | basic]
  const SPORTS = [
    ["rugby", "Rugby", "#7a4b2a", 8.3, "team"],
    ["natation", "Natation", "#0e86b3", 7, "swim"],
    ["velo", "Vélo", "#0b7a53", 8, "dist"],
    ["vtt", "VTT", "#5b7a1e", 8.5, "dist"],
    ["foot", "Football", "#2f8f3a", 7, "team"],
    ["basket", "Basket", "#d0661b", 6.5, "team"],
    ["hand", "Handball", "#b8452c", 8, "team"],
    ["volley", "Volley", "#c99a06", 4, "team"],
    ["tennis", "Tennis", "#8aa516", 7.3, "basic"],
    ["padel", "Padel", "#3a9a8a", 6, "basic"],
    ["badminton", "Badminton", "#6b8f2a", 5.5, "basic"],
    ["combat", "Sports de combat", "#a3243b", 7.8, "basic"],
    ["escalade", "Escalade", "#8a5a3c", 7.5, "basic"],
    ["rando", "Randonnée", "#4c7a43", 6, "dist"],
    ["ski", "Ski", "#3a6fb0", 7, "basic"],
    ["rameur", "Rameur", "#2d6f8f", 7, "dist"],
    ["hiit", "HIIT / CrossFit", "#c4304b", 8, "basic"],
    ["yoga", "Yoga / mobilité", "#7b5fb3", 2.5, "basic"],
    ["danse", "Danse", "#b0447a", 5, "basic"],
    ["marche", "Marche", "#6a7f74", 3.5, "dist"],
    ["autre", "Autre sport", "#6b7280", 5, "basic"],
  ].map(([id, name, color, met, fields]) => ({ id, name, color, met, fields }));
  const sportOf = (id) => SPORTS.find((s) => s.id === id) || SPORTS[SPORTS.length - 1];
  const STROKES = [["crawl", "Crawl", 8.3], ["brasse", "Brasse", 8], ["dos", "Dos", 7], ["papillon", "Papillon", 11], ["4n", "4 nages", 8.5], ["educ", "Éducatifs / palmes", 6]];

  // Échelle d'effort ressenti (CR-10 de Borg, en mots simples)
  const RPE = ["", "Très, très facile", "Très facile", "Facile", "Modéré", "Un peu dur", "Dur", "Dur", "Très dur", "Très, très dur", "Maximal"];

  /* Calories : l'effort ressenti n'entre pas dans le calcul (il dépend de la forme du jour, pas de l'énergie dépensée).
     1. Fréquence cardiaque moyenne notée + âge et sexe du profil : formule de Keytel (2005), la plus fiable sans capteur de gaz.
     2. Sinon : MET du sport (ou de la nage) × poids × durée. En match, seules les minutes jouées comptent à pleine intensité. */
  const prof = () => { try { return window.TempoStore.profile(); } catch (_) { return {}; } };
  function kcalHR(s, w, p) {
    const hr = s.fc, a = p.age, sex = p.sex;
    if (!(hr >= 90 && hr <= 220 && a > 0 && (sex === "h" || sex === "f" || sex === "m"))) return null;
    const perMin = sex === "f" ? (-20.4022 + 0.4472 * hr - 0.1263 * w + 0.074 * a) / 4.184
                               : (-55.0969 + 0.6309 * hr + 0.1988 * w + 0.2017 * a) / 4.184;
    return perMin > 0 ? (perMin * (s.dur || 0)) / 60 : null;
  }
  function kcalMET(s, w) {
    const sp = sportOf(s.sport);
    let met = sp.met;
    if (s.sport === "natation" && s.stroke) { const st = STROKES.find((x) => x[0] === s.stroke); if (st) met = st[2]; }
    const dur = s.dur || 0;
    let active = dur;
    if (sp.fields === "team" && s.kind === "match" && s.played > 0) active = Math.min(dur, s.played * 60);
    return (met * w * active + 1.5 * w * (dur - active)) / 3600;   // 1,5 MET sur le banc
  }
  function kcal(s, w, p) {
    p = p || prof();
    w = w || p.kg || 70;
    const h = kcalHR(s, w, p);
    return h != null ? h : kcalMET(s, w);
  }
  const kcalSrc = (s, w, p) => { p = p || prof(); return kcalHR(s, w || p.kg || 70, p) != null ? "fc" : "met"; };

  /* Toutes les activités des carnets, au même format : { date, src, name, color, min, rpe, load } */
  const dk = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const MUSCU_RPE = 7;
  function entries(TS) {
    const get = (k) => { try { return TS.get(k); } catch (_) { return null; } };
    const out = [];
    const f = get("carnet-fonte-v1"), c = get("tempo-course-v1"), m = get("tempo-multi-v1");
    ((f && f.sessions) || []).forEach((s) => {
      const sets = (s.exercises || []).reduce((n, e) => n + (e.sets || []).length, 0);
      const min = s.duration > 0 ? s.duration : Math.max(20, sets * 3);
      out.push({ date: dk(new Date(s.date)), src: "muscu", name: "Musculation", color: "var(--c-muscu)", min, rpe: s.rpe || MUSCU_RPE, load: min * (s.rpe || MUSCU_RPE) });
    });
    ((c && c.sessions) || []).forEach((s) => { const min = (s.dur || 0) / 60; out.push({ date: s.date, src: "course", name: "Course à pied", color: "var(--c-course)", min, rpe: s.rpe || 5, load: min * (s.rpe || 5) }); });
    ((m && m.sessions) || []).forEach((s) => { const sp = sportOf(s.sport), min = (s.dur || 0) / 60; out.push({ date: s.date, src: sp.id, name: sp.name, color: sp.color, min, rpe: s.rpe || 5, load: min * (s.rpe || 5) }); });
    return out.filter((x) => /^\d{4}-\d\d-\d\d$/.test(x.date));
  }
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const monday = (d) => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

  /* Charges par semaine (lundi → dimanche), de la plus ancienne à la plus récente */
  function weekly(list, n) {
    const m0 = monday(new Date()), W = [];
    for (let i = n - 1; i >= 0; i--) {
      const a = dk(addDays(m0, -7 * i)), b = dk(addDays(m0, -7 * i + 7));
      const L = list.filter((x) => x.date >= a && x.date < b), by = {};
      L.forEach((x) => { const k = x.src; by[k] = by[k] || { name: x.name, color: x.color, load: 0, min: 0, n: 0 }; by[k].load += x.load; by[k].min += x.min; by[k].n++; });
      W.push({ start: a, load: L.reduce((t, x) => t + x.load, 0), min: L.reduce((t, x) => t + x.min, 0), n: L.length, by });
    }
    return W;
  }

  /* Rapport charge aiguë / charge chronique : 7 derniers jours comparés à la moyenne des 28 derniers jours */
  const ZONES = [
    { max: 0.8, id: "low", label: "Charge en baisse", color: "var(--z1)", text: "Vous en faites moins que d'habitude. Parfait pour récupérer, mais si cela dure, la forme baisse : reprenez progressivement." },
    { max: 1.3, id: "ok", label: "Zone idéale", color: "var(--z2)", text: "Votre charge suit vos habitudes : c'est la zone où l'on progresse avec le moins de risque de blessure." },
    { max: 1.5, id: "warn", label: "Attention", color: "var(--z4)", text: "Votre charge monte vite par rapport aux semaines précédentes. Gardez des séances faciles et dormez bien ces prochains jours." },
    { max: Infinity, id: "high", label: "Risque élevé", color: "var(--z5)", text: "Charge bien plus forte que d'habitude : c'est dans ces périodes que les blessures sont les plus fréquentes. Allégez les prochains jours et augmentez plutôt de 10 % par semaine." },
  ];
  function acwr(list) {
    const today = dk(new Date());
    const d7 = dk(addDays(new Date(), -6)), d28 = dk(addDays(new Date(), -27));
    const acute = list.filter((x) => x.date >= d7 && x.date <= today).reduce((t, x) => t + x.load, 0);
    const chronicSum = list.filter((x) => x.date >= d28 && x.date <= today).reduce((t, x) => t + x.load, 0);
    const chronic = chronicSum / 4;
    const first = list.reduce((a, x) => (!a || x.date < a ? x.date : a), null);
    const days = first ? Math.round((new Date(today + "T12:00") - new Date(first + "T12:00")) / 864e5) + 1 : 0;
    const enough = days >= 21 && chronic > 0;
    const ratio = chronic > 0 ? acute / chronic : null;
    const zone = ratio == null ? null : ZONES.find((z) => ratio < z.max);
    return { acute, chronic, ratio, zone, enough, days };
  }

  window.TempoCharge = { SPORTS, sportOf, STROKES, RPE, kcal, kcalSrc, entries, weekly, acwr, ZONES, MUSCU_RPE };
})();
