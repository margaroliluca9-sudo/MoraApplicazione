// PARANCHI ELETTRICI A CATENA DONATI serie DMK 1/2/3/4: limiti di usura di catena e gancio.
// Tutto dal manuale del costruttore, parola per parola:
//   Donati Sollevamenti «Istruzioni per l'uso – Paranchi elettrici a catena serie DMK 1/2/3/4, carrelli DMT 2/3/4/5»
//   (KMAN03MI01, revisione luglio 2026), punto 6.3.3 «Verifiche di efficienza delle parti e dei componenti», pag. 81-83,
//   tabella della catena (norma FEM 9.671 paragrafo 4) e «Caratteristiche dei ganci di sollevamento dei paranchi DMK» (fig. 77).
// I disegni dell'app sono fatti dall'app. Niente valori inventati.

export const DMK_SOURCE = "Manuale Donati «Istruzioni per l'uso – Paranchi elettrici a catena serie DMK 1/2/3/4» (KMAN03MI01, rev. luglio 2026), punto 6.3.3, pag. 81-83";

// grandezze DMK: catena (tipo, d nominale, dm minimo usurato, passo p, passo max, 11 maglie nuove, 11 maglie max, rottura kN)
export const DMK_SIZES = [
  { id: "DMK1", chain: "4x12", d: 4, dm: 3.6, p: 12, pMax: 12.6, p11: 132, p11Max: 135.8, kN: 20.1 },
  { id: "DMK2", chain: "5x15", d: 5, dm: 4.5, p: 15, pMax: 15.75, p11: 165, p11Max: 170.9, kN: 31.4 },
  { id: "DMK3", chain: "7x21", d: 7, dm: 6.3, p: 21, pMax: 22.05, p11: 231, p11Max: 238.2, kN: 61.6 },
  { id: "DMK4", chain: "10x28", d: 10, dm: 9, p: 28, pMax: 29.4, p11: 308, p11Max: 317.7, kN: 126 },
];
// modelli: grandezza, tiri, portata massima per gruppo FEM (2m / 1Am / 1B), gancio (a2 apertura, h2 altezza della sezione), tipo gancio
export const DMK_MODELS = [
  { id: "DMK1 · 1 tiro", size: "DMK1", tiri: 1, fem2m: "250 kg", fem1am: "—", fem1b: "200 kg monofase", a2: 24.2, h2: 17, tipo: "" },
  { id: "DMK2 · 1 tiro", size: "DMK2", tiri: 1, fem2m: "500 kg", fem1am: "—", fem1b: "400 kg monofase", a2: 28.6, h2: 22, tipo: "" },
  { id: "DMK3 · 1 tiro", size: "DMK3", tiri: 1, fem2m: "1000 kg", fem1am: "—", fem1b: "800 kg monofase", a2: 35.7, h2: 29, tipo: "" },
  { id: "DMK4 · 1 tiro", size: "DMK4", tiri: 1, fem2m: "2000 kg", fem1am: "—", fem1b: "—", a2: 41.6, h2: 37, tipo: "" },
  { id: "DMK4 · 2/1 tiri", size: "DMK4", tiri: 2, fem2m: "3200 kg", fem1am: "4000 kg", fem1b: "—", a2: 45, h2: 48, tipo: "1.6 V" },
];
export const dmkModel = (id) => {
  const m = DMK_MODELS.find((x) => x.id === id) || DMK_MODELS[1];
  return { ...m, ...DMK_SIZES.find((s) => s.id === m.size) };
};

