/* Tempo : exemple de carnets (données fictives) pour découvrir le site sans rien saisir.
   Profil type : un étudiant qui fait de la musculation 3 fois par semaine, du rugby 2 fois plus un match,
   et court le dimanche, sur les 12 dernières semaines. Chargé seulement en mode essai, jamais copié dans un compte. */
(function () {
  "use strict";
  // Hasard reproductible : le même exemple à chaque fois
  let seed = 42;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const dk = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const at = (d, h, m) => { const x = new Date(d); x.setHours(h, m || 0, 0, 0); return x; };
  const iso = (d) => dk(d) + "T" + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + ":00";
  const round = (x, s) => Math.round(x / s) * s;
  let n = 0;
  const id = () => "demo-" + (++n).toString(36);

  // Programme : exercices de la bibliothèque, avec la charge de départ et la charge visée en 12 semaines
  const DAYS = [
    { id: "push", name: "Push", color: "red", wd: 1, ex: [
      ["developpe-couche", "Développé couché", "Pecs", 4, "6-8", 70, 82.5, 2.5],
      ["developpe-militaire", "Développé militaire", "Épaules", 3, "8-10", 40, 47.5, 2.5],
      ["dips", "Dips", "Triceps", 3, "8-12", 0, 10, 2.5],
      ["elevations-laterales", "Élévations latérales", "Épaules", 3, "12-15", 10, 12, 2]] },
    { id: "pull", name: "Pull", color: "blue", wd: 3, ex: [
      ["tractions", "Tractions", "Dos", 4, "6-8", 0, 10, 2.5],
      ["rowing-barre", "Rowing barre", "Dos", 4, "8-10", 60, 72.5, 2.5],
      ["tirage-vertical", "Tirage vertical", "Dos", 3, "10-12", 55, 65, 2.5],
      ["curl-barre", "Curl barre", "Biceps", 3, "10-12", 30, 30, 2.5]] },   // stagne : déclenche le conseil
    { id: "legs", name: "Legs", color: "yellow", wd: 5, ex: [
      ["squat", "Squat", "Quadriceps", 4, "5-6", 100, 120, 5],
      ["souleve-de-terre-roumain", "Soulevé de terre roumain", "Ischios", 3, "8-10", 80, 95, 5],
      ["presse-a-cuisses", "Presse à cuisses", "Quadriceps", 3, "10-12", 160, 200, 10],
      ["leg-curl", "Leg curl", "Ischios", 3, "10-12", 40, 50, 2.5],
      ["gainage", "Gainage", "Abdos", 3, "30-60 s", 0, 10, 5]] },   // exercice en temps : durée + lest
  ];
  const WEEKS = 12;

  function build() {
    seed = 42; n = 0;
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const start = new Date(monday); start.setDate(monday.getDate() - 7 * (WEEKS - 1));
    const day = (w, wd) => { const d = new Date(start); d.setDate(start.getDate() + 7 * w + (wd - 1)); return d; };
    const past = (d) => d <= today;
    const fonte = [], course = [], multi = [];

    for (let w = 0; w < WEEKS; w++) {
      const p = w / (WEEKS - 1), deload = w === 7;   // semaine 8 allégée
      // Musculation
      DAYS.forEach((D) => {
        const d = day(w, D.wd);
        if (!past(d) || (w === 4 && D.id === "legs")) return;          // une séance manquée
        const h = at(d, 18, pick([0, 10, 20, 30]));
        const exercises = D.ex.map(([exId, name, muscle, sets, reps, a, b, step]) => {
          if (/ s$/.test(reps)) {   // gainage : de 35 s à 60 s, puis 5 puis 10 kg de lest
            const sec = Math.round(35 + 25 * Math.min(1, p * 1.6)), kg = p > 0.75 ? 10 : p > 0.6 ? 5 : 0;
            return { exId, name, muscle, mode: "time", sets: Array.from({ length: sets }, (_, i) => ({ kg, sec: Math.max(20, (kg ? 45 : sec) - i * 5 - Math.floor(rnd() * 4)) })) };
          }
          const [lo, hi] = reps.split("-").map(Number);
          let kg = round(a + (b - a) * Math.min(1, p * 1.08), step);
          if (deload) kg = round(kg * 0.85, step);
          return { exId, name, muscle, sets: Array.from({ length: sets }, (_, i) => ({ kg, reps: Math.max(lo - 1, hi - i - Math.floor(rnd() * 2) - (w % 3 === 0 ? 1 : 0)) })) };
        });
        fonte.push({ id: id(), date: iso(h), dayId: D.id, dayName: D.name, color: D.color, duration: 55 + Math.floor(rnd() * 20), rpe: deload ? 6 : pick([7, 7, 8]), note: "", exercises });
      });
      // Rugby : entraînements mardi et jeudi, match le samedi une semaine sur deux
      [2, 4].forEach((wd) => {
        const d = day(w, wd); if (!past(d)) return;
        multi.push({ id: id(), at: d.getTime(), date: dk(d), sport: "rugby", dur: 90 * 60, rpe: deload ? 5 : pick([6, 7, 7]), format: "xv", kind: "train",
          focus: wd === 2 ? ["coll", "def"] : pick([["opp", "phys"], ["scrum", "lineout"], ["tech", "coll"]]) });
      });
      if (w % 2 === 0) {
        const d = day(w, 6);
        if (past(d)) {
          const us = 10 + Math.floor(rnd() * 25), them = 8 + Math.floor(rnd() * 22), played = pick([50, 60, 80, 80]);
          multi.push({ id: id(), at: d.getTime(), date: dk(d), sport: "rugby", dur: 100 * 60, rpe: pick([8, 8, 9]), format: "xv", kind: "match", comp: "champ", poste: "l3a",
            role: played === 80 ? "start" : "sub", played, result: us > them ? "win" : us < them ? "loss" : "draw", scoreFor: us, scoreAg: them,
            tries: rnd() < 0.3 ? 1 : 0, tackles: 6 + Math.floor(rnd() * 9), missed: Math.floor(rnd() * 3), carries: 4 + Math.floor(rnd() * 8), card: "none",
            fc: 158 + Math.floor(rnd() * 10), note: pick(["Bonne défense, on a tenu en deuxième mi-temps", "Mêlée dominée", "", "Gros match en touche"]) });
        }
      }
      // Natation de récupération une semaine sur trois
      if (w % 3 === 1) { const d = day(w, 7); if (past(d)) multi.push({ id: id(), at: d.getTime(), date: dk(d), sport: "natation", dur: 40 * 60, rpe: 4, pool: "25", dist: 1500 + 100 * Math.floor(rnd() * 5), stroke: "crawl", work: "rec", gear: ["pull"] }); }
      // Course : sortie le dimanche (sauf les semaines de natation), fractionné une semaine sur trois le mercredi matin
      if (w % 3 !== 1) {
        const d = day(w, 7);
        if (past(d)) { const km = Math.round((7 + 5 * p + rnd() * 2) * 10) / 10, pace = 330 - 15 * p + rnd() * 15; course.push({ id: id(), at: d.getTime(), date: dk(d), type: km > 10 ? "long" : "ef", dist: km, dur: Math.round(km * pace), dplus: Math.round(km * 8), fc: 145 + Math.floor(rnd() * 8), rpe: 4, gear: "demo-shoe", note: "" }); }
      }
      if (w % 3 === 2) {
        const d = day(w, 3);
        if (past(d)) course.push({ id: id(), at: d.getTime(), date: dk(d), type: "frac", dist: 6, dur: Math.round(6 * (300 - 12 * p)), fc: 162, rpe: 8, gear: "demo-shoe", note: "8 × 400 m, récup 1 min 30" });
      }
    }
    const byDate = (a, b) => (a.date < b.date ? 1 : -1);
    return {
      "carnet-fonte-v1": {
        program: { days: DAYS.map((D) => ({ id: D.id, name: D.name, color: D.color, exercises: D.ex.map(([i, name, muscle, sets, reps]) => ({ id: i, name, muscle, sets, reps })) })) },
        sessions: fonte.sort(byDate), body: [], settings: { rest: 120, goal: 3, level: "int", onboarded: 1, demo: 1 },
      },
      "tempo-course-v1": { sessions: course.sort(byDate), gear: [{ id: "demo-shoe", name: "Chaussures de l'exemple", limit: 700, retired: false }], settings: { demo: 1 } },
      "tempo-multi-v1": { sessions: multi.sort(byDate), settings: { demo: 1 } },
      "tempo-food-v1": { sessions: food(today), recents: [] },
      "tempo-forme-v1": forme(today),
      "tempo-tests-v1": tests(today),
      "tempo-profile-v1": { "n-sex": "h", "n-age": "20", "n-cm": "182", "n-kg": "84", "n-act": "1.725", "n-goal": "keep" },
    };
  }

  // Trois jours de repas, valeurs pour 100 g de la table Ciqual
  function food(today) {
    const M = {
      bf: [["Flocons d'avoine", 60, 371, 11.7, 58.7, 7], ["Lait demi-écrémé", 250, 46, 3.3, 4.8, 1.6], ["Banane", 120, 90, 1.1, 20.5, 0.3]],
      lunch: [["Riz blanc cuit", 220, 146, 2.8, 31.5, 0.7], ["Blanc de poulet rôti", 160, 158, 29.5, 0, 4.2], ["Haricots verts cuits", 150, 29, 1.8, 3.9, 0.2], ["Huile d'olive", 10, 899, 0, 0, 99.9]],
      snack: [["Fromage blanc nature 3 %", 200, 76, 7.3, 4.2, 3.2], ["Amandes", 25, 634, 25.4, 8.8, 53.4]],
      dinner: [["Pâtes cuites", 250, 152, 5.4, 30.6, 0.9], ["Steak haché 5 %", 125, 136, 21.7, 0, 5.4], ["Salade verte", 60, 15, 1.3, 1.5, 0.2], ["Yaourt nature", 125, 61, 4.1, 5.4, 2.5]],
    };
    const out = [];
    for (let d = 0; d < 3; d++) {
      const x = new Date(today); x.setDate(x.getDate() - d); const k = dk(x);
      Object.keys(M).forEach((meal) => M[meal].forEach(([name, g, kcal, p, c, f], i) => {
        if (d === 0 && meal === "dinner") return;   // le dîner du jour n'est pas encore noté
        out.push({ id: id(), at: x.getTime() + i, date: k, meal, name, g: Math.round(g * (1 + (d - 1) * 0.06)), kcal, p, c, f, src: "ciqual" });
      }));
    }
    return out;
  }

  // Forme du jour : 3 semaines notées, un creux après le match du samedi ; aujourd'hui pas encore rempli
  function forme(today) {
    const days = {};
    for (let i = 1; i <= 21; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (rnd() < 0.15) continue;   // quelques oublis
      const wd = d.getDay(), afterMatch = wd === 0 || wd === 1;
      const b = afterMatch ? 2 : 3 + Math.round(rnd());
      days[dk(d)] = { sleep: Math.min(5, b + Math.round(rnd())), energy: Math.max(1, b - (afterMatch ? 0 : Math.round(rnd()) - 1)), sore: afterMatch ? 2 : Math.min(5, b + 1), mood: Math.min(5, b + 1) };
    }
    return { days, demo: 1 };
  }
  // Tests physiques : trois campagnes (il y a 4 mois, 2 mois, la semaine dernière)
  function tests(today) {
    const at = (m) => { const d = new Date(today); d.setDate(d.getDate() - Math.round(m * 30.4) - 3); return dk(d); };
    const R = [];
    [[4, 0], [2, 1], [0.1, 2]].forEach(([m, k]) => {
      const date = at(m);
      [["s10", [1.86, 1.83, 1.80]], ["s40", [5.62, 5.55, 5.46]], ["bronco", [328, 316, 305]], ["cmj", [44, 46, 48]], ["yoyo", [1240, 1360, 1480]], ["pullup", [9, 11, 12]], ["sq1rm", [125, 132.5, 140]], ["bp1rm", [92.5, 95, 100]]]
        .forEach(([t, v]) => R.push({ id: id(), test: t, date, v: v[k] }));
    });
    return { results: R, group: "fwd", settings: { demo: 1 } };
  }

  window.TempoDemo = { build };
})();
