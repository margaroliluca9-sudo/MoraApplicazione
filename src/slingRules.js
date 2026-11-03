// FASCE E ANELLI CONTINUI DI POLIESTERE (sottoganci): portata secondo il modo di imbracare e controllo a vista.
// Tutto dal catalogo FAS «Fasce e anelli continui di poliestere» (rev. 09/2025, pag. 262-264): testi copiati
// parola per parola, fattori di carico della tabella «Portata delle imbragature» (colori secondo EN 1492-1/2).
// Niente frasi inventate: l'esito è DA SCARTARE se si spunta uno dei casi che il catalogo indica.

export const SLING_SOURCE = "Catalogo FAS «Fasce e anelli continui di poliestere» (rev. 09/2025)";

// colori secondo EN 1492-1/2 (catalogo FAS, Fig. 2): portata in t
export const SLING_COLORS = [
  ["viola", "Viola", 1, "#7c3aed"],
  ["verde", "Verde", 2, "#16a34a"],
  ["giallo", "Giallo", 3, "#facc15"],
  ["grigio", "Grigio", 4, "#9ca3af"],
  ["rosso", "Rosso", 5, "#dc2626"],
  ["marrone", "Marrone", 6, "#92400e"],
  ["blu", "Blu", 8, "#2563eb"],
  ["arancio", "Arancio", 10, "#f97316"],
];

// modi di imbracare e fattori di carico (tabella «Portata delle imbragature», pag. 264)
export const SLING_MODES = [
  { id: "diritto", n: 1, label: "Diritta", factor: 1 },
  { id: "strozzo", n: 1, label: "A strozzo", factor: 0.8 },
  { id: "u0", n: 1, label: "Ad U verticale (β 0°-7°)", factor: 2 },
  { id: "u45", n: 1, label: "Ad U inclinata (β 7°-45°)", factor: 1.4 },
  { id: "u60", n: 1, label: "Ad U inclinata (β 45°-60°)", factor: 1 },
  { id: "tri45", n: 1, label: "Anello a triangolo (β 7°-45°)", factor: 0.7 },
  { id: "tri60", n: 1, label: "Anello a triangolo (β 45°-60°)", factor: 0.5 },
  { id: "due45", n: 2, label: "2 fasce, 2 bracci (β 7°-45°)", factor: 1.4 },
  { id: "due60", n: 2, label: "2 fasce, 2 bracci (β 45°-60°)", factor: 1 },
  { id: "duestr45", n: 2, label: "2 fasce a strozzo (β 7°-45°)", factor: 1.12 },
  { id: "duestr60", n: 2, label: "2 fasce a strozzo (β 45°-60°)", factor: 0.8 },
];

// testi del catalogo, parola per parola
export const SLING_TEXT = {
  angolo: "È proibito effettuare sollevamenti con angolo β superiore a 60° (Figura 1).",
  simmetria: "Le portate indicate si riferiscono a carichi simmetrici e bracci di uguale lunghezza.",
  asola: "Quando l'asola di una fascia viene inserita nel gancio della gru, l'angolo non deve superare 20°, poiché la cucitura potrebbe strapparsi (Figura 3). La formula approssimativa prevede che la lunghezza dell'asola sottocarico corrisponda max alla larghezza del gancio moltiplicata 3,5 volte: L = b x 3,5.",
  spigoli: "Il raggio dell'angolo r deve essere sempre maggiore dello spessore d della braca di sollevamento (Figura 4). Se questo non fosse possibile, le brache di poliestere devono obbligatoriamente essere dotate di opportune protezioni.",
  temperatura: "Le brache di poliestere possono essere utilizzate in presenza di temperature comprese tra -40 °C e +100 °C (Figura 5). In presenza di prodotti chimici, è assolutamente necessario contattare il produttore per verificare la compatibilità.",
  marcatura: "Ogni braca deve riportare le seguenti indicazioni: Identificazione del costruttore; Materiale del nastro (abbr. Poliestere: PES); Lunghezza nominale in metri; Carico massimo di esercizio; Codice di rintracciabilità; Marcatura CE; Le norme di riferimento.",
  verifiche: "Le brache devono essere ispezionate attentamente al più tardi ogni tre mesi da un responsabile della sicurezza, fermo restando che vanno sempre controllate prima di essere utilizzate.",
  scarto: "Le brache non possono più essere utilizzate quando presentano tagli, anche di piccole dimensioni, deformazioni o segni di deterioramento, rammollimento o irrigidimento del nastro, o perdita di flessibilità. Nel caso di anelli continui, scartare la braca non appena si lacera la guaina esterna.",
  danneggiate: "Non utilizzare mai brache danneggiate anche parzialmente.",
  nodi: "Non accorciare le brache annodandole, poiché la portata diminuirebbe enormemente.",
  chimici: "Il poliestere si disintegra nell'acido solforico concentrato.",
  norme: "I riferimenti Europei per la costruzione delle brache di poliestere sono indicati nelle norme armonizzate EN 1492-1 (brache piatte con asole) e EN 1492-2 (anelli continui).",
};

