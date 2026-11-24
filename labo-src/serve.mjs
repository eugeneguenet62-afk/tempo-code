// Serveur local de relecture : sert ce dossier, va chercher sur le site en ligne
// les fichiers absents de la copie (photos des exercices), et retire la balise
// de mesure d'audience pour ne pas compter les visites de test.
// Usage : node labo-src/serve.mjs [port]
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "site");   // dépôt Tempo : le dossier publié est site/
const port = Number(process.argv[2] ?? 3140);
const LIVE = "https://tempo-training.com";
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml",
  ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  else if (!extname(path)) path += ".html";   // adresses sans .html, comme Cloudflare Pages
  const file = normalize(join(root, path));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  try {
    let body = await readFile(file);
    const type = types[extname(file)] ?? "application/octet-stream";
    if (type.startsWith("text/html")) body = Buffer.from(body.toString("utf8").replace(/<!-- Cloudflare Pages Analytics -->.*?<!-- Cloudflare Pages Analytics -->/s, ""));
    res.writeHead(200, { "content-type": type, "cache-control": "no-store" }).end(body);
  } catch {
    try {
      const r = await fetch(LIVE + path);
      if (!r.ok) return res.writeHead(r.status).end();
      res.writeHead(200, { "content-type": r.headers.get("content-type") ?? "application/octet-stream" }).end(Buffer.from(await r.arrayBuffer()));
    } catch {
      res.writeHead(502).end();
    }
  }
}).listen(port, () => console.log(`Tempo Labo : http://localhost:${port}`));
