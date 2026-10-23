// CONTROLLO PRIMA DI PUBBLICARE: ogni classe di grafica scritta nel codice (className="…")
// deve esistere in src/tailwind.css (grafica già pronta) o nei nostri CSS. Se ne manca una,
// la pubblicazione si ferma: meglio che un pezzo di app senza grafica.
// Per rigenerare src/tailwind.css: scripts/tw-build.js (vedi le istruzioni lì dentro).
const fs = require("fs");
const path = require("path");
const SRC = path.join(__dirname, "..", "src");
const files = [];
const walk = (d) => fs.readdirSync(d).forEach((f) => { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.js$/.test(f)) files.push(p); });
walk(SRC);
const css = fs.readdirSync(SRC).filter((f) => f.endsWith(".css")).map((f) => fs.readFileSync(path.join(SRC, f), "utf8")).join("\n");
// nomi di classe presenti nei CSS (con i caratteri speciali «sfuggiti» rimessi a posto)
const have = new Set();
// anche gli stili scritti dentro i file .js (es. <style> della schermata iniziale)
files.forEach((f) => (fs.readFileSync(f, "utf8").match(/\.[a-z][\w-]*(?=[\s,:{.>[)])/gi) || []).forEach((m) => have.add(m.slice(1))));
(css.match(/\.(?:\\.|[\w-])+/g) || []).forEach((m) => have.add(m.slice(1).replace(/\\(.)/g, "$1")));
const missing = new Map();
const check = (cls, file) => {
  cls.split(/\s+/).forEach((t) => {
    if (!t || /[${}]/.test(t)) return;
    if (!/^[!-]?[a-z0-9@][\w:[\]/.%#()',=+!-]*$/i.test(t)) return;
    if (!have.has(t)) missing.set(t, (missing.get(t) || []).concat(path.relative(SRC, file)));
  });
};
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  for (const m of s.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g)) check((m[1] || m[2] || m[3] || "").replace(/\S*\$\{[^}]*\}\S*/g, " "), f);
}
// classi che non sono di Tailwind e non servono nei CSS (solo per le prove automatiche o per JS)
// (fade-in / slide-in-from-… erano di un plugin mai caricato: non facevano nulla neanche prima)
const IGNORE = /^(group|peer|custom-scrollbar|no-scrollbar|lucide|fade-in|zoom-in(-\d+)?|animate-in|slide-in-from-[a-z]+(-\d+)?)$/;
const real = [...missing].filter(([t]) => !IGNORE.test(t));
if (real.length) {
  console.error("Classi di grafica che mancano in src/tailwind.css (rigenera con scripts/tw-build.js):");
  real.slice(0, 50).forEach(([t, f]) => console.error("  " + t + "   (" + [...new Set(f)].slice(0, 3).join(", ") + ")"));
  process.exit(1);
}
console.log("Grafica: tutte le classi ci sono.");
