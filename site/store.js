/* Stockage de Tempo.
   Sans compte (mode essai) : les carnets sont gardés le temps de la visite seulement (sessionStorage), puis effacés
   à la fermeture du site. Une autre personne qui utilise le même appareil ne voit donc rien.
   Avec un compte (Firebase) : chaque carnet est enregistré en ligne et retrouvé sur tous vos appareils, en direct.
   Une copie reste sur l'appareil pour fonctionner hors connexion ; elle est effacée à la déconnexion. */
(function () {
  "use strict";
  const SYNCED = ["tempo-course-v1", "tempo-day-v1", "tempo-steps-v1", "tempo-profile-v1", "carnet-fonte-v1", "carnet-fonte-draft", "tempo-plan-v1", "tempo-multi-v1", "tempo-food-v1"];
  const DIRTY = "tempo-dirty", ACCOUNT = "tempo-account";
  const SDK = "https://www.gstatic.com/firebasejs/11.0.2/";
  const MAX_DOC = 900000;    // limite Firestore : 1 Mo par document (marge pour les champs)
  const CFG = window.TEMPO_FIREBASE || {};
  const configured = !!(CFG.apiKey && CFG.projectId && CFG.appId);

  // Carnets : durables avec un compte, temporaires sans compte. Le reste (préférences d'affichage) : durable.
  const DATA = new Set(SYNCED);
  const area = (k, guest) => { try { return DATA.has(k) && guest ? sessionStorage : localStorage; } catch (e) { return null; } };
  const rawGet = (s, k) => { try { return s ? JSON.parse(s.getItem(k)) : null; } catch (e) { return null; } };
  const rawSet = (s, k, v) => { try { if (s) v == null ? s.removeItem(k) : s.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const lsGet = (k) => rawGet(area(k, DATA.has(k) && !account), k);
  const lsSet = (k, v) => rawSet(area(k, DATA.has(k) && !account), k, v);
  const str = (v) => (v == null ? null : JSON.stringify(v));
  const err = (code) => Object.assign(new Error(code), { code });

  const mem = {}, watchers = {}, timers = {}, inflight = {}, statusFns = [];
  let dirty = lsGet(DIRTY) || {};               // clé -> date d'une modification pas encore envoyée
  let account = configured ? rawGet(localStorage, ACCOUNT) : null;   // { email } si connecté sur cet appareil

  /* Anciennes versions : sans compte, les carnets restaient sur l'appareil. On les passe en mode essai
     (visibles jusqu'à la fermeture du site, le temps de créer un compte pour les garder). */
  let migrated = false;
  if (!account) {
    SYNCED.forEach((k) => {
      const v = rawGet(localStorage, k);
      if (v == null) return;
      if (rawGet(sessionStorage, k) == null) rawSet(area(k, true), k, v);
      rawSet(localStorage, k, null); migrated = true;
    });
    if (migrated) { rawSet(localStorage, "tempo-dirty", null); rawSet(localStorage, "tempo-synced", null); rawSet(area("tempo-course-v1", true), "tempo-migrated", 1); }
  }
  const guestFlag = () => { try { return sessionStorage.getItem("tempo-migrated") === "1"; } catch (e) { return false; } };
  /* Passage du mode essai au compte : ce qui a été noté pendant la visite devient durable */
  function promote() {
    // Le compte peut déjà être déclaré par Firebase à ce stade : on lit les drapeaux directement
    const demo = sessFlag("tempo-demo"), demoProf = sessFlag("tempo-demo-prof");
    SYNCED.forEach((k) => {
      let v = rawGet(area(k, true), k);
      rawSet(area(k, true), k, null);
      if (v == null) return;
      if (demo) {   // l'exemple n'entre jamais dans un compte : on ne garde que ce que la personne a saisi
        if (k === "tempo-profile-v1" && demoProf) return;
        if (v && Array.isArray(v.sessions)) {
          v.sessions = v.sessions.filter((s) => !String(s.id).startsWith("demo-"));
          if (!v.sessions.length) return;
          if (v.settings) delete v.settings.demo;
          if (k === "carnet-fonte-v1") delete v.program;
          if (v.gear) v.gear = v.gear.filter((g) => !String(g.id).startsWith("demo-"));
        }
      }
      rawSet(localStorage, k, v);
    });
    ["tempo-migrated", "tempo-demo", "tempo-demo-prof"].forEach((f) => { try { sessionStorage.removeItem(f); } catch (e) {} });
    SYNCED.forEach((k) => { mem[k] = str(rawGet(localStorage, k)); });   // la suite (fusion avec le compte) part de ce qui a été gardé
  }
  const sessFlag = (f) => { try { return sessionStorage.getItem(f) === "1"; } catch (e) { return false; } };
  const isDemo = () => !account && sessFlag("tempo-demo");
  /* Exemple : carnets fictifs pour découvrir le site (mode essai seulement) */
  function loadDemo() {
    if (account) return Promise.resolve(false);
    const go = () => {
      const data = window.TempoDemo.build();
      const prof = get("tempo-profile-v1");
      Object.keys(data).forEach((k) => {
        if (k === "tempo-profile-v1") { if (prof && Object.keys(prof).length) return; try { sessionStorage.setItem("tempo-demo-prof", "1"); } catch (e) {} }
        set(k, data[k]); fire(k);
      });
      try { sessionStorage.setItem("tempo-demo", "1"); } catch (e) {}
      return true;
    };
    if (window.TempoDemo) return Promise.resolve(go());
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = "demo.js"; s.onload = () => res(go()); s.onerror = rej; document.head.appendChild(s); });
  }
  function clearDemo() {
    if (account) return;
    SYNCED.forEach((k) => { rawSet(area(k, true), k, null); mem[k] = null; });
    ["tempo-demo", "tempo-demo-prof", "tempo-migrated"].forEach((f) => { try { sessionStorage.removeItem(f); } catch (e) {} });
    SYNCED.forEach(fire);
  }
  /* Déconnexion : rien ne reste sur l'appareil */
  function wipe() {
    SYNCED.forEach((k) => { rawSet(localStorage, k, null); rawSet(area(k, true), k, null); mem[k] = null; });
    SYNCED.forEach(fire);
  }
  let uid = null, unsub = null, merging = null;
  let status = account ? "saving" : "anon";
  const setStatus = (s) => { status = s; statusFns.forEach((f) => { try { f(s, account); } catch (e) {} }); };
  const saveDirty = () => lsSet(DIRTY, dirty);
  const settle = () => { if (account && !Object.keys(dirty).length) setStatus("ok"); };

  /* ---------- Lecture / écriture locales ---------- */
  function get(k) {
    if (!(k in mem)) mem[k] = str(lsGet(k));
    return mem[k] == null ? null : JSON.parse(mem[k]);
  }
  function fire(k) { const v = get(k); (watchers[k] || []).forEach((f) => { try { f(v); } catch (e) { console.error(e); } }); }
  function apply(k, s) {
    if (mem[k] === s) return;
    mem[k] = s;
    try { lsSet(k, s == null ? null : JSON.parse(s)); } catch (e) {}
    fire(k);
  }
  function set(k, v) {
    const s = str(v);
    if (mem[k] === s) return;
    mem[k] = s;
    lsSet(k, v);
    if (SYNCED.includes(k) && account) { dirty[k] = Date.now(); saveDirty(); push(k); }
  }
  function watch(k, fn) { (watchers[k] = watchers[k] || []).push(fn); }

  /* ---------- Firebase (chargé seulement si configuré) ---------- */
  let fbPromise = null;
  function firebase() {
    if (!configured) return Promise.reject(err("not_configured"));
    if (!fbPromise) {
      fbPromise = Promise.all([import(SDK + "firebase-app.js"), import(SDK + "firebase-auth.js"), import(SDK + "firebase-firestore.js")])
        .then(([appM, A, F]) => {
          const app = appM.initializeApp(CFG);
          const auth = A.getAuth(app);
          auth.languageCode = "fr";
          return { auth, db: F.getFirestore(app), A, F };
        })
        .catch((e) => { fbPromise = null; throw err(navigator.onLine === false ? "offline" : "unavailable"); });
    }
    return fbPromise;
  }
  const kvCol = (fb) => fb.F.collection(fb.db, "users", uid, "kv");
  const kvDoc = (fb, k) => fb.F.doc(fb.db, "users", uid, "kv", k);
  const AUTH_ERR = {
    "auth/email-already-in-use": "email_taken", "auth/invalid-email": "bad_email", "auth/missing-email": "bad_email",
    "auth/weak-password": "weak_password", "auth/missing-password": "bad_credentials",
    "auth/invalid-credential": "bad_credentials", "auth/wrong-password": "bad_credentials", "auth/user-not-found": "bad_credentials",
    "auth/invalid-login-credentials": "bad_credentials", "auth/too-many-requests": "too_many", "auth/network-request-failed": "offline",
    "auth/operation-not-allowed": "not_configured", "auth/configuration-not-found": "not_configured", "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "not_configured",
    "auth/unauthorized-domain": "unauthorized_domain", "auth/requires-recent-login": "bad_credentials",
    "auth/popup-closed-by-user": "cancelled", "auth/cancelled-popup-request": "cancelled", "auth/user-cancelled": "cancelled",
    "auth/popup-blocked": "popup_blocked", "auth/account-exists-with-different-credential": "email_taken",
  };
  const mapErr = (e) => err(AUTH_ERR[e && e.code] || (e && e.code && !String(e.code).includes("/") ? e.code : "unknown"));

  /* ---------- Carnets découpés par mois ----------
     Les carnets de course et de musculation ne sont pas envoyés d'un bloc : un petit document pour les réglages
     (programme, matériel, mesures…) et un document par mois de séances. Avantages :
       - aucune limite de taille en pratique (Firestore : 1 Mo par document, un mois de séances pèse quelques Ko) ;
       - deux appareils qui modifient des séances différentes en même temps ne s'écrasent plus : on fusionne séance par séance. */
  const SPLIT = { "tempo-course-v1": "sessions", "carnet-fonte-v1": "sessions", "tempo-multi-v1": "sessions", "tempo-food-v1": "sessions" };
  const SEP = "--m--", SYNCD = "tempo-synced";
  let synced = lsGet(SYNCD) || {};      // document -> { h: empreinte, ids: séances } tel que vu en ligne la dernière fois
  const saveSynced = () => lsSet(SYNCD, synced);
  let remote = {}, haveRemote = false;   // dernier état connu en ligne : document -> texte
  const hash = (t) => { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
  const monthOf = (x) => (/^\d{4}-\d{2}/.test(String((x && x.date) || "")) ? String(x.date).slice(0, 7) : "sans-date");
  const chunkId = (k, m) => k + SEP + m;
  const chunksOf = (k, docs) => Object.keys(docs).filter((id) => id.startsWith(k + SEP));
  const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const listStr = (list) => JSON.stringify(list.slice().sort((a, b) => (String(a.id) < String(b.id) ? -1 : 1)));
  const idsOf = (t) => { try { return JSON.parse(t).map((x) => String(x.id)); } catch (e) { return []; } };
  const mark = (id, t) => { if (t == null) delete synced[id]; else synced[id] = { h: hash(t), ids: SPLIT_DOC(id) ? idsOf(t) : [] }; };
  const SPLIT_DOC = (id) => id.includes(SEP);
  function splitValue(k, v) {
    const f = SPLIT[k], meta = Object.assign({}, v), chunks = {};
    delete meta[f];
    ((v && v[f]) || []).forEach((x) => { const m = monthOf(x); (chunks[m] = chunks[m] || []).push(x); });
    Object.keys(chunks).forEach((m) => (chunks[m] = listStr(chunks[m])));
    return { meta: JSON.stringify(meta), chunks };
  }
  function assemble(k, docs) {
    const f = SPLIT[k], ids = chunksOf(k, docs);
    if (docs[k] == null && !ids.length) return null;
    let meta = {};
    try { meta = docs[k] != null ? JSON.parse(docs[k]) : {}; } catch (e) {}
    const out = Object.assign({}, meta);
    // Ancien format (tout dans un seul document) tant qu'aucun mois n'a encore été écrit
    out[f] = ids.length ? [].concat(...ids.map((id) => { try { return JSON.parse(docs[id]); } catch (e) { return []; } })).sort(byDateDesc) : (meta[f] || []);
    return out;
  }
  const isLegacy = (k, docs) => { if (docs[k] == null || chunksOf(k, docs).length) return false; try { return Array.isArray(JSON.parse(docs[k])[SPLIT[k]]); } catch (e) { return false; } };

  /* ---------- Envoi ---------- */
  function push(k, delay = 700) {
    if (!account || !uid) return;
    clearTimeout(timers[k]);
    timers[k] = setTimeout(async () => {
      if (inflight[k]) { push(k, 400); return; }
      if (SPLIT[k] && !haveRemote) { push(k, 600); return; }   // on attend de connaître l'état en ligne pour fusionner
      const stamp = dirty[k];
      inflight[k] = true;
      setStatus(navigator.onLine === false ? "offline" : "saving");
      try {
        const fb = await firebase();
        if (SPLIT[k]) await pushSplit(fb, k);
        else {
          const t = mem[k] !== undefined ? mem[k] : str(lsGet(k));
          if (t != null && t.length > MAX_DOC) throw err("too_large");
          if (t == null) await fb.F.deleteDoc(kvDoc(fb, k));
          else await fb.F.setDoc(kvDoc(fb, k), { v: t, at: Date.now() });
        }
        if (dirty[k] === stamp) { delete dirty[k]; saveDirty(); }
        settle();
      } catch (e) {
        if (e.code === "too_large") { setStatus("err"); notify("Un mois de séances est trop volumineux pour être enregistré en ligne."); }
        else setStatus(e.code === "permission-denied" ? "err" : "offline");
      } finally { inflight[k] = false; }
    }, delay);
  }

  async function pushSplit(fb, k) {
    const f = SPLIT[k], v = get(k), at = Date.now();
    const { meta, chunks } = v == null ? { meta: null, chunks: {} } : splitValue(k, v);
    const months = new Set(Object.keys(chunks));
    chunksOf(k, remote).forEach((id) => months.add(id.slice((k + SEP).length)));
    Object.keys(synced).filter((id) => id.startsWith(k + SEP)).forEach((id) => months.add(id.slice((k + SEP).length)));
    // Documents à envoyer : ceux qui diffèrent de la dernière version connue en ligne
    const todo = Array.from(months).filter((m) => chunks[m] !== remote[chunkId(k, m)]);
    const metaTodo = meta !== remote[k];
    if (!todo.length && !metaTodo) return;
    let result;
    // Transaction : on relit la version en ligne de chaque mois juste avant d'écrire,
    // pour fusionner avec ce qu'un autre appareil aurait envoyé entre-temps
    await fb.F.runTransaction(fb.db, async (tx) => {
      const fresh = {}, writes = [];
      for (const m of todo) { const id = chunkId(k, m), d = await tx.get(kvDoc(fb, id)); fresh[id] = d.exists() ? (d.data() || {}).v : undefined; }
      let sessions = null;
      for (const m of todo) {
        const id = chunkId(k, m), loc = chunks[m], rem = fresh[id], base = synced[id];
        let out = loc;
        if (rem != null && rem !== loc && (!base || base.h !== hash(rem))) {
          const baseIds = new Set(base ? base.ids : []), remList = JSON.parse(rem), locList = loc ? JSON.parse(loc) : [];
          const locIds = new Set(locList.map((x) => String(x.id))), remIds = new Set(remList.map((x) => String(x.id)));
          const map = new Map();
          remList.forEach((x) => { if (!(baseIds.has(String(x.id)) && !locIds.has(String(x.id)))) map.set(String(x.id), x); });   // supprimée ici : on la retire
          locList.forEach((x) => { if (!(baseIds.has(String(x.id)) && !remIds.has(String(x.id)))) map.set(String(x.id), x); });   // supprimée ailleurs : on la retire
          out = map.size ? listStr(Array.from(map.values())) : undefined;
          if (out !== loc) {
            sessions = sessions || ((v && v[f]) || []).slice();
            sessions = sessions.filter((x) => monthOf(x) !== m).concat(out ? JSON.parse(out) : []);
          }
        }
        if (out === rem) { writes.push([id, rem, false]); continue; }
        if (out && out.length > MAX_DOC) throw err("too_large");
        writes.push([id, out == null ? null : out, true]);
      }
      if (metaTodo) writes.push([k, meta, true]);
      writes.forEach(([id, t, w]) => { if (w) (t == null ? tx.delete(kvDoc(fb, id)) : tx.set(kvDoc(fb, id), { v: t, at })); });
      result = { writes, sessions };
    });
    result.writes.forEach(([id, t]) => { if (t == null) delete remote[id]; else remote[id] = t; mark(id, t); });
    saveSynced();
    if (result.sessions) {
      const nv = Object.assign({}, v || {}); nv[f] = result.sessions.sort(byDateDesc);
      apply(k, str(nv));
    }
  }
  // Rattrapage des envois en attente (réseau revenu, page rouverte)
  const flush = () => Object.keys(dirty).forEach((k) => push(k, 50));

  /* ---------- Réception en direct ---------- */
  let firstSnap = true;
  function readDocs(snap) {
    const docs = {};
    snap.docs.forEach((d) => { const b = d.data() || {}; if (typeof b.v === "string") docs[d.id] = b.v; });
    return docs;
  }
  function adoptRemote(k, docs) {   // l'état en ligne devient la référence commune pour ce carnet
    [k].concat(chunksOf(k, docs)).forEach((id) => mark(id, docs[id]));
    Object.keys(synced).filter((id) => id.startsWith(k + SEP) && docs[id] == null).forEach((id) => delete synced[id]);
  }
  function onRemote(snap) {
    if (snap.metadata && snap.metadata.hasPendingWrites) return;
    const initial = firstSnap && !snap.metadata.fromCache;
    if (initial) firstSnap = false;
    const docs = readDocs(snap), before = haveRemote ? remote : null;
    remote = docs; haveRemote = true;
    SYNCED.forEach((k) => {
      if (dirty[k]) return;                          // modification locale en attente : l'envoi fusionnera
      if (SPLIT[k]) {
        const val = assemble(k, docs);
        if (val != null) {
          apply(k, str(val)); adoptRemote(k, docs);
          if (isLegacy(k, docs)) { dirty[k] = Date.now(); saveDirty(); push(k, 200); }   // conversion vers le découpage par mois
        } else if (initial && get(k) != null) { dirty[k] = Date.now(); saveDirty(); push(k, 50); }
        return;
      }
      if (k in docs) apply(k, docs[k]);
      // Supprimé depuis un autre appareil (ex. plan arrêté, séance en cours terminée)
      else if (before && k in before) apply(k, null);
      // Seulement à la première réponse : un carnet présent ici mais pas en ligne y est envoyé
      else if (initial && get(k) != null) { dirty[k] = Date.now(); saveDirty(); push(k, 50); }
    });
    saveSynced();
    flush();
    settle();
  }
  async function subscribe() {
    const fb = await firebase();
    if (unsub) unsub();
    firstSnap = true;
    unsub = fb.F.onSnapshot(kvCol(fb), { includeMetadataChanges: false }, onRemote, (e) => { setStatus(e && e.code === "permission-denied" ? "err" : "offline"); });
  }

  /* ---------- Fusion à la connexion : on garde ce qui était sur l'appareil ET dans le compte ---------- */
  const byId = (a, b, key = "id") => {
    const seen = new Map();
    (b || []).concat(a || []).forEach((x) => { if (x && x[key] != null && !seen.has(x[key])) seen.set(x[key], x); });
    return Array.from(seen.values());
  };
  function merge(k, local, rem) {
    if (local == null) return rem;
    if (rem == null) return local;
    if (k === "tempo-day-v1" || k === "tempo-steps-v1") return Object.assign({}, local, rem);
    if (SPLIT[k]) {
      const out = Object.assign({}, local, rem);
      out.sessions = byId(local.sessions, rem.sessions).sort(byDateDesc);
      if (local.gear || rem.gear) out.gear = byId(local.gear, rem.gear);
      if (local.body || rem.body) out.body = byId(local.body, rem.body, "date");
      return out;
    }
    return rem;   // profil, séance en cours : le compte l'emporte
  }
  async function mergeIn(fb) {
    const docs = readDocs(await fb.F.getDocs(kvCol(fb)));
    remote = docs; haveRemote = true; synced = {};
    SYNCED.forEach((k) => {
      const remVal = SPLIT[k] ? assemble(k, docs) : (k in docs ? JSON.parse(docs[k]) : null);
      if (SPLIT[k]) adoptRemote(k, docs);
      const t = str(merge(k, get(k), remVal));
      if (t !== str(remVal) || (SPLIT[k] && isLegacy(k, docs))) dirty[k] = Date.now();
      apply(k, t);
    });
    saveDirty(); saveSynced();
  }

  /* ---------- Session ---------- */
  // google : compte créé avec Google, sans mot de passe propre à Tempo
  const acct = (u) => { const ids = (u.providerData || []).map((p) => p.providerId); return { email: u.email, google: ids.includes("google.com") && !ids.includes("password") }; };
  let authReady = null;
  function watchAuth() {
    if (!configured) return;
    authReady = firebase().then((fb) => new Promise((resolve) => {
      fb.A.onAuthStateChanged(fb.auth, async (user) => {
        if (user) {
          uid = user.uid;
          account = acct(user); lsSet(ACCOUNT, account);
          if (merging) { try { await merging; } catch (e) {} }
          subscribe().catch(() => setStatus("offline"));
          flush(); settle();
          if (status === "anon") setStatus("saving");
        } else {
          uid = null; if (unsub) { unsub(); unsub = null; }
          remote = {}; haveRemote = false;
          if (account && !merging) {   // déconnecté depuis un autre appareil ou session expirée : on vide cet appareil
            account = null; lsSet(ACCOUNT, null); dirty = {}; saveDirty(); synced = {}; saveSynced(); wipe();
          }
          setStatus("anon");
        }
        resolve();
      });
    })).catch(() => { if (account) setStatus("offline"); });
  }

  async function begin(fn) {
    let release;
    merging = new Promise((r) => (release = r));
    try {
      const fb = await firebase();
      let cred;
      try { cred = await fn(fb); } catch (e) { throw mapErr(e); }
      uid = cred.user.uid;
      promote();
      account = acct(cred.user); lsSet(ACCOUNT, account);
      await mergeIn(fb);
      flush(); settle();
      return { email: cred.user.email };
    } finally { release(); merging = null; }
  }
  async function reauth(fb, password) {
    const u = fb.auth.currentUser;
    if (!u) throw err("not_signed_in");
    try {
      if (acct(u).google) await fb.A.reauthenticateWithPopup(u, new fb.A.GoogleAuthProvider());   // confirmation dans une fenêtre Google
      else await fb.A.reauthenticateWithCredential(u, fb.A.EmailAuthProvider.credential(u.email, String(password)));
    } catch (e) { throw mapErr(e); }
    return u;
  }
  const checkLen = (pw) => { if (String(pw).length < 8) throw err("weak_password"); };
  const normEmail = (e) => String(e || "").trim().toLowerCase();

  const accountApi = {
    configured,
    signup(email, password) { checkLen(password); return begin((fb) => fb.A.createUserWithEmailAndPassword(fb.auth, normEmail(email), String(password))); },
    login(email, password) { return begin((fb) => fb.A.signInWithEmailAndPassword(fb.auth, normEmail(email), String(password))); },
    google() { return begin((fb) => { const p = new fb.A.GoogleAuthProvider(); p.setCustomParameters && p.setCustomParameters({ prompt: "select_account" }); return fb.A.signInWithPopup(fb.auth, p); }); },
    async reset(email) {
      const fb = await firebase();
      try { await fb.A.sendPasswordResetEmail(fb.auth, normEmail(email)); } catch (e) { const m = mapErr(e); if (m.code !== "bad_credentials") throw m; }
    },
    async logout() {
      try { const fb = await firebase(); await fb.A.signOut(fb.auth); } catch (e) {}
      uid = null; if (unsub) { unsub(); unsub = null; }
      account = null; lsSet(ACCOUNT, null); dirty = {}; saveDirty(); synced = {}; saveSynced(); remote = {}; haveRemote = false;
      wipe();
      setStatus("anon");
    },
    async me() { if (authReady) await authReady; if (!account) throw err("not_signed_in"); return account; },
    async password(current, password) {
      checkLen(password);
      const fb = await firebase(), u = await reauth(fb, current);
      try { await fb.A.updatePassword(u, String(password)); } catch (e) { throw mapErr(e); }
      return { ok: true };
    },
    async remove(password) {
      const fb = await firebase(), u = await reauth(fb, password);
      if (unsub) { unsub(); unsub = null; }
      const snap = await fb.F.getDocs(kvCol(fb));
      await Promise.all(snap.docs.map((d) => fb.F.deleteDoc(d.ref)));
      try { await u.delete(); } catch (e) { throw mapErr(e); }
      uid = null; account = null; lsSet(ACCOUNT, null); dirty = {}; saveDirty(); synced = {}; saveSynced(); remote = {}; haveRemote = false; wipe(); setStatus("anon");
    },
    exportData() {
      const data = {};
      SYNCED.forEach((k) => { const v = get(k); if (v != null) data[k] = v; });
      return { app: "tempo", email: account && account.email, exported: new Date().toISOString(), data };
    },
    current: () => account,
    // Jeton d'identité Firebase (pour les services de Tempo qui demandent un compte, comme l'analyse photo)
    async token() { if (!account) return null; const fb = await firebase(); const u = fb.auth.currentUser; return u ? u.getIdToken() : null; },
    guest: () => !account,
  };

  function notify(msg) {
    let t = document.getElementById("tempo-toast");
    if (!t) { t = document.createElement("div"); t.id = "tempo-toast"; t.className = "tempo-toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 4500);
  }

  /* ---------- Profil (âge, poids, taille…) partagé par tous les outils ---------- */
  const PROFILE = "tempo-profile-v1";
  function profile() {
    const p = get(PROFILE) || {};
    const n = (k) => { const v = parseFloat(String(p[k] == null ? "" : p[k]).replace(",", ".")); return v > 0 ? v : null; };
    return { age: n("n-age"), cm: n("n-cm"), kg: n("n-kg"), sex: p["n-sex"] || null, act: n("n-act"), goal: p["n-goal"] || null,
      life: n("d-life"), hrRest: n("h-rest"), hrMax: n("h-max"), raw: p };
  }
  function setProfile(patch) {
    const p = Object.assign({}, get(PROFILE) || {}, patch);
    Object.keys(p).forEach((k) => { if (p[k] === "" || p[k] == null) delete p[k]; });
    const before = mem[PROFILE];
    set(PROFILE, p);
    if (mem[PROFILE] !== before) fire(PROFILE);   // les autres outils de la page s'adaptent tout de suite
  }

  window.TempoStore = {
    get, set, watch, account: accountApi, notify, profile, setProfile, loadDemo, clearDemo, isDemo: () => isDemo(),
    status: () => status,
    onStatus: (f) => { statusFns.push(f); f(status, account); },
  };

  /* ---------- Listes de choix : l'option choisie est expliquée juste en dessous ---------- */
  function describe(sel) {
    let p = sel._desc;
    if (!p) {
      p = document.createElement("p");
      p.className = "hint opt-desc";
      p.setAttribute("aria-live", "polite");
      sel.insertAdjacentElement("afterend", p);
      sel._desc = p;
      sel.addEventListener("change", () => describe(sel));
      sel.addEventListener("input", () => describe(sel));
    }
    const o = sel.options[sel.selectedIndex];
    const t = o && o.dataset.desc;
    p.textContent = t || "";
    p.hidden = !t;
  }
  const scanSelects = (root) => (root.querySelectorAll ? root.querySelectorAll("select[data-describe]") : []).forEach(describe);
  function initDescribe() {
    scanSelects(document);
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.matches && n.matches("select[data-describe]")) describe(n); scanSelects(n); } })))
      .observe(document.body, { childList: true, subtree: true });
    // Une valeur changée par le code (profil) met aussi l'explication à jour
    document.addEventListener("input", (e) => { if (e.target && e.target._desc) describe(e.target); }, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initDescribe); else initDescribe();
  TempoStore.describe = describe;

  /* ---------- Lien « Compte » dans l'en-tête ---------- */
  function headerLink() {
    if (!configured) return;
    const wrap = document.querySelector(".top .wrap");
    if (!wrap || wrap.querySelector(".acct")) return;
    const a = document.createElement("a");
    a.className = "acct"; a.href = "compte.html";
    if (location.pathname.endsWith("compte.html")) a.setAttribute("aria-current", "page");
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><span></span>';
    wrap.appendChild(a);
    const label = a.querySelector("span");
    TempoStore.onStatus((s) => {
      a.dataset.s = s;
      label.textContent = account ? "Mon compte" : "Se connecter";
      a.title = { anon: "Mode essai : rien n'est gardé après la visite", ok: "Enregistré dans votre compte", saving: "Enregistrement…", offline: "Hors connexion : sera envoyé au retour du réseau", err: "Erreur d'enregistrement" }[s] || "";
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", headerLink); else headerLink();

  /* ---------- Bandeau « mode essai » sur l'accueil et les pages qui enregistrent des séances ---------- */
  const GUEST_PAGES = /(^\/$|index\.html$|carnet\.html$|carnet-course\.html$|multisport\.html$|calories\.html$|plan-entrainement\.html$)/;
  const hasData = () => ["carnet-fonte-v1", "tempo-course-v1", "tempo-multi-v1"].some((k) => { const v = get(k); return v && v.sessions && v.sessions.length; });
  function guestBar() {
    if (!GUEST_PAGES.test(location.pathname)) return;
    const top = document.querySelector("header.top");
    if (!top) return;
    let bar = document.querySelector(".guest-bar"), wired = false;   // présent dans la page : pas de saut à l'affichage
    const draw = () => {
      document.documentElement.classList.toggle("guest", !account);
      if (account) return;
      if (!bar) {
        bar = document.createElement("aside");
        bar.className = "guest-bar"; bar.setAttribute("aria-label", "Mode essai");
        top.insertAdjacentElement("afterend", bar);
      }
      if (!wired) {
        wired = true;
        bar.addEventListener("click", async (e) => {
          const b = e.target.closest("button[data-g]"); if (!b) return;
          b.disabled = true;
          try { if (b.dataset.g === "demo") await loadDemo(); else clearDemo(); location.reload(); }
          catch (_) { b.disabled = false; notify("L'exemple n'a pas pu être chargé. Vérifiez votre connexion."); }
        });
      }
      const demo = isDemo();
      const txt = demo
        ? "<b>Exemple</b> : carnets fictifs, effacés quand vous fermez le site."
        : guestFlag()
          ? "<b>Mode essai</b> : vos anciennes séances seront effacées à la fermeture. Créez un compte pour les garder."
          : "<b>Mode essai</b> : rien n'est gardé quand vous fermez le site.";
      const extra = demo ? '<button type="button" class="btn ghost" data-g="clear">Effacer l\'exemple</button>'
        : !hasData() ? '<button type="button" class="btn ghost" data-g="demo">Voir un exemple</button>' : "";
      const html = '<div class="wrap"><p>' + txt + '</p><div class="gb-act">' + extra + '<a class="btn" href="compte.html">Créer un compte</a></div></div>';
      if (bar.innerHTML !== html) bar.innerHTML = html;
    };
    TempoStore.onStatus(draw);
    ["carnet-fonte-v1", "tempo-course-v1", "tempo-multi-v1"].forEach((k) => watch(k, draw));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", guestBar); else guestBar();

  /* ---------- Démarrage ---------- */
  if (configured && (account || location.pathname.endsWith("compte.html"))) watchAuth();
  else if (configured) {
    // Pas connecté sur cet appareil : on ne charge Firebase qu'à la demande (pages plus légères)
    ["signup", "login", "google"].forEach((m) => { const f = accountApi[m]; accountApi[m] = (...a) => { if (!authReady) watchAuth(); return f(...a); }; });
  }
  window.addEventListener("online", () => { if (account) { firebase().then(() => { if (!unsub && uid) subscribe(); flush(); }).catch(() => {}); } });
  window.addEventListener("offline", () => { if (account) setStatus("offline"); });
  window.addEventListener("storage", (e) => { if (SYNCED.includes(e.key)) { delete mem[e.key]; fire(e.key); } });   // autre onglet

  /* ---------- Application installable (hors connexion) ---------- */
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
