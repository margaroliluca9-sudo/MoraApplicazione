// COPIA DI SICUREZZA SETTIMANALE DEL DATABASE.
// Lo lancia GitHub Actions ogni domenica notte (.github/workflows/backup.yml).
// Scarica tutte le raccolte dell'app (rapporti, clienti, gru, tecnici, ...) e le scrive in un
// unico file JSON. Il workflow poi lo cifra con la password BACKUP_PASSWORD (segreto di GitHub,
// mai nel codice) prima di salvarlo: il repository è pubblico.
// Uso: node .github/scripts/backup.js uscita.json
const fs = require("fs");

const PROJECT = "mora-app-36607";
const API_KEY = "AIzaSyCQ3VhCtvxIP2cxtdSgMzYXaTg4E1zPlZE"; // chiave web pubblica (è già dentro l'app)
const DATA = "artifacts/mora-maintenance-v1/public/data";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

let token = null;
const signIn = async () => {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const j = await r.json();
  token = j.idToken || null;
};
const call = async (url, opts = {}, retry = true) => {
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) };
  const r = await fetch(url, { ...opts, headers });
  if ((r.status === 401 || r.status === 403) && retry) {
    await signIn();
    return call(url, opts, false);
  }
  if (!r.ok) throw new Error(`Firestore ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

// tutte le raccolte dell'app, anche quelle aggiunte in futuro
const collections = async () => {
  const out = [];
  let page = "";
  for (;;) {
    const j = await call(`${BASE}/${DATA}:listCollectionIds`, {
      method: "POST",
      body: JSON.stringify({ pageSize: 100, ...(page ? { pageToken: page } : {}) }),
    });
    out.push(...(j.collectionIds || []));
    if (!j.nextPageToken) return out;
    page = j.nextPageToken;
  }
};

// i documenti restano nel formato di Firestore, così si possono rimettere identici
const documents = async (coll) => {
  const out = [];
  let page = "";
  for (;;) {
    const j = await call(`${BASE}/${DATA}/${coll}?pageSize=300${page ? "&pageToken=" + encodeURIComponent(page) : ""}`);
    (j.documents || []).forEach((d) => out.push({ id: d.name.split("/").pop(), fields: d.fields || {} }));
    if (!j.nextPageToken) return out;
    page = j.nextPageToken;
  }
};

const main = async () => {
  const file = process.argv[2] || "backup.json";
  await signIn();
  const names = (await collections()).sort();
  const data = {};
  let total = 0;
  for (const c of names) {
    data[c] = await documents(c);
    total += data[c].length;
    console.log(`${c}: ${data[c].length}`);
  }
  if (!total) throw new Error("Nessun documento scaricato: la copia non viene salvata.");
  fs.writeFileSync(file, JSON.stringify({ app: DATA, date: new Date().toISOString(), collections: data }));
  console.log(`Totale: ${total} documenti in ${names.length} raccolte`);
};

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
