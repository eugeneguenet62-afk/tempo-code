/* Tempo : fichier de calendrier (.ics) avec des rappels récurrents (adresse /api/rappels).
   Rien n'est stocké : tout est dans l'adresse. Heures « flottantes » (sans fuseau) : le téléphone les lit à l'heure locale.
   Paramètres : d = jours d'entraînement (MO,TU,…), t = heure de la séance (HH:MM), a = avance du rappel en minutes,
                f = heure du rappel « forme du jour », r = heure du rappel « repas ». Tous facultatifs. */
const DAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const SITE = "https://tempo-training.com";
const hhmm = (v) => { const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(v || ""); return m ? [m[1], m[2]] : null; };
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
// Lignes de 75 octets au plus (règle du format iCalendar)
function fold(line) {
  const out = []; let cur = "", n = 0;
  for (const ch of line) { const b = new TextEncoder().encode(ch).length; if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; n = 0; } cur += ch; n += b; }
  out.push(cur); return out.join("\r\n ");
}

export function buildICS(q, now = new Date()) {
  const days = String(q.get("d") || "").split(",").filter((x) => DAYS.includes(x));
  const t = hhmm(q.get("t")) || ["18", "00"], adv = Math.min(240, Math.max(0, parseInt(q.get("a"), 10) || 0));
  const f = hhmm(q.get("f")), r = hhmm(q.get("r"));
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tempo//Rappels//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Tempo"];
  const ev = (uid, start, dur, rrule, title, desc, url, trigger) => {
    L.push("BEGIN:VEVENT", `UID:${uid}@tempo-training.com`, `DTSTAMP:${stamp}`, `DTSTART:${start}`, `DURATION:${dur}`, `RRULE:${rrule}`,
      `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(desc + "\n" + url)}`, `URL:${url}`, "TRANSP:TRANSPARENT",
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)}`, `TRIGGER:${trigger}`, "END:VALARM", "END:VEVENT");
  };
  const key = [days.join(""), t.join(""), adv, f ? f.join("") : "", r ? r.join("") : ""].join("-");
  if (days.length) {
    // Première séance : le prochain jour choisi (aujourd'hui compris)
    let d = new Date(today); for (let i = 0; i < 7; i++) { if (days.includes(DAYS[(d.getUTCDay() + 6) % 7])) break; d.setUTCDate(d.getUTCDate() + 1); }
    ev(`seance-${key}`, `${ymd(d)}T${t[0]}${t[1]}00`, "PT1H", `FREQ=WEEKLY;BYDAY=${days.join(",")}`, "Séance d'entraînement",
      "C'est l'heure de votre séance. Ouvrez Tempo pour la noter.", `${SITE}/carnet.html`, adv ? `-PT${adv}M` : "PT0M");
  }
  if (f) ev(`forme-${key}`, `${ymd(today)}T${f[0]}${f[1]}00`, "PT5M", "FREQ=DAILY", "Forme du jour",
    "Quatre touches pour noter votre sommeil, votre énergie, vos courbatures et votre moral.", `${SITE}/#today-title`, "PT0M");
  if (r) ev(`repas-${key}`, `${ymd(today)}T${r[0]}${r[1]}00`, "PT5M", "FREQ=DAILY", "Noter mes repas",
    "Notez ce que vous avez mangé aujourd'hui.", `${SITE}/nutrition.html`, "PT0M");
  L.push("END:VCALENDAR");
  return L.map(fold).join("\r\n") + "\r\n";
}

export async function onRequestGet({ request }) {
  const q = new URL(request.url).searchParams;
  const ics = buildICS(q);
  if (!ics.includes("BEGIN:VEVENT")) return new Response("Aucun rappel choisi.", { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(ics, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'inline; filename="tempo-rappels.ics"', "cache-control": "no-store" } });
}
