/* Tempo : partager une séance ou une sortie sous forme d'image (format story 1080 × 1350). */
(function () {
  "use strict";
  const W = 1080, H = 1350;
  const ink = "#111a17", muted = "#5d6b66", bg = "#f6f8f7";

  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fit(c, text, max, size, weight, family) {
    let s = size;
    do { c.font = `${weight} ${s}px ${family}`; s -= 2; } while (c.measureText(text).width > max && s > 20);
    return s + 2;
  }
  function clip(c, text, max) {
    if (c.measureText(text).width <= max) return text;
    while (text.length > 1 && c.measureText(text + "…").width > max) text = text.slice(0, -1);
    return text + "…";
  }

  /* d : { color, kicker, title, date, stats:[[valeur, libellé]], lines:[[gauche, droite]], highlight, route:[[lat,lon]] } */
  async function draw(d) {
    try { await Promise.all([document.fonts.load("700 80px 'Barlow Condensed'"), document.fonts.load("600 40px Barlow"), document.fonts.load("400 30px Barlow")]); } catch (_) {}
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c = cv.getContext("2d");
    const col = d.color || "#2350d9";
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    // Couloirs de piste en fond
    c.save(); c.globalAlpha = 0.09; c.strokeStyle = col; c.lineWidth = 3;
    for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(W + 120, H + 160, 520 + i * 70, 420 + i * 70, 0, Math.PI, 1.5 * Math.PI); c.stroke(); }
    c.restore();
    c.fillStyle = col; c.fillRect(0, 0, W, 18);
    const X = 80;
    // En-tête
    c.fillStyle = col; c.font = "600 34px Barlow, sans-serif"; c.fillText(d.kicker || "", X, 120);
    const ts = fit(c, d.title || "", W - 2 * X, 112, 700, "'Barlow Condensed', sans-serif");
    c.fillStyle = ink; c.font = `700 ${ts}px 'Barlow Condensed', sans-serif`; c.fillText(d.title || "", X, 120 + ts + 6);
    c.fillStyle = muted; c.font = "400 32px Barlow, sans-serif"; c.fillText(d.date || "", X, 120 + ts + 60);
    let y = 120 + ts + 120;
    // Chiffres clés
    const st = (d.stats || []).slice(0, 3);
    if (st.length) {
      const gw = (W - 2 * X - (st.length - 1) * 24) / st.length;
      st.forEach(([v, k], i) => {
        const x = X + i * (gw + 24);
        c.fillStyle = "#ffffff"; roundRect(c, x, y, gw, 170, 28); c.fill();
        c.fillStyle = ink; const vs = fit(c, String(v), gw - 48, 76, 700, "'Barlow Condensed', sans-serif"); c.font = `700 ${vs}px 'Barlow Condensed', sans-serif`; c.fillText(String(v), x + 28, y + 96);
        c.fillStyle = muted; c.font = "500 28px Barlow, sans-serif"; c.fillText(clip(c, k, gw - 48), x + 28, y + 142);
      });
      y += 210;
    }
    // Record mis en avant
    if (d.highlight) {
      c.fillStyle = col; roundRect(c, X, y, W - 2 * X, 120, 28); c.fill();
      c.fillStyle = "#ffffff"; c.font = "600 36px Barlow, sans-serif"; c.fillText(clip(c, d.highlight, W - 2 * X - 60), X + 32, y + 72);
      y += 160;
    }
    // Tracé GPS
    if (d.route && d.route.length > 1) {
      const h = Math.min(420, H - y - 170 - Math.min(3, (d.lines || []).length) * 56), w = W - 2 * X;
      c.fillStyle = "#ffffff"; roundRect(c, X, y, w, h, 28); c.fill();
      const la = d.route.map((p) => p[0]), lo = d.route.map((p) => p[1]);
      const midLat = (Math.min(...la) + Math.max(...la)) / 2, k = Math.cos((midLat * Math.PI) / 180);
      const minX = Math.min(...lo) * k, maxX = Math.max(...lo) * k, minY = Math.min(...la), maxY = Math.max(...la);
      const sc = Math.min((w - 80) / Math.max(1e-9, maxX - minX), (h - 80) / Math.max(1e-9, maxY - minY));
      const ox = X + (w - (maxX - minX) * sc) / 2, oy = y + (h - (maxY - minY) * sc) / 2;
      c.strokeStyle = col; c.lineWidth = 9; c.lineJoin = c.lineCap = "round"; c.beginPath();
      d.route.forEach(([a, b], i) => { const px = ox + (b * k - minX) * sc, py = oy + (maxY - a) * sc; i ? c.lineTo(px, py) : c.moveTo(px, py); });
      c.stroke();
      y += h + 40;
    }
    // Détail
    c.font = "500 32px Barlow, sans-serif";
    const lines = d.lines || [], maxL = Math.max(0, Math.floor((H - 170 - y) / 56));
    lines.slice(0, maxL).forEach(([a, b], i) => {
      const yy = y + i * 56 + 36;
      c.fillStyle = ink; c.font = "500 32px Barlow, sans-serif";
      const bw = b ? (c.font = "600 30px Barlow, sans-serif", c.measureText(b).width) : 0;
      c.font = "500 32px Barlow, sans-serif"; c.fillText(clip(c, a, W - 2 * X - bw - 30), X, yy);
      if (b) { c.fillStyle = muted; c.font = "600 30px Barlow, sans-serif"; c.fillText(b, W - X - bw, yy); }
      c.strokeStyle = "rgba(17,26,23,.08)"; c.lineWidth = 2; c.beginPath(); c.moveTo(X, yy + 20); c.lineTo(W - X, yy + 20); c.stroke();
    });
    if (lines.length > maxL && maxL > 0) { c.fillStyle = muted; c.font = "400 28px Barlow, sans-serif"; c.fillText(`et ${lines.length - maxL} de plus`, X, y + maxL * 56 + 30); }
    // Signature
    c.fillStyle = col; roundRect(c, X, H - 110, 56, 56, 16); c.fill();
    c.strokeStyle = "#ffffff"; c.lineWidth = 5; c.beginPath(); c.ellipse(X + 28, H - 82, 16, 11, 0, 0, 2 * Math.PI); c.stroke();
    c.fillStyle = ink; c.font = "700 40px 'Barlow Condensed', sans-serif"; c.fillText("Tempo", X + 76, H - 68);
    c.fillStyle = muted; c.font = "400 28px Barlow, sans-serif"; const u = "tempo-2er.pages.dev"; c.fillText(u, W - X - c.measureText(u).width, H - 70);
    return new Promise((res) => cv.toBlob(res, "image/png"));
  }

  async function share(d, filename) {
    const blob = await draw(d);
    if (!blob) throw new Error("image");
    const file = new File([blob], (filename || "tempo") + ".png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: d.title }); return "shared"; }
      catch (e) { if (e && e.name === "AbortError") return "cancel"; }
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return "downloaded";
  }
  window.TempoShare = { draw, share };
})();
