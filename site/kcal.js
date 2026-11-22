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

  /* ---------- Dépense d'une journée : partagée par la page Calories et le journal alimentaire ----------
     Métabolisme de base (Mifflin-St Jeor) + vie quotidienne (type de journée ou pas) + surplus des séances notées ce jour-là.
     Le niveau « Activité au quotidien » du profil n'est pas utilisé ici : il contient déjà le sport, on le compterait deux fois. */
  const MET = { course: [8.3, 9.8, 11.8], velo: [6.8, 8, 10], muscu: [3.5, 5, 6], natation: [5.8, 8.3, 9.8], marche: [3, 3.5, 5],
    rando: [5.3, 6, 7.8], rameur: [4.8, 7, 8.5], hiit: [6, 8, 10], yoga: [2.5, 3, 4] };
  const LABEL = { course: "Course à pied", velo: "Vélo", muscu: "Musculation", natation: "Natation", marche: "Marche", rando: "Randonnée", rameur: "Rameur", hiit: "HIIT", yoga: "Yoga" };
  const dk = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const sum = (a, f) => a.reduce((t, x) => t + (f(x) || 0), 0);
  const r1 = (x) => (Math.round(x * 10) / 10).toLocaleString("fr-FR");
  function human(sec) {
    sec = Math.round(sec || 0);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60, out = [];
    if (h) out.push(h + " h"); if (m || (h && s)) out.push((h ? String(m).padStart(2, "0") : m) + " min"); if (s || (!h && !m)) out.push((h || m ? String(s).padStart(2, "0") : s) + " s");
    return out.join(" ");
  }
  const TS = () => window.TempoStore;
  const get = (k) => { try { return TS().get(k); } catch (_) { return null; } };
  function profile() {
    let p = {}; try { p = TS().profile() || {}; } catch (_) {}
    if (!(p.age && p.cm && p.kg && p.sex)) return null;
    const life = parseFloat((p.raw || {})["d-life"]) || 1.2;
    return { w: p.kg, h: p.cm, goal: p.goal || "keep", life, lifeSet: !!(p.raw || {})["d-life"], bmr: 10 * p.kg + 6.25 * p.cm - 5 * p.age + (p.sex === "h" ? 5 : -161) };
  }
  // Séances du jour lues dans les carnets + ajouts manuels de la page Calories
  function sessions(day, w) {
    const out = [];
    const course = get("tempo-course-v1"), fonte = get("carnet-fonte-v1"), extra = get("tempo-day-v1") || {};
    ((course && course.sessions) || []).filter((s) => s.date === day).forEach((s) => out.push({
      src: "course", name: "Course · " + r1(s.dist) + " km", sub: human(s.dur), dur: s.dur,
      kcal: w * s.dist * (s.type === "trail" ? 1.1 : 1) + (s.dplus || 0) * w * 0.0015 }));
    const allMuscu = ((fonte && fonte.sessions) || []).map((x) => Object.assign({}, x, { date: dk(new Date(x.date)) }));
    allMuscu.filter((s) => s.date === day).forEach((s) => {
      const m = muscuKcal(s, w, allMuscu);
      out.push({ src: "muscu", name: "Musculation · " + s.dayName, dur: m.dur,
        sub: human(m.dur) + " · " + m.sets + " séries · " + r1(m.tonnage / 1000) + " t soulevées · " + m.zone, kcal: m.kcal });
    });
    const multi = get("tempo-multi-v1"), CH = window.TempoCharge;
    if (CH) ((multi && multi.sessions) || []).filter((s) => s.date === day).forEach((s) => {
      const t = CH.sportOf(s.sport);
      out.push({ src: "multi", sport: t.name, color: t.color, name: t.name, sub: human(s.dur), dur: s.dur, kcal: CH.kcal(s, w) || 0 });
    });
    (extra[day] || []).forEach((x) => MET[x.act] && out.push({ src: "extra", id: x.id, act: x.act, name: LABEL[x.act], sub: human(x.dur) + " · " + ["facile", "modérée", "soutenue"][x.lvl], dur: x.dur, kcal: (MET[x.act][x.lvl] * w * x.dur) / 3600 }));
    return out;
  }
  function day(dayKey, p, lf) {
    p = p || profile(); if (!p) return null;
    lf = lf || p.life;
    const ss = sessions(dayKey, p.w);
    // Le repos pendant la séance est déjà dans le métabolisme : on ne compte que le surplus du sport
    const sport = sum(ss, (s) => Math.max(0, s.kcal - (p.bmr / 86400) * s.dur));
    /* Pas : foulée de marche ≈ taille × 0,415, dépense nette ≈ 0,5 kcal par kg et par km.
       Les pas des sorties de course du carnet sont retirés (foulée de course ≈ taille × 0,65) pour ne pas compter deux fois. */
    const st = (get("tempo-steps-v1") || {})[dayKey] || 0;
    const course = get("tempo-course-v1");
    const runKm = sum(((course && course.sessions) || []).filter((x) => x.date === dayKey), (x) => x.dist);
    const runSteps = Math.min(st, (runKm * 1000) / (p.h * 0.0065));
    const walkSteps = st - runSteps, walkKm = (walkSteps * p.h * 0.00415) / 1000, stepsK = 0.5 * p.w * walkKm;
    // Avec des pas : digestion et petits mouvements (~15 %) + supplément métier physique + pas.
    // Sans pas : estimation selon le type de journée (une journée assise ≈ 3 000 pas).
    const daily = st > 0 ? p.bmr * 0.15 + Math.max(0, lf - 1.2) * p.bmr + stepsK : p.bmr * (lf - 1);
    const all = p.bmr + daily + sport, k = { cut: 0.85, keep: 1, bulk: 1.1 }[p.goal] || 1;
    return { ss, sport, daily, st, runSteps, walkSteps, walkKm, stepsK, base: p.bmr, all, goal: p.goal, target: all * k, p };
  }
  window.TempoKcal = { muscuMet, muscuKcal, MET, LABEL, profile, sessions, day };
})();
