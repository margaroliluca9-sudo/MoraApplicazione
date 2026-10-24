// CONTROLLO AUTOMATICO (vedi .github/workflows/check.yml): impacchetta tutti i moduli di src
// in una pagina di prova con un database FINTO (loader.js), così si può provare l'app senza toccare i dati veri.
// uso: node tests/build-harness.js <node_modules con react, react-dom, scheduler, typescript> src <cartella di uscita>
const fs = require("fs");
const path = require("path");
const [G, SRCDIR, OUT] = process.argv.slice(2);
const ts = require(path.join(G, "typescript"));
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const wrap = (name, code) => `window.__defs=window.__defs||{};window.__defs[${JSON.stringify(name)}]=function(module,exports,require,process){${code}\n};\n`;
const libs = {
  react: path.join(G, "react/cjs/react.development.js"),
  scheduler: path.join(G, "scheduler/cjs/scheduler.development.js"),
  "react-dom": path.join(G, "react-dom/cjs/react-dom.development.js"),
  "react-dom/client": path.join(G, "react-dom/cjs/react-dom-client.development.js"),
};
const scripts = [];
for (const [name, file] of Object.entries(libs)) {
  const f = name.replace(/\//g, "_") + ".js";
  fs.writeFileSync(path.join(OUT, f), wrap(name, fs.readFileSync(file, "utf8")));
  scripts.push(f);
}
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const mods = walk(SRCDIR).filter((f) => f.endsWith(".js") && path.basename(f) !== "index.js");
let i = 0;
for (const f of mods) {
  const id = "@/" + path.relative(SRCDIR, f).replace(/\\/g, "/").replace(/\.js$/, "");
  const out = ts.transpileModule(fs.readFileSync(f, "utf8"), {
    fileName: f.replace(/\.js$/, ".jsx"), reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2019, esModuleInterop: true },
  });
  if (out.diagnostics.length) { console.error(id, out.diagnostics.map((d) => d.messageText)); process.exit(2); }
  const fname = "m" + i++ + ".js";
  // require relativo -> id assoluto "@/..."
  const dir = path.posix.dirname(id);
  const code = out.outputText.replace(/require\("(\.[^"]+)"\)/g, (_, rel) => `require(${JSON.stringify(path.posix.normalize(path.posix.join(dir, rel)))})`);
  fs.writeFileSync(path.join(OUT, fname), wrap(id, code));
  scripts.push(fname);
}
fs.copyFileSync(path.join(__dirname, "loader.js"), path.join(OUT, "loader2.js"));
// grafica dell'app (gli stessi file .css della versione vera, nello stesso ordine)
const CSS = ["theme", "dark", "appearance", "tailwind"].filter((c) => fs.existsSync(path.join(SRCDIR, c + ".css")));
CSS.forEach((c) => fs.copyFileSync(path.join(SRCDIR, c + ".css"), path.join(OUT, c + ".css")));
// pdf-lib per le stampe (se installato)
const PDFLIB = [path.join(SRCDIR, "..", "node_modules/pdf-lib/dist/pdf-lib.min.js"), path.join(G, "pdf-lib/dist/pdf-lib.min.js")].find((f) => fs.existsSync(f));
if (PDFLIB) fs.copyFileSync(PDFLIB, path.join(OUT, "pdf-lib.min.js"));
fs.writeFileSync(path.join(OUT, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${CSS.map((c) => `<link rel="stylesheet" href="${c}.css">`).join("")}</head><body><div id="root"></div>${PDFLIB ? '<script src="pdf-lib.min.js"></script>' : ""}${scripts.map((s) => `<script src="${s}"></script>`).join("")}<script src="loader2.js"></script></body></html>`);
console.log(`moduli: ${mods.length} -> ${OUT}`);
