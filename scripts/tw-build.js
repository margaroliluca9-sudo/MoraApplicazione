// Genera src/tailwind.css (stile già pronto) dalle classi usate nel codice, con lo stesso Tailwind
// che l'app caricava dal CDN (3.4.17). Così il telefono non deve più costruire la grafica mentre la usi.
// uso (su un PC con Playwright): node scripts/tw-build.js <cartella node_modules globale> src <tailwind-3.4.17.js> src/tailwind.css
const path = require("path"), fs = require("fs");
const [G, SRC, TWJS, OUTCSS] = process.argv.slice(2);
const { chromium } = require(path.join(G, "playwright"));

const COLORS = ["slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"];
const files = [];
const walk = (d) => fs.readdirSync(d).forEach((f) => { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : /\.js$/.test(f) && files.push(p); });
walk(SRC);
const tokens = new Set();
const dyn = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  // stringhe "..." '...' e `...` (anche su più righe)
  const strs = s.match(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) || [];
  // anche le stringhe dentro ${ … } dei template (es. `p-2 ${on ? "border-black" : ""}`)
  // (secondo giro: tutte le stringhe "…" e '…' del file, ovunque si trovino)
  (s.match(/"(?:[^"\\\n]|\\.)*"/g) || []).forEach((q) => strs.push(q));
  (s.match(/'(?:[^'\\\n]|\\.)*'/g) || []).forEach((q) => strs.push(q));
  // modelli con colore anche dentro template annidati (`… ${on ? `border-${color}-500` : ""}`)
  (s.match(/[!\w:/.[\]-]*-\$\{[^}]+\}[\w/.%-]*/g) || []).forEach((m) => dyn.add(m.replace(/\$\{[^}]+\}/, "§")));
  for (let str of strs) {
    str = str.slice(1, -1);
    // parti dinamiche: prefisso-${x}-suffisso
    (str.match(/[!\w:/.[\]-]*-\$\{[^}]+\}[\w/.%-]*/g) || []).forEach((m) => dyn.add(m.replace(/\$\{[^}]+\}/, "§")));
    str.replace(/\$\{[^}]*\}/g, " ").split(/\s+/).forEach((t) => {
      if (/^[!-]?[a-z0-9@][\w:[\]/.%#()',=+!-]*$/i.test(t) && t.length < 80) tokens.add(t);
    });
  }
}
// numeri calcolati (es. md:col-span-${n}): tutte le misure da 1 a 12
for (const d of dyn) if (/^[\w:!-]*(col-span|row-span|grid-cols|grid-rows)-§$/.test(d)) for (let i = 1; i <= 12; i++) tokens.add(d.replace("§", i));
for (const d of dyn) {
  if (!/^[\w:!-]*(bg|text|border|border-t|border-b|border-l|border-r|from|to|via|ring|shadow|fill|stroke|outline|divide|accent|caret|decoration|placeholder)-§-?\d{2,3}(\/\d+)?$/.test(d)) continue;
  COLORS.forEach((c) => tokens.add(d.replace("§", c)));
}
const list = [...tokens];
console.log("classi candidate:", list.length, " modelli dinamici:", dyn.size);

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent("<!doctype html><html><head></head><body></body></html>");
  await p.addScriptTag({ path: TWJS });
  await p.evaluate((list) => {
    const box = document.createElement("div");
    // a gruppi, così anche classi con caratteri strani non rompono le altre
    for (let i = 0; i < list.length; i += 50) {
      const d = document.createElement("div");
      d.className = list.slice(i, i + 50).join(" ");
      box.appendChild(d);
    }
    document.body.appendChild(box);
    // la modalità scura dell'app non usa «dark:» di Tailwind; niente da aggiungere qui
  }, list);
  await p.waitForTimeout(2500);
  const css = await p.evaluate(() => [...document.querySelectorAll("style")].map((s) => s.textContent).join("\n"));
  fs.writeFileSync(OUTCSS, "/* Grafica dell'app già pronta (Tailwind 3.4.17). Si rigenera con lo strumento tw_build: non modificare a mano. */\n" + css);
  console.log("CSS:", Math.round(css.length / 1024), "KB ->", OUTCSS);
  await b.close();
})();
