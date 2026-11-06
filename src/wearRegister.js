// COSA SCRIVERE SUL REGISTRO DI CONTROLLO e VERBALE (fune e catena): solo dati e criteri, niente frasi inventate.
// Esito: DA SCARTARE se è raggiunto un criterio di scarto, altrimenti IDONEA; accanto, quali criteri
// sono stati raggiunti (o «Nessun criterio di scarto raggiunto»).
// Norma di legge citata parola per parola: D.Lgs. 81/2008, Allegato VI, punto 3.1.2.
import { ROPE_FLAGS, ROPE_FLAG_ISO, CHAIN_FLAGS } from "./wearRules";

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
// testo di legge (D.Lgs. 81/2008, Allegato VI, punto 3.1.2), parola per parola
export const DLGS_3_1_2 = "D.Lgs. 81/2008, Allegato VI, punto 3.1.2: «Le funi e le catene debbono essere sottoposte a controlli trimestrali in mancanza di specifica indicazione da parte del fabbricante.»";

// gravità complessiva della fune (la peggiore tra fili rotti, diametro e i due insieme)
export const ropeSeverity = (r) => Math.max(r.s6 || 0, r.s30 || 0, r.dia ? r.dia.sev : 0, r.combined || 0, r.discard ? 100 : 0);

const NONE = "Nessun criterio di scarto raggiunto.";
export const ropeVerdict = (r) => {
  const g = ropeSeverity(r);
  const why = [];
  if ((r.b6 || 0) >= r.lim.six) why.push(`fili rotti su 6d: ${r.b6} (scarto a ${r.lim.six})`);
  if ((r.b30 || 0) >= r.lim.thirty) why.push(`fili rotti su 30d: ${r.b30} (scarto a ${r.lim.thirty})`);
  if (r.dia && r.dia.sev >= 100) why.push(`calo del diametro ${fmt(r.dec)}% (scarto al ${fmt(r.dia.limit)}%)`);
  if (!why.length && (r.combined || 0) >= 100) why.push("fili rotti e calo del diametro insieme: 100%");
  r.flags.forEach((k) => why.push((ROPE_FLAGS.find((f) => f[0] === k) || [k, k])[1]));
  const scarto = r.level === "scarto" || g >= 100 || why.length > 0;
  return { esito: scarto ? "DA SCARTARE" : "IDONEA", azione: scarto ? `Criterio di scarto raggiunto: ${why.join("; ")}.` : NONE, g };
};

export const chainVerdict = (r) => {
  const why = r.checks.filter((c) => c.bad).map((c) => `${c.label.toLowerCase()} ${fmt(c.value)}% (scarto oltre il ${c.limit}%)`);
  r.flags.forEach((k) => why.push((CHAIN_FLAGS.find((f) => f[0] === k) || [k, k])[1]));
  const scarto = r.level === "scarto" || why.length > 0;
  return { esito: scarto ? "DA SCARTARE" : "IDONEA", azione: scarto ? `Criterio di scarto raggiunto: ${why.join("; ")}.` : NONE };
};

