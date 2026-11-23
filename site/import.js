/* Tempo : import groupé d'activités depuis une montre ou Strava.
   Formats lus dans le navigateur (rien n'est envoyé) : .gpx, .tcx, .fit, et leurs versions compressées .gz
   (l'export complet de Strava contient un dossier « activities » rempli de ces fichiers).
   Les courses vont dans le carnet de course, le reste (vélo, natation, randonnée, marche, rameur…) dans le carnet multisport. */
(function () {
  "use strict";
  const TS = () => window.TempoStore;
  const dKey = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const r1 = (x) => (Math.round(x * 10) / 10).toLocaleString("fr-FR");
  const gid = () => "imp-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const human = (s) => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? h + " h " + String(m).padStart(2, "0") : m + " min"; };

  /* ---------- Type de sport ---------- */
  function sportFrom(txt) {
    txt = String(txt || "").toLowerCase();
    if (/run|course|jog|trail|footing/.test(txt)) return "run";
    if (/mountain|vtt|mtb/.test(txt)) return "vtt";
    if (/bik|cycl|ride|velo|vélo|bike/.test(txt)) return "velo";
    if (/swim|natation|nage/.test(txt)) return "natation";
    if (/hik|rando|trek/.test(txt)) return "rando";
    if (/walk|marche/.test(txt)) return "marche";
    if (/row|rameur|aviron/.test(txt)) return "rameur";
    if (/ski/.test(txt)) return "ski";
    return null;
  }
  const NAMES = { run: "Course à pied", velo: "Vélo", vtt: "VTT", natation: "Natation", rando: "Randonnée", marche: "Marche", rameur: "Rameur", ski: "Ski" };

  /* ---------- TCX (Garmin, Polar…) ---------- */
  function parseTCX(text) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("tcx");
    const act = doc.getElementsByTagName("Activity")[0]; if (!act) throw new Error("vide");
    const laps = [...act.getElementsByTagName("Lap")];
    const num = (el, tag) => { const x = el.getElementsByTagName(tag)[0]; return x ? +x.textContent : 0; };
    let dist = 0, dur = 0, kcal = 0, hrS = 0, hrT = 0;
    laps.forEach((l) => {
      const t = num(l, "TotalTimeSeconds"); dist += num(l, "DistanceMeters"); dur += t; kcal += num(l, "Calories");
      const av = l.getElementsByTagName("AverageHeartRateBpm")[0]; if (av) { const v = +av.textContent.trim(); if (v > 30) { hrS += v * t; hrT += t; } }
    });
    // Dénivelé et tracé à partir des points
    const pts = [...act.getElementsByTagName("Trackpoint")].map((p) => {
      const la = p.getElementsByTagName("LatitudeDegrees")[0], lo = p.getElementsByTagName("LongitudeDegrees")[0], al = p.getElementsByTagName("AltitudeMeters")[0];
      return { lat: la ? +la.textContent : null, lon: lo ? +lo.textContent : null, ele: al ? +al.textContent : null };
    });
    let up = 0, ref = null; pts.forEach((p) => { if (p.ele == null) return; if (ref == null) ref = p.ele; else if (p.ele - ref >= 3) { up += p.ele - ref; ref = p.ele; } else if (p.ele < ref) ref = p.ele; });
    const geo = pts.filter((p) => p.lat != null); const step = Math.max(1, Math.ceil(geo.length / 300));
    const id = act.getElementsByTagName("Id")[0];
    const start = id ? new Date(id.textContent.trim()) : laps[0] ? new Date(laps[0].getAttribute("StartTime")) : null;
    return { sport: sportFrom(act.getAttribute("Sport")), start, km: dist / 1000, dur, dplus: Math.round(up) || null, fc: hrT ? Math.round(hrS / hrT) : null, kcal: kcal || null,
      route: geo.length > 1 ? geo.filter((_, i) => i % step === 0 || i === geo.length - 1).map((p) => [Math.round(p.lat * 1e5) / 1e5, Math.round(p.lon * 1e5) / 1e5]) : null };
  }

  /* ---------- FIT (format binaire des montres Garmin, Coros, Wahoo, Suunto…) ----------
     On lit seulement le message « session » (résumé de l'activité) et, s'il manque, on se rabat sur les points (« record »). */
  function parseFIT(buf) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf);
    const hlen = u8[0]; if (String.fromCharCode(u8[8], u8[9], u8[10], u8[11]) !== ".FIT") throw new Error("fit");
    const end = Math.min(buf.byteLength - 2, hlen + dv.getUint32(4, true));
    const defs = {}; let p = hlen, session = null, sport = null, lastTs = 0; const rec = [];
    const FIT_EPOCH = 631065600;   // 31/12/1989 en secondes Unix
    const read = (off, size, base, le) => {
      const t = base & 0x1f;
      try {
        if (t === 0 || t === 2 || t === 10 || t === 13) return size === 1 ? u8[off] : null;   // enum, uint8, uint8z, byte
        if (t === 1) return dv.getInt8(off);
        if (t === 3) return dv.getInt16(off, le); if (t === 4 || t === 11) return dv.getUint16(off, le);
        if (t === 5) return dv.getInt32(off, le); if (t === 6 || t === 12) return dv.getUint32(off, le);
        if (t === 8) return dv.getFloat32(off, le);
      } catch (_) {}
      return null;
    };
    const INVALID = (v, base) => v == null || ((base & 0x1f) === 4 && v === 0xffff) || ((base & 0x1f) === 6 && v === 0xffffffff) || ((base & 0x1f) === 2 && v === 0xff) || ((base & 0x1f) === 0 && v === 0xff) || ((base & 0x1f) === 5 && v === 0x7fffffff) || ((base & 0x1f) === 3 && v === 0x7fff);
    while (p < end) {
      const h = u8[p++];
      if (h & 0x80) {   // en-tête compressé (horodatage court) : message de données
        const lt = (h >> 5) & 3, d = defs[lt]; if (!d) throw new Error("fit");
        const v = {}; let o = p; d.fields.forEach((f) => { const x = read(o, f.size, f.base, d.le); if (!INVALID(x, f.base)) v[f.num] = x; o += f.size; }); p = o + d.devSize;
        if (d.gnum === 20) rec.push(v);
        continue;
      }
      const lt = h & 0x0f;
      if (h & 0x40) {   // définition
        p++; const le = u8[p++] === 0; const gnum = le ? dv.getUint16(p, true) : dv.getUint16(p, false); p += 2;
        const n = u8[p++]; const fields = [];
        for (let i = 0; i < n; i++) { fields.push({ num: u8[p], size: u8[p + 1], base: u8[p + 2] }); p += 3; }
        let devSize = 0; if (h & 0x20) { const nd = u8[p++]; for (let i = 0; i < nd; i++) { devSize += u8[p + 1]; p += 3; } }
        defs[lt] = { le, gnum, fields, devSize };
      } else {
        const d = defs[lt]; if (!d) throw new Error("fit");
        const v = {}; let o = p; d.fields.forEach((f) => { const x = read(o, f.size, f.base, d.le); if (!INVALID(x, f.base)) v[f.num] = x; o += f.size; }); p = o + d.devSize;
        if (d.gnum === 18 && !session) session = v;                 // session
        else if (d.gnum === 12 && sport == null) sport = v[0];     // sport
        else if (d.gnum === 20) rec.push(v);                        // record
        if (v[253]) lastTs = v[253];
      }
    }
    const SPORT = { 1: "run", 2: "velo", 5: "natation", 11: "marche", 17: "rando", 15: "rameur", 13: "ski" };
    if (session) {
      const sp = session[5] != null ? session[5] : sport, sub = session[6];
      const start = session[2] ? new Date((session[2] + FIT_EPOCH) * 1000) : null;
      return { sport: sp === 2 && sub === 8 ? "vtt" : SPORT[sp] || null, start, km: (session[9] || 0) / 100000, dur: Math.round((session[8] || session[7] || 0) / 1000),
        dplus: session[22] || null, fc: session[16] || null, kcal: session[11] || null, watts: session[20] || null };
    }
    if (rec.length) {   // pas de résumé : on reconstruit à partir des points
      const ts = rec.map((r) => r[253]).filter(Boolean), dist = Math.max(0, ...rec.map((r) => r[5] || 0)) / 100;
      const hr = rec.map((r) => r[3]).filter((x) => x > 30);
      return { sport: SPORT[sport] || null, start: ts.length ? new Date((ts[0] + FIT_EPOCH) * 1000) : null, km: dist / 1000, dur: ts.length ? ts[ts.length - 1] - ts[0] : 0,
        dplus: null, fc: hr.length ? Math.round(hr.reduce((a, b) => a + b, 0) / hr.length) : null };
    }
    throw new Error("vide");
  }

  /* ---------- Lecture d'un fichier ---------- */
  async function bytes(file) {
    let buf = await file.arrayBuffer();
    if (/\.gz$/i.test(file.name)) {
      if (!("DecompressionStream" in window)) throw new Error("gz");
      buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
    }
    return buf;
  }
  async function readFile(file) {
    const name = file.name.replace(/\.gz$/i, ""), ext = (name.match(/\.([a-z]+)$/i) || [])[1];
    const buf = await bytes(file);
    let a;
    if (/^fit$/i.test(ext)) a = parseFIT(buf);
    else {
      const text = new TextDecoder().decode(buf);
      if (/^tcx$/i.test(ext) || /<TrainingCenterDatabase/i.test(text)) a = parseTCX(text);
      else if (/^gpx$/i.test(ext) || /<gpx/i.test(text)) {
        const g = window.TempoGPX.parse(text);
        const typ = (text.match(/<type>([^<]+)<\/type>/i) || [])[1];
        a = { sport: sportFrom(typ) || sportFrom(g.name) || sportFrom(file.name), start: g.date ? new Date(g.date + "T12:00") : null, km: g.km, dur: g.dur, dplus: g.dplus, fc: g.fc, route: g.route, name: g.name };
        const t0 = (text.match(/<time>([^<]+)<\/time>/) || [])[1]; if (t0 && !isNaN(Date.parse(t0))) a.start = new Date(t0);
      } else throw new Error("format");
    }
    if (!a.sport) a.sport = sportFrom(file.name);
    if (!a.start || isNaN(a.start)) throw new Error("date");
    if (!(a.dur > 0) && !(a.km > 0)) throw new Error("vide");
    a.file = file.name;
    return a;
  }

  /* ---------- Conversion vers les carnets ---------- */
  function toSession(a, sportOverride) {
    const sp = sportOverride || a.sport || "run", date = dKey(a.start), at = a.start.getTime();
    if (sp === "run") {
      const km = Math.round(a.km * 100) / 100, steep = km > 0 && a.dplus && a.dplus / km > 30;
      const s = { id: gid(), at, date, type: steep ? "trail" : km >= 15 ? "long" : "ef", dist: km, dur: Math.round(a.dur), dplus: a.dplus || null, fc: a.fc || null, rpe: 5, gear: "", note: "Importé" + (a.name ? " : " + a.name : "") };
      if (a.route) s.route = a.route;
      return { key: "tempo-course-v1", s };
    }
    const s = { id: gid(), at, date, sport: sp, dur: Math.round(a.dur), rpe: 5, fc: a.fc || null, note: "Importé" + (a.name ? " : " + a.name : "") };
    if (sp === "natation") { s.dist = Math.round(a.km * 1000); s.pool = "25"; }
    else if (sp === "rameur") { s.dist = Math.round(a.km * 1000); if (a.watts) s.watts = a.watts; }
    else if (a.km > 0) { s.dist = Math.round(a.km * 10) / 10; if (a.dplus) s.dplus = a.dplus; }
    if ((sp === "velo" || sp === "vtt") && a.watts) s.watts = a.watts;
    if (a.route && ["velo", "vtt", "rando", "marche"].includes(sp)) s.route = a.route;
    return { key: "tempo-multi-v1", s };
  }
  // Doublon : même jour, même type, départ à moins de 10 min ou durée à 2 % près
  function isDup(list, s) {
    return list.some((x) => x.date === s.date && (x.sport || "run") === (s.sport || "run") && ((x.at && Math.abs(x.at - s.at) < 6e5) || (x.dur && Math.abs(x.dur - s.dur) <= Math.max(30, s.dur * 0.02))));
  }

  /* ---------- Fenêtre ---------- */
  let found = [];
  function overlay() {
    let el = document.getElementById("imp-sheet");
    if (!el) { el = document.createElement("div"); el.id = "imp-sheet"; el.className = "j-sheet"; el.hidden = true; document.body.appendChild(el);
      el.addEventListener("click", onClick); el.addEventListener("change", onChange); }
    return el;
  }
  const close = () => { const el = overlay(); el.hidden = true; el.innerHTML = ""; found = []; };
  function open() {
    const el = overlay();
    el.innerHTML = `<div class="j-panel" role="dialog" aria-modal="true" aria-labelledby="imp-t">
      <div class="imp-h"><div class="j-h2" id="imp-t">Importer des activités</div><button type="button" class="j-btn sm" data-i="close">Fermer</button></div>
      <p class="j-muted" style="margin:0">Choisissez un ou plusieurs fichiers de votre montre ou de Strava : <b>.gpx</b>, <b>.tcx</b>, <b>.fit</b>, y compris compressés (.gz). Les courses vont dans le carnet de course, le vélo, la natation, la marche et la randonnée dans vos autres sports. Les fichiers sont lus sur votre appareil, rien n'est envoyé.</p>
      <details class="imp-help"><summary>Où trouver ces fichiers ?</summary><ul>
        <li><b>Strava</b> : sur une activité, menu « … » puis « Exporter le GPX ». Pour tout récupérer : Paramètres → Mon compte → « Télécharger ou supprimer votre compte » → « Demander une archive » ; le dossier <i>activities</i> de l'archive se glisse ici.</li>
        <li><b>Garmin Connect</b> : sur une activité, roue dentée → « Exporter l'original » (.fit) ou « Exporter au format GPX ».</li>
        <li><b>Coros, Suunto, Polar, Decathlon</b> : dans l'application, partager ou exporter l'activité en .fit ou .gpx.</li></ul></details>
      <label class="j-btn primary big imp-pick">Choisir des fichiers<input type="file" id="imp-files" multiple accept=".gpx,.tcx,.fit,.gz,application/gpx+xml,application/octet-stream" hidden></label>
      <div id="imp-list"></div></div>`;
    el.hidden = false;
  }
  function drawList(errors) {
    const box = document.getElementById("imp-list"); if (!box) return;
    if (!found.length) { box.innerHTML = errors.length ? `<p class="imp-err">${errors.length} fichier${errors.length > 1 ? "s" : ""} non lu${errors.length > 1 ? "s" : ""} : ${esc(errors.slice(0, 3).join(", "))}${errors.length > 3 ? "…" : ""}</p>` : ""; return; }
    const n = found.filter((f) => f.on).length;
    box.innerHTML = `<div class="imp-rows">${found.map((f, i) => `<label class="imp-row${f.dup ? " dup" : ""}"><input type="checkbox" data-i="tog" data-n="${i}" ${f.on ? "checked" : ""}>
      <span><b>${f.a.start.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</b>
      <small>${[f.a.km > 0 ? r1(f.a.km) + " km" : "", f.a.dur ? human(f.a.dur) : "", f.a.dplus ? f.a.dplus + " m D+" : "", f.a.fc ? f.a.fc + " bpm" : ""].filter(Boolean).join(" · ")}${f.dup ? " · " + f.dup : ""}</small></span>
      <select data-i="sport" data-n="${i}" aria-label="Sport">${Object.entries(NAMES).map(([k, v]) => `<option value="${k}" ${k === (f.sport) ? "selected" : ""}>${v}</option>`).join("")}</select></label>`).join("")}</div>
      ${errors.length ? `<p class="imp-err">${errors.length} fichier${errors.length > 1 ? "s" : ""} non lu${errors.length > 1 ? "s" : ""} (format inconnu ou activité vide).</p>` : ""}
      <button type="button" class="j-btn primary big" data-i="save" ${n ? "" : "disabled"}>Ajouter ${n} activité${n > 1 ? "s" : ""}</button>`;
  }
  async function onChange(e) {
    if (e.target.id === "imp-files") {
      const files = [...e.target.files]; if (!files.length) return;
      const box = document.getElementById("imp-list"); box.innerHTML = `<p class="j-muted">Lecture de ${files.length} fichier${files.length > 1 ? "s" : ""}…</p>`;
      const errors = [], course = (TS().get("tempo-course-v1") || {}).sessions || [], multi = (TS().get("tempo-multi-v1") || {}).sessions || [];
      found = [];
      for (const f of files) {
        try {
          const a = await readFile(f), sport = a.sport || "run", conv = toSession(a, sport);
          const twin = found.some((x) => Math.abs(x.a.start - a.start) < 6e5);
          const dup = isDup(conv.key === "tempo-course-v1" ? course : multi, conv.s);
          found.push({ a, sport, dup: dup ? "déjà dans vos carnets" : twin ? "même activité qu'un autre fichier" : "", on: !dup && !twin });
        } catch (err) { errors.push(f.name); }
      }
      found.sort((x, y) => y.a.start - x.a.start);
      drawList(errors);
    } else if (e.target.dataset.i === "tog") { found[+e.target.dataset.n].on = e.target.checked; drawList([]); }
    else if (e.target.dataset.i === "sport") { found[+e.target.dataset.n].sport = e.target.value; }
  }
  function onClick(e) {
    if (e.target.id === "imp-sheet") return close();
    const b = e.target.closest("[data-i]"); if (!b) return;
    if (b.dataset.i === "close") close();
    else if (b.dataset.i === "save") {
      const add = { "tempo-course-v1": [], "tempo-multi-v1": [] };
      found.filter((f) => f.on).forEach((f) => { const c = toSession(f.a, f.sport); add[c.key].push(c.s); });
      Object.entries(add).forEach(([k, L]) => {
        if (!L.length) return;
        const d = TS().get(k) || { sessions: [] }; d.sessions = (d.sessions || []).concat(L).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.at || 0) - (a.at || 0)));
        TS().set(k, d);
      });
      const n = add["tempo-course-v1"].length + add["tempo-multi-v1"].length;
      close();
      try { TS().notify(`${n} activité${n > 1 ? "s" : ""} importée${n > 1 ? "s" : ""}`); } catch (_) {}
      if (window.TempoImport.onDone) window.TempoImport.onDone(n);
    }
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { const el = document.getElementById("imp-sheet"); if (el && !el.hidden) close(); } });
  window.TempoImport = { open, readFile, parseFIT, parseTCX, toSession, onDone: null };
})();
