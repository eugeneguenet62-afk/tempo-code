/* Illustrations des exercices de Tempo (dessinées par le code, aucune image externe).
   - mouvement : un bonhomme de profil animé entre la position de départ et la position d'arrivée
   - muscles : silhouettes de face et de dos, muscle principal et muscles secondaires surlignés */
(function () {
  "use strict";
  const L = { torso: 44, upper: 24, fore: 22, thigh: 30, shin: 30, neck: 13 };
  const rad = (a) => (a * Math.PI) / 180;
  const dir = (a) => [Math.sin(rad(a)), Math.cos(rad(a))];
  const add = (p, a, l) => { const d = dir(a); return [p[0] + d[0] * l, p[1] + d[1] * l]; };
  const f = (n) => Math.round(n * 10) / 10;

  /* Une pose = angles des segments (0° = vers le bas, 90° = vers l'avant, 180° = vers le haut, -90° = vers l'arrière)
     + le point d'appui (pied, main, hanche, épaule ou genou) placé à une position fixe. */
  function joints(p) {
    const H = [0, 0];
    const S = add(H, p.t, L.torso);
    const E = add(S, p.ua, L.upper), W = add(E, p.fa, L.fore);
    const K = add(H, p.th, L.thigh), F = add(K, p.sh, L.shin);
    const K2 = add(H, p.th2 ?? p.th, L.thigh), F2 = add(K2, p.sh2 ?? p.sh, L.shin);
    const Hd = add(S, p.hd ?? p.t, L.neck);
    const J = { H, S, E, W, K, F, K2, F2, Hd };
    const r = J[p.root[0]], dx = p.root[1] - r[0], dy = p.root[2] - r[1];
    Object.keys(J).forEach((k) => (J[k] = [J[k][0] + dx, J[k][1] + dy]));
    return J;
  }
  const P = (...pts) => "M" + pts.map((q) => f(q[0]) + " " + f(q[1])).join(" L");
  // Rotation des bras avec le buste (barre posée sur le dos, etc.)
  const lean = (o, d) => Object.assign({}, o, { t: o.t + d, ua: o.ua + d, fa: o.fa + d });

  const stand = { t: 180, th: 0, sh: 0, ua: 0, fa: 0, root: ["F", 110, 152] };
  const backBar = { ua: -60, fa: 150 };
  const S = (o) => Object.assign({}, stand, o);

  /* ---------- Les mouvements ---------- */
  const M = {
    squat: { a: S(backBar), b: lean(S({ th: 78, sh: -28, ua: -60, fa: 150, t: 180 }), -38), tool: "back" },
    squatfront: { a: S({ ua: 60, fa: 175 }), b: S({ t: 158, th: 80, sh: -30, ua: 38, fa: 155 }), tool: "hand" },
    hinge: { a: S({}), b: S({ t: 100, th: 14, sh: -6 }), tool: "hand" },
    goodmorning: { a: S(backBar), b: lean(S({ th: 12, sh: -6, ua: -60, fa: 150 }), -80), tool: "back" },
    deadlift: { a: S({ t: 118, th: 50, sh: -22, root: ["F", 110, 152] }), b: S({}), tool: "hand" },
    swing: { a: S({ t: 112, th: 22, sh: -10, ua: -14, fa: -14 }), b: S({ ua: 92, fa: 92 }), tool: "kb" },
    thruster: { a: S({ t: 160, th: 80, sh: -30, ua: 38, fa: 160 }), b: S({ ua: 176, fa: 180 }), tool: "hand" },
    press: { a: S({ ua: 22, fa: 172 }), b: S({ ua: 176, fa: 180 }), tool: "hand" },
    pushfront: { a: S({ ua: 40, fa: 150 }), b: S({ ua: 88, fa: 90 }), tool: "hand", cable: [200, 70] },
    frontraise: { a: S({ ua: 6, fa: 6 }), b: S({ ua: 95, fa: 95 }), tool: "hand" },
    curl: { a: S({ ua: 14, fa: 10 }), b: S({ ua: 16, fa: 165 }), tool: "hand" },
    pushdown: { a: S({ ua: 12, fa: 150 }), b: S({ ua: 6, fa: 4 }), tool: "hand", cable: [150, 18] },
    straightarm: { a: S({ t: 165, ua: 150, fa: 150 }), b: S({ t: 165, ua: 8, fa: 8 }), tool: "hand", cable: [175, 18] },
    overheadext: { a: S({ ua: 172, fa: -25 }), b: S({ ua: 172, fa: 178 }), tool: "hand" },
    kickback: { a: S({ t: 115, th: 20, sh: -8, ua: -70, fa: 4 }), b: S({ t: 115, th: 20, sh: -8, ua: -70, fa: -70 }), tool: "hand" },
    facepull: { a: S({ ua: 90, fa: 90 }), b: S({ ua: -112, fa: 150 }), tool: "hand", cable: [205, 60] },
    row: { a: S({ t: 118, th: 22, sh: -10, ua: 2, fa: 2 }), b: S({ t: 118, th: 22, sh: -10, ua: -158, fa: 8 }), tool: "hand" },
    seatedrow: { a: { t: 162, th: 90, sh: 40, ua: 98, fa: 92, root: ["H", 85, 122] }, b: { t: 185, th: 90, sh: 40, ua: -70, fa: 82, root: ["H", 85, 122] }, tool: "hand", cable: [205, 112], props: ["seat"] },
    rower: { a: { t: 155, th: 140, sh: 35, ua: 100, fa: 98, root: ["H", 70, 140] }, b: { t: 192, th: 92, sh: 92, ua: -55, fa: 75, root: ["H", 70, 140] }, tool: "hand", props: ["floorseat"] },
    pullup: { a: { t: 180, th: 8, sh: -40, ua: 180, fa: 180, root: ["W", 110, -18] }, b: { t: 178, th: 10, sh: -50, ua: 28, fa: 172, root: ["W", 110, -18] }, props: ["bar"], air: true },
    pulldown: { a: { t: 175, th: 90, sh: 0, ua: 176, fa: 178, root: ["H", 100, 112] }, b: { t: 170, th: 90, sh: 0, ua: 30, fa: 168, root: ["H", 100, 112] }, tool: "hand", cable: [110, 6], props: ["seat"] },
    bench: { a: { t: -90, th: 62, sh: 0, ua: 180, fa: 180, root: ["H", 118, 103] }, b: { t: -90, th: 62, sh: 0, ua: 18, fa: 168, root: ["H", 118, 103] }, tool: "hand", props: ["bench"] },
    skull: { a: { t: -90, th: 62, sh: 0, ua: 168, fa: 172, root: ["H", 118, 103] }, b: { t: -90, th: 62, sh: 0, ua: 165, fa: -95, root: ["H", 118, 103] }, tool: "hand", props: ["bench"] },
    pullover: { a: { t: -90, th: 62, sh: 0, ua: -100, fa: -100, root: ["H", 118, 103] }, b: { t: -90, th: 62, sh: 0, ua: 172, fa: 172, root: ["H", 118, 103] }, tool: "hand", props: ["bench"] },
    pushup: { a: { t: 115, th: -65, sh: -65, ua: 0, fa: 0, root: ["W", 150, 152] }, b: { t: 104, th: -76, sh: -76, ua: -62, fa: 38, root: ["W", 150, 152] } },
    climber: { a: { t: 115, th: -65, sh: -65, th2: -65, sh2: -65, ua: 0, fa: 0, root: ["W", 150, 152] }, b: { t: 115, th: 35, sh: -40, th2: -65, sh2: -65, ua: 0, fa: 0, root: ["W", 150, 152] } },
    plank: { a: { t: 110, th: -70, sh: -70, ua: 0, fa: 90, root: ["E", 145, 152] }, b: { t: 112, th: -68, sh: -68, ua: 0, fa: 90, root: ["E", 145, 152] } },
    dips: { a: { t: 180, th: 10, sh: -60, ua: 0, fa: 0, root: ["W", 110, 92] }, b: { t: 172, th: 10, sh: -60, ua: -38, fa: 20, root: ["W", 110, 92] }, props: ["dipbars"] },
    lunge: { a: S({ th2: 0, sh2: 0 }), b: { t: 180, th: 82, sh: 0, th2: -28, sh2: -82, ua: 0, fa: 0, root: ["F", 135, 152] }, tool: "hand" },
    walk: { a: S({ th: 18, sh: 0, th2: -18, sh2: -10 }), b: S({ th: -18, sh: -10, th2: 18, sh2: 0 }), tool: "hand" },
    calf: { a: S({ ua: 10, fa: 10 }), b: S({ ua: 10, fa: 10, root: ["F", 110, 140] }), props: ["step"] },
    jump: { a: S({ th: 30, sh: -25, ua: 20, fa: 20 }), b: S({ root: ["F", 110, 138], ua: 165, fa: 170 }) },
    wallsit: { a: { t: 180, th: 90, sh: 0, ua: 0, fa: 90, root: ["F", 128, 152] }, b: { t: 180, th: 88, sh: 2, ua: 0, fa: 90, root: ["F", 128, 152] }, props: ["wall"] },
    legext: { a: { t: 175, th: 90, sh: 0, ua: 12, fa: 12, root: ["H", 95, 112] }, b: { t: 175, th: 90, sh: 88, ua: 12, fa: 12, root: ["H", 95, 112] }, props: ["seat"] },
    legcurl: { a: { t: -90, th: 90, sh: 90, ua: 30, fa: 30, hd: -100, root: ["H", 100, 104] }, b: { t: -90, th: 90, sh: 175, ua: 30, fa: 30, hd: -100, root: ["H", 100, 104] }, props: ["bench"] },
    nordic: { a: { t: 180, th: 0, sh: -90, ua: 20, fa: 120, root: ["K", 115, 146] }, b: { t: 112, th: -68, sh: -90, ua: 70, fa: 70, root: ["K", 115, 146] } },
    legpress: { a: { t: -128, th: 152, sh: 92, ua: 10, fa: 40, root: ["H", 70, 118] }, b: { t: -128, th: 118, sh: 118, ua: 10, fa: 40, root: ["H", 70, 118] }, props: ["sled"] },
    hipthrust: { a: { t: -127, th: 128, sh: 0, ua: -60, fa: 30, root: ["S", 62, 108] }, b: { t: -92, th: 96, sh: -4, ua: -60, fa: 30, root: ["S", 62, 108] }, tool: "hip", props: ["benchend"] },
    bridge: { a: { t: -100, th: 120, sh: 10, ua: 20, fa: 0, root: ["S", 60, 146] }, b: { t: -72, th: 100, sh: -8, ua: 20, fa: 0, root: ["S", 60, 146] } },
    glutekick: { a: S({ t: 165, ua: 70, fa: 90 }), b: S({ t: 165, th2: -55, sh2: -60, ua: 70, fa: 90 }), cable: [40, 140] },
    crunch: { a: { t: -90, th: 140, sh: 20, ua: -150, fa: -40, root: ["H", 112, 146] }, b: { t: -125, th: 140, sh: 20, ua: -185, fa: -75, root: ["H", 112, 146] }, props: ["mat"] },
    legraise: { a: { t: -90, th: 92, sh: 92, ua: 0, fa: 90, root: ["H", 110, 146] }, b: { t: -90, th: 178, sh: 178, ua: 0, fa: 90, root: ["H", 110, 146] }, props: ["mat"] },
    hangleg: { a: { t: 180, th: 4, sh: 4, ua: 180, fa: 180, root: ["W", 110, -18] }, b: { t: 180, th: 92, sh: 92, ua: 180, fa: 180, root: ["W", 110, -18] }, props: ["bar"], air: true },
    backext: { a: { t: 25, th: 125, sh: 125, ua: 15, fa: 15, hd: 40, root: ["H", 100, 92] }, b: { t: -60, th: 125, sh: 125, ua: -20, fa: -20, hd: -75, root: ["H", 100, 92] }, props: ["hyper"] },
  };

  /* Vues de face : élévations latérales, écartés, haussements d'épaules, abduction */
  const FRONT = {
    lateral: { a: { arm: 10, fore: 0, leg: 4, lift: 0 }, b: { arm: 86, fore: 0, leg: 4, lift: 0 } },
    fly: { a: { arm: 95, fore: 0, leg: 4, lift: 0 }, b: { arm: 18, fore: -30, leg: 4, lift: 0 } },
    shrug: { a: { arm: 6, fore: 0, leg: 4, lift: 0 }, b: { arm: 6, fore: 0, leg: 4, lift: -8 } },
    abduct: { a: { arm: 12, fore: 0, leg: 3, lift: 0 }, b: { arm: 12, fore: 0, leg: 26, lift: 0 } },
  };

  /* ---------- Quel mouvement pour quel exercice ---------- */
  const RULES = [
    [/chaise$/i, "wallsit"], [/tibial/i, "calf"], [/mollets/i, "calf"],
    [/squat avant|gobelet|sumo haltère|pistol/i, "squatfront"], [/squat sauté|corde à sauter|assault|corde ondulatoire|burpee/i, "jump"],
    [/hack|pendulum|squat|sissy/i, "squat"], [/presse à cuisses/i, "legpress"],
    [/fente latérale|abduction|adduction|copenhague|marche latérale/i, "abduct"],
    [/fente|step-up|bulgare/i, "lunge"], [/farmer|sled/i, "walk"],
    [/swing|kettlebell snatch/i, "swing"], [/thruster|wall ball|épaulé-jeté|push press|turkish/i, "thruster"],
    [/good morning/i, "goodmorning"], [/roumain|jambes tendues|une jambe$/i, "hinge"],
    [/soulevé|rack pull|épaulé|arraché/i, "deadlift"],
    [/hip thrust|frog|reverse hyper/i, "hipthrust"], [/pont fessier/i, "bridge"], [/kickback poulie/i, "glutekick"],
    [/leg extension/i, "legext"], [/leg curl|glute ham/i, "legcurl"], [/nordic/i, "nordic"],
    [/suspension|tractions/i, "pullup"], [/tirage vertical/i, "pulldown"], [/tirage bras tendus|pull-over poulie/i, "straightarm"],
    [/rameur/i, "rower"], [/tirage horizontal|rowing machine/i, "seatedrow"], [/rowing|seal row/i, "row"],
    [/face pull|rotation externe/i, "facepull"], [/shrug|tirage menton/i, "shrug"],
    [/oiseau|reverse pec|élévations latérales|y-raise/i, "lateral"], [/élévations frontales/i, "frontraise"],
    [/écarté|pec deck|svend/i, "fly"], [/pull-over/i, "pullover"],
    [/développé militaire|haltères assis|arnold|machine épaules|pompes piquées|en équilibre/i, "press"],
    [/landmine|convergente|pallof|bûcheron/i, "pushfront"],
    [/développé|jm press/i, "bench"], [/mountain/i, "climber"], [/pompe/i, "pushup"], [/dips/i, "dips"],
    [/barre au front/i, "skull"], [/nuque/i, "overheadext"], [/kickback/i, "kickback"], [/extension triceps|extension unilat/i, "pushdown"],
    [/curl/i, "curl"], [/pince|suspension/i, "curl"],
    [/relevé de jambes suspendu|chaise romaine/i, "hangleg"], [/relevé de jambes|dragon|hollow|dead bug/i, "legraise"],
    [/crunch|russian/i, "crunch"], [/gainage|roue|bird dog|superman/i, "plank"], [/extension lombaire/i, "backext"],
  ];
  const BY_MUSCLE = { Pecs: "bench", Dos: "row", "Trapèzes": "shrug", Lombaires: "backext", "Épaules": "press", Biceps: "curl", Triceps: "pushdown",
    "Avant-bras": "curl", Abdos: "crunch", Quadriceps: "squat", Ischios: "hinge", Fessiers: "hipthrust", Adducteurs: "abduct", Mollets: "calf", "Corps entier": "thruster" };
  function moveOf(e) {
    const n = String(e.name || "");
    for (const [re, m] of RULES) if (re.test(n)) return m;
    return BY_MUSCLE[e.muscle] || "squat";
  }

  /* ---------- Dessin ---------- */
  const SPL = 'calcMode="spline" keyTimes="0;0.5;1" keySplines=".45 0 .55 1;.45 0 .55 1" dur="2.6s" repeatCount="indefinite"';
  const anim = (attr, a, b) => (a === b ? "" : `<animate attributeName="${attr}" values="${a};${b};${a}" ${SPL}/>`);
  const at = (q) => `translate(${f(q[0])} ${f(q[1])})`;
  const move = (a, b) => (a === b ? "" : `<animateTransform attributeName="transform" type="translate" values="${a};${b};${a}" ${SPL}/>`);
  const tp = (q) => `${f(q[0])} ${f(q[1])}`;

  function toolShape(kind, equip) {
    const e = String(equip || "");
    if (kind === "kb" || /kettlebell/i.test(e)) return '<g class="eq"><circle cx="0" cy="9" r="7.5"/><path d="M-4 3 Q0 -3 4 3" fill="none" class="eq-l"/></g>';
    if (/haltère/i.test(e)) return '<g class="eq"><rect x="-8" y="-3" width="16" height="6" rx="2"/><rect x="-10" y="-5.5" width="4" height="11" rx="1.5"/><rect x="6" y="-5.5" width="4" height="11" rx="1.5"/></g>';
    if (/barre|smith|trap bar|lest|disque/i.test(e)) return '<g class="eq"><circle r="12" class="eq-plate"/><circle r="3"/></g>';
    if (/poulie|élastique/i.test(e)) return '<g class="eq"><rect x="-6" y="-2.5" width="12" height="5" rx="2"/></g>';
    if (/médecine/i.test(e)) return '<g class="eq"><circle r="8"/></g>';
    return "";
  }
  const PROPS = {
    bench: '<rect x="40" y="110" width="118" height="8" rx="3" class="pr"/><rect x="52" y="118" width="6" height="34" class="pr"/><rect x="140" y="118" width="6" height="34" class="pr"/>',
    benchend: '<rect x="14" y="110" width="52" height="8" rx="3" class="pr"/><rect x="24" y="118" width="6" height="34" class="pr"/>',
    seat: '<rect x="70" y="115" width="44" height="8" rx="3" class="pr"/><rect x="88" y="123" width="6" height="29" class="pr"/>',
    floorseat: '<rect x="50" y="142" width="110" height="5" rx="2" class="pr"/>',
    bar: '<line x1="70" y1="-18" x2="160" y2="-18" class="pr-l"/>',
    dipbars: '<line x1="80" y1="96" x2="150" y2="96" class="pr-l"/><line x1="140" y1="96" x2="140" y2="152" class="pr-l"/>',
    step: '<rect x="96" y="144" width="40" height="8" rx="2" class="pr"/>',
    wall: '<line x1="80" y1="40" x2="80" y2="152" class="pr-l"/>',
    mat: '<rect x="30" y="149" width="150" height="4" rx="2" class="pr"/>',
    sled: '<line x1="150" y1="60" x2="128" y2="110" class="pr-l"/><rect x="40" y="118" width="46" height="8" rx="3" class="pr"/>',
    hyper: '<rect x="96" y="96" width="14" height="10" rx="3" class="pr"/><line x1="103" y1="106" x2="103" y2="152" class="pr-l"/><line x1="150" y1="130" x2="175" y2="152" class="pr-l"/>',
  };

  function sideSVG(m, equip) {
    const A = joints(m.a), B = joints(m.b);
    const legBack = (J) => P(J.F2, J.K2, J.H), body = (J) => P(J.F, J.K, J.H, J.S), arm = (J) => P(J.S, J.E, J.W);
    const toolAt = m.tool === "back" ? "W" : m.tool === "hip" ? "H" : "W";
    const shape = !m.tool ? "" : m.tool === "kb" ? toolShape("kb", "") : toolShape("", equip);
    const cable = m.cable && /poulie|élastique|machine/i.test(equip || "") ? m.cable : null;
    return `${m.air ? "" : '<line x1="8" y1="152" x2="212" y2="152" class="gr"/>'}${(m.props || []).map((p) => PROPS[p] || "").join("")}
      ${cable ? `<circle cx="${cable[0]}" cy="${cable[1]}" r="4" class="pr"/><line x1="${cable[0]}" y1="${cable[1]}" x2="${f(A.W[0])}" y2="${f(A.W[1])}" class="cb">${anim("x2", f(A.W[0]), f(B.W[0]))}${anim("y2", f(A.W[1]), f(B.W[1]))}</line>` : ""}
      <path class="lb" d="${legBack(A)}">${anim("d", legBack(A), legBack(B))}</path>
      <path class="lm" d="${body(A)}">${anim("d", body(A), body(B))}</path>
      <circle class="hd" r="8.5" cx="${f(A.Hd[0])}" cy="${f(A.Hd[1])}">${anim("cx", f(A.Hd[0]), f(B.Hd[0]))}${anim("cy", f(A.Hd[1]), f(B.Hd[1]))}</circle>
      <path class="lm" d="${arm(A)}">${anim("d", arm(A), arm(B))}</path>
      ${shape ? `<g transform="${at(A[toolAt])}">${move(tp(A[toolAt]), tp(B[toolAt]))}${shape}</g>` : ""}`;
  }

  function frontSVG(m, equip) {
    const pose = (o) => {
      const cx = 110, sy = 58 + o.lift, hipY = 104;
      const Ls = [cx - 15, sy], Rs = [cx + 15, sy];
      const le = add(Ls, -o.arm, 26), re = add(Rs, o.arm, 26);
      const lh = add(le, -(o.arm + o.fore), 24), rh = add(re, o.arm + o.fore, 24);
      const lk = add([cx - 8, hipY], -o.leg, 26), rk = add([cx + 8, hipY], o.leg, 26);
      const lf = add(lk, -o.leg, 22), rf = add(rk, o.leg, 22);
      return { Ls, Rs, le, re, lh, rh, lk, rk, lf, rf, head: [cx, sy - 20], hipY, cx };
    };
    const A = pose(m.a), B = pose(m.b);
    const arms = (q) => P(q.lh, q.le, q.Ls, q.Rs, q.re, q.rh);
    const legs = (q) => P(q.lf, q.lk, [q.cx - 8, q.hipY], [q.cx + 8, q.hipY], q.rk, q.rf);
    const torso = (q) => P([q.cx, q.Ls[1]], [q.cx, q.hipY]);
    const shape = toolShape("", equip);
    const tool = (side) => shape ? `<g transform="${at(A[side])}">${move(tp(A[side]), tp(B[side]))}${shape}</g>` : "";
    return `<line x1="8" y1="152" x2="212" y2="152" class="gr"/>
      <path class="lm" d="${legs(A)}">${anim("d", legs(A), legs(B))}</path>
      <path class="lm torso" d="${torso(A)}">${anim("d", torso(A), torso(B))}</path>
      <circle class="hd" r="9" cx="${f(A.head[0])}" cy="${f(A.head[1])}">${anim("cy", f(A.head[1]), f(B.head[1]))}</circle>
      <path class="lm" d="${arms(A)}">${anim("d", arms(A), arms(B))}</path>${tool("lh")}${tool("rh")}`;
  }

  function moveSVG(e, still) {
    const k = moveOf(e);
    let inner = FRONT[k] ? frontSVG(FRONT[k], e.equip) : sideSVG(M[k], e.equip);
    // Vignette fixe (liste) : pas d'animation, pour rester léger
    if (still) inner = inner.replace(/<animate(Transform)?\b[^>]*\/>/g, "");
    return `<svg class="ex-move" viewBox="0 -32 220 194" role="img" aria-label="Animation du mouvement : ${String(e.name).replace(/"/g, "")}">${inner}</svg>`;
  }

  /* ---------- Carte des muscles (planche anatomique simplifiée, face et dos) ----------
     Chaque muscle est dessiné pour le côté gauche puis reflété ; les muscles centraux sont dessinés en entier. */
  const SIDE = {
    // Vue de face
    trapF: "M44 25 Q39 30 31 33 L43 33 Z",
    delt: "M31 33 Q22 34 20 47 Q24 47 29 45 Q34 39 33 34 Z",
    pec: "M49.5 35 L49.5 55 Q42 59 35 55 Q30 48 33 39 Q40 34 49.5 35 Z",
    serratus: "M34 57 Q35 62 37 66 L41 62 Q38 60 35 56 Z",
    bicep: "M20.5 49 Q18.5 59 20.5 71 Q24.5 72.5 26.5 66 Q28.5 56 27.5 47.5 Q24 48 20.5 49 Z",
    forearm: "M20.5 74 Q16.5 87 17.5 101 Q21.5 102.5 23.5 99 Q27 87 27 74.5 Q24 73 20.5 74 Z",
    oblique: "M35.5 58 Q37 76 39 95 L43.5 98 L43.5 61 Q40 63 37.5 65 Z",
    quad: "M37.5 106 Q32.5 126 35.5 149 Q40.5 152.5 44 149 Q47 129 46.5 108 Q42 105 37.5 106 Z",
    vmo: "M44 136 Q47 141 45 149 Q43 151 41.5 148 Q43 142 44 136 Z",
    add: "M46.5 108 Q48.5 122 46.5 136 Q49.5 132 49.5 118 L49.5 106 Z",
    tib: "M37.5 157 Q35 172 37.5 189 L40.5 189 Q41.5 172 41 157 Z",
    calfF: "M41.5 158 Q45 168 43.5 184 L41.5 186 Q42.5 172 41.5 158 Z",
    // Vue de dos
    rdelt: "M31 33 Q22 34 20 47 Q24 47 29 45 Q34 39 33 34 Z",
    infra: "M34 38 Q38 44 44 46 Q42 39 36 36 Z",
    lat: "M35 44 Q30 58 37 80 L49.5 89 L49.5 64 Q41 52 35 44 Z",
    tri: "M20.5 49 Q18.5 59 20.5 71 Q24.5 72.5 26.5 66 Q28.5 56 27.5 47.5 Q24 48 20.5 49 Z",
    forearmB: "M20.5 74 Q16.5 87 17.5 101 Q21.5 102.5 23.5 99 Q27 87 27 74.5 Q24 73 20.5 74 Z",
    glute: "M36 100 Q33 112 37.5 121 Q44 125 49.5 119 L49.5 100 Q43 97 36 100 Z",
    ham: "M37.5 124 Q34 139 37 153 Q41.5 155.5 44.5 151.5 Q48 137 48 124 Q43 121 37.5 124 Z",
    addB: "M48 124 Q49.5 132 48.5 140 Q50 136 49.5 124 Z",
    calf: "M37 158 Q32.5 168 36.5 181 Q40.5 183.5 43.5 178 Q46 167 43.5 158 Q40 156 37 158 Z",
  };
  const CENTER = {
    abs: "M44.5 59 H49 V68 H44.5 Z M51 59 H55.5 V68 H51 Z M44.5 70 H49 V79 H44.5 Z M51 70 H55.5 V79 H51 Z M44.5 81 H49 V90 H44.5 Z M51 81 H55.5 V90 H51 Z M45 92 H55 L52.5 104 H47.5 Z",
    trapB: "M50 23 L37 31.5 Q42 37 45 46 L50 63 L55 46 Q58 37 63 31.5 Z",
    lower: "M44 82 L50 90 L56 82 L57 100 L43 100 Z",
  };
  const PARTS = {
    front: { "Pecs": ["pec"], "Épaules": ["delt"], "Biceps": ["bicep"], "Avant-bras": ["forearm"], "Abdos": ["abs", "oblique", "serratus"],
      "Quadriceps": ["quad", "vmo"], "Adducteurs": ["add"], "Mollets": ["tib", "calfF"], "Trapèzes": ["trapF"] },
    back: { "Trapèzes": ["trapB"], "Épaules": ["rdelt", "infra"], "Dos": ["lat", "infra"], "Triceps": ["tri"], "Avant-bras": ["forearmB"], "Lombaires": ["lower"],
      "Fessiers": ["glute"], "Ischios": ["ham"], "Mollets": ["calf"], "Adducteurs": ["addB"] },
  };
  PARTS.front["Corps entier"] = ["pec", "delt", "abs", "oblique", "quad", "vmo", "bicep"];
  PARTS.back["Corps entier"] = ["trapB", "rdelt", "lat", "lower", "glute", "ham", "calf", "tri"];
  const VIEW_PARTS = {
    front: ["trapF", "delt", "pec", "serratus", "bicep", "forearm", "oblique", "abs", "quad", "vmo", "add", "tib", "calfF"],
    back: ["trapB", "rdelt", "infra", "lat", "tri", "forearmB", "lower", "glute", "ham", "addB", "calf"],
  };
  function shape(id, cls) {
    if (CENTER[id]) return `<path d="${CENTER[id]}" class="${cls}"/>`;
    return `<path d="${SIDE[id]}" class="${cls}"/><path d="${SIDE[id]}" class="${cls}" transform="translate(100 0) scale(-1 1)"/>`;
  }
  // Contour du corps (sous les muscles) : tête, cou, tronc, membres, mains, pieds
  const OUTLINE = '<g class="sil">' +
    '<ellipse cx="50" cy="13" rx="8.5" ry="10.5"/><path d="M45 21 H55 L56 28 H44 Z"/>' +
    '<path d="M31 32 Q50 24 69 32 L72 46 Q68 62 64 78 L64 102 Q50 108 36 102 L36 78 Q32 62 28 46 Z"/>' +
    '<path d="M36 100 Q50 110 64 100 L64 112 Q52 116 50 110 Q48 116 36 112 Z"/>' +
    '<path d="M22 46 Q15 74 16 104 L24 104 Q29 76 30 48 Z M78 46 Q85 74 84 104 L76 104 Q71 76 70 48 Z"/>' +
    '<ellipse cx="19.5" cy="109" rx="4.5" ry="6"/><ellipse cx="80.5" cy="109" rx="4.5" ry="6"/>' +
    '<path d="M36 104 Q31 130 35 152 Q34 172 37 192 L44 192 Q46 172 45 154 Q49 130 50 112 Q51 130 55 154 Q54 172 56 192 L63 192 Q66 172 65 152 Q69 130 64 104 Z"/>' +
    '<ellipse cx="40" cy="196" rx="6" ry="3.5"/><ellipse cx="60" cy="196" rx="6" ry="3.5"/></g>';
  function figure(view, x, label, main, sec) {
    const on = new Set((PARTS[view][main] || [])), half = new Set();
    sec.forEach((m) => (PARTS[view][m] || []).forEach((id) => { if (!on.has(id)) half.add(id); }));
    const muscles = VIEW_PARTS[view].map((id) => shape(id, on.has(id) ? "m1" : half.has(id) ? "m2" : "m0")).join("");
    return `<g transform="translate(${x} 4)">${OUTLINE}${muscles}<text x="50" y="212" class="mlabel">${label}</text></g>`;
  }
  function musclesSVG(e) {
    const sec = String(e.sec || "").split(/,\s*/).filter(Boolean);
    return `<svg class="ex-map" viewBox="0 0 220 222" role="img" aria-label="Muscles travaillés : ${e.muscle}${sec.length ? ", " + sec.join(", ") : ""}">` +
      figure("front", 6, "Face", e.muscle, sec) + figure("back", 114, "Dos", e.muscle, sec) + "</svg>";
  }

  window.TempoIllus = { move: moveSVG, muscles: musclesSVG, moveOf, _M: M, _F: FRONT, _joints: joints };
})();