// testi del manuale, parola per parola
export const DMK_TEXT = {
  catenaTab: "La catena deve essere sostituita se presenta usure o deformazioni riferite alla sotto-riportata tabella (vedi norma FEM 9.671 paragrafo 4):",
  catenaUsura: "Catena e spina sono materiali di usura.",
  catenaStato: "Controllare lo stato di conservazione della catena per valutarne l'eventuale degradamento.",
  catenaLubr: "Una regolare lubrificazione ne allunga la durata.",
  catenaDove: "Nel corso delle ispezioni è bene osservare, con attenzione, le parti della catena che si avvolgono sulle noci e quelle in prossimità dei punti di fissaggio alle estremità.",
  catenaRegistro: "Annotare nell'apposito registro di controllo la data e i risultati degli esami, in modo da poter prevedere in futuro il periodo in cui la catena dovrà essere sostituita.",
  catenaFem: "La decisione di sostituire la catena, in conformità con la norma FEM 9.671 paragrafo 4, deve essere determinata dal grado di usura e di corrosione e da altri danni rilevati.",
  spina: "Ad ogni cambio catena si deve sostituire anche la spina capocatena.",
  asciutta: "Non impiegare per nessuna ragione il paranco con la catena asciutta o non sufficientemente lubrificata",
  gancioTrim: "Verifica trimestrale dell'efficienza del gancio di sollevamento (fig.77): Il gancio deve essere esaminato, segnalando eventuali anomalie relative a: Deformazioni, allungamenti, incisioni, usura, corrosioni, abrasioni. Integrità e funzionalità del dispositivo di sicurezza antisgancio (moschettone). Eccessivo attrito, il gancio deve ruotare e muoversi liberamente in tutte le direzioni con moto dolce e senza scatti. Diversamente occorre smontarlo ed esaminare il cuscinetto. Usura della zona a contatto con le imbracature.",
  gancioSost: "Sostituire il gancio quando si riscontrano: deformazione permanente con allargamento dell'apertura all'imbocco > del 10%. riduzioni dimensionali in qualsiasi punto > del 5%.",
  gancioA2: "Quota a2 > 10 % della dimensione nominale",
  gancioH2: "Quota h2 < 5 % della dimensione nominale",
  gancioAssistenza: "Per le procedure di sostituzione contattare il servizio tecnico di assistenza DONATI SOLLEVAMENTI S.r.l.",
  periodicita: "Catena, elementi di fissaggio: ispezione visiva giornaliera; verifica usura ed efficienza trimestrale. Gancio di sollevamento: ispezione visiva e verifica moschettone giornaliera; verifica usura ed efficienza trimestrale.",
  strutture: "variazioni di sezione ≥ del 10%, oppure di diametro o di spessore ≥ del 5 % rispetto ai valori iniziali",
};

// controlli a vista (dal manuale)
export const DMK_FLAGS = [
  { id: "moschettone", label: "Dispositivo di sicurezza antisgancio (moschettone) non integro o non funzionante", rimedio: "Ripristinare il moschettone; il manuale chiede integrità e funzionalità." },
  { id: "deform", label: "Gancio: deformazioni, allungamenti, incisioni, usura, corrosioni, abrasioni", rimedio: "Sostituire il gancio (contattare il servizio tecnico di assistenza DONATI SOLLEVAMENTI S.r.l.)." },
  { id: "attrito", label: "Eccessivo attrito: il gancio non ruota e non si muove liberamente in tutte le direzioni con moto dolce e senza scatti", rimedio: "Smontarlo ed esaminare il cuscinetto." },
  { id: "imbracature", label: "Usura della zona a contatto con le imbracature", rimedio: "Sostituire il gancio se la riduzione dimensionale supera il 5%." },
  { id: "catenaDanni", label: "Catena: usura, corrosione o altri danni rilevati (maglie sulle noci e vicino ai fissaggi)", rimedio: "Sostituire la catena e la spina capocatena (FEM 9.671 paragrafo 4)." },
  { id: "asciutta", label: "Catena asciutta o non sufficientemente lubrificata", rimedio: "Pulire e lubrificare prima di usare il paranco." },
];

