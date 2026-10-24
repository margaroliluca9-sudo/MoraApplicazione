// VERCEL: prima di pubblicare la versione per tutti (produzione) aspetta il «Controllo app» di GitHub
// (vedi .github/workflows/check.yml). Vercel usa questo file come «Ignored Build Step» (vercel.json):
//   uscita 1 = vai avanti e pubblica · uscita 0 = NON pubblicare (resta la versione di prima)
// Se il controllo è rosso non si pubblica. Se GitHub non risponde o il controllo non arriva in tempo,
// si pubblica lo stesso (meglio non bloccare tutto per un problema di GitHub).
const https = require("https");

const PUBLISH = 1;
const SKIP = 0;
const sha = process.env.VERCEL_GIT_COMMIT_SHA;
const owner = process.env.VERCEL_GIT_REPO_OWNER || "margaroliluca9-sudo";
const repo = process.env.VERCEL_GIT_REPO_SLUG || "MoraApplicazione";
const token = process.env.GITHUB_BACKUP_TOKEN || process.env.GITHUB_TOKEN || "";
const MAX_MIN = 14;

if (process.env.VERCEL_ENV !== "production" || !sha) {
  console.log("Anteprima (non produzione): si costruisce senza aspettare il controllo.");
  process.exit(PUBLISH);
}

const get = (path) =>
  new Promise((resolve) => {
    const req = https.get(
      { host: "api.github.com", path, headers: { "User-Agent": "mora-vercel", Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve(res.statusCode === 200 ? JSON.parse(body) : null);
          } catch (e) {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.setTimeout(15000, () => {
      req.destroy();
      resolve(null);
    });
  });

(async () => {
  const until = Date.now() + MAX_MIN * 60 * 1000;
  while (Date.now() < until) {
    const j = await get(`/repos/${owner}/${repo}/commits/${sha}/check-runs?per_page=50`);
    // lo stesso codice può essere controllato più volte (ramo e main): basta un controllo riuscito
    const runs = j ? (j.check_runs || []).filter((c) => c.name === "Controllo app") : [];
    if (runs.some((r) => r.status === "completed" && r.conclusion === "success")) {
      console.log("Controllo app: OK. Si pubblica.");
      process.exit(PUBLISH);
    }
    const bad = runs.find((r) => r.status === "completed" && r.conclusion !== "cancelled");
    if (bad && runs.every((r) => r.status === "completed")) {
      console.log(`Controllo app: ${bad.conclusion}. NON si pubblica: resta la versione di prima. Dettagli: ${bad.html_url}`);
      process.exit(SKIP);
    }
    console.log(runs.length ? "Controllo app in corso…" : "Aspetto che parta il Controllo app…");
    await new Promise((r) => setTimeout(r, 20000));
  }
  console.log("Il controllo non è arrivato in tempo: si pubblica lo stesso.");
  process.exit(PUBLISH);
})();
