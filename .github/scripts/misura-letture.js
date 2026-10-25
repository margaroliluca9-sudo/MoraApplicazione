// misura temporanea: legge read_stats (conteggi delle letture scritti dai telefoni) e stampa il riepilogo
const PROJECT = "mora-app-36607";
const API_KEY = "AIzaSyCQ3VhCtvxIP2cxtdSgMzYXaTg4E1zPlZE";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/artifacts/mora-maintenance-v1/public/data`;
const val = (v) => (!v ? null : "integerValue" in v ? Number(v.integerValue) : "stringValue" in v ? v.stringValue : "mapValue" in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, val(x)])) : "doubleValue" in v ? v.doubleValue : null);
(async () => {
  const t = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{\"returnSecureToken\":true}" })).json();
  const H = { Authorization: "Bearer " + t.idToken };
  const rows = [];
  let page = "";
  for (;;) {
    const r = await fetch(`${BASE}/read_stats?pageSize=300${page ? "&pageToken=" + encodeURIComponent(page) : ""}`, { headers: H });
    const j = await r.json();
    if (!r.ok) { console.log("::error::" + JSON.stringify(j).slice(0, 300)); return; }
    (j.documents || []).forEach((d) => rows.push(Object.fromEntries(Object.entries(d.fields || {}).map(([k, x]) => [k, val(x)]))));
    if (!j.nextPageToken) break;
    page = j.nextPageToken;
  }
  const days = {};
  rows.forEach((r) => {
    const d = (days[r.date] = days[r.date] || { tot: 0, who: {}, by: {}, dev: 0 });
    d.tot += r.total || 0;
    d.dev++;
    d.who[r.who || "?"] = (d.who[r.who || "?"] || 0) + (r.total || 0);
    Object.entries(r.by || {}).forEach(([k, n]) => (d.by[k] = (d.by[k] || 0) + n));
  });
  const top = (o, n = 8) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}:${v}`).join(" ");
  Object.keys(days).sort().slice(-6).forEach((k) => {
    const d = days[k];
    console.log(`::notice::${k} totale ${d.tot} telefoni ${d.dev} | chi: ${top(d.who)} | cosa: ${top(d.by, 12)}`);
  });
})();