// testo per il registro (da copiare)
export const ropeRegister = ({ r, x, label = "" }) => {
  const v = ropeVerdict(r);
  const d = Number(String(x.d || "").replace(",", ".")) || 0;
  const out = [`CONTROLLO FUNE (ISO 4309:2017) – ${today()}${tech() ? " – tecnico " + tech() : ""}`];
  out.push(`Fune: ${label || "non nota (valori prudenti)"}${d ? ` Ø${fmt(d)} mm` : ""}`);
  out.push(`Fili rotti visibili nel tratto peggiore: ${r.b6 || 0} su 6d${r.len6 ? ` (${r.len6} mm)` : ""}, scarto a ${r.lim.six} · ${r.b30 || 0} su 30d${r.len30 ? ` (${r.len30} mm)` : ""}, scarto a ${r.lim.thirty}`);
  out.push(r.dec != null ? `Diametro: riferimento ${fmt(r.dRef, 2)} mm · misurato ${fmt(r.dMis, 2)} mm${r.ms && r.ms.length > 1 ? ` (media di ${r.ms.length} misure: ${r.ms.map((m) => fmt(m, 2)).join(" · ")})` : ""} · calo ${fmt(r.dec)}% sul nominale (scarto al ${fmt(r.dia.limit)}%${r.dia.teci ? ", catalogo Teci" : ""})` : "Diametro: non misurato");
  if (r.incWarn) out.push(`Diametro aumentato del ${fmt(r.inc)}% rispetto al riferimento (ISO 4309, 6.7.6: cercarne la causa e valutare lo scarto)`);
  out.push(`Altri difetti: ${r.flags.length ? r.flags.map((k) => (ROPE_FLAGS.find((f) => f[0] === k) || [k, k])[1]).join("; ") : "nessuno"}`);
  out.push(`Gravità complessiva: ${v.g}%`);
  out.push(`Esito: ${v.esito} – ${v.azione}`);
  return out.join("\n");
};
export const chainRegister = ({ r, x }) => {
  const v = chainVerdict(r);
  const out = [`CONTROLLO CATENA ${x.kind === "imbracatura" ? "DEI SOTTOGANCI (BRACA DI CATENA)" : "DEL PARANCO"} – ${today()}${tech() ? " – tecnico " + tech() : ""}`];
  out.push(`Catena: ${x.kind === "imbracatura" && x.mora ? `N. Mora ${x.mora} · ` : ""}Ø${fmt(r.d, 2)} mm nominale${Number(String(x.t || "").replace(",", ".")) ? ` · passo ${x.t} mm` : ""}`);
  out.push(r.wear != null ? `Usura: misura più bassa ${fmt(r.dm, 2)} mm${r.ds && r.ds.length > 1 ? ` su ${r.ds.length} misure (${r.ds.map((m) => fmt(m, 2)).join(" · ")}; media ${fmt(r.dMean, 2)} mm)` : ""} (minimo ${fmt(r.minDm, 2)} mm) · usura ${fmt(r.wear)}% (scarto oltre il 10%)` : "Usura: non misurata");
  if (r.p1 != null) out.push(`Allungamento di una maglia: ${fmt(r.p1)}% (scarto oltre il 5%)`);
  if (r.p11 != null && r.hoist) out.push(`Allungamento su 11 maglie: ${fmt(r.p11)}% (scarto oltre il 2%)`);
  if (r.hook != null) out.push(`Apertura del gancio: ${fmt(r.h1, 2)} mm su ${fmt(r.h0, 2)} mm nominali, +${fmt(Math.max(0, r.hook))}% (scarto oltre il 10%)`);
  out.push(`Altri difetti: ${r.flags.length ? r.flags.map((k) => (CHAIN_FLAGS.find((f) => f[0] === k) || [k, k])[1]).join("; ") : "nessuno"}`);
  out.push(`Esito: ${v.esito} – ${v.azione}`);
  return out.join("\n");
};

