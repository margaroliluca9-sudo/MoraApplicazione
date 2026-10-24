// PAESE E INDIRIZZO DEI CLIENTI
// Ogni cliente può avere  city: "Borgomanero (NO)"  e  address: "Via Arona, 79".
// Si scrivono a mano (Admin → Clienti → matita) oppure si importano da un file Excel/CSV
// (Admin → Clienti → «Importa paesi»): l'app abbina i nomi del file ai clienti e salva solo dopo «Conferma».

export const placeOf = (c) => [c && c.city, c && c.address].map((x) => String(x || "").trim()).filter(Boolean).join(" · ");

export const mapsUrl = (c) => {
  const q = [c && c.address, c && c.city].map((x) => String(x || "").trim()).filter(Boolean).join(", ");
  return q ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q) : "";
};

// nome «pulito» per abbinare: maiuscolo, senza punteggiatura né forme societarie
const FORMS = /\b(S\s?R\s?L|S\s?P\s?A|S\s?N\s?C|S\s?A\s?S|S\s?S|SPA|SRL|SNC|SAS|SOCIETA|SOCIET[AÀ]|UNIPERSONALE|A SOCIO UNICO|SOCIO UNICO|BENEFIT|ITALIA|ITALIANA|F\s?LLI|FRATELLI|OFF|OFFICINA|MECC|DI|E|C)\b/g;
export const normName = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’]/g, "")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(FORMS, " ")
    .replace(/\s+/g, " ")
    .trim();

const findCol = (head, words) => head.findIndex((h) => words.some((w) => h === w || h.startsWith(w)));

// dalle righe del file: [{ names: ["BIANCHI", "BIANCHI LAMIERE SRL"], city, address }]
export const rowsToPlaces = (rows) => {
  const clean = (rows || []).filter((r) => r && r.some((x) => String(x || "").trim()));
  if (!clean.length) return [];
  const head = clean[0].map((h) => normName(h).replace(/ /g, ""));
  let iName = findCol(head, ["CLIENTE", "NOME", "CLIENT"]);
  const iAlt = findCol(head, ["RAGIONESOCIALE", "RAGIONE", "DENOMINAZIONE"]);
  const iCity = findCol(head, ["PAESE", "CITTA", "COMUNE", "LOCALITA", "CITY"]);
  const iAddr = findCol(head, ["INDIRIZZO", "VIA", "ADDRESS"]);
  if (iName < 0) iName = iAlt;
  if (iName < 0 || (iCity < 0 && iAddr < 0)) return null; // intestazioni non trovate
  return clean
    .slice(1)
    .map((r) => ({
      names: [r[iName], iAlt >= 0 ? r[iAlt] : ""].map((x) => String(x || "").trim()).filter(Boolean),
      city: iCity >= 0 ? String(r[iCity] || "").trim() : "",
      address: iAddr >= 0 ? String(r[iAddr] || "").trim() : "",
    }))
    .filter((p) => p.names.length && (p.city || p.address));
};

// abbina le righe ai clienti: prima il nome uguale, poi «contiene» se il risultato è uno solo
export const matchPlaces = (places, customers) => {
  const custs = (customers || []).map((c) => ({ c, k: normName(c.name) })).filter((x) => x.k);
  const used = new Set();
  const found = [];
  const missing = [];
  (places || []).forEach((p) => {
    const keys = p.names.map(normName).filter(Boolean);
    let hit = custs.find((x) => !used.has(x.c.id) && keys.includes(x.k));
    let how = "uguale";
    if (!hit) {
      const cands = custs.filter(
        (x) =>
          !used.has(x.c.id) &&
          keys.some((k) => {
            const [a, b] = k.length <= x.k.length ? [k, x.k] : [x.k, k];
            return a.length >= 4 && (` ${b} `).includes(` ${a} `);
          })
      );
      if (cands.length === 1) {
        hit = cands[0];
        how = "simile";
      }
    }
    if (!hit) {
      missing.push(p);
      return;
    }
    used.add(hit.c.id);
    const same = String(hit.c.city || "") === p.city && String(hit.c.address || "") === p.address;
    found.push({
      customer: hit.c,
      city: p.city,
      address: p.address,
      fileName: p.names[0],
      how,
      same,
      // di base: sì se il cliente non ha ancora il paese; se ce l'ha diverso lo decidi tu
      checked: !same && !String(hit.c.city || hit.c.address || "").trim(),
    });
  });
  return { found, missing };
};