const num = (v) => {
  const n = Number(String(v == null ? "" : v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};
export const fmtD = (v, dec = 2) => (v == null || Number.isNaN(v) ? "—" : Number(v).toLocaleString("it-IT", { maximumFractionDigits: dec, minimumFractionDigits: 0 }));

// le misure: [id, nome, dir ("min" = non scendere sotto, "max" = non superare), campo standard, campo limite, rimedio]
export const DMK_MEASURES = [
  { id: "d", part: "catena", label: "Catena · diametro del tondino d", dir: "min", std: "d", lim: "dm", rimedio: "Sostituire la catena e la spina capocatena." },
  { id: "p", part: "catena", label: "Catena · passo di una maglia p", dir: "max", std: "p", lim: "pMax", rimedio: "Sostituire la catena e la spina capocatena." },
  { id: "p11", part: "catena", label: "Catena · lunghezza di 11 maglie", dir: "max", std: "p11", lim: "p11Max", rimedio: "Sostituire la catena e la spina capocatena." },
  { id: "a2", part: "gancio", label: "Gancio · apertura all'imbocco a2", dir: "max", std: "a2", pct: 10, rimedio: "Sostituire il gancio." },
  { id: "h2", part: "gancio", label: "Gancio · altezza della sezione h2", dir: "min", std: "h2", pct: 5, rimedio: "Sostituire il gancio." },
];

// x = { model, d, p, p11, a2, h2, serie, flags }
export const checkDmk = (x) => {
  const m = dmkModel(x.model);
  const items = [];
  DMK_MEASURES.forEach((q) => {
    const v = num(x[q.id]);
    if (v == null) return;
    const std = m[q.std];
    const limit = q.lim ? m[q.lim] : Math.round(std * (1 + (q.dir === "max" ? q.pct : -q.pct) / 100) * 100) / 100;
    const over = q.dir === "max" ? v > limit : v < limit;
    const pct = Math.round(((v - std) / std) * 1000) / 10;
    // vicino al limite: oltre metà strada tra standard e limite
    const near = !over && (q.dir === "max" ? v > std + (limit - std) / 2 : v < std - (std - limit) / 2);
    items.push({ ...q, v, std, limit, over, near, pct });
  });
  const flags = DMK_FLAGS.filter((f) => x.flags && x.flags[f.id]);
  const bad = items.filter((i) => i.over);
  const level = bad.length || flags.length ? "scarto" : items.some((i) => i.near) ? "attenzione" : "ok";
  return { m, items, bad, flags, level, any: items.length > 0 || flags.length > 0 };
};

export const dmkVerdict = (r) => {
  const fix = [...r.bad.map((i) => `${i.label}: ${i.rimedio}`), ...r.flags.map((f) => `${f.label}: ${f.rimedio}`)];
  return {
    esito: r.level === "scarto" ? "NON IDONEO" : "IDONEO",
    azione: fix.length ? `Rimedio (manuale Donati): ${fix.join(" ")}` : "Nessun limite del manuale Donati superato.",
  };
};

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
const limTxt = (i) => `${i.dir === "max" ? "max" : "min"} ${fmtD(i.limit)} mm${i.pct ? ` (${i.dir === "max" ? "+" : "−"}${i.pct}%)` : ""}`;

export const dmkRegister = ({ r }) => {
  const v = dmkVerdict(r);
  const out = [`CONTROLLO PARANCO DONATI ${r.m.id} (catena ${r.m.chain}) – ${today()}${tech() ? " – tecnico " + tech() : ""}`];
  r.items.forEach((i) => out.push(`${i.label}: ${fmtD(i.v)} mm (nominale ${fmtD(i.std)}, limite ${limTxt(i)}) → ${i.over ? "OLTRE IL LIMITE" : "entro il limite"}`));
  r.flags.forEach((f) => out.push(`${f.label} → ${f.rimedio}`));
  out.push(`Esito: ${v.esito}`);
  out.push(`Fonte: ${DMK_SOURCE}.`);
  return out.join("\n");
};

export const dmkReport = ({ r, x }) => {
  const v = dmkVerdict(r);
  const rows = r.items.map((i) => [i.label, `${fmtD(i.v)} mm`, `${limTxt(i)} · nominale ${fmtD(i.std)}`, i.over ? "OLTRE IL LIMITE" : i.near ? "entro (vicino)" : "entro il limite"]);
  r.flags.forEach((f) => rows.push([f.label, "SÌ", "a vista", "SCARTO"]));
  return {
    type: "paranco",
    title: "VERBALE CONTROLLO PARANCO",
    tiles: [
      ["Paranco", `DONATI ${r.m.id}`],
      ["Misure prese", String(r.items.length)],
      ["Oltre il limite", String(r.bad.length + r.flags.length)],
    ],
    params: [
      ["Paranco", `DONATI serie DMK · ${r.m.id}`],
      ["Catena", `${r.m.chain} (d ${fmtD(r.m.d)} mm, passo ${fmtD(r.m.p)} mm) · rottura minima ${fmtD(r.m.kN, 1)} kN`],
      ["Portata massima", `FEM 2m ${r.m.fem2m}${r.m.fem1am !== "—" ? ` · FEM 1Am ${r.m.fem1am}` : ""}${r.m.fem1b !== "—" ? ` · FEM 1B ${r.m.fem1b}` : ""}`],
      ["Numero di serie", x.serie || ""],
    ],
    rows,
    rowHead: ["Controllo", "Misurato", "Limite", "Esito"],
    defects: r.flags.map((f) => f.label),
    esito: v.esito,
    azione: v.azione,
    level: r.level,
    norms: [
      `${DMK_SOURCE}: tabella della catena (FEM 9.671 paragrafo 4) e «Caratteristiche dei ganci di sollevamento dei paranchi DMK» (fig. 77). Limiti del costruttore.`,
      `Catena (manuale): «${DMK_TEXT.catenaTab}» «${DMK_TEXT.catenaFem}» «${DMK_TEXT.spina}»`,
      `Gancio (manuale): «${DMK_TEXT.gancioSost}» «${DMK_TEXT.gancioA2}» «${DMK_TEXT.gancioH2}»`,
      `Periodicità (manuale, tabella 6.3.2): ${DMK_TEXT.periodicita}`,
      "D.Lgs. 81/2008, Allegato VI, punto 3.1.2: «Le funi e le catene debbono essere sottoposte a controlli trimestrali in mancanza di specifica indicazione da parte del fabbricante.»",
    ],
  };
};
