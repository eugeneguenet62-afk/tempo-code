// Construit labo.js : transpile chaque module TypeScript, puis les assemble
// dans une seule fonction (aucune dépendance à télécharger).
// Usage : node labo-src/build.cjs <chemin vers le paquet typescript>   (écrit site/labo.js)
const fs = require("fs");
const path = require("path");
const ts = require(process.argv[2] || "typescript");
const dir = __dirname;
const order = ["pixel/canvas", "pixel/athlete", "pixel/food", "labo"];
const varName = (m) => "M_" + m.replace(/\W/g, "_");
let out = "/* Tempo Labo : généré par labo-src/build.cjs, ne pas modifier à la main. */\n(function(){\"use strict\";\n";
for (const m of order) {
  const src = fs.readFileSync(path.join(dir, m + ".ts"), "utf8");
  let js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.ESNext, removeComments: true } }).outputText;
  const exported = [];
  js = js.replace(/^import\s*\{([^}]*)\}\s*from\s*["']\.\/?(?:\.\/)?([^"']+)["'];?\s*$/gm, (_, names, from) => {
    const mod = path.posix.normalize(path.posix.join(path.posix.dirname(m), from)).replace(/^\.\//, "");
    const list = names.split(",").map((s) => s.trim()).filter((s) => s && !s.startsWith("type "));
    return list.length ? `const { ${list.join(", ")} } = ${varName(mod)};` : "";
  });
  js = js.replace(/^export\s+(const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kw, name) => {
    exported.push(name);
    return `${kw} ${name}`;
  });
  js = js.replace(/^export\s*\{\s*\};?\s*$/gm, "");
  out += `const ${varName(m)} = (function(){\n${js}\nreturn { ${exported.join(", ")} };\n})();\n`;
}
out += "})();\n";
fs.writeFileSync(path.join(dir, "..", "site", "labo.js"), out);   // dépôt Tempo : le dossier publié est site/
console.log("labo.js", out.length, "octets");
