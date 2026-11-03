// COSA SCRIVERE SUL REGISTRO DI CONTROLLO (fune e catena): oltre alla percentuale, l'esito e cosa fare,
// con le voci che il registro deve avere (data, tecnico, fune o catena, misure, difetti, gravità, esito).
// Fune: ISO 4309:2017 — gravità a scatti di 20% (lieve, media, alta, molto alta, scarto); più la gravità sale
// più si accorcia l'intervallo tra i controlli; al 100% la fune va scartata.
// Catena: usura oltre il 10% del nominale, allungamento oltre i limiti o difetti → scarto (EN 818-6 / costruttori).
import { ROPE_FLAGS, CHAIN_FLAGS } from "./wearRules";

const fmt = (v, dec = 1) => (v == null || Number.isNaN(v) ? "—" : Number(v).toLocaleString("it-IT", { maximumFractionDigits: dec, minimumFractionDigits: 0 }));
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
export const SEVERITY_WORD = (s) => (s >= 100 ? "scarto" : s >= 80 ? "molto alta" : s >= 60 ? "alta" : s >= 40 ? "media" : s >= 20 ? "lieve" : "trascurabile");

// gravità complessiva della fune (la peggiore tra fili rotti, diametro e i due insieme)
export const ropeSeverity = (r) => Math.max(r.s6 || 0, r.s30 || 0, r.dia ? r.dia.sev : 0, r.combined || 0, r.discard ? 100 : 0);

export const ropeVerdict = (r) => {
  const g = ropeSeverity(r);
  if (r.level === "scarto" || g >= 100)
    return { esito: "DA SCARTARE", azione: "Sostituire la fune. La gru non va usata finché la fune non è sostituita.", g };
  if (g >= 60) return { esito: "IDONEA CON RISERVA", azione: `Gravità ${SEVERITY_WORD(g)} (${g}%): accorciare l'intervallo tra i controlli e programmare la sostituzione della fune.`, g };
  if (g >= 40) return { esito: "IDONEA", azione: `Gravità media (${g}%): al prossimo controllo guardare bene il tratto peggiore.`, g };
  return { esito: "IDONEA", azione: "Nessun intervento: prossimo controllo alla scadenza normale.", g };
};

export const chainVerdict = (r) => {
  if (r.level === "scarto") return { esito: "DA SCARTARE", azione: "Sostituire la catena (e controllare la noce o la ruota del paranco). Il paranco non va usato finché la catena non è sostituita." };
  if (r.level === "attenzione") {
    const c = r.checks.slice().sort((a, b) => b.value / b.limit - a.value / a.limit)[0];
    return { esito: "IDONEA CON RISERVA", azione: `Vicina al limite (${fmt(c.value)}% su ${c.limit}% ammesso): ricontrollare più spesso e programmare la sostituzione.` };
  }
  return { esito: "IDONEA", azione: "Nessun intervento: prossimo controllo alla scadenza normale." };
};

// testo per il registro (da copiare)
export const ropeRegister = ({ r, x, label = "" }) => {
  const v = ropeVerdict(r);
  const d = Number(String(x.d || "").replace(",", ".")) || 0;
  const out = [`CONTROLLO FUNE (ISO 4309:2017) – ${today()}${tech() ? " – tecnico " + tech() : ""}`];
  out.push(`Fune: ${label || "non nota (valori prudenti)"}${d ? ` Ø${fmt(d)} mm` : ""}`);
  out.push(`Fili rotti visibili nel tratto peggiore: ${r.b6 || 0} su 6d${r.len6 ? ` (${r.len6} mm)` : ""}, scarto a ${r.lim.six} · ${r.b30 || 0} su 30d${r.len30 ? ` (${r.len30} mm)` : ""}, scarto a ${r.lim.thirty}`);
  out.push(r.dec != null ? `Diametro: riferimento ${fmt(r.dRef, 2)} mm · misurato ${fmt(r.dMis, 2)} mm · calo ${fmt(r.dec)}% (scarto al ${fmt(r.dia.limit)}%)` : "Diametro: non misurato");
  out.push(`Altri difetti: ${r.flags.length ? r.flags.map((k) => (ROPE_FLAGS.find((f) => f[0] === k) || [k, k])[1]).join("; ") : "nessuno"}`);
  out.push(`Gravità complessiva: ${v.g}% (${SEVERITY_WORD(v.g)})`);
  out.push(`Esito: ${v.esito} – ${v.azione}`);
  return out.join("\n");
};
export const chainRegister = ({ r, x }) => {
  const v = chainVerdict(r);
  const out = [`CONTROLLO CATENA ${x.kind === "imbracatura" ? "DI IMBRACATURA (EN 818-6)" : "DEL PARANCO"} – ${today()}${tech() ? " – tecnico " + tech() : ""}`];
  out.push(`Catena: Ø${fmt(r.d, 2)} mm nominale${Number(String(x.t || "").replace(",", ".")) ? ` · passo ${x.t} mm` : ""}`);
  out.push(r.wear != null ? `Usura: diametro medio ${fmt(r.dm, 2)} mm (minimo ${fmt(r.minDm, 2)} mm) · usura ${fmt(r.wear)}% (scarto oltre il 10%)` : "Usura: non misurata");
  if (r.p1 != null) out.push(`Allungamento di una maglia: ${fmt(r.p1)}% (scarto oltre il 5%)`);
  if (r.p11 != null && r.hoist) out.push(`Allungamento su 11 maglie: ${fmt(r.p11)}% (scarto oltre il 2%)`);
  out.push(`Altri difetti: ${r.flags.length ? r.flags.map((k) => (CHAIN_FLAGS.find((f) => f[0] === k) || [k, k])[1]).join("; ") : "nessuno"}`);
  out.push(`Esito: ${v.esito} – ${v.azione}`);
  return out.join("\n");
};

