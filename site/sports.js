/* Tempo : ce que l'on note pour chaque sport du carnet multisport.
   Chaque sport décrit ses champs (formulaire), son résumé (liste), ses valeurs calculées (détail),
   ses totaux (onglet « Par sport ») et, si besoin, l'intensité qui sert au calcul des calories (MET).
   Types de champs : seg (choix unique en boutons), multi (plusieurs choix), select, num, text, score (pour / contre), gpx.
   « when » : le champ n'apparaît que si la condition est vraie (ex. seulement en match). */
(function () {
  "use strict";
  const r0 = (x) => Math.round(x).toLocaleString("fr-FR");
  const r1 = (x) => (Math.round(x * 10) / 10).toLocaleString("fr-FR");
  const mmss = (sec) => Math.floor(sec / 60) + ":" + String(Math.round(sec % 60)).padStart(2, "0");
  const sum = (a, f) => a.reduce((t, x) => t + (+f(x) || 0), 0);
  const lab = (opts, v) => { const o = (opts || []).find((x) => x[0] === v); return o ? o[1] : ""; };
  const pl = (n, w, ws) => r0(n) + " " + (n > 1 ? ws || w + "s" : w);
  const isMatch = (v) => v.kind === "match";
  const notMatch = (v) => v.kind !== "match";

  /* ---------- Briques communes ---------- */
  const KIND = { k: "kind", type: "seg", label: "Type de séance", opts: [["train", "Entraînement"], ["match", "Match"]], def: "train" };
  const RESULT3 = [["win", "Victoire"], ["draw", "Nul"], ["loss", "Défaite"]];
  const RESULT2 = [["win", "Victoire"], ["loss", "Défaite"]];
  const resultOf = (s) => ({ win: "Victoire", draw: "Nul", loss: "Défaite" }[s.result] || "");
  const scoreOf = (s) => (s.scoreFor != null && s.scoreAg != null ? s.scoreFor + "-" + s.scoreAg : "");
  const kmField = { k: "km", type: "num", label: "Distance parcourue", unit: "km", dec: 1, ph: "montre GPS, optionnel" };
  const COMP = { k: "comp", type: "seg", label: "Compétition", opts: [["champ", "Championnat"], ["cup", "Coupe"], ["friendly", "Amical"], ["tourn", "Tournoi"]], when: isMatch };
  const ROLE = { k: "role", type: "seg", label: "Statut", opts: [["start", "Titulaire"], ["sub", "Remplaçant"]], when: isMatch };
  const CARD = { k: "card", type: "seg", label: "Carton", opts: [["none", "Aucun"], ["yellow", "Jaune"], ["red", "Rouge"]], def: "none", when: isMatch };

  // Sports collectifs : entraînement (contenu) ou match (poste, temps de jeu, score, statistiques)
  function team(o) {
    const f = [];
    if (o.formats) f.push({ k: "format", type: "seg", label: "Format", opts: o.formats, def: o.formats[0][0] });
    f.push(KIND,
      { k: "focus", type: "multi", label: "Contenu de la séance", opts: o.focus, when: notMatch },
      COMP,
      { k: "poste", type: "select", label: "Poste", opts: o.postes, when: isMatch },
      ROLE,
      { k: "played", type: "num", label: "Minutes jouées", unit: "min", ph: o.ph || "Ex. 60", when: isMatch, hint: "Seules les minutes sur le terrain comptent à pleine intensité pour les calories." },
      { k: "result", type: "seg", label: "Résultat", opts: o.draw === false ? RESULT2 : RESULT3, when: isMatch },
      { k: "score", type: "score", label: o.scoreLabel || "Score", sub: o.scoreSub || ["Votre équipe", "Adversaire"], when: isMatch });
    (o.stats || []).forEach((x) => f.push(Object.assign({ type: "num", when: (v) => isMatch(v) && (!x.gk || x.gk(v)) }, x)));
    if (o.card) f.push(CARD);
    if (o.km !== false) f.push(kmField);
    return f;
  }
  const teamSum = (s, o) => {
    if (!isMatch(s)) { const fo = (s.focus || []).map((v) => lab(o.focus, v)).filter(Boolean); return ["Entraînement" + (fo.length ? " · " + fo.slice(0, 2).join(", ") : "")]; }
    const out = ["Match" + (s.result ? " · " + resultOf(s) : "") + (scoreOf(s) ? " " + scoreOf(s) : "")];
    if (s.played) out.push(s.played + " min jouées");
    if (s.poste) out.push(lab(o.postes, s.poste));
    return out;
  };
  const teamDerive = (s, o) => {
    const r = [];
    if (s.format && o.formats) r.push(["Format", lab(o.formats, s.format)]);
    if (isMatch(s)) {
      if (s.comp) r.push(["Compétition", lab(COMP.opts, s.comp)]);
      if (s.poste) r.push(["Poste", lab(o.postes, s.poste) + (s.role ? " · " + lab(ROLE.opts, s.role) : "")]);
      if (s.played) r.push(["Temps de jeu", s.played + " min"]);
      if (s.result || scoreOf(s)) r.push(["Résultat", [resultOf(s), scoreOf(s)].filter(Boolean).join(" · ")]);
      (o.stats || []).forEach((x) => { if (s[x.k] != null) r.push([x.label, r0(s[x.k])]); });
      if (o.tackle && (s.tackles || s.missed)) r.push(["Réussite au plaquage", r0((100 * (s.tackles || 0)) / Math.max(1, (s.tackles || 0) + (s.missed || 0))) + " %"]);
      if (s.card && s.card !== "none") r.push(["Carton", lab(CARD.opts, s.card)]);
    } else if ((s.focus || []).length) r.push(["Contenu", s.focus.map((v) => lab(o.focus, v)).join(", ")]);
    if (s.km) r.push(["Distance parcourue", r1(s.km) + " km"]);
    return r;
  };
  const teamTiles = (L, o) => {
    const M = L.filter(isMatch), t = [];
    if (!M.length) return t;
    const w = M.filter((s) => s.result === "win").length, d = M.filter((s) => s.result === "draw").length, l = M.filter((s) => s.result === "loss").length;
    t.push([M.length, "matchs"]);
    if (w + d + l) t.push([w + (o.draw === false ? "-" : "-" + d + "-") + l, o.draw === false ? "victoires-défaites" : "victoires-nuls-défaites"]);
    const mins = sum(M, (s) => s.played); if (mins) t.push([r0(mins), "minutes jouées"]);
    (o.stats || []).filter((x) => x.total).forEach((x) => { const v = sum(M, (s) => s[x.k]); if (v) t.push([r0(v), x.total]); });
    if (o.tackle) { const a = sum(M, (s) => s.tackles), b = sum(M, (s) => s.missed); if (a + b) t.push([r0((100 * a) / (a + b)) + " %", "de plaquages réussis"]); }
    return t;
  };
  const teamMet = (s, base) => (isMatch(s) ? base * 1.12 : base * 0.85);   // un match est plus intense qu'un entraînement

  // Sports de raquette
  function racket(o) {
    const f = [KIND];
    if (o.formats) f.push({ k: "format", type: "seg", label: "Format", opts: o.formats, def: o.formats[0][0] });
    if (o.surface) f.push({ k: "surface", type: "seg", label: "Surface", opts: o.surface });
    f.push({ k: "focus", type: "multi", label: "Travail technique", opts: o.focus, when: notMatch },
      { k: "result", type: "seg", label: "Résultat", opts: RESULT2, when: isMatch },
      { k: "sets", type: "text", label: "Score", ph: o.scorePh, when: isMatch, hint: "Jeux de chaque set, de votre point de vue." });
    (o.stats || []).forEach((x) => f.push(Object.assign({ type: "num", when: isMatch }, x)));
    return f;
  }
  const racketSum = (s, o) => isMatch(s)
    ? ["Match" + (s.format && o.formats ? " " + lab(o.formats, s.format).toLowerCase() : "") + (s.result ? " · " + resultOf(s) : "") + (s.sets ? " " + s.sets : "")]
    : ["Entraînement" + ((s.focus || []).length ? " · " + s.focus.slice(0, 2).map((v) => lab(o.focus, v)).join(", ") : "")];
  const racketDerive = (s, o) => {
    const r = [];
    if (s.format && o.formats) r.push(["Format", lab(o.formats, s.format)]);
    if (s.surface && o.surface) r.push(["Surface", lab(o.surface, s.surface)]);
    if (isMatch(s)) { if (s.result || s.sets) r.push(["Résultat", [resultOf(s), s.sets].filter(Boolean).join(" · ")]); (o.stats || []).forEach((x) => { if (s[x.k] != null) r.push([x.label, r0(s[x.k])]); }); }
    else if ((s.focus || []).length) r.push(["Travail technique", s.focus.map((v) => lab(o.focus, v)).join(", ")]);
    return r;
  };
  const racketTiles = (L) => { const M = L.filter(isMatch), w = M.filter((s) => s.result === "win").length; return M.length ? [[M.length, "matchs"], [r0((100 * w) / M.length) + " %", "de victoires"]] : []; };

  // Activités avec distance et trace GPS
  const GPX = { k: "route", type: "gpx" };
  const DIST = (unit, ph) => ({ k: "dist", type: "num", label: "Distance", unit: unit || "km", dec: unit === "m" ? 0 : 1, ph: ph || "Ex. 25" });
  const DPLUS = { k: "dplus", type: "num", label: "Dénivelé positif", unit: "m", ph: "optionnel" };
  const speed = (s) => (s.dist > 0 && s.dur > 0 ? s.dist / (s.dur / 3600) : null);
  const paceKm = (s) => (s.dist > 0 && s.dur > 0 ? s.dur / s.dist : null);

  const GRADES = ["3", "4a", "4b", "4c", "5a", "5b", "5c", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+", "7b", "7b+", "7c", "7c+", "8a", "8a+", "8b", "8b+", "8c", "8c+", "9a"];
  const STROKES = [["crawl", "Crawl", 8.3], ["brasse", "Brasse", 8], ["dos", "Dos", 7], ["papillon", "Papillon", 11], ["4n", "4 nages", 8.5], ["educ", "Éducatifs / palmes", 6]];

  /* ---------- Les sports ---------- */
  const RUGBY = {
    formats: [["xv", "XV"], ["vii", "À 7"], ["x", "À 10"], ["touch", "À toucher"]],
    focus: [["tech", "Technique individuelle"], ["coll", "Jeu collectif"], ["opp", "Opposition"], ["phys", "Physique"], ["scrum", "Mêlée"], ["lineout", "Touche"], ["kick", "Jeu au pied"], ["def", "Défense"]],
    postes: [["pil", "Pilier"], ["tal", "Talonneur"], ["l2", "Deuxième ligne"], ["l3a", "Troisième ligne aile"], ["l3c", "Troisième ligne centre"], ["dm", "Demi de mêlée"], ["do", "Demi d'ouverture"], ["ce", "Centre"], ["ai", "Ailier"], ["ar", "Arrière"]],
    stats: [{ k: "tries", label: "Essais marqués", total: "essais" }, { k: "pts", label: "Points marqués", hint: "Essais, transformations, pénalités, drops.", total: "points marqués" },
      { k: "tackles", label: "Plaquages réussis", total: "plaquages réussis" }, { k: "missed", label: "Plaquages manqués" }, { k: "carries", label: "Ballons portés" }],
    tackle: true, card: true, ph: "Ex. 80",
  };
  const FOOT = {
    formats: [["xi", "À 11"], ["viii", "À 8"], ["futsal", "Futsal"], ["five", "Five"]],
    focus: [["tech", "Technique"], ["tact", "Tactique"], ["phys", "Physique"], ["opp", "Jeu réduit / opposition"], ["fin", "Finition"], ["cpa", "Coups de pied arrêtés"]],
    postes: [["gk", "Gardien"], ["dc", "Défenseur central"], ["lat", "Latéral"], ["md", "Milieu défensif"], ["mo", "Milieu offensif"], ["ail", "Ailier"], ["at", "Attaquant"]],
    stats: [{ k: "goals", label: "Buts", total: "buts", gk: (v) => v.poste !== "gk" }, { k: "assists", label: "Passes décisives", total: "passes décisives" },
      { k: "saves", label: "Arrêts", total: "arrêts", gk: (v) => v.poste === "gk" }],
    card: true,
  };
  const BASKET = {
    formats: [["5x5", "5 contre 5"], ["3x3", "3 contre 3"]],
    focus: [["shoot", "Tir"], ["dribble", "Dribble"], ["def", "Défense"], ["coll", "Jeu collectif"], ["phys", "Physique"], ["opp", "Opposition"]],
    postes: [["men", "Meneur"], ["arr", "Arrière"], ["ail", "Ailier"], ["af", "Ailier fort"], ["piv", "Pivot"]],
    stats: [{ k: "pts", label: "Points", total: "points" }, { k: "reb", label: "Rebonds", total: "rebonds" }, { k: "ast", label: "Passes décisives", total: "passes décisives" }, { k: "stl", label: "Interceptions" }, { k: "fouls", label: "Fautes" }],
    draw: false, km: false, ph: "Ex. 24",
  };
  const HAND = {
    focus: [["shoot", "Tir"], ["def", "Défense"], ["mb", "Montée de balle"], ["coll", "Jeu collectif"], ["phys", "Physique"], ["opp", "Opposition"]],
    postes: [["gk", "Gardien"], ["ail", "Ailier"], ["arr", "Arrière"], ["dc", "Demi-centre"], ["piv", "Pivot"]],
    stats: [{ k: "goals", label: "Buts", total: "buts", gk: (v) => v.poste !== "gk" }, { k: "shots", label: "Tirs tentés", gk: (v) => v.poste !== "gk" }, { k: "ast", label: "Passes décisives" },
      { k: "saves", label: "Arrêts", total: "arrêts", gk: (v) => v.poste === "gk" }, { k: "excl", label: "Exclusions 2 min" }],
    km: false, ph: "Ex. 40",
  };
  const VOLLEY = {
    formats: [["indoor", "En salle"], ["beach", "Beach"]],
    focus: [["serve", "Service"], ["recep", "Réception"], ["att", "Attaque"], ["block", "Contre"], ["def", "Défense"], ["coll", "Jeu collectif"]],
    postes: [["pass", "Passeur"], ["ra", "Réceptionneur-attaquant"], ["pointu", "Pointu"], ["central", "Central"], ["libero", "Libéro"]],
    stats: [{ k: "pts", label: "Points marqués", total: "points" }, { k: "aces", label: "Aces", total: "aces" }, { k: "blocks", label: "Contres gagnants" }],
    draw: false, km: false, scoreLabel: "Sets", scoreSub: ["Gagnés", "Perdus"],
  };
  const TENNIS = {
    formats: [["single", "Simple"], ["double", "Double"]],
    surface: [["hard", "Dur"], ["clay", "Terre battue"], ["grass", "Gazon"], ["indoor", "Intérieur"]],
    focus: [["serve", "Service"], ["fh", "Coup droit"], ["bh", "Revers"], ["volley", "Volée"], ["feet", "Jeu de jambes"], ["points", "Points / matchs"]],
    stats: [{ k: "aces", label: "Aces" }, { k: "df", label: "Doubles fautes" }], scorePh: "Ex. 6-4 3-6 7-5",
  };
  const PADEL = { focus: [["vitre", "Jeu de vitre"], ["volley", "Volée"], ["smash", "Smash / bandeja"], ["serve", "Service"], ["points", "Points / matchs"]], scorePh: "Ex. 6-3 6-4" };
  const BAD = {
    formats: [["single", "Simple"], ["double", "Double"], ["mixed", "Mixte"]],
    focus: [["clear", "Dégagés"], ["smash", "Smash"], ["net", "Jeu au filet"], ["serve", "Service"], ["feet", "Déplacements"], ["points", "Points / matchs"]], scorePh: "Ex. 21-17 18-21 21-15",
  };

  const SPEC = {
    rugby: { fields: team(RUGBY), sum: (s) => teamSum(s, RUGBY), derive: (s) => teamDerive(s, RUGBY), tiles: (L) => teamTiles(L, RUGBY), met: teamMet },
    foot: { fields: team(FOOT), sum: (s) => teamSum(s, FOOT), derive: (s) => teamDerive(s, FOOT), tiles: (L) => teamTiles(L, FOOT), met: teamMet },
    basket: { fields: team(BASKET), sum: (s) => teamSum(s, BASKET), derive: (s) => teamDerive(s, BASKET), tiles: (L) => teamTiles(L, BASKET), met: teamMet },
    hand: { fields: team(HAND), sum: (s) => teamSum(s, HAND), derive: (s) => teamDerive(s, HAND), tiles: (L) => teamTiles(L, HAND), met: teamMet },
    volley: { fields: team(VOLLEY), sum: (s) => teamSum(s, VOLLEY), derive: (s) => teamDerive(s, VOLLEY), tiles: (L) => teamTiles(L, VOLLEY),
      met: (s, b) => (s.format === "beach" ? 8 : teamMet(s, b)) },
    tennis: { fields: racket(TENNIS), sum: (s) => racketSum(s, TENNIS), derive: (s) => racketDerive(s, TENNIS), tiles: racketTiles, met: (s, b) => (s.format === "double" ? 6 : isMatch(s) ? 8 : b) },
    padel: { fields: racket(PADEL), sum: (s) => racketSum(s, PADEL), derive: (s) => racketDerive(s, PADEL), tiles: racketTiles },
    badminton: { fields: racket(BAD), sum: (s) => racketSum(s, BAD), derive: (s) => racketDerive(s, BAD), tiles: racketTiles, met: (s, b) => (isMatch(s) ? 7 : b) },

    natation: {
      fields: [
        { k: "pool", type: "seg", label: "Bassin", opts: [["25", "25 m"], ["50", "50 m"], ["open", "Eau libre"]], def: "25" },
        { k: "dist", type: "num", label: "Distance nagée", unit: "m", ph: "Ex. 1500" },
        { k: "stroke", type: "select", label: "Nage principale", opts: STROKES.map(([a, b]) => [a, b]), def: "crawl" },
        { k: "work", type: "seg", label: "Type de séance", opts: [["end", "Endurance"], ["tech", "Technique"], ["int", "Fractionné"], ["rec", "Récupération"]] },
        { k: "gear", type: "multi", label: "Matériel", opts: [["pads", "Plaquettes"], ["pull", "Pull-buoy"], ["fins", "Palmes"], ["snorkel", "Tuba"]] },
      ],
      sum: (s) => (s.dist ? [r0(s.dist) + " m" + (s.dist && s.dur ? " · " + mmss(s.dur / (s.dist / 100)) + " /100 m" : "")] : []).concat(s.work ? [lab([["end", "Endurance"], ["tech", "Technique"], ["int", "Fractionné"], ["rec", "Récupération"]], s.work)] : []),
      derive: (s) => {
        const r = [];
        if (s.pool) r.push(["Bassin", s.pool === "open" ? "Eau libre" : s.pool + " m"]);
        if (s.dist) r.push(["Distance", r0(s.dist) + " m" + (s.pool && s.pool !== "open" ? " · " + r0(s.dist / +s.pool) + " longueurs" : "")]);
        if (s.dist && s.dur) r.push(["Allure moyenne", mmss(s.dur / (s.dist / 100)) + " /100 m"]);
        if (s.stroke) r.push(["Nage principale", lab(STROKES, s.stroke)]);
        if ((s.gear || []).length) r.push(["Matériel", s.gear.map((v) => lab([["pads", "Plaquettes"], ["pull", "Pull-buoy"], ["fins", "Palmes"], ["snorkel", "Tuba"]], v)).join(", ")]);
        return r;
      },
      tiles: (L) => { const d = sum(L, (s) => s.dist), best = L.filter((s) => s.dist >= 400 && s.dur).map((s) => s.dur / (s.dist / 100)); return [[r1(d / 1000) + " km", "nagés"]].concat(best.length ? [[mmss(Math.min(...best)), "meilleure allure /100 m (400 m et plus)"]] : []); },
      met: (s) => { const st = STROKES.find((x) => x[0] === s.stroke); let m = st ? st[2] : 7; if (s.work === "rec" || s.work === "tech") m *= 0.75; if (s.work === "int") m *= 1.1; return m; },
    },
    velo: {
      fields: [
        { k: "kind", type: "seg", label: "Pratique", opts: [["road", "Route"], ["gravel", "Gravel"], ["trainer", "Home trainer"], ["commute", "Vélotaf"]], def: "road" },
        GPX, DIST("km", "Ex. 45"), Object.assign({}, DPLUS, { when: (v) => v.kind !== "trainer" }),
        { k: "watts", type: "num", label: "Puissance moyenne", unit: "W", ph: "capteur, optionnel", hint: "Avec un capteur de puissance, les calories sont calculées à partir du travail réel." },
        { k: "cad", type: "num", label: "Cadence moyenne", unit: "tr/min", ph: "optionnel" },
      ],
      sum: (s) => (s.dist ? [r1(s.dist) + " km" + (speed(s) ? " · " + r1(speed(s)) + " km/h" : "")] : []).concat(s.dplus ? [r0(s.dplus) + " m D+"] : []),
      derive: (s) => {
        const r = [["Pratique", lab([["road", "Route"], ["gravel", "Gravel"], ["trainer", "Home trainer"], ["commute", "Vélotaf"]], s.kind) || "Route"]];
        if (s.dist) r.push(["Distance", r1(s.dist) + " km"]);
        if (speed(s)) r.push(["Vitesse moyenne", r1(speed(s)) + " km/h"]);
        if (s.dplus) r.push(["Dénivelé positif", r0(s.dplus) + " m"]);
        if (s.watts) r.push(["Puissance moyenne", r0(s.watts) + " W · travail " + r0((s.watts * s.dur) / 1000) + " kJ"]);
        if (s.cad) r.push(["Cadence moyenne", r0(s.cad) + " tr/min"]);
        return r;
      },
      tiles: (L) => { const t = [[r0(sum(L, (s) => s.dist)) + " km", "parcourus"]], dp = sum(L, (s) => s.dplus), sp = L.filter((s) => s.dist >= 20).map(speed).filter(Boolean); if (dp) t.push([r0(dp) + " m", "de dénivelé"]); if (sp.length) t.push([r1(Math.max(...sp)) + " km/h", "meilleure moyenne (20 km et plus)"]); return t; },
      met: (s) => { const v = speed(s); if (s.kind === "trainer") return 7; if (!v) return 8; return v < 16 ? 4.5 : v < 19 ? 6 : v < 22 ? 7.5 : v < 25 ? 9 : v < 28 ? 10.5 : 12; },
      power: true,
    },
    vtt: {
      fields: [
        { k: "disc", type: "seg", label: "Discipline", opts: [["xc", "Cross-country"], ["am", "All-mountain"], ["enduro", "Enduro"], ["dh", "Descente"], ["vae", "VTT électrique"]], def: "xc" },
        GPX, DIST("km", "Ex. 30"), DPLUS, { k: "dminus", type: "num", label: "Dénivelé négatif", unit: "m", ph: "optionnel" },
      ],
      sum: (s) => [[s.dist ? r1(s.dist) + " km" : "", s.dplus ? r0(s.dplus) + " m D+" : ""].filter(Boolean).join(" · ")].filter(Boolean),
      derive: (s) => { const r = [["Discipline", lab([["xc", "Cross-country"], ["am", "All-mountain"], ["enduro", "Enduro"], ["dh", "Descente"], ["vae", "VTT électrique"]], s.disc) || "Cross-country"]]; if (s.dist) r.push(["Distance", r1(s.dist) + " km"]); if (speed(s)) r.push(["Vitesse moyenne", r1(speed(s)) + " km/h"]); if (s.dplus) r.push(["Dénivelé", "+" + r0(s.dplus) + " m" + (s.dminus ? " / −" + r0(s.dminus) + " m" : "")]); return r; },
      tiles: (L) => [[r0(sum(L, (s) => s.dist)) + " km", "parcourus"], [r0(sum(L, (s) => s.dplus)) + " m", "de dénivelé"]],
      met: (s) => ({ xc: 8.5, am: 8.5, enduro: 8, dh: 6, vae: 5.5 }[s.disc] || 8.5),
    },
    combat: {
      fields: [
        { k: "disc", type: "select", label: "Discipline", opts: [["boxe", "Boxe anglaise"], ["kick", "Kick-boxing / muay-thaï"], ["mma", "MMA"], ["judo", "Judo"], ["jjb", "Jiu-jitsu brésilien"], ["lutte", "Lutte"], ["karate", "Karaté"], ["tkd", "Taekwondo"], ["autre", "Autre"]], def: "boxe" },
        { k: "kind", type: "seg", label: "Type de séance", opts: [["tech", "Technique"], ["spar", "Sparring / randori"], ["phys", "Physique"], ["fight", "Combat officiel"]], def: "tech" },
        { k: "rounds", type: "num", label: "Rounds", ph: "Ex. 6", when: (v) => v.kind === "spar" || v.kind === "fight" },
        { k: "rmin", type: "num", label: "Durée d'un round", unit: "min", dec: 1, ph: "Ex. 3", when: (v) => v.kind === "spar" || v.kind === "fight" },
        { k: "result", type: "seg", label: "Résultat", opts: RESULT3, when: (v) => v.kind === "fight" },
        { k: "how", type: "select", label: "Décision", opts: [["points", "Aux points"], ["ko", "KO / TKO"], ["sub", "Soumission / ippon"], ["dq", "Disqualification"]], when: (v) => v.kind === "fight" },
      ],
      sum: (s) => [[lab(SPEC.combat.fields[0].opts, s.disc), lab(SPEC.combat.fields[1].opts, s.kind)].filter(Boolean).join(" · ") + (s.rounds ? " · " + pl(s.rounds, "round") : "") + (s.kind === "fight" && s.result ? " · " + resultOf(s) : "")],
      derive: (s) => { const r = [["Discipline", lab(SPEC.combat.fields[0].opts, s.disc)], ["Séance", lab(SPEC.combat.fields[1].opts, s.kind)]]; if (s.rounds) r.push(["Rounds", s.rounds + (s.rmin ? " × " + r1(s.rmin) + " min · " + r0(s.rounds * s.rmin) + " min de combat" : "")]); if (s.kind === "fight" && s.result) r.push(["Résultat", resultOf(s) + (s.how ? " · " + lab(SPEC.combat.fields[5].opts, s.how) : "")]); return r; },
      tiles: (L) => { const F = L.filter((s) => s.kind === "fight"), R = sum(L, (s) => s.rounds); const t = []; if (R) t.push([r0(R), "rounds"]); if (F.length) t.push([F.filter((s) => s.result === "win").length + "-" + F.filter((s) => s.result === "loss").length, "combats gagnés-perdus"]); return t; },
      met: (s) => ({ tech: 6, spar: 9.5, phys: 8, fight: 11 }[s.kind] || 7.8),
    },
    escalade: {
      fields: [
        { k: "disc", type: "seg", label: "Discipline", opts: [["bloc", "Bloc"], ["voie", "Voie en salle"], ["ext", "Falaise / extérieur"]], def: "bloc" },
        { k: "grade", type: "select", label: "Cotation max réussie", opts: [["", "—"]].concat(GRADES.map((g) => [g, g])) },
        { k: "sent", type: "num", label: "Voies ou blocs réussis", ph: "Ex. 12" },
        { k: "tries", type: "num", label: "Essais au total", ph: "optionnel" },
      ],
      sum: (s) => [[lab([["bloc", "Bloc"], ["voie", "Voie en salle"], ["ext", "Falaise"]], s.disc), s.grade ? "max " + s.grade : "", s.sent ? pl(s.sent, "réussi") : ""].filter(Boolean).join(" · ")],
      derive: (s) => { const r = [["Discipline", lab([["bloc", "Bloc"], ["voie", "Voie en salle"], ["ext", "Falaise / extérieur"]], s.disc)]]; if (s.grade) r.push(["Cotation max réussie", s.grade]); if (s.sent) r.push(["Réussis", s.sent + (s.tries ? " sur " + s.tries + " essais (" + r0((100 * s.sent) / s.tries) + " %)" : "")]); return r; },
      tiles: (L) => { const g = L.map((s) => GRADES.indexOf(s.grade)).filter((i) => i >= 0); const t = []; if (g.length) t.push([GRADES[Math.max(...g)], "meilleure cotation"]); const n = sum(L, (s) => s.sent); if (n) t.push([r0(n), "voies et blocs réussis"]); return t; },
      met: (s) => (s.disc === "bloc" ? 7 : 8),
    },
    rando: {
      fields: [GPX, DIST("km", "Ex. 15"), DPLUS, { k: "dminus", type: "num", label: "Dénivelé négatif", unit: "m", ph: "optionnel" },
        { k: "alt", type: "num", label: "Altitude max", unit: "m", ph: "optionnel" }, { k: "bag", type: "num", label: "Poids du sac", unit: "kg", dec: 1, ph: "optionnel", hint: "Le sac est ajouté à votre poids pour les calories." }],
      sum: (s) => [[s.dist ? r1(s.dist) + " km" : "", s.dplus ? r0(s.dplus) + " m D+" : ""].filter(Boolean).join(" · ")].filter(Boolean),
      derive: (s) => { const r = []; if (s.dist) r.push(["Distance", r1(s.dist) + " km"]); if (paceKm(s)) r.push(["Allure", mmss(paceKm(s)) + " /km · " + r1(speed(s)) + " km/h"]); if (s.dplus) r.push(["Dénivelé", "+" + r0(s.dplus) + " m" + (s.dminus ? " / −" + r0(s.dminus) + " m" : "")]); if (s.alt) r.push(["Altitude max", r0(s.alt) + " m"]); if (s.bag) r.push(["Sac", r1(s.bag) + " kg"]); return r; },
      tiles: (L) => [[r0(sum(L, (s) => s.dist)) + " km", "parcourus"], [r0(sum(L, (s) => s.dplus)) + " m", "de dénivelé"]].concat(L.some((s) => s.alt) ? [[r0(Math.max(...L.map((s) => s.alt || 0))) + " m", "plus haute altitude"]] : []),
      met: (s) => { const grade = s.dist > 0 && s.dplus ? s.dplus / (s.dist * 10) : 0; return Math.min(8.5, 5.3 + grade * 0.25); },
      extraKg: (s) => s.bag || 0,
    },
    ski: {
      fields: [
        { k: "disc", type: "seg", label: "Pratique", opts: [["alpin", "Ski alpin"], ["snow", "Snowboard"], ["fond", "Fond classique"], ["skate", "Skating"], ["rando", "Ski de randonnée"]], def: "alpin" },
        { k: "runs", type: "num", label: "Descentes", ph: "Ex. 12", when: (v) => v.disc === "alpin" || v.disc === "snow" },
        { k: "ddown", type: "num", label: "Dénivelé descendu", unit: "m", ph: "optionnel", when: (v) => v.disc === "alpin" || v.disc === "snow" },
        Object.assign(DIST("km", "Ex. 15"), { when: (v) => !(v.disc === "alpin" || v.disc === "snow") }),
        Object.assign({}, DPLUS, { when: (v) => v.disc === "rando" || v.disc === "fond" || v.disc === "skate" }),
      ],
      sum: (s) => [[lab(SPEC.ski.fields[0].opts, s.disc), s.runs ? pl(s.runs, "descente") : "", s.dist ? r1(s.dist) + " km" : "", s.dplus ? r0(s.dplus) + " m D+" : ""].filter(Boolean).join(" · ")],
      derive: (s) => { const r = [["Pratique", lab(SPEC.ski.fields[0].opts, s.disc)]]; if (s.runs) r.push(["Descentes", r0(s.runs)]); if (s.ddown) r.push(["Dénivelé descendu", r0(s.ddown) + " m"]); if (s.dist) r.push(["Distance", r1(s.dist) + " km" + (speed(s) ? " · " + r1(speed(s)) + " km/h" : "")]); if (s.dplus) r.push(["Dénivelé positif", r0(s.dplus) + " m"]); return r; },
      tiles: (L) => { const t = [], d = sum(L, (s) => s.ddown), k = sum(L, (s) => s.dist); if (d) t.push([r0(d) + " m", "descendus"]); if (k) t.push([r0(k) + " km", "de fond ou de rando"]); return t; },
      met: (s) => ({ alpin: 5.3, snow: 5.3, fond: 9, skate: 11, rando: 10 }[s.disc] || 7),
    },
    rameur: {
      fields: [
        { k: "work", type: "seg", label: "Type de séance", opts: [["end", "Endurance"], ["int", "Fractionné"], ["test", "Test (2 000 m, 500 m…)"]], def: "end" },
        { k: "dist", type: "num", label: "Distance", unit: "m", ph: "Ex. 5000" },
        { k: "spm", type: "num", label: "Cadence moyenne", unit: "coups/min", ph: "Ex. 24" },
        { k: "watts", type: "num", label: "Puissance moyenne", unit: "W", ph: "affichée par l'écran, optionnel" },
      ],
      sum: (s) => (s.dist ? [r0(s.dist) + " m" + (s.dur ? " · " + mmss(s.dur / (s.dist / 500)) + " /500 m" : "")] : []),
      derive: (s) => { const r = [["Séance", lab(SPEC.rameur.fields[0].opts, s.work)]]; if (s.dist) r.push(["Distance", r0(s.dist) + " m"]); if (s.dist && s.dur) r.push(["Allure moyenne", mmss(s.dur / (s.dist / 500)) + " /500 m"]); if (s.spm) r.push(["Cadence", r0(s.spm) + " coups/min"]); if (s.watts) r.push(["Puissance moyenne", r0(s.watts) + " W"]); return r; },
      tiles: (L) => { const t = [[r1(sum(L, (s) => s.dist) / 1000) + " km", "ramés"]], p = L.filter((s) => s.dist >= 2000 && s.dur).map((s) => s.dur / (s.dist / 500)); if (p.length) t.push([mmss(Math.min(...p)), "meilleure allure /500 m (2 000 m et plus)"]); return t; },
      met: (s) => ({ end: 6, int: 9, test: 11 }[s.work] || 7),
      rowPower: true,
    },
    hiit: {
      fields: [
        { k: "fmt", type: "seg", label: "Format", opts: [["amrap", "AMRAP"], ["emom", "EMOM"], ["fortime", "For time"], ["tabata", "Tabata"], ["circuit", "Circuit"]], def: "amrap" },
        { k: "wod", type: "text", label: "Nom ou contenu du WOD", ph: "Ex. Cindy, ou 5 tractions, 10 pompes, 15 squats" },
        { k: "score", type: "text", label: "Résultat", ph: "Ex. 18 tours + 6, ou 12 min 40" },
        { k: "rx", type: "seg", label: "Niveau", opts: [["rx", "Rx (charges prescrites)"], ["scaled", "Adapté"]] },
      ],
      sum: (s) => [[lab(SPEC.hiit.fields[0].opts, s.fmt), s.wod, s.score].filter(Boolean).join(" · ")],
      derive: (s) => [["Format", lab(SPEC.hiit.fields[0].opts, s.fmt)]].concat(s.wod ? [["WOD", s.wod]] : [], s.score ? [["Résultat", s.score + (s.rx ? " · " + (s.rx === "rx" ? "Rx" : "adapté") : "")]] : []),
      tiles: () => [],
      met: (s) => ({ tabata: 9, amrap: 8, fortime: 8.5, emom: 7.5, circuit: 7 }[s.fmt] || 8),
    },
    yoga: {
      fields: [{ k: "style", type: "seg", label: "Style", opts: [["hatha", "Hatha"], ["vinyasa", "Vinyasa"], ["yin", "Yin"], ["pilates", "Pilates"], ["mob", "Mobilité"], ["stretch", "Étirements"]], def: "hatha" },
        { k: "focus", type: "multi", label: "Zones travaillées", opts: [["hips", "Hanches"], ["back", "Dos"], ["shoulders", "Épaules"], ["legs", "Jambes"], ["core", "Gainage"], ["breath", "Respiration"]] }],
      sum: (s) => [lab(SPEC.yoga.fields[0].opts, s.style)].filter(Boolean),
      derive: (s) => [["Style", lab(SPEC.yoga.fields[0].opts, s.style)]].concat((s.focus || []).length ? [["Zones", s.focus.map((v) => lab(SPEC.yoga.fields[1].opts, v)).join(", ")]] : []),
      tiles: () => [],
      met: (s) => ({ hatha: 2.5, vinyasa: 4, yin: 2, pilates: 3, mob: 2.5, stretch: 2.3 }[s.style] || 2.5),
    },
    danse: {
      fields: [{ k: "style", type: "select", label: "Style", opts: [["salsa", "Salsa / bachata"], ["hiphop", "Hip-hop"], ["classique", "Classique"], ["contemp", "Contemporain / jazz"], ["rock", "Rock / swing"], ["zumba", "Zumba / fitness"], ["autre", "Autre"]], def: "hiphop" },
        { k: "kind", type: "seg", label: "Séance", opts: [["cours", "Cours"], ["repet", "Répétition"], ["soiree", "Soirée"], ["spectacle", "Spectacle / compétition"]], def: "cours" }],
      sum: (s) => [[lab(SPEC.danse.fields[0].opts, s.style), lab(SPEC.danse.fields[1].opts, s.kind)].filter(Boolean).join(" · ")],
      derive: (s) => [["Style", lab(SPEC.danse.fields[0].opts, s.style)], ["Séance", lab(SPEC.danse.fields[1].opts, s.kind)]],
      tiles: () => [],
      met: (s) => ({ salsa: 5, hiphop: 6, classique: 5, contemp: 5, rock: 5.5, zumba: 6.5 }[s.style] || 5),
    },
    marche: {
      fields: [GPX, DIST("km", "Ex. 6"), { k: "steps", type: "num", label: "Nombre de pas", ph: "optionnel" }, DPLUS],
      sum: (s) => [[s.dist ? r1(s.dist) + " km" : "", s.steps ? r0(s.steps) + " pas" : ""].filter(Boolean).join(" · ")].filter(Boolean),
      derive: (s) => { const r = []; if (s.dist) r.push(["Distance", r1(s.dist) + " km" + (speed(s) ? " · " + r1(speed(s)) + " km/h" : "")]); if (s.steps) r.push(["Pas", r0(s.steps)]); if (s.dplus) r.push(["Dénivelé positif", r0(s.dplus) + " m"]); return r; },
      tiles: (L) => [[r0(sum(L, (s) => s.dist)) + " km", "marchés"]],
      met: (s) => { const v = speed(s); return !v ? 3.5 : v < 4 ? 2.8 : v < 5 ? 3.5 : v < 6 ? 4.3 : 5; },
    },
    autre: {
      fields: [{ k: "name", type: "text", label: "Quel sport ?", ph: "Ex. Aviron, golf, surf…" }, { k: "intensity", type: "seg", label: "Intensité habituelle de ce sport", opts: [["low", "Faible"], ["mid", "Moyenne"], ["high", "Élevée"]], def: "mid", hint: "Sert seulement à estimer les calories quand la fréquence cardiaque n'est pas notée." }],
      sum: (s) => [s.name].filter(Boolean),
      derive: (s) => (s.name ? [["Sport", s.name]] : []),
      tiles: () => [],
      met: (s) => ({ low: 3.5, mid: 5.5, high: 8 }[s.intensity] || 5.5),
    },
  };

  /* Valeurs par défaut des choix uniques pour une nouvelle séance */
  const defaults = (id) => { const o = {}; ((SPEC[id] || {}).fields || []).forEach((f) => { if (f.def != null) o[f.k] = f.def; }); return o; };

  window.TempoSports = { SPEC, STROKES, GRADES, defaults, speed };
})();