// casi di scarto (dal testo del catalogo)
export const SLING_FLAGS = [
  ["tagli", "Tagli, anche di piccole dimensioni"],
  ["deforma", "Deformazioni"],
  ["deterioramento", "Segni di deterioramento"],
  ["rigidita", "Rammollimento o irrigidimento del nastro, o perdita di flessibilità"],
  ["guaina", "Anello continuo: guaina esterna lacerata", "anello"],
  ["parziale", "Braca danneggiata anche parzialmente"],
];

const fmt = (v, dec = 2) => (v == null || Number.isNaN(v) ? "—" : Number(v).toLocaleString("it-IT", { maximumFractionDigits: dec, minimumFractionDigits: 0 }));

export const checkSling = (x) => {
  const wll = Number(String(x.wll || "").replace(",", ".")) || 0;
  const mode = SLING_MODES.find((m) => m.id === x.mode) || SLING_MODES[0];
  const cap = wll ? Math.round(wll * mode.factor * 1000) / 1000 : null;
  const flags = SLING_FLAGS.filter(([k, , only]) => x.flags && x.flags[k] && (!only || only === x.kind)).map(([k, l]) => ({ k, l }));
  const catalog = flags.length > 0;
  // regola Mora: senza targhetta (etichetta) la braca si scarta
  if (x.labelBad) flags.unshift({ k: "etichetta", l: "Targhetta (etichetta) mancante o illeggibile" });
  const discard = flags.length > 0;
  return { wll, mode, cap, flags, discard, catalog, level: discard ? "scarto" : "ok", labelBad: !!x.labelBad };
};

export const slingVerdict = (r) => ({
  esito: r.discard ? "DA SCARTARE" : "IDONEA",
  azione: r.discard ? `${r.flags.map((f) => f.l).join("; ")}.${r.catalog ? ` «${SLING_TEXT.scarto}»` : ""}` : "Nessuno dei casi di scarto indicati nel catalogo; targhetta presente.",
});

const today = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
const tech = () => {
  try {
    return localStorage.getItem("mora_tech_last_name") || "";
  } catch (e) {
    return "";
  }
};
const kindName = (k) => (k === "anello" ? "anello continuo (EN 1492-2)" : "fascia piatta con asole (EN 1492-1)");

export const slingRegister = ({ r, x }) => {
  const v = slingVerdict(r);
  const out = [`CONTROLLO BRACA DI POLIESTERE – ${today()}${tech() ? " – tecnico " + tech() : ""}`];
  out.push(`Braca: ${kindName(x.kind)}${x.mora ? ` · N. Mora ${x.mora}` : ""}${x.code ? ` · ${x.code}` : ""}${r.wll ? ` · portata ${fmt(r.wll)} t${x.color ? ` (${x.color})` : ""}` : ""}${x.len ? ` · lunghezza ${x.len} m` : ""}`);
  if (r.cap != null) out.push(`Uso: ${r.mode.label} · fattore ${fmt(r.mode.factor)} · portata ${fmt(r.cap)} t`);
  out.push(`Targhetta: ${r.labelBad ? "mancante o illeggibile" : "presente e leggibile"}`);
  out.push(`Casi di scarto trovati: ${r.flags.length ? r.flags.map((f) => f.l).join("; ") : "nessuno"}`);
  out.push(`Esito: ${v.esito}`);
  return out.join("\n");
};

export const slingReport = ({ r, x }) => {
  const v = slingVerdict(r);
  const rows = SLING_FLAGS.filter(([, , only]) => !only || only === x.kind).map(([k, l]) => [l, x.flags && x.flags[k] ? "SÌ" : "no", "scarto", x.flags && x.flags[k] ? "SCARTO" : "assente"]);
  rows.unshift(["Targhetta (etichetta) presente e leggibile", r.labelBad ? "NO" : "sì", "senza targhetta: scarto", r.labelBad ? "SCARTO" : "presente"]);
  return {
    type: "fascia",
    title: "VERBALE CONTROLLO BRACA",
    tiles: [
      ["Portata nominale", r.wll ? `${fmt(r.wll)} t` : "—"],
      ["Fattore di carico", fmt(r.mode.factor)],
      ["Portata nell'uso", r.cap != null ? `${fmt(r.cap)} t` : "—"],
    ],
    params: [
      ["Braca", kindName(x.kind)],
      ["Modo di imbracare", r.mode.label],
      ["Colore", x.color || ""],
      ["Numero Mora (targhetta)", x.mora || ""],
      ["Codice del fabbricante", x.code || ""],
      ["Lunghezza", x.len ? `${x.len} m` : ""],
    ],
    rows,
    rowHead: ["Controllo", "Trovato", "Criterio", "Esito"],
    mora: x.mora || "",
    defects: r.flags.map((f) => f.l),
    esito: v.esito,
    azione: v.azione,
    level: r.level,
    norms: [
      `${SLING_SOURCE}: «${SLING_TEXT.norme}»`,
      `Fattori di carico: tabella «Portata delle imbragature» del catalogo (colori secondo EN1492-1/2). «${SLING_TEXT.simmetria}» «${SLING_TEXT.angolo}»`,
      `Criteri di scarto (catalogo): «${SLING_TEXT.scarto}» «${SLING_TEXT.danneggiate}»`,
      `Marcatura (catalogo): «${SLING_TEXT.marcatura}» Elettromeccanica Mora: senza targhetta la braca si scarta.`,
      `Verifiche periodiche (catalogo): «${SLING_TEXT.verifiche}»`,
    ],
  };
};
