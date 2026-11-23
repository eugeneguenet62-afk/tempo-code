/* Tempo : rappels via le calendrier du téléphone.
   Un site ne peut pas envoyer de notification quand il est fermé sans serveur dédié : on passe donc par le calendrier,
   qui sonne même hors ligne. Le fichier .ics est généré par /api/rappels à partir des choix ci-dessous. */
(function () {
  "use strict";
  const DAYS = [["MO", "L", "lundi"], ["TU", "M", "mardi"], ["WE", "M", "mercredi"], ["TH", "J", "jeudi"], ["FR", "V", "vendredi"], ["SA", "S", "samedi"], ["SU", "D", "dimanche"]];
  const KEY = "tempo-rappels";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; } };
  const keep = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (_) {} };
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function el() {
    let e = document.getElementById("rp-sheet");
    if (!e) {
      e = document.createElement("div"); e.id = "rp-sheet"; e.className = "j-sheet rp"; e.hidden = true; document.body.appendChild(e);
      e.addEventListener("click", click); e.addEventListener("change", sync);
      document.addEventListener("keydown", (x) => { if (x.key === "Escape" && !e.hidden) close(); });
    }
    return e;
  }
  const close = () => { const e = el(); e.hidden = true; e.innerHTML = ""; };
  function state() {
    const e = el(), v = {};
    v.d = [...e.querySelectorAll("[data-day][aria-pressed='true']")].map((b) => b.dataset.day);
    v.t = e.querySelector("#rp-t").value; v.a = e.querySelector("#rp-a").value;
    v.fOn = e.querySelector("#rp-f-on").checked; v.f = e.querySelector("#rp-f").value;
    v.rOn = e.querySelector("#rp-r-on").checked; v.r = e.querySelector("#rp-r").value;
    return v;
  }
  function url(v) {
    const q = new URLSearchParams();
    if (v.d.length) { q.set("d", v.d.join(",")); q.set("t", v.t); if (+v.a) q.set("a", v.a); }
    if (v.fOn) q.set("f", v.f); if (v.rOn) q.set("r", v.r);
    return "/api/rappels?" + q.toString();
  }
  function sync() {
    const v = state(), e = el(), go = e.querySelector("#rp-go"), n = v.d.length + (v.fOn ? 1 : 0) + (v.rOn ? 1 : 0);
    go.href = url(v); go.classList.toggle("off", !n); go.setAttribute("aria-disabled", String(!n));
    e.querySelector("#rp-sum").textContent = n ? [v.d.length ? `séance le ${v.d.map((d) => DAYS.find((x) => x[0] === d)[2]).join(", ")} à ${v.t.replace(":", " h ")}` : "", v.fOn ? `forme du jour à ${v.f.replace(":", " h ")}` : "", v.rOn ? `repas à ${v.r.replace(":", " h ")}` : ""].filter(Boolean).join(" ; ") + "." : "Choisissez au moins un rappel.";
    keep(v);
  }
  function open() {
    // Les styles des fenêtres sont dans journal.css (pas chargé sur l'accueil)
    if (!document.querySelector('link[href="journal.css"]')) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "journal.css"; document.head.appendChild(l); }
    const v = Object.assign({ d: ["MO", "WE", "FR"], t: "18:00", a: "30", fOn: true, f: "08:00", rOn: false, r: "20:30" }, load());
    const e = el();
    e.innerHTML = `<div class="j-panel" role="dialog" aria-modal="true" aria-labelledby="rp-title">
      <div class="imp-h"><div class="j-h2" id="rp-title">Rappels</div><button type="button" class="j-btn sm" data-r="close">Fermer</button></div>
      <p class="j-muted" style="margin:0">Les rappels s'ajoutent au calendrier de votre téléphone : ils sonnent même quand Tempo est fermé. Vous pourrez les modifier ou les supprimer dans votre calendrier.</p>
      <fieldset class="rp-f"><legend>Jours d'entraînement</legend><div class="rp-days">${DAYS.map(([k, s, l]) => `<button type="button" data-day="${k}" aria-pressed="${v.d.includes(k)}" aria-label="${l}">${s}</button>`).join("")}</div>
        <div class="j-grid"><label class="j-f">Heure de la séance<input type="time" id="rp-t" value="${v.t}"></label>
        <label class="j-f">Me prévenir<select id="rp-a">${[["0", "à l'heure"], ["15", "15 min avant"], ["30", "30 min avant"], ["60", "1 h avant"], ["120", "2 h avant"]].map(([a, b]) => `<option value="${a}" ${String(v.a) === a ? "selected" : ""}>${b}</option>`).join("")}</select></label></div></fieldset>
      <label class="rp-row"><input type="checkbox" id="rp-f-on" ${v.fOn ? "checked" : ""}><span><b>Forme du jour</b><small>Tous les matins</small></span><input type="time" id="rp-f" value="${v.f}" aria-label="Heure du rappel forme du jour"></label>
      <label class="rp-row"><input type="checkbox" id="rp-r-on" ${v.rOn ? "checked" : ""}><span><b>Noter mes repas</b><small>Tous les soirs</small></span><input type="time" id="rp-r" value="${v.r}" aria-label="Heure du rappel repas"></label>
      <p class="rp-sum" id="rp-sum"></p>
      <a class="j-btn primary big" id="rp-go" href="#">Ajouter à mon calendrier</a>
      <p class="j-muted" style="margin:0">${isIOS ? "Sur iPhone : touchez « Tout ajouter » dans la fenêtre qui s'ouvre." : "Sur Android : ouvrez le fichier téléchargé (tempo-rappels.ics) avec votre agenda. Sur ordinateur : il s'ouvre dans Calendrier ou Outlook."} Pour changer vos rappels plus tard, supprimez les anciens événements « Tempo » de votre calendrier, puis recommencez ici.</p></div>`;
    e.hidden = false; sync();
  }
  function click(x) {
    const e = el();
    if (x.target === e) return close();
    const b = x.target.closest("[data-day],[data-r],#rp-go"); if (!b) return;
    if (b.dataset.day) { b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); sync(); }
    else if (b.dataset.r === "close") close();
    else if (b.id === "rp-go" && b.classList.contains("off")) x.preventDefault();
  }
  window.TempoRappels = { open };
})();
