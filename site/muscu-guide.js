/* Tempo : aide à l'entraînement de musculation, du débutant au confirmé.
   Niveau de chaque exercice, lexique, séances proposées, programmes prêts et conseils de charge. */
(function () {
  "use strict";
  const LIB = window.TempoExercices || { list: [], byId: () => null };
  const byName = (n) => LIB.list.find((e) => e.name === n) || null;

  /* ---------- Niveaux ---------- */
  const LEVELS = {
    deb: { label: "Je débute", short: "Débutant", desc: "Moins de 6 mois de pratique. Des machines et des gestes simples, des conseils à chaque série." },
    int: { label: "J'ai l'habitude", short: "Intermédiaire", desc: "6 mois à 2 ans. Haltères, barres et poulies, avec des objectifs de charge à chaque séance." },
    conf: { label: "Confirmé", short: "Confirmé", desc: "Plus de 2 ans. Les grands mouvements à la barre, vos propres méthodes, l'essentiel des chiffres." },
  };

  /* ---------- Difficulté de chaque exercice : 1 facile, 2 intermédiaire, 3 avancé ---------- */
  const ADV = ["Épaulé", "Épaulé-jeté", "Arraché", "Push press", "Dragon flag", "Squat pistol", "Nordic curl", "Tractions lestées", "Dips lestés",
    "Pompes en équilibre", "Turkish get-up", "Kettlebell snatch", "Rowing Pendlay", "Seal row", "Rowing Meadows", "JM press", "Glute ham raise",
    "Sissy squat", "Good morning", "Rack pull", "Squat avant", "Soulevé de terre jambes tendues", "Copenhague", "Reverse hyper", "Pompes piquées",
    "Curl araignée", "Relevé de jambes suspendu", "Roue abdominale", "Hollow hold", "Thruster"];
  const MID_FORCE = ["Curl Bayesian", "Bûcheron poulie", "Pendulum squat"];
  const EASY = ["Curl haltères", "Curl marteau", "Élévations latérales", "Élévations frontales", "Squat gobelet", "Pont fessier", "Pont fessier une jambe",
    "Gainage", "Gainage latéral", "Crunch", "Dead bug", "Bird dog", "Superman", "Relevé de jambes au sol", "Pompes", "Mollets une jambe", "Shrugs haltères",
    "Curl concentré", "Kickback", "Rowing haltère un bras", "Développé haltères assis", "Développé couché haltères", "Abduction élastique",
    "Marche latérale élastique", "Frog pump", "Chaise", "Corde à sauter", "Extension lombaire", "Tractions assistées", "Dips sur banc", "Step-up",
    "Farmer walk", "Développé sol haltères", "Rowing poitrine appuyée", "Curl barre EZ", "Fentes arrière", "Soulevé de terre roumain haltères"];
  const EASY_EQUIP = ["Machine", "Poulie", "Smith", "Élastique"];
  function level(e) {
    if (!e) return 2;
    const n = e.name;
    if (ADV.includes(n)) return 3;
    if (MID_FORCE.includes(n)) return 2;
    if (EASY.includes(n) || EASY_EQUIP.includes(e.equip)) return 1;
    return 2;
  }
  const LEVEL_LABEL = ["", "Facile", "Intermédiaire", "Avancé"];

  /* ---------- Lexique ---------- */
  const GLOSS = {
    serie: ["Série", "Un enchaînement de répétitions sans pause. « 3 séries de 10 » : 10 mouvements, une pause, 10 mouvements, une pause, puis 10 mouvements."],
    rep: ["Répétition (rep)", "Un mouvement complet : de la position de départ à l'arrivée, puis retour au départ."],
    fourchette: ["Fourchette de répétitions", "Par exemple 8-12. Choisissez une charge qui vous permet au moins 8 répétitions propres. Quand vous en faites 12 à toutes les séries, augmentez la charge : c'est ainsi qu'on progresse."],
    charge: ["Charge", "Le poids soulevé, en kg. Avec des haltères, notez le poids d'un seul haltère. Aux machines, notez le chiffre indiqué sur la pile de poids."],
    reserve: ["Répétitions en réserve", "Le nombre de répétitions que vous auriez encore pu faire en fin de série. « 2 en réserve » : vous vous arrêtez alors qu'il vous en reste 2. C'est assez dur pour progresser, sans risque de mal faire le geste."],
    echec: ["Échec", "Le moment où vous ne pouvez plus faire une répétition propre. Inutile d'aller jusque-là à chaque série, surtout quand on débute."],
    echauffement: ["Échauffement", "1 ou 2 séries légères (environ la moitié de votre charge) avant les séries de travail du premier exercice. Elles préparent les articulations et ne se notent pas."],
    repos: ["Temps de repos", "La pause entre deux séries. En général 1 min 30 à 2 min ; 3 min ou plus pour les séries très lourdes. Tempo lance le minuteur quand vous cochez une série."],
    surcharge: ["Surcharge progressive", "Le principe de base pour progresser : faire un peu plus que la dernière fois. Une répétition de plus, ou un peu plus de charge. Tempo vous propose un objectif à chaque séance."],
    "1rm": ["1RM (répétition maximale)", "La charge la plus lourde que vous pourriez soulever une seule fois. Tempo l'estime à partir de vos séries avec la formule d'Epley : charge × (1 + répétitions ÷ 30). Inutile de la tester pour de vrai."],
    volume: ["Volume", "Charge × répétitions, additionnées sur toutes les séries. Il mesure la quantité totale de travail. Exemple : 3 séries de 10 à 40 kg = 1 200 kg."],
    poly: ["Polyarticulaire", "Un mouvement qui fait travailler plusieurs articulations et plusieurs muscles à la fois : squat, développé, rowing, tractions. C'est la base d'un programme."],
    iso: ["Isolation", "Un mouvement qui cible un seul muscle : curl, élévations latérales, leg extension. À faire après les polyarticulaires, en complément."],
    split: ["Split", "La façon de répartir les muscles dans la semaine : corps entier à chaque séance, haut du corps / bas du corps, ou push / pull / legs."],
    ppl: ["Push / Pull / Legs", "Push : les mouvements où l'on pousse (pecs, épaules, triceps). Pull : ceux où l'on tire (dos, biceps). Legs : les jambes."],
    record: ["Record (PR)", "Votre meilleure performance sur un exercice (« personal record »). Tempo compare vos séries grâce au 1RM estimé, pour qu'une série de 10 à 50 kg et une série de 5 à 57 kg soient comparables."],
    seriesmuscle: ["Séries par muscle", "Le nombre de séries faites pour chaque muscle dans la semaine. Entre 10 et 20 séries par muscle et par semaine est la fourchette habituelle pour prendre du muscle ; 6 à 10 suffisent pour débuter."],
    amplitude: ["Amplitude", "La distance parcourue pendant le mouvement. Une amplitude complète (descendre bien bas, remonter jusqu'au bout) fait plus progresser qu'un mouvement à moitié."],
  };

  /* ---------- Séances proposées selon le type de séance et le niveau ---------- */
  // Chaque ligne : [débutant, intermédiaire, confirmé] ; null = pas d'exercice à ce niveau
  const SLOTS = {
    push: [["Développé machine convergente", "Développé couché haltères", "Développé couché"], ["Développé machine épaules", "Développé haltères assis", "Développé incliné haltères"],
      ["Pec deck", "Écarté poulie", "Développé militaire"], ["Élévations latérales machine", "Élévations latérales", "Élévations latérales poulie"],
      ["Extension triceps poulie", "Extension triceps corde", "Dips"], [null, null, "Extension nuque poulie"]],
    pull: [["Tirage vertical", "Tirage vertical", "Tractions"], ["Rowing machine", "Tirage horizontal", "Rowing barre"], ["Reverse pec deck", "Face pull", "Rowing haltère un bras"],
      ["Curl machine", "Curl haltères", "Face pull"], ["Curl poulie", "Curl marteau", "Curl incliné"], [null, null, "Curl marteau"]],
    legs: [["Presse à cuisses", "Squat gobelet", "Squat"], ["Leg curl assis", "Soulevé de terre roumain haltères", "Soulevé de terre roumain"], ["Leg extension", "Presse à cuisses", "Presse à cuisses"],
      ["Hip thrust machine", "Fentes arrière", "Fentes bulgares"], ["Mollets assis", "Leg curl assis", "Leg curl assis"], [null, "Mollets debout", "Mollets debout"]],
    full: [["Presse à cuisses", "Squat gobelet", "Squat"], ["Développé machine convergente", "Développé couché haltères", "Développé couché"], ["Tirage vertical", "Tirage horizontal", "Rowing barre"],
      ["Leg curl assis", "Soulevé de terre roumain haltères", "Soulevé de terre roumain"], ["Développé machine épaules", "Élévations latérales", "Développé militaire"], ["Gainage", "Crunch poulie", "Relevé de jambes suspendu"]],
    haut: [["Développé machine convergente", "Développé couché haltères", "Développé couché"], ["Tirage vertical", "Tirage vertical", "Tractions"], ["Développé machine épaules", "Développé haltères assis", "Développé incliné haltères"],
      ["Rowing machine", "Tirage horizontal", "Rowing haltère un bras"], ["Élévations latérales machine", "Élévations latérales", "Élévations latérales"], ["Curl poulie", "Curl haltères", "Curl incliné"], [null, "Extension triceps corde", "Barre au front"]],
    "pecs-dos": [["Développé machine convergente", "Développé couché haltères", "Développé couché"], ["Tirage vertical", "Tirage vertical", "Tractions"], ["Pec deck", "Développé incliné haltères", "Développé incliné haltères"],
      ["Rowing machine", "Rowing haltère un bras", "Rowing barre"], ["Écarté poulie", "Écarté poulie", "Écarté poulie"], [null, "Pull-over poulie", "Pull-over poulie"]],
    "epaules-bras": [["Développé machine épaules", "Développé haltères assis", "Développé militaire"], ["Élévations latérales machine", "Élévations latérales", "Élévations latérales poulie"],
      ["Reverse pec deck", "Oiseau", "Face pull"], ["Curl machine", "Curl haltères", "Curl barre EZ"], ["Extension triceps poulie", "Extension triceps corde", "Barre au front"], [null, "Curl marteau", "Curl incliné"], [null, null, "Extension nuque poulie"]],
    abdos: [["Crunch machine", "Crunch poulie", "Relevé de jambes suspendu"], ["Gainage", "Gainage", "Roue abdominale"], ["Gainage latéral", "Pallof press", "Pallof press"], ["Dead bug", "Relevé de genoux chaise romaine", "Dragon flag"]],
  };
  const FOCUS_LABEL = { push: "Push : pecs, épaules, triceps", pull: "Pull : dos, biceps", legs: "Jambes", full: "Corps entier", haut: "Haut du corps", "pecs-dos": "Pecs et dos", "epaules-bras": "Épaules et bras", abdos: "Abdos et gainage" };
  const norm = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  function focusOf(name, id) {
    const t = norm(name + " " + id);
    const has = (...w) => w.some((x) => t.includes(x));
    if (has("full", "corps entier", "fullbody", "full body")) return "full";
    if (has("push")) return "push";
    if (has("pull")) return "pull";
    if (has("leg", "jambe", "cuisse", "bas du corps", "lower")) return "legs";
    if (/\bbas\b/.test(t)) return "legs";
    if (has("haut", "upper")) return "haut";
    if (has("abdo", "gainage", "core")) return "abdos";
    const pecs = has("pec", "poitrine"), dos = has("dos"), ep = has("epaule"), bras = has("bras", "biceps", "triceps");
    if (pecs && dos) return "pecs-dos";
    if (ep || bras) return "epaules-bras";
    if (pecs) return "push";
    if (dos) return "pull";
    return "full";
  }
  const LI = { deb: 0, int: 1, conf: 2 };
  // Séries et répétitions conseillées pour un exercice selon le niveau
  function dose(e, lv) {
    const timed = /s\b|sec|min|\bm\b/i.test(e.reps || "");
    if (timed || e.muscle === "Abdos") return { sets: 3, reps: e.reps || "12-15" };
    const iso = e.type === "Iso";
    if (lv === "deb") return { sets: 3, reps: iso ? "12-15" : "10-12" };
    if (lv === "int") return { sets: iso ? 3 : 4, reps: iso ? "10-15" : "8-12" };
    return { sets: e.sets || (iso ? 3 : 4), reps: (e.reps || (iso ? "10-12" : "6-10")).replace(/\/.*$/, "") };
  }
  function item(name, lv, over) {
    const e = byName(name);
    if (!e) return null;
    const d = Object.assign(dose(e, lv), over || {});
    return { id: e.id, name: e.name, muscle: e.muscle, sets: d.sets, reps: d.reps };
  }
  function suggest(dayName, dayId, lv) {
    lv = LI[lv] != null ? lv : "int";
    const f = focusOf(dayName, dayId);
    const out = [], seen = new Set();
    (SLOTS[f] || SLOTS.full).forEach((row) => {
      const n = row[LI[lv]];
      if (!n || seen.has(n)) return;
      const x = item(n, lv);
      if (x) { seen.add(n); out.push(x); }
    });
    return { focus: f, label: FOCUS_LABEL[f], exercises: out };
  }

  /* ---------- Programmes prêts ---------- */
  const day = (id, name, color, lv, names, over) => ({ id, name, color, exercises: names.map((n) => item(n, lv, over)).filter(Boolean) });
  // Variante où chaque exercice a sa propre dose : [nom, séries, répétitions]
  const dayx = (id, name, color, lv, rows) => ({ id, name, color, exercises: rows.map(([n, sets, reps]) => item(n, lv, { sets, reps })).filter(Boolean) });
  const TEMPLATES = [
    {
      id: "debut", name: "Débuter en salle", level: "deb", per: 3, rest: 90,
      desc: "Deux séances corps entier à alterner (A, B, A, puis B, A, B). Surtout des machines, pour apprendre les gestes en sécurité et progresser vite les premiers mois.",
      days: () => [
        day("fb-a", "Corps entier A", "red", "deb", ["Presse à cuisses", "Développé machine convergente", "Tirage vertical", "Leg curl assis", "Développé machine épaules", "Gainage"]),
        day("fb-b", "Corps entier B", "blue", "deb", ["Squat gobelet", "Développé couché haltères", "Rowing machine", "Hip thrust machine", "Élévations latérales", "Crunch machine"]),
      ],
    },
    {
      id: "maison", name: "À la maison", level: "deb", per: 3, rest: 75,
      desc: "Pour s'entraîner chez soi avec une paire d'haltères et un tapis. Deux séances corps entier à alterner, accessibles à tous les niveaux : augmentez les répétitions puis le poids.",
      days: () => [
        day("home-a", "Maison A", "green", "deb", ["Squat gobelet", "Pompes", "Rowing haltère un bras", "Soulevé de terre roumain haltères", "Élévations latérales", "Gainage"]),
        day("home-b", "Maison B", "yellow", "deb", ["Fentes arrière", "Développé sol haltères", "Rowing poitrine appuyée", "Pont fessier", "Curl haltères", "Dead bug"]),
      ],
    },
    {
      id: "hautbas", name: "Haut / Bas", level: "int", per: 4, rest: 120,
      desc: "Quatre séances par semaine : chaque muscle travaille deux fois. Le programme idéal après quelques mois, quand le corps entier devient trop long.",
      days: () => [
        day("haut-a", "Haut A", "red", "int", ["Développé couché haltères", "Tirage vertical", "Développé haltères assis", "Tirage horizontal", "Élévations latérales", "Curl haltères", "Extension triceps corde"]),
        day("bas-a", "Bas A", "yellow", "int", ["Squat gobelet", "Soulevé de terre roumain haltères", "Presse à cuisses", "Leg curl assis", "Mollets debout", "Crunch poulie"]),
        day("haut-b", "Haut B", "blue", "int", ["Développé incliné haltères", "Rowing haltère un bras", "Développé machine épaules", "Tirage vertical prise serrée", "Face pull", "Curl marteau", "Extension triceps poulie"]),
        day("bas-b", "Bas B", "green", "int", ["Presse à cuisses", "Hip thrust", "Fentes arrière", "Leg extension", "Leg curl allongé", "Gainage"]),
      ],
    },
    {
      id: "ppl", name: "Push / Pull / Legs", level: "conf", per: 3, rest: 120,
      desc: "Le split classique : pousser, tirer, jambes. Trois séances (une fois par semaine) ou six (deux fois). Les grands mouvements à la barre en premier.",
      days: () => [
        day("push", "Push", "red", "conf", ["Développé couché", "Développé militaire", "Développé incliné haltères", "Élévations latérales poulie", "Dips", "Extension nuque poulie"]),
        day("pull", "Pull", "blue", "conf", ["Tractions", "Rowing barre", "Rowing haltère un bras", "Face pull", "Curl incliné", "Curl marteau"]),
        day("legs", "Legs", "yellow", "conf", ["Squat", "Soulevé de terre roumain", "Presse à cuisses", "Fentes bulgares", "Leg curl assis", "Mollets debout"]),
      ],
    },
    {
      id: "force", name: "Force 5 × 5", level: "conf", per: 3, rest: 180,
      desc: "Trois séances par semaine sur les mouvements de base, 5 séries de 5 répétitions. Quand les 5 × 5 passent, ajoutez 2,5 kg (5 kg au squat et au soulevé de terre).",
      days: () => [
        day("force-a", "Force A", "red", "conf", ["Squat", "Développé couché", "Rowing barre"], { sets: 5, reps: "5" }),
        day("force-b", "Force B", "blue", "conf", ["Squat", "Développé militaire"], { sets: 5, reps: "5" }),
      ].map((d) => { if (d.id === "force-b") { const dl = item("Soulevé de terre", "conf", { sets: 1, reps: "5" }); if (dl) d.exercises.push(dl); } return d; }),
    },
    {
      id: "rugby-pre", name: "Rugby : pré-saison", level: "int", per: 3, rest: 150, rugby: 1,
      desc: "Trois séances pour préparer la saison : force maximale, puissance (sauts, épaulé) et solidité des zones qui se blessent au rugby (ischios, adducteurs, épaules, tronc). Gardez 48 h entre la séance Puissance et un entraînement de contact.",
      days: () => [
        dayx("rg-force", "Force", "red", "int", [["Squat", 4, "4-6"], ["Développé couché", 4, "4-6"], ["Tractions lestées", 4, "5-6"], ["Nordic curl", 3, "4-6"], ["Pallof press", 3, "10-12"]]),
        dayx("rg-puiss", "Puissance", "blue", "int", [["Épaulé", 5, "3"], ["Squat sauté", 4, "5"], ["Push press", 4, "4-5"], ["Hip thrust", 3, "6-8"], ["Copenhague", 3, "20-30 s/côté"]]),
        dayx("rg-solid", "Solidité", "yellow", "int", [["Soulevé de terre", 3, "4-5"], ["Fentes bulgares", 3, "6-8"], ["Rowing barre", 4, "6-8"], ["Développé militaire", 3, "6-8"], ["Shrugs trap bar", 3, "10-12"], ["Gainage latéral", 3, "30-45 s"]]),
      ],
    },
    {
      id: "rugby-saison", name: "Rugby : en saison", level: "int", per: 2, rest: 150, rugby: 1,
      desc: "Deux séances courtes (45 min) pour garder sa force pendant la saison sans arriver fatigué au match. Lourd mais peu de séries : arrêtez une ou deux répétitions avant l'échec. Pas de séance jambes la veille d'un match.",
      days: () => [
        dayx("rs-force", "Force", "red", "int", [["Squat", 3, "3-5"], ["Développé couché", 3, "3-5"], ["Tractions lestées", 3, "4-6"], ["Nordic curl", 2, "4-6"], ["Copenhague", 2, "20-30 s/côté"]]),
        dayx("rs-puiss", "Puissance", "blue", "int", [["Épaulé", 4, "3"], ["Squat sauté", 3, "5"], ["Push press", 3, "4"], ["Rowing barre", 3, "6"], ["Pallof press", 2, "10"]]),
      ],
    },
  ];

  /* ---------- Conseil de charge pour la séance du jour ---------- */
  function range(reps) {
    const s = String(reps || "");
    if (/s\b|sec|min|\bm\b/i.test(s)) return null;
    const m = s.match(/(\d+)\s*(?:-|à|–)\s*(\d+)/);
    if (m) return { lo: +m[1], hi: +m[2] };
    const one = s.match(/^\s*(\d+)\s*$/);
    return one ? { lo: +one[1], hi: +one[1] } : null;
  }
  function step(e) {
    const i = (e && (LIB.byId(e.exId || e.id) || byName(e.name))) || e || {};
    const lower = ["Quadriceps", "Ischios", "Fessiers"].includes(i.muscle) && i.type === "Poly";
    if (lower && ["Barre", "Machine", "Smith", "Trap bar"].includes(i.equip)) return 5;
    if (i.equip === "Haltères") return 2;
    return 2.5;
  }
  const r25 = (x) => Math.round(x * 4) / 4;
  /* e : exercice de la séance (reps = fourchette visée) ; last : séries de la dernière fois ; lv : niveau */
  function coach(e, last, lv) {
    const rg = range(e.reps) || range((LIB.byId(e.exId || e.id) || byName(e.name) || {}).reps) || (lv === "deb" ? { lo: 10, hi: 12 } : { lo: 8, hi: 12 });
    if (!last || !last.length) {
      return { first: true, rg, msg: lv === "deb"
        ? `Première fois : prenez une charge légère que vous pouvez soulever ${rg.hi} fois proprement, en gardant 2 répétitions en réserve. Trop facile ? Ajoutez du poids à la série suivante.`
        : lv === "int" ? `Première fois : trouvez une charge pour ${rg.lo === rg.hi ? rg.lo : rg.lo + " à " + rg.hi} répétitions avec 1 ou 2 en réserve.` : "" };
    }
    const top = Math.max(...last.map((s) => s.kg || 0));
    const at = last.filter((s) => (s.kg || 0) === top);
    const fmtKg = (x) => String(r25(x)).replace(".", ",");
    if (top <= 0) {
      const all = at.every((s) => s.reps >= rg.hi);
      return { kg: null, reps: all ? null : Math.max(...at.map((s) => s.reps)) + 1, rg, kind: all ? "up" : "keep",
        msg: all ? `${rg.hi} répétitions ou plus partout la dernière fois : ralentissez la descente, ajoutez du lest ou passez à une variante plus dure.` : "Visez 1 répétition de plus par série que la dernière fois." };
    }
    const st = step(e);
    if (at.every((s) => s.reps >= rg.hi)) {
      const kg = r25(top + st);
      const target = rg.lo === rg.hi ? `${rg.lo} répétitions` : `au moins ${rg.lo} répétitions`;
      return { kg, reps: rg.lo, rg, kind: "up", msg: `La dernière fois, ${rg.lo === rg.hi ? rg.hi + " répétitions" : rg.hi + " répétitions ou plus"} à ${fmtKg(top)} kg sur toutes les séries : passez à ${fmtKg(kg)} kg et visez ${target}.` };
    }
    if (at.filter((s) => s.reps < rg.lo).length > at.length / 2) {
      return { kg: top, reps: rg.lo, rg, kind: "down", msg: `La dernière fois, moins de ${rg.lo} répétitions à ${fmtKg(top)} kg. Gardez cette charge (ou retirez ${fmtKg(st)} kg) et visez ${rg.lo} à ${rg.hi} répétitions.` };
    }
    const best = Math.max(...at.map((s) => s.reps));
    return { kg: top, reps: Math.min(rg.hi, best + 1), rg, kind: "keep", msg: `Gardez ${fmtKg(top)} kg et faites 1 répétition de plus par série que la dernière fois. À ${rg.hi} partout, vous augmenterez.` };
  }
  // Retour immédiat après une série cochée
  function feedback(e, set, lv) {
    if (lv === "conf") return "";
    const rg = range(e.reps);
    if (!rg || !(set.kg > 0)) return "";
    if (set.reps >= rg.hi + 3) return `${set.reps} répétitions : c'est trop léger pour ${rg.lo}-${rg.hi}. Ajoutez ${String(step(e)).replace(".", ",")} kg à la prochaine série.`;
    if (set.reps < rg.lo - 2) return `${set.reps} répétitions : un peu lourd. Retirez ${String(step(e)).replace(".", ",")} kg à la prochaine série.`;
    return "";
  }


  /* ---------- Échauffement et disques ---------- */
  const BARS = ["Barre", "Smith", "Trap bar", "Barre EZ"];
  const infoOf = (e) => (e && (LIB.byId(e.exId || e.id) || byName(e.name))) || e || {};
  const isBar = (e) => BARS.includes(infoOf(e).equip);
  const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
  // Disques à mettre de chaque côté pour atteindre kg avec une barre de bar kg
  function plates(kg, bar) {
    bar = bar || 20;
    let side = (kg - bar) / 2;
    if (side < -1e-9) return null;
    const used = [];
    PLATES.forEach((p) => { while (side >= p - 1e-9) { used.push(p); side -= p; } });
    return { used, rest: Math.round(side * 2 * 100) / 100 };
  }
  const fmtKg = (x) => String(Math.round(x * 100) / 100).replace(".", ",");
  const platesStr = (kg, bar) => { const p = plates(kg, bar); if (!p) return ""; return p.used.length ? p.used.map(fmtKg).join(" + ") : "barre seule"; };
  const roundTo = (x, st) => Math.max(0, Math.round(x / st) * st);
  /* Séries d'échauffement avant une charge de travail kg */
  function warmup(e, kg, bar) {
    const i = infoOf(e);
    if (!(kg > 0)) return [];
    bar = bar || 20;
    if (isBar(i)) {
      if (kg <= bar + 10) return [{ kg: bar, reps: 10, label: "barre à vide" }];
      const out = [{ kg: bar, reps: 10, label: "barre à vide" }];
      [[0.5, 5], [0.7, 3], [0.85, 1]].forEach(([f, r]) => {
        if (f === 0.85 && kg < 80) return;
        const w = roundTo(kg * f, 2.5);
        if (w > out[out.length - 1].kg && w < kg) out.push({ kg: w, reps: r });
      });
      return out;
    }
    if (i.equip === "Poids du corps" || i.equip === "Élastique") return [];
    const st = i.equip === "Haltères" ? 2 : 2.5;
    return [[0.5, 10], [0.75, 5]].map(([f, r]) => ({ kg: roundTo(kg * f, st), reps: r })).filter((x, k, a) => x.kg > 0 && x.kg < kg && (k === 0 || x.kg > a[k - 1].kg));
  }

  /* ---------- Stagnation : pas de progrès sur les 3 dernières séances ---------- */
  // hist : séries de chaque séance pour cet exercice, de la plus récente à la plus ancienne
  const e1 = (kg, r) => (r > 0 && kg > 0 ? (r === 1 ? kg : kg * (1 + r / 30)) : 0);
  function stall(hist) {
    if (!hist || hist.length < 4) return null;
    const best = hist.map((sets) => Math.max(0, ...sets.map((x) => e1(x.kg, x.reps))));
    if (!(best[3] > 0)) return null;
    const before = Math.max(...best.slice(3));
    const recent = Math.max(...best.slice(0, 3));
    if (recent > before * 1.01) return null;
    return { sessions: 3, msg: "Ça arrive à tout le monde. Au choix : retirez environ 10 % et remontez petit à petit, passez quelques semaines sur une variante proche (haltères au lieu de la barre, par exemple), ou faites une semaine plus légère. Le sommeil et les repas comptent aussi." };
  }

  window.TempoMuscu = { LEVELS, level, LEVEL_LABEL, GLOSS, suggest, focusOf, FOCUS_LABEL, TEMPLATES, coach, feedback, range, step, dose, plates, platesStr, warmup, isBar, stall };
})();
