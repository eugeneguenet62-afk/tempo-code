/* Calories d'une séance de musculation, partagé par le carnet de séances et le bilan de la page Calories. */
(function () {
  "use strict";
  /* Musculation : plus un muscle est gros, plus il dépense. On pondère chaque série par le MET de son muscle
     (jambes et dos > pecs > épaules > bras), avec un bonus pour les gros mouvements polyarticulaires.
     La densité (séries par minute) ajuste ensuite de ±15 % : peu de repos = plus de dépense. */
  const MUSCLE_MET = { Quadriceps: 6, Ischios: 6, Fessiers: 6, Adducteurs: 5, Dos: 5.5, "Trapèzes": 4.5, Lombaires: 4.5, Pecs: 5, "Épaules": 4.5, Abdos: 3.8, Mollets: 4, Biceps: 3.5, Triceps: 3.5, "Avant-bras": 3, "Corps entier": 8 };
  const BIG = /squat|soulev|terre|presse|fente|hip thrust|rowing|traction|développé|dips|épaulé|arraché|thruster|swing|good morning|rack pull/i;
  const LEGS = ["Quadriceps", "Ischios", "Fessiers", "Mollets", "Adducteurs"];
  /* La charge compte de deux façons :
     1. l'effort : une série proche de votre meilleur 1RM estimé sur l'exercice compte plus qu'une série légère (×0,85 à ×1,1) ;
     2. le travail mécanique : charge × 9,81 × amplitude × répétitions (+ un tiers pour la descente),
        avec un rendement musculaire d'environ 22 %. */
  const ROM = { Quadriceps: 0.55, Ischios: 0.5, Fessiers: 0.45, Adducteurs: 0.4, Dos: 0.5, "Trapèzes": 0.1, Lombaires: 0.4, Pecs: 0.4, "Épaules": 0.5, Biceps: 0.35, Triceps: 0.35, "Avant-bras": 0.1, Mollets: 0.1, Abdos: 0.3, "Corps entier": 0.9 };
  const BODY = [[/traction|dips|rowing inversé|suspension/i, 0.95], [/pompe|burpee/i, 0.65], [/squat|fente|step-up|pistol|chaise/i, 0.85], [/relevé de jambes|nordic|glute ham/i, 0.4]];
  const e1rm = (kg, r) => (r > 1 ? kg * (1 + r / 30) : kg);
  const exKey = (e) => e.exId || String(e.name).toLowerCase();
  function muscuMet(s, w, all) {
    const bodyPart = (e) => { const b = BODY.find(([re]) => re.test(e.name)); return b ? b[1] * w : 0; };
    // Meilleur 1RM estimé par exercice, sur l'historique jusqu'à cette séance incluse
    const best = {};
    all.filter((x) => x.date <= s.date).forEach((x) => (x.exercises || []).forEach((e) => {
      const bp = bodyPart(e), k = exKey(e);
      e.sets.forEach((st) => { best[k] = Math.max(best[k] || 0, e1rm((st.kg || 0) + bp, st.reps || 0)); });
    }));
    let sets = 0, wsum = 0, legs = 0, work = 0, tonnage = 0;
    (s.exercises || []).forEach((e) => {
      const base = (MUSCLE_MET[e.muscle] || 4.5) + (BIG.test(e.name) ? 0.5 : 0), bp = bodyPart(e), rom = ROM[e.muscle] || 0.4;
      e.sets.forEach((st) => {
        const load = (st.kg || 0) + bp, reps = st.reps || 0;
        if (!reps) return;
        const rel = best[exKey(e)] ? e1rm(load, reps) / best[exKey(e)] : 0.8;
        const effort = 0.85 + 0.25 * Math.max(0, Math.min(1, (rel - 0.55) / 0.4));
        sets++; wsum += base * effort;
        // moitié seulement : le MET de base couvre déjà une partie de ce travail
        work += (0.5 * load * 9.81 * rom * reps * 1.33) / 0.22 / 4184;
        tonnage += (st.kg || 0) * reps;
        if (LEGS.includes(e.muscle)) legs++;
      });
    });
    const share = sets ? legs / sets : 0;
    return { sets, met: sets ? wsum / sets : 5, work, tonnage, zone: share > 0.6 ? "bas du corps" : share < 0.2 ? "haut du corps" : "corps complet" };
  }

  /* Calories brutes d'une séance : MET pondéré × densité (±15 %) × poids × durée + travail mécanique.
     s.duration en minutes ; sans durée, on compte 3 min par série. */
  function muscuKcal(s, w, all) {
    const m = muscuMet(s, w, all), d = (s.duration > 0 ? s.duration : m.sets * 3) * 60;
    const density = Math.max(0.85, Math.min(1.15, (m.sets * 2.75) / (d / 60)));
    return Object.assign({}, m, { dur: d, kcal: (m.met * density * w * d) / 3600 + m.work });
  }
  window.TempoKcal = { muscuMet, muscuKcal };
})();
