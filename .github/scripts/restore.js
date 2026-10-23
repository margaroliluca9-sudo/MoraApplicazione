// RIPRISTINO DA UNA COPIA DI SICUREZZA (solo in caso di emergenza).
// 1) Scarica la copia da GitHub: Actions → "Copia di sicurezza" → l'ultima esecuzione → Artifacts.
// 2) Decifrala:  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in backup.json.gz.enc -out backup.json.gz
//                gunzip backup.json.gz        (chiede la password BACKUP_PASSWORD)
// 3) Prova senza scrivere:   node .github/scripts/restore.js backup.json
//    Rimetti una raccolta:   node .github/scripts/restore.js backup.json --scrivi maintenance_logs
//    Rimetti tutto:          node .github/scripts/restore.js backup.json --scrivi tutto
// Riscrive i documenti presenti nella copia (stesso id); non cancella quelli nuovi creati dopo.
const fs = require("fs");

const PROJECT = "mora-app-36607";
const API_KEY = "AIzaSyCQ3VhCtvxIP2cxtdSgMzYXaTg4E1zPlZE";
const ROOT = `projects/${PROJECT}/databases/(default)/documents`;
const BASE = `https://firestore.googleapis.com/v1/${ROOT}`;

const main = async () => {
  const [file, flag, which] = process.argv.slice(2);
  if (!file) throw new Error("Uso: node restore.js backup.json [--scrivi raccolta|tutto]");
  const b = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`Copia del ${b.date}`);
  Object.entries(b.collections).forEach(([c, docs]) => console.log(`  ${c}: ${docs.length}`));
  if (flag !== "--scrivi") return console.log("Prova finita: niente è stato scritto.");
  const names = which === "tutto" ? Object.keys(b.collections) : [which];
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const token = (await r.json()).idToken;
  for (const c of names) {
    const docs = b.collections[c];
    if (!docs) throw new Error(`Raccolta ${c} non presente nella copia`);
    for (let i = 0; i < docs.length; i += 400) {
      const writes = docs.slice(i, i + 400).map((d) => ({
        update: { name: `${ROOT}/${b.app}/${c}/${d.id}`, fields: d.fields },
      }));
      const w = await fetch(`${BASE}:commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ writes }),
      });
      if (!w.ok) throw new Error(`Firestore ${w.status}: ${(await w.text()).slice(0, 200)}`);
    }
    console.log(`Rimessa ${c}: ${docs.length} documenti`);
  }
};

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
