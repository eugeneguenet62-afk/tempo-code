/* Tempo : lecture des fichiers GPX (montre, Strava, Garmin…) et dessin du tracé. Utilisé par les carnets. */
(function () {
  "use strict";
  const dKey = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  function parseGPX(text) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("gpx");
    let pts = [...doc.getElementsByTagName("trkpt")];
    if (!pts.length) pts = [...doc.getElementsByTagName("rtept")];
    if (pts.length < 2) throw new Error("vide");
    const P = pts.map((p) => {
      const t = p.getElementsByTagName("time")[0], e = p.getElementsByTagName("ele")[0];
      const hr = [...p.getElementsByTagName("*")].find((x) => /(^|:)hr$/i.test(x.tagName));
      return { lat: +p.getAttribute("lat"), lon: +p.getAttribute("lon"), ele: e ? +e.textContent : null, t: t ? Date.parse(t.textContent) : null, hr: hr ? +hr.textContent : null };
    }).filter((p) => isFinite(p.lat) && isFinite(p.lon));
    const R = 6371000, rad = Math.PI / 180;
    const hav = (a, b) => { const dLa = (b.lat - a.lat) * rad, dLo = (b.lon - a.lon) * rad; const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(h))); };
    let dist = 0, moving = 0, up = 0, ref = null;
    for (let i = 1; i < P.length; i++) {
      const d = hav(P[i - 1], P[i]); dist += d;
      if (P[i].t && P[i - 1].t) { const dt = (P[i].t - P[i - 1].t) / 1000; if (dt > 0 && dt < 120 && d / dt > 0.6) moving += dt; }
    }
    // Dénivelé positif avec un seuil de 3 m pour ignorer le bruit du GPS
    P.forEach((p) => { if (p.ele == null) return; if (ref == null) ref = p.ele; else if (p.ele - ref >= 3) { up += p.ele - ref; ref = p.ele; } else if (p.ele < ref) ref = p.ele; });
    const hrs = P.map((p) => p.hr).filter((x) => x > 30 && x < 230);
    const t0 = P.find((p) => p.t), t1 = [...P].reverse().find((p) => p.t);
    const elapsed = t0 && t1 ? (t1.t - t0.t) / 1000 : 0;
    // Tracé allégé (300 points au plus) pour la carte et l'image partagée
    const step = Math.max(1, Math.ceil(P.length / 300));
    const route = P.filter((_, i) => i % step === 0 || i === P.length - 1).map((p) => [Math.round(p.lat * 1e5) / 1e5, Math.round(p.lon * 1e5) / 1e5]);
    const nameEl = doc.getElementsByTagName("name")[0];
    return { km: Math.round(dist / 10) / 100, dur: Math.round(moving > 0.5 * elapsed ? moving : elapsed), dplus: Math.round(up) || null,
      fc: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null, date: t0 ? dKey(new Date(t0.t)) : null, route, name: nameEl ? nameEl.textContent.trim() : "" };
  }
  function routeSVG(route, color) {
    if (!route || route.length < 2) return "";
    const la = route.map((p) => p[0]), lo = route.map((p) => p[1]), k = Math.cos(((Math.min(...la) + Math.max(...la)) / 2) * Math.PI / 180);
    const x0 = Math.min(...lo) * k, x1 = Math.max(...lo) * k, y0 = Math.min(...la), y1 = Math.max(...la);
    const W = 320, H = 180, sc = Math.min((W - 24) / Math.max(1e-9, x1 - x0), (H - 24) / Math.max(1e-9, y1 - y0));
    const ox = (W - (x1 - x0) * sc) / 2, oy = (H - (y1 - y0) * sc) / 2;
    const d = route.map(([a, b], i) => (i ? "L" : "M") + (ox + (b * k - x0) * sc).toFixed(1) + " " + (oy + (y1 - a) * sc).toFixed(1)).join("");
    return `<svg class="j-route" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tracé du parcours"><path d="${d}" fill="none" stroke="${color || "var(--accent)"}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  window.TempoGPX = { parse: parseGPX, svg: routeSVG };
})();