// ---------------------------------------------------------------- VERBALE IN PDF (Stampa)
// dati già pronti per il PDF (src/pdf.js → buildWearPdf): misure con limite ed esito, difetti, norme usate
const ok = (bad) => (bad ? "OLTRE IL LIMITE" : "entro il limite");
export const ropeReport = ({ r, x, label = "", fas = false, teci = false }) => {
  const v = ropeVerdict(r);
  const d = Number(String(x.d || "").replace(",", ".")) || 0;
  const rows = [
    ["Fili rotti visibili su 6d" + (r.len6 ? ` (${r.len6} mm)` : ""), String(r.b6 || 0), `scarto a ${r.lim.six}`, `${ok((r.b6 || 0) >= r.lim.six)} · gravità ${r.s6}%`],
    ["Fili rotti visibili su 30d" + (r.len30 ? ` (${r.len30} mm)` : ""), String(r.b30 || 0), `scarto a ${r.lim.thirty}`, `${ok((r.b30 || 0) >= r.lim.thirty)} · gravità ${r.s30}%`],
  ];
  if (r.dec != null) rows.push(["Diametro (rif. " + fmt(r.dRef, 2) + " mm)" + (r.ms && r.ms.length > 1 ? ` – media di ${r.ms.length} misure (${r.ms.map((m) => fmt(m, 2)).join(" · ")})` : ""), `${fmt(r.dMis, 2)} mm · calo ${fmt(r.dec)}%`, `scarto al ${fmt(r.dia.limit)}%${r.dia.teci ? " (Teci)" : ""}`, `${ok(r.dia.sev >= 100)} · gravità ${r.dia.sev}%`]);
  if (r.inc > 0) rows.push(["Aumento del diametro rispetto al riferimento", `+${fmt(r.inc)}%`, `${r.incLimit}% o più: cercarne la causa`, r.incWarn ? "DA VERIFICARE" : "sotto la soglia"]);
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
    "ISO 4309:2017 (UNI ISO 4309) – Cranes – Wire ropes – Care and maintenance, inspection and discard. Criteri usati: numero di fili rotti visibili su 6d e su 30d (Prospetti 3 e 4), diminuzione uniforme del diametro (Prospetto 5; calo = (diametro di riferimento − diametro misurato) / diametro nominale × 100, punto 6.4.2), valutazione combinata dei due; valori per meccanismi di classe M1–M4 o di classe non nota. Diametro misurato: «Media di due misurazioni, prese ad angolo retto una rispetto all'altra» (punto 3.2). Aumento del diametro in servizio del 5% o più (anima metallica) o del 10% o più (anima tessile): cercarne la causa e valutare lo scarto (punto 6.7.6). Funi Seale con 19 fili o meno per trefolo: due righe più su nel Prospetto 3. Altri difetti controllati a vista: punti 6.2.1, 6.4.3, 6.5, 6.6, 6.7.2–6.7.10.",
  ];
  if (fas) norms.push("Catalogo funi FAS (rev. 09/2026): numero massimo di fili rotti su 6d e 30d indicato nel catalogo per questa fune e questo diametro.");
  if (teci) norms.push(`Catalogo Teci «Funi in acciaio / Steel Wire Ropes»: costruzione, fili portanti esterni e carico di rottura minimo della fune${r.lim.teci ? "; fili rotti ammessi dalla tabella Teci «Rottura dei fili (secondo ISO 4309)», meccanismi M1–M4" : ""}. Diametro: «il diametro della fune, anche in un solo punto, risulta ridotto del 7% rispetto a quello nominale» → sostituzione.`);
  if (r.auto) norms.push("Fune non identificata: l'app usa i valori della fune più delicata del tipo osservato, con cordatura parallela e anima metallica.");
  norms.push(DLGS_3_1_2);
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
    defects: r.flags.map((k) => (ROPE_FLAGS.find((f) => f[0] === k) || [k, k])[1] + (ROPE_FLAG_ISO[k] ? ` (ISO 4309, ${ROPE_FLAG_ISO[k]})` : "")),
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
  if (r.wear != null) rows.push(["Usura della maglia (misura più bassa)", `Ø ${fmt(r.dm, 2)} mm · usura ${fmt(r.wear)}%`, `scarto oltre il 10% (sotto ${fmt(r.minDm, 2)} mm)`, ok(r.wear > 10)]);
  else rows.push(["Usura della maglia", "non misurata", "", ""]);
  if (r.p1 != null) rows.push(["Allungamento di una maglia", `${fmt(r.p1)}%`, "scarto oltre il 5%", ok(r.p1 > 5)]);
  if (hoist && r.p11 != null) rows.push(["Allungamento su 11 maglie", `${fmt(r.p11)}%`, "scarto oltre il 2%", ok(r.p11 > 2)]);
  if (r.hook != null) rows.push(["Apertura del gancio", `${fmt(r.h1, 2)} mm su ${fmt(r.h0, 2)} mm · +${fmt(Math.max(0, r.hook))}%`, "scarto oltre il 10%", ok(r.hook > 10)]);
  const params = [
    ["Catena", hoist ? "del paranco" : "dei sottoganci (braca di catena)"],
    ["Numero Mora (targhetta)", hoist ? "" : x.mora || ""],
    ["Diametro nominale", r.d ? `${fmt(r.d, 2)} mm` : ""],
    ["Misure", (r.ds || []).map((m) => `${fmt(m, 2)} mm`).join(" · ") + (r.ds && r.ds.length > 1 ? ` (media ${fmt(r.dMean, 2)} mm)` : "")],
    ["Passo nominale", Number(String(x.t || "").replace(",", ".")) ? `${x.t} mm` : ""],
  ];
  const norms = hoist
    ? ["Catena del paranco: limiti usati dall'app – usura oltre il 10% del diametro nominale, allungamento di una maglia oltre il 5%, allungamento su 11 maglie oltre il 2%. Fanno fede i limiti del manuale del costruttore del paranco."]
    : ["Sottoganci (brache di catena), UNI EN 818-6. Limiti usati dall'app: usura oltre il 10% del diametro nominale, allungamento della maglia oltre il 5%; apertura del gancio: l'aumento non deve superare il 10% del valore nominale; marcatura della portata illeggibile o assente: fuori servizio."];
  norms.push("Elettromeccanica Mora: basta una sola misura sotto il 90% del diametro nominale perché la catena sia da scartare (si considera la misura più bassa, non la media).");
  norms.push(DLGS_3_1_2);
  return {
    type: "catena",
    sottoganci: !hoist,
    mora: hoist ? "" : x.mora || "",
    title: "VERBALE DI CONTROLLO CATENA",
    tiles: [
      ["Usura", r.wear != null ? `${fmt(r.wear)}% / 10%` : "—"],
      ["Misura più bassa", r.wear != null ? `${fmt(r.dm, 2)} mm` : "—"],
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