// ---------------------------------------------------------------- VERBALE IN PDF (Stampa)
// dati già pronti per il PDF (src/pdf.js → buildWearPdf): misure con limite ed esito, difetti, norme usate
const ok = (bad) => (bad ? "OLTRE IL LIMITE" : "entro il limite");
export const ropeReport = ({ r, x, label = "", fas = false }) => {
  const v = ropeVerdict(r);
  const d = Number(String(x.d || "").replace(",", ".")) || 0;
  const rows = [
    ["Fili rotti visibili su 6d" + (r.len6 ? ` (${r.len6} mm)` : ""), String(r.b6 || 0), `scarto a ${r.lim.six}`, `${ok((r.b6 || 0) >= r.lim.six)} · gravità ${r.s6}%`],
    ["Fili rotti visibili su 30d" + (r.len30 ? ` (${r.len30} mm)` : ""), String(r.b30 || 0), `scarto a ${r.lim.thirty}`, `${ok((r.b30 || 0) >= r.lim.thirty)} · gravità ${r.s30}%`],
  ];
  if (r.dec != null) rows.push(["Diametro (rif. " + fmt(r.dRef, 2) + " mm)", `${fmt(r.dMis, 2)} mm · calo ${fmt(r.dec)}%`, `scarto al ${fmt(r.dia.limit)}%`, `${ok(r.dia.sev >= 100)} · gravità ${r.dia.sev}%`]);
  else rows.push(["Diametro", "non misurato", "", ""]);
  if (r.dec != null && (r.b6 || r.b30)) rows.push(["Valutazione combinata (fili + diametro)", `${r.combined}%`, "scarto al 100%", ok(r.combined >= 100)]);
  const params = [
    ["Fune", label || "non nota"],
    ["Diametro nominale", d ? `${fmt(d)} mm` : ""],
    ["Fili portanti esterni (n) / RCN", r.n ? `${r.n}${r.lim.rcn ? " / RCN " + r.lim.rcn : ""}` : ""],
    ["Tipo di fune per la norma", r.rr ? "antigiro" : r.kind === "tessile" ? "a trefoli, anima tessile" : "a trefoli, anima metallica"],
    ["Cordatura", r.auto ? (x.lay === "crociata" ? "crociata" : "non nota: contata come parallela (più severa)") : x.lay === "parallela" ? "parallela (Lang)" : x.lay === "crociata" ? "crociata" : ""],
    ["Avvolgimento sul tamburo", x.layers === "piu" ? "a più strati" : "a uno strato / non noto"],
  ];
  const norms = [
    "ISO 4309:2017 (UNI ISO 4309) – Apparecchi di sollevamento – Funi – Cura e manutenzione, installazione, ispezione e scarto.",
    "  · Prospetto 3: numero di fili rotti visibili ammessi su 6d e 30d per funi a trefoli (in base al numero di fili portanti esterni, RCN).",
    "  · Prospetto 4: fili rotti ammessi per funi antigiro.",
    "  · Prospetto 5: diminuzione uniforme del diametro rispetto al diametro di riferimento (gravità 20-40-60-80-100%).",
    "  · Valutazione combinata di fili rotti e diminuzione del diametro; gravità a scatti di 20%; al 100% la fune va scartata.",
    "  · Valori per meccanismi di classe M1-M4 o di classe non nota (i più prudenti).",
  ];
  if (fas) norms.push("Catalogo funi FAS (rev. 09/2026): numero massimo di fili rotti su 6d e 30d indicato da FAS per questa fune e questo diametro.");
  if (r.auto) norms.push("Fune non identificata: per sicurezza si considera la fune più delicata del tipo osservato, cordatura parallela e anima metallica (valori più severi).");
  norms.push("D.Lgs. 81/2008, art. 71 e Allegato VI punto 3.1.2: controllo periodico (trimestrale) delle funi e delle catene degli apparecchi di sollevamento, con registrazione dell'esito.");
  return {
    type: "fune",
    title: "VERBALE DI CONTROLLO FUNE",
    tiles: [
      ["Fili rotti su 6d", `${r.b6 || 0} / ${r.lim.six}`],
      ["Fili rotti su 30d", `${r.b30 || 0} / ${r.lim.thirty}`],
      ["Calo diametro", r.dec != null ? `${fmt(r.dec)}% / ${fmt(r.dia.limit)}%` : "—"],
      ["Gravità", `${v.g}%`],
    ],
    params,
    rows,
    defects: r.flags.map((k) => (ROPE_FLAGS.find((f) => f[0] === k) || [k, k])[1]),
    esito: v.esito,
    azione: v.azione,
    level: r.level,
    norms,
  };
};
export const chainReport = ({ r, x }) => {
  const v = chainVerdict(r);
  const hoist = x.kind !== "imbracatura";
  const rows = [];
  if (r.wear != null) rows.push(["Usura della maglia (media di d1 e d2)", `Ø medio ${fmt(r.dm, 2)} mm · usura ${fmt(r.wear)}%`, `scarto oltre il 10% (sotto ${fmt(r.minDm, 2)} mm)`, ok(r.wear > 10)]);
  else rows.push(["Usura della maglia", "non misurata", "", ""]);
  if (r.p1 != null) rows.push(["Allungamento di una maglia", `${fmt(r.p1)}%`, "scarto oltre il 5%", ok(r.p1 > 5)]);
  if (hoist && r.p11 != null) rows.push(["Allungamento su 11 maglie", `${fmt(r.p11)}%`, "scarto oltre il 2%", ok(r.p11 > 2)]);
  const params = [
    ["Catena", hoist ? "del paranco" : "di imbracatura"],
    ["Diametro nominale", r.d ? `${fmt(r.d, 2)} mm` : ""],
    ["Misure", [x.d1, x.d2].filter(Boolean).map((m) => `${m} mm`).join(" · ")],
    ["Passo nominale", Number(String(x.t || "").replace(",", ".")) ? `${x.t} mm` : ""],
  ];
  const norms = hoist
    ? [
        "UNI EN 818-7 – Catene a maglia corta per sollevamento – Catene calibrate per paranchi (Grado T): caratteristiche della catena.",
        "Criteri di scarto dei costruttori dei paranchi (stesso criterio della EN 818-6): usura oltre il 10% del diametro nominale nel punto di contatto tra le maglie; allungamento di una maglia oltre il 5%; allungamento su 11 maglie oltre il 2%.",
      ]
    : ["UNI EN 818-6 – Catene a maglia corta per sollevamento – Catene di imbracatura – Istruzioni per l'uso e la manutenzione: scarto per usura oltre il 10% del diametro nominale (media di due misure a 90°), allungamento oltre il 5%, cricche, deformazioni, danni da calore."];
  norms.push("D.Lgs. 81/2008, art. 71 e Allegato VI punto 3.1.2: controllo periodico (trimestrale) delle funi e delle catene degli apparecchi di sollevamento, con registrazione dell'esito.");
  return {
    type: "catena",
    title: "VERBALE DI CONTROLLO CATENA",
    tiles: [
      ["Usura", r.wear != null ? `${fmt(r.wear)}% / 10%` : "—"],
      ["Diametro medio", r.wear != null ? `${fmt(r.dm, 2)} mm` : "—"],
      ["Minimo ammesso", r.minDm ? `${fmt(r.minDm, 2)} mm` : "—"],
      ["Allungamento", r.p1 != null ? `${fmt(r.p1)}% / 5%` : "—"],
    ],
    params,
    rows,
    defects: r.flags.map((k) => (CHAIN_FLAGS.find((f) => f[0] === k) || [k, k])[1]),
    esito: v.esito,
    azione: v.azione,
    level: r.level,
    norms,
  };
};
