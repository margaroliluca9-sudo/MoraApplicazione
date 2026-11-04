// PROVE DELLE FUNZIONI (GitHub Actions, dopo smoke.js): ogni file in tests/feature/ apre l'app con un database FINTO
// (clienti inventati) e prova una funzione per davvero: tocchi, misure, esiti, verbali, Guida...
// Ogni prova scrive «TUTTO OK» alla fine; se una non lo scrive (o si blocca) il controllo fallisce e la versione
// NON viene pubblicata. Girano 4 alla volta.
// uso: node tests/features.js <node_modules con playwright> <cartella della pagina di prova>
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");

const [G, OUT] = process.argv.slice(2);
const DIR = path.join(__dirname, "feature");
const SHOTS = fs.mkdtempSync(path.join(os.tmpdir(), "mora-prove-"));
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".js")).sort();
const LIMIT = 150000;

const runOne = (f) =>
  new Promise((resolve) => {
    let out = "";
    const p = spawn(process.execPath, [path.join(DIR, f), G, OUT, SHOTS], { stdio: ["ignore", "pipe", "pipe"] });
    const t = setTimeout(() => {
      out += "\n(bloccata: oltre " + LIMIT / 1000 + " s)";
      p.kill("SIGKILL");
    }, LIMIT);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("close", (code) => {
      clearTimeout(t);
      const ok = code === 0 && /TUTTO OK\s*$/.test(out.trim());
      resolve({ f, ok, out });
    });
  });

(async () => {
  const results = [];
  let i = 0;
  const worker = async () => {
    while (i < files.length) {
      const f = files[i++];
      const r = await runOne(f);
      results.push(r);
      console.log(`${r.ok ? "OK  " : "NO  "} ${f}`);
      if (!r.ok) console.log(r.out.split("\n").filter((l) => !/^PASS /.test(l)).slice(-25).join("\n"));
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  const bad = results.filter((r) => !r.ok);
  console.log(bad.length ? `${bad.length} prove fallite su ${files.length}` : `Tutte le ${files.length} prove sono OK`);
  process.exit(bad.length ? 1 : 0);
})();
