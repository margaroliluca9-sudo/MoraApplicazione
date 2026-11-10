// PARANCHI ELETTRICI A CATENA KITO (serie KQ e KF): limiti di usura, conta ore, codici errore e guasti.
// Tutto dai manuali FAS/KITO, parola per parola:
//  - «Istruzioni d'uso e di sicurezza – Paranchi elettrici a catena serie KQ (da 125 kg a 1 t)» (pag. 57, 64-67, 75-79)
//  - «Istruzioni d'uso e di sicurezza per inverter – serie KQ» (fascicolo KQ-1111-CE-00, pag. 13-24)
//  - catalogo FAS «Paranchi elettrici a catena serie KF – Dimensioni ganci e catene» (rev. 02/2018, pag. 93)
// I disegni dell'app sono fatti dall'app (non sono quelli del manuale). Niente frasi inventate.

export const KQ_SOURCE = "Manuale KITO «Istruzioni d'uso e di sicurezza – Paranchi elettrici a catena serie KQ»";
export const INV_SOURCE = "Manuale KITO «Istruzioni d'uso e di sicurezza per inverter – serie KQ» (KQ-1111-CE-00)";
export const KF_SOURCE = "Catalogo FAS «Paranchi elettrici a catena serie KF – Dimensioni ganci e catene» (rev. 02/2018, pag. 93)";

// modelli KQ e i loro valori (Standard / Limite)
// catena: somma dei passi di 5 maglie (non superare il limite massimo) e diametro (non superare il limite minimo)
// gancio: a (solo standard: si confronta con la misura all'acquisto), b, c; occhiello di sospensione: d, e
export const KQ_MODELS = [
  { id: "KQ1SD", wll: "125 kg", g: "s" },
  { id: "KQ3SD", wll: "250 kg", g: "s" },
  { id: "KQ5SD", wll: "500 kg", g: "s", molla: [29, 26.5] },
  { id: "KQ10SD", wll: "1 t", g: "l", molla: [26.5, 24] },
];
const SIZES = {
  s: { chain: "Ø 5,6", passo5: [79, 81.5], d: [5.6, 5.1], a: 45.0, b: [17.5, 16.6], c: [23.5, 22.3], od: [8.0, 7.6], oe: [27.0, 25.7], puleggia: [3.4, 2.3], frenoB: [3, 2.5], olio: 510 },
  l: { chain: "Ø 7,1", passo5: [100, 103], d: [7.1, 6.4], a: 50.0, b: [22.5, 21.4], c: [31.0, 29.5], od: [12.3, 11.7], oe: [27.0, 25.7], puleggia: [5, 3.3], frenoB: [4, 3.5], olio: 840 },
};
export const kqModel = (id) => {
  const m = KQ_MODELS.find((x) => x.id === id) || KQ_MODELS[0];
  return { ...m, ...SIZES[m.g] };
};

// le misure del controllo: [id, nome, a cosa si riferisce, "max" = non superare il limite massimo | "min" = minimo, rimedio del manuale]
export const KQ_MEASURES = [
  { id: "passo5", part: "catena", label: "Somma dei passi di 5 maglie", dir: "max", rimedio: "Sostituire la catena di carico." },
  { id: "d", part: "catena", label: "Diametro del tondino (d)", dir: "min", rimedio: "Sostituire la catena di carico." },
  { id: "b", part: "gancio", label: "Gancio · dimensione b (larghezza del gancio)", dir: "min", rimedio: "Sostituire il gancio e l'occhiello di sospensione." },
  { id: "c", part: "gancio", label: "Gancio · dimensione c (spessore del gancio)", dir: "min", rimedio: "Sostituire il gancio e l'occhiello di sospensione." },
  { id: "od", part: "occhiello", label: "Occhiello · dimensione d (spessore dell'occhiello di sospensione)", dir: "min", rimedio: "Sostituire il gancio e l'occhiello di sospensione." },
  { id: "oe", part: "occhiello", label: "Occhiello · dimensione e (larghezza dell'occhiello di sospensione)", dir: "min", rimedio: "Sostituire il gancio e l'occhiello di sospensione." },
  { id: "puleggia", part: "puleggia", label: "Puleggia di carico · spessore", dir: "min", rimedio: "Sostituire la puleggia di carico." },
  { id: "molla", part: "molla", label: "Molla della catena · lunghezza", dir: "min", rimedio: "Sostituire la molla della catena." },
  { id: "frenoB", part: "freno", label: "Freno · dimensione B (guarnizione del freno)", dir: "min", rimedio: "Sostituire la campana freno, il coperchio del motore, la molla del freno e la molla del rotore a trazione." },
];

// controlli a vista (dalle colonne «Condizioni normali» e «Rimedio» del manuale)
export const KQ_FLAGS = [
  { id: "antisgancio", label: "Sicurezza antisgancio non installata correttamente, deformata o che non si muove liberamente", rimedio: "Se necessario, sostituire la sicurezza antisgancio.", warn: "Non utilizzare il gancio se privo della sicurezza antisgancio." },
  { id: "gancioDanni", label: "Gancio: deformazioni (es. distorsioni o piegature), tagli profondi, corrosione eccessiva o materiali estranei", rimedio: "Se necessario, sostituire il gancio." },
  { id: "rotazione", label: "Il gancio non ruota regolarmente a mano", rimedio: "Se necessario, sostituire il gancio." },
  { id: "freno", label: "Freno: alla fermata non entra subito in funzione o la distanza di arresto supera l'1% (in linea di massima 2-3 maglie)", rimedio: "Smontare il freno per verificarne il corretto montaggio e che non siano presenti componenti anomali." },
  { id: "arresto", label: "Arresto della catena non fissato alla terza maglia dalla parte terminale del lato non del carico", rimedio: "Fissare l'arresto alla terza maglia." },
  { id: "molla", label: "Molla della catena deformata", rimedio: "Sostituire la molla della catena." },
];

// testi del manuale KQ, parola per parola
export const KQ_TEXT = {
  catena: "Utilizzare un calibro digitale per misurare la somma dei passi e il diametro del tondino.",
  catenaNota: "Se si riscontra l'usura della catena di carico, verificare anche l'usura della puleggia.",
  passo5: "Il valore massimo della \"somma dei passi di cinque maglie\" non deve essere mai superato.",
  diametro: "Il valore massimo del \"diametro del tondino della catena di carico\" non deve essere mai superato.",
  gancio: "Comparare le dimensioni a, b e c con quelle misurate al momento dell'acquisto e verificare che rientrino nei limiti ammissibili.",
  gancioA: "All'apertura della confezione, compilare la tabella a destra con la dimensione \"a\" (apertura del gancio, misurata tra i segni in rilievo sul gancio inferiore), la dimensione \"b\" (larghezza del gancio), la \"c\" (spessore del gancio), la \"d\" (spessore dell'occhiello di sospensione) e la \"e\" (larghezza dell'occhiello di sospensione).",
  gancioRischio: "Utilizzare ganci le cui dimensioni superano i limiti ammissibili potrebbe infatti causare lesioni personali o danni materiali.",
  usura5: "L'usura non deve eccedere il 5%.",
  gancioLimiteA: "Le dimensioni registrare al momento dell'acquisto",
  gancioTabella: "Le tabelle seguenti indicano i valori nominali standard. NB: questi valori includono la tolleranza dovuta alla forgiatura.",
  puleggia: "Se si riscontra usura sulla puleggia di carico, è probabile che l'usura sia presente anche sulla catena di carico: verificarla facendo riferimento al relativo punto del presente manuale.",
  molla: "La deformazione della molla della catena è dovuta a un uso eccessivo dell'innesto della frizione e del finecorsa. Utilizzare sempre correttamente il paranco elettrico a catena.",
  freno: "Sollevare e abbassare il paranco di 20 o 30 cm con un peso e quindi fermarlo. Una volta fermata l'operazione, il freno deve entrare immediatamente in funzione e il motore si deve fermare. Salita/discesa: La distanza di arresto deve essere pari o inferiore all'1% della distanza percorsa dalla catena in un minuto di sollevamento o discesa.",
  frenoMaglie: "(In linea di massima: la catena può scendere al massimo di 2-3 maglie dal momento in cui viene premuto il pulsante).",
  frenoB1: "Una volta raggiunto il milione di avviamenti, verificare la dimensione B e prendere le misure necessarie, secondo quanto indicato in tabella.",
  frenoB2: "Una volta raggiunti i due milioni di avviamenti, sostituire la campana del freno, il coperchio del motore, la molla del freno e la molla del rotore, a prescindere dalla dimensione B.",
  lubrificazione: "Una lubrificazione regolare aumenta notevolmente la durata di servizio della catena di carico. Utilizzare lubrificanti originali KITO o prodotti equivalenti (grasso industriale al litio, consistenza 0).",
  lubrificazione2: "Eliminare tutti i carichi dalla catena. Applicare il lubrificante in particolare sulla parte di catena di carico che ingrana sulla puleggia.",
  lubrificazione3: "Dopo l'applicazione del lubrificante, eseguire operazioni di sollevamento/discesa senza carico per far sì che il lubrificante si distribuisca sulla catena.",
  grasso: "Grasso lubrificante Epinoc Grease AP (N)0 (Nippon Oil Corporation) · Grasso lubrificante con consistenza 0 (grasso industriale generico al litio)",
  olio: "L'utilizzo di un olio per ingranaggi incorretto può causare la caduta del carico sospeso. Assicurarsi sempre di utilizzare l'olio raccomandato.",
  olio5: "Se le ore di funzionamento non hanno raggiunto i livelli indicati in tabella, cambiare comunque l'olio ogni cinque anni.",
  contaOre: "Durante i controlli, verificare il numero di avviamenti e le ore di funzionamento. In base a questi dati, verificare lo stato di funzionamento del paranco e la manutenzione.",
  contaOreNota: "Nota: Il valore massimo che può essere indicato non è indicativo del termine della vita utile del prodotto.",
  ricambi: "Sostituire sempre i componenti con prodotti originali KITO. Anche se un componente è originale, non è possibile usarlo se è stato progettato per un altro modello.",
  parametri: "Non modificare i parametri dell'inverter. Per la loro modifica, contattare KITO o il rivenditore più vicino a voi.",
  cinqueMinuti: "Non svolgere operazioni quali manutenzione o controlli prima di 5 minuti dallo spegnimento. Attendere che il condensatore all'interno dell'inverter sia completamente scarico.",
  ventola: "Durante il funzionamento del paranco, il coperchio della ventola si surriscalda molto. Non toccarlo.",
};

// freno: le tre condizioni della dimensione B (tabella pag. 75)
export const frenoBState = (B, [std, lim]) => {
  if (!(B > 0)) return null;
  if (B <= lim) return { level: "scarto", cond: "È stato raggiunto il limite di tolleranza.", azione: "Sostituire la campana freno, il coperchio del motore, la molla del freno e la molla del rotore a trazione." };
  if (B < (std + lim) / 2) return { level: "attenzione", cond: "Si è più prossimi al raggiungimento del limite di tolleranza piuttosto che a un punto intermedio tra lo standard e il limite.", azione: "Da questo momento in poi, verificare la dimensione B ogni centomila avviamenti, fino al raggiungimento del limite di tolleranza." };
  return { level: "ok", cond: "Si è più prossimi allo standard piuttosto che a un punto intermedio tra lo standard e il limite.", azione: "Verificare la dimensione B ogni duecentomila avviamenti." };
};

const num = (v) => {
  const n = Number(String(v == null ? "" : v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};
export const fmtK = (v, dec = 1) => (v == null || Number.isNaN(v) ? "—" : Number(v).toLocaleString("it-IT", { maximumFractionDigits: dec, minimumFractionDigits: 0 }));

// controllo KQ: x = { model, passo5, d, a, b, c, od, oe, puleggia, molla, frenoB, flags }
export const checkKq = (x) => {
  const m = kqModel(x.model);
  const items = [];
  KQ_MEASURES.forEach((q) => {
    const lim = m[q.id];
    if (!lim) return;
    const v = num(x[q.id]);
    if (v == null) return;
    const [std, limit] = lim;
    // freno B: il manuale dice «È stato raggiunto il limite di tolleranza → sostituire», quindi al limite esatto è già scarto.
    // Le altre misure: «non deve essere mai superato», al limite esatto si è ancora dentro.
    const over = q.id === "frenoB" ? v <= limit : q.dir === "max" ? v > limit : v < limit;
    const it = { ...q, v, std, limit, over };
    if (q.id === "frenoB") it.state = frenoBState(v, lim);
    items.push(it);
  });
  // apertura «a»: il manuale dà solo lo standard (e rimanda alla misura all'acquisto, che nessuno ha).
  // Limite: +10% dello standard, UNI EN 818-6 (apertura del gancio). Sopra lo standard il campo è arancio.
  const a = num(x.a);
  let aInfo = null;
  if (a != null) {
    const base = m.a;
    const limit = Math.round(base * 1.1 * 100) / 100;
    const pct = Math.round(((a - base) / base) * 1000) / 10;
    const over = a > limit;
    aInfo = { v: a, std: m.a, base, pct, limit, pctLim: 10, over, near: !over && a > base, rule: "UNI EN 818-6: apertura del gancio +10% sullo standard del manuale" };
  }
  const flags = KQ_FLAGS.filter((f) => x.flags && x.flags[f.id]);
  const bad = items.filter((i) => i.over);
  const aBad = !!(aInfo && aInfo.over);
  const level = bad.length || flags.length || aBad ? "scarto" : items.some((i) => i.state && i.state.level === "attenzione") || (aInfo && aInfo.near) ? "attenzione" : "ok";
  return { m, items, bad, aInfo, aBad, flags, level, any: items.length > 0 || !!aInfo || flags.length > 0 };
};

export const kqVerdict = (r) => {
  const fix = [...r.bad.map((i) => `${i.label}: ${i.rimedio}`), ...(r.aBad ? [`Gancio · dimensione a (apertura) ${fmtK(r.aInfo.v, 2)} mm, oltre ${fmtK(r.aInfo.limit, 2)} mm (${r.aInfo.rule}): Sostituire il gancio e l'occhiello di sospensione.`] : []), ...r.flags.map((f) => `${f.label}: ${f.rimedio}`)];
  return {
    esito: r.level === "scarto" ? "NON IDONEO" : "IDONEO",
    azione: fix.length ? `Rimedio (manuale KQ): ${fix.join(" ")}` : "Nessun limite del manuale superato.",
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
const limTxt = (i) => `${i.dir === "max" ? "max" : "min"} ${fmtK(i.limit, 2)} mm`;

export const kqRegister = ({ r }) => {
  const v = kqVerdict(r);
  const out = [`CONTROLLO PARANCO KITO ${r.m.id} (${r.m.wll}) – ${today()}${tech() ? " – tecnico " + tech() : ""}`];
  r.items.forEach((i) => out.push(`${i.label}: ${fmtK(i.v, 2)} mm (standard ${fmtK(i.std, 2)}, limite ${limTxt(i)}) → ${i.over ? "OLTRE IL LIMITE" : "entro il limite"}${i.state && !i.over ? ` · ${i.state.azione}` : ""}`));
  if (r.aInfo) out.push(`Gancio · dimensione a (apertura): ${fmtK(r.aInfo.v, 2)} mm (standard ${fmtK(r.aInfo.std, 2)}; limite ${fmtK(r.aInfo.limit, 2)} mm, ${r.aInfo.rule}) → ${r.aInfo.over ? "OLTRE IL LIMITE" : "entro il limite"}`);
  r.flags.forEach((f) => out.push(`${f.label} → ${f.rimedio}`));
  out.push(`Esito: ${v.esito}`);
  return out.join("\n");
};

export const kqReport = ({ r, x }) => {
  const v = kqVerdict(r);
  const rows = r.items.map((i) => [i.label, `${fmtK(i.v, 2)} mm`, `${limTxt(i)} (std ${fmtK(i.std, 2)})`, i.over ? "OLTRE IL LIMITE" : i.state && i.state.level === "attenzione" ? "entro (vicino)" : "entro il limite"]);
  if (r.aInfo) rows.push(["Gancio · dimensione a (apertura)", `${fmtK(r.aInfo.v, 2)} mm`, `max ${fmtK(r.aInfo.limit, 2)} (+10% su std ${fmtK(r.aInfo.std, 2)}, EN 818-6)`, r.aInfo.over ? "OLTRE IL LIMITE" : r.aInfo.near ? "entro (si è aperto)" : "entro il limite"]);
  r.flags.forEach((f) => rows.push([f.label, "SÌ", "a vista", "SCARTO"]));
  return {
    type: "paranco",
    title: "VERBALE CONTROLLO PARANCO",
    tiles: [
      ["Paranco", `KITO ${r.m.id}`],
      ["Misure prese", String(r.items.length + (r.aInfo ? 1 : 0))],
      ["Oltre il limite", String(r.bad.length + r.flags.length)],
    ],
    params: [
      ["Paranco", `KITO serie KQ · ${r.m.id}`],
      ["Portata", r.m.wll],
      ["Catena di carico", r.m.chain],
      ["Numero di serie", x.serie || ""],
      ["Conta ore (U7-03)", x.ore ? `${x.ore} ore` : ""],
    ],
    rows,
    rowHead: ["Controllo", "Misurato", "Limite", "Esito"],
    defects: r.flags.map((f) => f.label),
    esito: v.esito,
    azione: v.azione,
    level: r.level,
    norms: [
      `${KQ_SOURCE}: tabelle «Passo della catena di carico e diametro per le singole portate», «Gancio inferiore / Occhiello di sospensione», «Puleggia di carico», «Molla della catena», «Usura della guarnizione del freno durante l'uso».`,
      `Catena (manuale): «${KQ_TEXT.passo5}» «${KQ_TEXT.diametro}»`,
      `Gancio (manuale): «${KQ_TEXT.gancio}» «${KQ_TEXT.usura5}» Apertura a: il manuale dà solo lo standard (rimanda alla misura all'acquisto); l'app usa la UNI EN 818-6 (aumento massimo 10% sullo standard).`,
      `Freno (manuale): «${KQ_TEXT.freno}»`,
      "D.Lgs. 81/2008, Allegato VI, punto 3.1.2: «Le funi e le catene debbono essere sottoposte a controlli trimestrali in mancanza di specifica indicazione da parte del fabbricante.»",
    ],
  };
};

// ---------------------------------------------------------------- CONTA ORE (pag. 75-77)
export const LOADS = [
  { id: "leggero", label: "Leggero", text: "Meccanismo soggetto molto raramente al carico massimo. Il paranco è normalmente soggetto a carichi leggeri.", olio: 360, gancio: 2000000 },
  { id: "medio", label: "Medio", text: "Meccanismo soggetto frequentemente al carico massimo. Il paranco è normalmente soggetto a carichi abbastanza moderati.", olio: 240, gancio: 1500000 },
  { id: "pesante", label: "Pesante", text: "Meccanismo soggetto frequentemente al carico massimo. Il paranco è normalmente soggetto a carichi pesanti.", olio: 120, gancio: 1000000 },
  { id: "moltopesante", label: "Molto pesante", text: "Meccanismo soggetto regolarmente al carico massimo.", olio: 120, gancio: 1000000 },
];
// «Dimensione corpo paranco»: ore prima della sostituzione
export const BODIES = [
  { id: "M5", label: "M5, 2m", ingranaggi: 1600, albero: 1600, cuscinetti: 1600 },
  { id: "M6", label: "M6, 3m", ingranaggi: 3200, albero: 3200, cuscinetti: 3200 },
];
export const U7 = [
  ["U7-01", "Numero di avviamenti", "Una singola unità rappresenta 1000 sollevamenti/discese. Sono indicate al massimo 10.000 unità. Per es., 10.000 x 1.000 = 10.000.000 di avviamenti"],
  ["U7-02", "Numero di avviamenti", "Una singola unità rappresenta un unico sollevamento/discesa. Sono indicate al massimo 999 unità. Raggiunte le 1000 operazioni, il valore di U7-01 (superiore) aumenta di un'unità (+1), mentre U7-02 (inferiore) ritorna a 0."],
  ["U7-03", "Ore di funzionamento", "L'unità di misura è l'ora. Sono indicate al massimo 65.535 ore."],
];
// procedura per leggere il conta ore (i tasti come sul pannello dell'inverter)
export const U7_STEPS = [
  ["Collegare la corrente."],
  ["Premere ", "[∧]", " fino alla visualizzazione della schermata di controllo."],
  ["Premere ", "[ENTER]", " per visualizzare la schermata per l'impostazione dei parametri, quindi premere ", "[ESC]", "."],
  ["Premere ", "[∧]", " o ", "[∨]", " per visualizzare U7-01."],
  ["Premere ", "[RESET]", ", ", "[∧]", ", o ", "[∨]", " e impostare U7-03 (ore di funzionamento)"],
  ["Premere ", "[ENTER]", " per visualizzare il valore corrente."],
  ["Per terminare i controlli e riprendere il normale funzionamento, tenere premuto ", "[ESC]", " fino al ritorno alla schermata iniziale."],
];

export const contaOre = ({ u1, u2, ore, load, body }) => {
  const a1 = Number(String(u1 || "").replace(/\D/g, "")) || 0;
  const a2 = Number(String(u2 || "").replace(/\D/g, "")) || 0;
  const h = Number(String(ore || "").replace(/\D/g, "")) || 0;
  const avv = a1 * 1000 + a2;
  const L = LOADS.find((l) => l.id === load) || null;
  const B = BODIES.find((b) => b.id === body) || null;
  const rows = [];
  if (L) rows.push({ id: "olio", label: "Olio per ingranaggi", when: `Ogni ${L.olio} ore`, has: h > 0, reached: h >= L.olio, value: `${fmtK(h, 0)} ore`, note: KQ_TEXT.olio5 });
  if (B) {
    rows.push({ id: "ingranaggi", label: "Ingranaggi (ingranaggio di carico, frizione con ingranaggio 2, ingranaggio 3)", when: `Sostituzione del componente: ogni ${B.ingranaggi} ore`, has: h > 0, reached: h >= B.ingranaggi, value: `${fmtK(h, 0)} ore` });
    rows.push({ id: "albero", label: "Albero motore (con rotore)", when: `Lubrificare le scanalature: ogni 800 ore · Sostituzione del componente: ogni ${B.albero} ore`, has: h > 0, reached: h >= B.albero, value: `${fmtK(h, 0)} ore`, note: "* È necessario lubrificare le scanalature ogni 800, 1600 e 2400 ore." });
    rows.push({ id: "cuscinetti", label: "Cuscinetti", when: `Sostituzione del componente: ogni ${B.cuscinetti} ore`, has: h > 0, reached: h >= B.cuscinetti, value: `${fmtK(h, 0)} ore` });
  }
  if (L) rows.push({ id: "gancio", label: "Gancio, bozzello e occhiello di sospensione", when: `Ogni ${fmtK(L.gancio / 1000000, 1)} ${L.gancio === 1000000 ? "milione" : "milioni"} di avviamenti`, has: avv > 0, reached: avv >= L.gancio, value: `${fmtK(avv, 0)} avviamenti` });
  rows.push({ id: "frenoB", label: "Freno · verificare la dimensione B", when: "Al milione di avviamenti", has: avv > 0, reached: avv >= 1000000, value: `${fmtK(avv, 0)} avviamenti`, note: KQ_TEXT.frenoB1 });
  rows.push({ id: "freno2", label: "Freno · sostituire campana, coperchio del motore, molla del freno e molla del rotore", when: "Ai due milioni di avviamenti", has: avv > 0, reached: avv >= 2000000, value: `${fmtK(avv, 0)} avviamenti`, note: KQ_TEXT.frenoB2 });
  return { avv, h, rows, L, B };
};

// ---------------------------------------------------------------- CODICI ERRORE DELL'INVERTER (manuale inverter, pag. 13-24)
// kind: "errore" = caratteri accesi (ALM accesa, il motore si ferma) · "minore" = caratteri che lampeggiano · "funz" = errore di funzionamento
export const INV_KINDS = {
  errore: { label: "Errore", hint: "Caratteri accesi (non lampeggianti), ALM accesa", text: "I caratteri indicanti i dettagli dell'errore sono visualizzati sul display LED e la modalità ALM è accesa. La potenza erogata dall'inverter viene arrestata e il motore si arresta dopo un giro in folle." },
  minore: { label: "Errore/avvertimento di entità minore", hint: "Caratteri che lampeggiano, ALM lampeggia", text: "I caratteri indicanti i dettagli dell'errore di minore entità lampeggiano sul display LED e la modalità ALM lampeggia. Il motore non si arresta. Azioni: Dopo la rivelazione di un errore/allarme di minore entità, eliminare immediatamente la causa. L'inverter tornerà automaticamente allo stato iniziale." },
  funz: { label: "Errore di funzionamento", hint: "Errore d'immissione parametro", text: "Un errore di funzionamento viene visualizzato per un errore d'immissione parametro, combinazione errata dei parametri o guasto della scheda opzionale. Azioni: Dopo la rivelazione di un errore, eliminare la causa dell'errore mediante l'impostazione del corrispondente parametro, ecc. L'inverter entrerà in funzione unicamente quando il parametro sarà impostato correttamente." },
};

const CPF_CAUSE = ["Si è verificato ognuno dei seguenti errori. Errore RAM/Errore FLASH/eccezione circuito temporizzazione", "Errore RAM", "Errore memoria Flash (Errore ROM)", "Errore temporizzatore di allarme", "Errore orologio"];
const RESTART = "Scollegare e ricollegare l'alimentazione elettrica al fine di verificare l'eventuale comparsa di errori. Se l'errore si ripete spesso, sostituire l'inverter.";
const NOISE = "Verificare lo stato del filtro antidisturbo. Controllare il cablaggio del circuito di controllo così come il cablaggio e il cablaggio della massa del circuito principale, e prendere i necessari provvedimenti al fine di eliminare il rumore. Se la fonte che genera il rumore è il contattore elettromagnetico, collegare un assorbitore della sovracorrente momentanea alla bobina del contattore elettromagnetico.";
const UV_FIX = [
  "Controllare il cablaggio dell'alimentazione del circuito principale al fine di verificare la presenza di cablaggi errati o rotti. Realizzare il cablaggio correttamente.",
  "Controllare i morsetti al fine di verificare eventuali allentamenti. Riserrare il morsetto.",
  "Controllare la tensione. Regolare la tensione fino alla specifica dell'alimentazione elettrica dell'inverter.",
  "Controllare l'alimentazione elettrica.",
  "Controllare se si verifica un allarme quando l'interruttore del cablaggio, l'interruttore del rivelatore di massa (con la funzione di protezione da sovracorrente) oppure il teleruttore sono accesi. Revisionare la capacità del trasformatore dell'alimentazione",
  "Controllare la temperatura ambiente dell'inverter.",
  "Sostituire l'inverter.",
];
const UV_CAUSE = [
  "Si è verificata un'interruzione di fase dell'alimentazione.",
  "Il terminale di cablaggio dell'alimentazione in entrata è allentato.",
  "Si è verificato un errore nella tensione dell'alimentazione principale.",
  "Si è verificato un guasto a livello della potenza.",
  "La tensione dell'alimentazione elettrica diminuisce rapidamente in corrispondenza della corrente di punta dell'inverter a causa della capacità insufficiente del trasformatore dell'alimentazione elettrica.",
  "Errore dell'atmosfera interna dell'inverter.",
  "Guasto della spia CHARGE",
];

export const INV_ERRORS = [
  { code: "CF", kind: "errore", name: "Errore di controllo", desc: "Il limite della coppia ha impiegato 3 secondi o più in successione nel corso della decelerazione/arresto", cause: ["L'inerzia del carico è elevata."], fix: ["Regolare i parametri utilizzati tra C1-02, -04, -06, -08 (tempo di decelerazione).", "Abbassare il comando di frequenza alla frequenza di uscita minima per la decelerazione, quindi commutare a off il comando di trasmissione."] },
  { code: "CPF06", kind: "errore", name: "Errore dati EEPROM", desc: "I dati salvati nella memoria EEPROM sono errati.", cause: ["Il circuito di controllo è danneggiato."], fix: ["Scollegare e ricollegare l'alimentazione elettrica al fine di verificare il funzionamento.", "Se l'errore si verifica nuovamente, sostituire l'inverter."] },
  { code: "CPF07", kind: "errore", name: "Errore di comunicazione della morsettiera", desc: "Guasto a livello della morsettiera.", cause: ["Errore di comunicazione tra la morsettiera e la scheda di comando"], fix: ["Spegnere l'alimentazione principale dell'inverter e ricollegare il morsetto del circuito di controllo."] },
  { code: "CPF08", kind: "errore", name: "Errore di comunicazione seriale della memoria EEPROM", desc: "Guasto a livello della memoria EEPROM", cause: ["Errore di comunicazione tra la morsettiera e la scheda di comando."], fix: ["Spegnere l'alimentazione principale dell'inverter e ricollegare il morsetto del circuito di controllo."] },
  { code: "CPF11", kind: "errore", name: "Errore RAM", desc: "Errore RAM", cause: CPF_CAUSE, fix: ["Sostituire l'inverter"] },
  { code: "CPF12", kind: "errore", name: "Errore della memoria flash", desc: "Errore ROM (memoria flash)", cause: CPF_CAUSE, fix: ["Sostituire l'inverter"] },
  { code: "CPF13", kind: "errore", name: "Errore temporizzatore di allarme", desc: "Errore auto-diagnosi", cause: CPF_CAUSE, fix: ["Sostituire l'inverter"] },
  { code: "CPF14", kind: "errore", name: "Errore del circuito di controllo", desc: "Guasto a livello della CPU (malfunzionamento della CPU dovuta al rumore)", cause: CPF_CAUSE, fix: ["Sostituire l'inverter"] },
  { code: "CPF16", kind: "errore", name: "Errore orologio", desc: "Riferimento errore orologio", cause: CPF_CAUSE, fix: ["Sostituire l'inverter"] },
  { code: "CPF17", kind: "errore", name: "Errore interruzione", desc: "La temporizzazione dell'elaborazione interna era sbagliata", cause: CPF_CAUSE, fix: ["Sostituire l'inverter"] },
  { code: "CPF18", kind: "errore", name: "Errore del circuito di controllo", desc: "Guasto a livello della CPU (malfunzionamento della CPU dovuta al rumore)", cause: CPF_CAUSE, fix: ["Sostituire l'inverter"] },
  { code: "CPF19", kind: "errore", name: "Errore del circuito di controllo", desc: "Guasto a livello della CPU (malfunzionamento della CPU dovuta al rumore)", cause: CPF_CAUSE, fix: ["Sostituire l'inverter"] },
  { code: "CPF20", alt: ["CPF21"], kind: "errore", name: "Errore RAM / Errore della memoria flash / Errore temporizzatore di allarme / Errore orologio", desc: "", cause: CPF_CAUSE, fix: ["Sostituire l'inverter"] },
  { code: "EF1…EF7", alt: ["EF1", "EF2", "EF3", "EF4", "EF5", "EF6", "EF7"], kind: "errore", name: "Errore esterno (Terminale input da S1 a S7)", desc: "Un errore esterno è stato causato da un terminale input di contatto malfunzione (da S1 a S7)", cause: ["La funzione di allarme dell'attrezzatura esterna è in funzione.", "Il cablaggio è sbagliato."], fix: ["Eliminare la causa dell'errore esterno e rimuovere l'input d'errore esterno dell'input multifunzionale.", "Verificare che la linea del segnale sia collegata correttamente. Collegare correttamente la linea del segnale."] },
  { code: "GF", kind: "errore", name: "Errore della massa", desc: "La corrente di protezione messa a terra ha superato del 50% la corrente nominale in uscita dell'invertitore all'interno del lato di uscita dell'inverter.", cause: ["Interruzione dovuta a cortocircuito o isolamento del motore.", "Guasto a livello della massa o del cavo verificatosi in conseguenza di un cavo danneggiato.", "La reattanza capacitiva oscillante tra il cavo e il terminale (terra) è elevata"], fix: ["Verificare la resistenza dell'isolamento del motore. Sostituire il motore in caso di guasto.", "Controllare il valore della resistenza tra il cavo e il terminale (di terra). Sostituire il cavo se si verifica questa situazione. Controllare il cavo di alimentazione del motore. Rimuovere la parte che presenta il guasto a livello della massa e collegare nuovamente l'alimentazione elettrica.", "Se la lunghezza del cavo supera i 100 metri, abbassare la frequenza del convogliatore. Eseguire le necessarie misurazioni al fine di ridurre la variazione della reattanza capacitiva."] },
  { code: "LF", kind: "errore", name: "Interruzione fase uscita", desc: "L'interruzione di fase si è verificata nel lato di uscita dell'invertitore.", cause: ["Il cavo di uscita è rotto", "La bobina (avvolgimento) all'interno del motore è rotta.", "Il morsetto in uscita è allentato."], fix: ["Controllare il cablaggio del cavo in uscita per verificare l'eventuale presenza di cablaggio errato o danneggiato. Realizzare il cablaggio correttamente.", "Misurare la resistenza di linea del motore. Se la bobina è rotta, sostituire il motore.", "Controllare il morsetto al fine di verificare eventuali allentamenti, quindi riserrare Il morsetto."] },
  { code: "oC", kind: "errore", name: "Sovracorrente", desc: "È stata rivelata una corrente in uscita dell'inverter che eccede il livello di rivelazione della sovracorrente.", cause: ["Interruzione dovuta a cortocircuito o isolamento del motore.", "Guasto a livello della massa o del cavo verificatosi in conseguenza di un cavo danneggiato.", "Il carico è eccessivo.", "Malfunzionamento dovuto al rumore."], fix: ["Verificare la resistenza dell'isolamento del motore. Sostituire il motore in caso di guasto.", "Controllare il cavo di alimentazione del motore. Rimuovere la parte che presenta il guasto a livello della massa e collegare nuovamente l'alimentazione elettrica. Controllare il valore della resistenza tra il cavo e il terminale (massa). Sostituire il cavo in caso di guasto.", "Misurare la corrente che fluisce attraverso il motore. Se il valore della corrente eccede la corrente nominale dell'inverter, procedere alla riduzione del carico. Verificare se il valore della corrente cambia improvvisamente. Se la corrente cambia improvvisamente, ridurre l'oscillazione del carico.", "Verificare lo stato delle protezioni antirumore. Controllare il cablaggio del circuito di controllo così come il cablaggio e il cablaggio della massa del circuito principale, e prendere i necessari provvedimenti al fine di eliminare il rumore. Se la fonte che genera il rumore è il contattore elettromagnetico, collegare un assorbitore della sovracorrente momentanea alla bobina del contattore elettromagnetico."] },
  { code: "oH", kind: "errore", name: "Termodispersore surriscaldato", desc: "La temperatura del termodispersore dell'inverter supera il valore dell'impostazione (da 90° a 100°).", cause: ["La temperatura dell'ambiente è troppo alta", "La frequenza è troppo alta", "Il carico è eccessivo."], fix: ["Controllare la temperatura dell'ambiente. Rimuovere gli elementi in prossimità del riscaldamento, se presenti. Utilizzare il prodotto nell'ambito della gamma di temperatura ambiente nominale.", "Utilizzare il prodotto nell'ambito della gamma nominale.", "Misurare la corrente d'uscita. Ridurre il carico."] },
  { code: "oH1", kind: "errore", name: "Termodispersore surriscaldato", desc: "La temperatura del termodispersore dell'inverter supera da 100° a 110°C.", cause: ["La temperatura dell'ambiente è troppo alta", "La frequenza è troppo alta", "Il carico è eccessivo."], fix: ["Controllare la temperatura dell'ambiente. Rimuovere gli elementi in prossimità del riscaldamento, se presenti. Utilizzare il prodotto nell'ambito della gamma di temperatura ambiente nominale.", "Utilizzare il prodotto nell'ambito della gamma nominale.", "Misurare la corrente d'uscita. Ridurre il carico."] },
  { code: "oL1", kind: "errore", name: "Sovraccarico motore", desc: "La protezione del sovraccarico del motore si è innescata a causa di una sovratemperatura.", cause: ["Il carico è eccessivo."], fix: ["Controllare il peso del carico. Ridurre il carico."] },
  { code: "oL2", kind: "errore", name: "Sovraccarico inverter", desc: "La protezione del sovraccarico del motore si è innescata a causa di uno shock termico elettrico.", cause: ["Il carico è eccessivo."], fix: ["Controllare il peso del carico. Ridurre il carico."] },
  { code: "oL3", kind: "errore", name: "Rivelazione coppia eccessiva 1", desc: "Flusso continuo di una corrente che supera il valore dell'impostazione.", cause: ["Il carico è eccessivo."], fix: ["Controllare il peso del carico. Ridurre il carico."] },
  { code: "oL4", alt: ["oLF"], kind: "errore", name: "Rivelazione coppia eccessiva 2", desc: "Flusso continuo di una corrente che supera il valore dell'impostazione.", cause: ["Il carico è eccessivo."], fix: ["Controllare il peso del carico. Ridurre il carico."] },
  { code: "ov", kind: "errore", name: "Sovratensione circuito principale", desc: "La tensione del circuito principale DC eccede il livello di sovratensione. Classe 200V: Circa 410V Classe 400V: Circa 820V", cause: ["Si è verificata un guasto a livello della massa del motore. Una corrente presentante un guasto a livello della massa sta caricando il condensatore del circuito principale all'interno dell'inverter mediante l'alimentazione elettrica.", "La tensione dell'alimentazione elettrica è troppo alta.", "La resistenza di frenatura è interrotta.", "Il cablaggio della resistenza di frenatura non è corretto.", "Malfunzionamento dovuto al rumore."], fix: ["Controllare il cavo di alimentazione, il morsetto del relè e la morsettiera del motore. Rimuovere la parte che presenta il guasto a livello della massa e collegare nuovamente l'alimentazione elettrica.", "Controllare la tensione. Abbassare la tensione fino alla specifica dell'alimentazione elettrica dell'inverter.", "Sostituire l'inverter.", "Controllare il collegamento della resistenza di frenatura. Realizzare il cablaggio correttamente.", "Verificare lo stato del filtro antidisturbo. Controllare il cablaggio del circuito di controllo così come il cablaggio e il cablaggio della massa del circuito principale, e prendere i necessari provvedimenti al fine di eliminare il disturbo. Se la fonte che genera il disturbo è il teleruttore, collegare un assorbitore della sovracorrente momentanea alla bobina del teleruttore."] },
  { code: "PF", kind: "errore", name: "Errore di tensione del circuito principale", desc: "La tensione del circuito principale DC fluttua in maniera anomala, diversamente da quanto avviene durante la rigenerazione.", cause: ["Si è verificata un'interruzione di fase dell'alimentazione elettrica in ingresso.", "Il terminale di cablaggio dell'alimentazione in entrata è allentato.", "La fluttuazione della tensione dell'alimentazione in ingresso è troppo alta.", "L'equilibrio della tensione tra le fasi è insufficiente.", "Il condensatore del circuito principale all'interno dell'inverter è deteriorato."], fix: ["Controllare il cablaggio dell'alimentazione del circuito principale al fine di verificare la presenza di cablaggi errati o rotti. Realizzare il cablaggio correttamente.", "Controllare i morsetti al fine di verificare eventuali allentamenti. Riserrare il morsetto.", "Controllare la tensione dell'alimentazione elettrica. Intraprendere le azioni necessarie per la stabilizzazione dell'alimentazione elettrica.", "Controllare la tensione dell'alimentazione elettrica e mettere in atto i necessari provvedimenti per la stabilizzazione dell'alimentazione elettrica.", "Controllare l'alimentazione elettrica in entrata al fine di verificare l'eventuale presenza di errori. Se non è presente alcun errore nel lato dell'alimentazione elettrica e gli allarmi si verificano frequentemente, eseguire la seguente procedura.", "Sostituire l'inverter."] },
  { code: "rr", kind: "errore", name: "Errore della resistenza di frenatura interna", desc: "Malfunzionamento della resistenza di frenatura.", cause: ["Il transistore di smorzamento è rotto. Circuito di controllo dell'inverter difettoso."], fix: [RESTART] },
  { code: "Uv1", kind: "errore", name: "Tensione bassa del circuito principale", desc: "Gli stati esposti in seguito si verificano quando viene innescato un comando di trasmissione (quando l'inverter non è in funzione). La tensione CC del circuito è al di sotto del valore dell'impostazione. Classe 200V: Circa 190V · Classe 400V: Circa 380V", cause: [...UV_CAUSE.slice(0, 3), "Si è verificato un guasto a livello della potenza. Il circuito interno dell'inverter è deteriorato", ...UV_CAUSE.slice(4)], fix: UV_FIX },
  { code: "Uv2", kind: "errore", name: "Errore dell'alimentazione di controllo", desc: "La tensione dell'alimentazione di controllo ha subito un calo improvviso.", cause: ["Errore del circuito interno dell'inverter."], fix: [RESTART] },
  { code: "Uv3", kind: "errore", name: "Errore del circuito di prevenzione picco", desc: "Si è verificato un guasto a livello del circuito di prevenzione del picco.", cause: ["Guasto del contattore del circuito di prevenzione del picco all'interno dell'inverter.", "Errore dell'atmosfera interna dell'inverter."], fix: ["Scollegare e ricollegare l'alimentazione elettrica al fine di verificare l'eventuale comparsa di errori. Se l'errore si verifica sostituire l'inverter.", "Controllare la temperatura ambiente dell'inverter."] },
  // errori / avvertimenti di entità minore (lampeggiano)
  { code: "EF", kind: "minore", name: "Input simultaneo comando avanti/indietro", desc: "Il comando di rotazione in avanti e il comando di rotazione indietro sono stati azionati contemporaneamente per 0,5 secondi o più.", cause: ["Errore sequenza"], fix: ["Rivedere e modificare il cablaggio del comando avanti/indietro."] },
  { code: "EF1…EF7", alt: ["EF1", "EF2", "EF3", "EF4", "EF5", "EF6", "EF7"], kind: "minore", name: "Errore esterno (terminale input da S1 a S7)", desc: "Un errore esterno è stato causato da un terminale input di contatto malfunzione (da S1 a S7)", cause: ["La funzione di allarme dell'attrezzatura esterna è in funzione.", "Il cablaggio è sbagliato."], fix: ["Eliminare la causa dell'errore esterno e rimuovere l'input d'errore esterno dell'input multifunzionale.", "Verificare che la linea del segnale sia collegata correttamente al terminale esterno. Collegare correttamente la linea del segnale."] },
  { code: "Hbb", kind: "minore", name: "È stato attivato una segnalazione di sicurezza", desc: "Una segnalazione di sicurezza è stata azionata dal terminale di input.", cause: ["L'interruttore di arresto di emergenza è stato premuto."], fix: ["Resettare l'arresto di emergenza."] },
  { code: "HCA", kind: "minore", name: "Avviso corrente", desc: "La corrente in uscita dall'inverter ha ecceduto il livello di segnalazione di sovracorrente (150% della corrente nominale).", cause: ["Il carico è eccessivo."], fix: ["Misurare la corrente che fluisce attraverso il motore. Se si verifica una condizione di sovraccarico, diminuire il carico oppure aumentare la portata dell'inverter."] },
  { code: "oH", kind: "minore", name: "Dissipatore surriscaldato", desc: "La temperatura del dissipatore dell'inverter supera il valore dell'impostazione (da 90° a 100°) (tale valore varia in relazione alla portata dell'inverter stesso).", cause: ["La temperatura ambiente è troppo alta"], fix: ["Controllare la temperatura ambiente. Utilizzare il prodotto ad una temperatura ambiente pari a 40ºC o inferiore. Rimuovere gli elementi in prossimità del riscaldamento, se presenti."] },
  { code: "oL3", kind: "minore", name: "Rivelazione coppia eccessiva 1", desc: "Flusso continuo di una corrente che supera il valore dell'impostazione.", cause: ["Il carico è eccessivo."], fix: ["Controllare l'ammontare del carico. Ridurre il carico."] },
  { code: "ov", kind: "minore", name: "Sovratensione circuito principale", desc: "La tensione del circuito principale DC eccede il livello di sovratensione se alcun comando di trasmissione viene inserito (quando l'inverter non è in funzione). Classe 200V: Circa 410V Classe 400V: Circa 820V", cause: ["La tensione della sovracorrente momentanea è stata combinata all'interno dell'alimentazione elettrica in entrata.", "Si è verificata un guasto a livello della massa del motore. Una corrente presentante un guasto a livello della massa sta caricando il condensatore del circuito principale all'interno dell'inverter mediante l'alimentazione elettrica.", "Malfunzionamento dovuto ad un disturbo."], fix: ["Staccare/riattaccare l'alimentazione.", "Il condensatore è commutato a on/off oppure il TRIAC di potenza funziona entro il medesimo sistema di alimentazione e si può verificare un rapido innalzamento (colpo di corrente) temporaneo della tensione in entrata.", "Controllare il cavo di alimentazione, il morsetto relè e la morsettiera del motore Rimuovere la parte che presenta il guasto a livello della massa e collegare nuovamente l'alimentazione elettrica.", NOISE] },
  { code: "rUnC", kind: "minore", name: "Resettare durante l'input del comando di trasmissione", desc: "Un segnale di reset dell'errore è stato attivato mentre era stato attivato il comando di trasmissione.", cause: ["Un reset dell'errore è stato attivato contemporaneamente all'attivazione del comando di trasmissione."], fix: ["Controllare se il comando di trasmissione è stato attivato da un terminale esterno o dalla scheda di comunicazione dopo il reset dell'errore. Commutare a off il comando di trasmissione."] },
  { code: "Uv", kind: "minore", name: "Bassa tensione circuito principale", desc: "Gli stati esposti in seguito si verificano quando viene innescato un comando di trasmissione (quando l'inverter non è in funzione). Il contattore di soppressione del picco di corrente all'interno dell'inverter è stato rilasciato. L'alimentazione di controllo è insufficiente.", cause: UV_CAUSE, fix: [UV_FIX[0], UV_FIX[1], UV_FIX[2], "Regolare l'alimentazione elettrica.", "Controllare se si verifica un allarme quando l'interruttore del cablaggio, l'interruttore del rivelatore di massa (con la funzione di protezione da sovracorrente) oppure il contattore elettromagnetico sono accesi. Revisionare la capacità del trasformatore dell'alimentazione", UV_FIX[5], UV_FIX[6]] },
  // errore di funzionamento
  { code: "oPE02", kind: "funz", name: "Gamma d'impostazione del parametro non valida", desc: "Per il parametro è stato impostato un valore esterno alla gamma.", cause: ["Per il parametro è stato impostato un valore esterno alla gamma."], fix: ["Controllare quali parametri sono stati impostati in modo errato con U1-18 (parametro errore OPE) Impostare il parametro correttamente."], note: "Nota: se si verificano contemporaneamente due errori di funzionamento, sul display viene segnalato OPE mm prima di OPE02." },
];

// testo del manuale inverter: reset e cause principali
export const INV_TEXT = {
  reset: "Quando si verifica un errore, riavviare l'inverter una volta eliminata la causa dell'errore. Per riavviare l'inverter, commutare a on/off il pulsante di arresto d'emergenza: Se l'inverter non si resetta, (1) Premere on/off diverse volte. (2) Se l'inverter è troppo caldo, attendere che si raffreddi prima di resettare.",
  cause: "L'inverter può arrestarsi in conseguenza di un sovraccarico, di una caduta di tensione, di un impiego dello stesso ad alta frequenza, di un impiego in presenza di elevate temperature o in presenza di una fase mancante. Utilizzare il prodotto solo nel caso in cui le condizioni/ambiente di funzionamento soddisfino le specifiche del prodotto.",
  storico: "U2-02 (errore precedente) indica quale errore ha provocato l'interruzione dell'alimentazione elettrica. Da U2-03 a U2-13 indica lo stato dell'inverter nel momento in cui si è verificato un errore (frequenza, corrente, tensione, ecc.) Da U3-01 a U3-10 indica la cronologia dell'errore (per 10 errori).",
  primaDiRidare: "Prima di collegare nuovamente l'alimentazione elettrica, controllare i seguenti elementi: Assenza di cortocircuito tra i principali morsetti del circuito principale R/L1, S/L2, e T/L3. Assenza di cortocircuito tra i principali morsetti del circuito principale R/L1, S/L2, e T/L3 relativamente alla messa a terra.",
};

const clean = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
// cerca per sigla: «ol1», «OL 1», «uv» → tutte le voci che iniziano così (prima quelle uguali)
export const findInvError = (q) => {
  const k = clean(q);
  if (!k) return INV_ERRORS;
  const keys = (e) => [e.code, ...(e.alt || [])].map(clean);
  const exact = INV_ERRORS.filter((e) => keys(e).includes(k));
  const starts = INV_ERRORS.filter((e) => !exact.includes(e) && keys(e).some((c) => c.startsWith(k)));
  const words = INV_ERRORS.filter((e) => !exact.includes(e) && !starts.includes(e) && k.length >= 3 && clean(e.name).includes(k));
  return [...exact, ...starts, ...words];
};

// ---------------------------------------------------------------- GUIDA ALLA RISOLUZIONE DEI PROBLEMI (manuale KQ, pag. 78-79)
// p = problema, s = sintomo, c = causa, e = elemento da verificare con la pagina del manuale
export const KQ_TROUBLE = [
  { p: "Inverter a due velocità", s: "Impossibile riavviare l'inverter procedendo al reset con il pulsante d'arresto di emergenza (l'inverter non si resetta nemmeno dopo il raffreddamento).", c: ["Inverter e suoi componenti"], e: [["Verificare il codice di errore dell'inverter", ""]], codes: true },
  { p: "Il paranco elettrico non funziona senza carico.", s: "Non si sente il rumore del funzionamento del freno.", c: ["Tensione di alimentazione inadeguata.", "Rottura e bruciatura del circuito di controllo.", "Elettronica guasta", "Guasto al motore o al freno", "Blocco dell'inverter per surriscaldamento del motore (termorelè elettronico)", "Surriscaldamento dell'inverter"], e: [["Alimentazione", "81"], ["Interruttore", "81"], ["Cavo di alimentazione", "82"], ["Cablaggio interno", "84"], ["Scheda HBB", "87"], ["Inverter", "87"], ["Finecorsa superiore/inferiore", "85"], ["Pulsantiera", "86"], ["Motore", "83"]] },
  { p: "Il paranco elettrico non funziona senza carico.", s: "Durante il funzionamento del freno, si sentono rumori.", c: ["Rottura della trazione", "Blocco del cuscinetto"], e: [["Ingranaggi", "93"], ["Cuscinetto", "94"]] },
  { p: "Il paranco elettrico funziona senza carico", s: "Non funziona con un carico (Il motore emette suoni anomali)", c: ["Sovraccarico (Innesto della frizione attivo)"], e: [["Frizione", "88"]] },
  { p: "Il paranco elettrico funziona senza carico", s: "È lento quando un carico è appeso", c: ["Caduta di tensione"], e: [["Cavo di alimentazione", "82"]] },
  { p: "Il paranco elettrico funziona senza carico", s: "Il paranco elettrico a catena funziona a bassa velocità, ma, impostando l'alta velocità, non funziona o funziona molto lentamente.", c: ["Tensione di alimentazione troppo ridotta", "Caduta di tensione"], e: [["Alimentazione", "81"], ["Cavo di alimentazione", "82"]] },
  { p: "Il paranco elettrico funziona senza carico", s: "Non fa scendere il carico o non funziona a bassa velocità.", c: ["Resistenza di frenatura guasta"], e: [["Resistenza di frenatura", "87"]] },
  { p: "Funziona diversamente rispetto a quanto indicato sulla pulsantiera", s: "Funziona diversamente rispetto a quanto indicato sulla pulsantiera. (direzione contraria a quella indicata)", c: ["Collegamento inverso fili del motore", "Collegamento errato"], e: [["Motore", "83"], ["Cablaggio interno", "84"], ["Pulsantiera", "86"]] },
  { p: "Non si arresta normalmente", s: "La distanza d'arresto è eccessiva o eccessivamente ridotta", c: ["Usura della guarnizione del freno."], e: [["Freno", "84"]] },
  { p: "Non si arresta normalmente", s: "Non si arresta al finecorsa superiore/inferiore.", c: ["Collegamento inverso fili del motore.", "Collegamento errato"], e: [["Cavo di alimentazione", "82"], ["Cablaggio interno", "84"], ["Pulsantiera", "86"]] },
  { p: "Rumore anomalo", s: "Suoni simili a colpi", c: ["Usura della catena di carico", "Usura della puleggia di carico"], e: [["Catena di carico", "91"], ["Puleggia di carico", "93"]] },
  { p: "Rumore anomalo", s: "Durante il funzionamento, si sentono rumori anomali", c: ["Usura o rottura dell'ingranaggio", "Deterioramento del cuscinetto"], e: [["Ingranaggi", "93"], ["Cuscinetto", "94"]] },
  { p: "Rumore anomalo", s: "Il freno è rumoroso: emette suoni quando entra in funzione (stride)", c: ["Il freno fa attrito"], e: [["Freno", "84"]] },
  { p: "Rumore anomalo", s: "Il freno è rumoroso: emette suoni quando viene rilasciato", c: ["Usura della guarnizione del freno"], e: [["Freno", "84"]] },
  { p: "Rumore anomalo", s: "Si sentono suoni durante il passaggio su una trave curva (attrito)", c: ["Interferenza meccanica trave/ruota"], e: [["Movimento di traslazione del carrello", "94-95"]] },
  { p: "Impossibile effettuare la traslazione", s: "Carrello motorizzato/carrello manuale", c: ["La ruota slitta", "La trave è inclinata", "Il carico è trainato lungo una direzione obliqua (la ruota non è in contatto con la trave)", "Ingranaggio incorretto.", "Freno bloccato"], e: [["Movimento di traslazione del carrello", "94-95"]] },
  { p: "Impossibile effettuare la traslazione", s: "Carrello motorizzato", c: ["Guasto del sistema elettrico (verificare nella sezione dedicata al paranco elettrico a catena)"], e: [] },
  { p: "Impossibile effettuare la traslazione", s: "Carrello manuale", c: ["Ingranaggio incorretto della ruota di manovra e della catena di manovra"], e: [] },
  { p: "Il movimento snodato crea rumori anomali", s: "Carrello motorizzato/carrello manuale", c: ["Interferenza meccanica trave/ruota", "Regolazione incorretta del collare", "Usura non uniforme della ruota", "Deformazione della ruota", "Deterioramento del cuscinetto", "Deformazione e usura della trave", "Usura della guarnizione del freno"], e: [["Movimento di traslazione del carrello", "94-95"]] },
  { p: "Gancio e suoi componenti", s: "", c: ["Deformazione"], e: [["Gancio", "89-90"]] },
  { p: "Catena di carico e suoi componenti", s: "", c: ["Usura, allungamento, torsione"], e: [["Catena di carico", "91"]] },
  { p: "Scossa elettrica al contatto con il corpo del paranco e con la pulsantiera", s: "", c: ["Messa a terra non adeguata, rottura del filo di messa a terra"], e: [["Scossa elettrica", "88"]] },
];

// ---------------------------------------------------------------- PROCEDURE
// 3 velocità: appunto di Elettromeccanica Mora («3 velocità kito kq»), parola per parola
export const KQ_3VEL = {
  source: "Appunto Elettromeccanica Mora «3 velocità kito kq»",
  togliere: "Andare in fc. discesa premere il fungo e premere 2 velocità discesa e aspettare 10 secondi",
  mettere: "Fare l'operazione di prima ma con la 1 velocità di discesa",
};

// ---------------------------------------------------------------- KF: dimensioni standard (il catalogo non dà limiti di usura)
export const KF_CHAINS = [
  ["KF 20S1", "125 kg", 5, 6.3, 18, 15.1, 0.55],
  ["KF 20S2", "250 kg", 5, 6.3, 18, 15.1, 1.1],
  ["KF 25S1", "250 kg", 5, 6.3, 18, 15.1, 0.55],
  ["KF 25S2", "500 kg", 5, 6.3, 18, 15.1, 1.1],
  ["KF 50S1", "500 kg", 6.3, 7.9, 22, 19.1, 0.85],
  ["KF 50S2", "1 t", 6.3, 7.9, 22, 19.1, 1.7],
  ["KF 100S1", "1 t", 7.1, 8.9, 25, 21.2, 1.1],
  ["KF 100S2", "2 t", 7.1, 8.9, 25, 21.2, 2.2],
];
// [tipo gancio, portata t, a, b, c, d, e, g]
export const KF_HOOKS = [
  ["SP", "125/250/500 kg", 28, 17.5, 23.5, 17.5, 35.5, 28],
  ["SV", "125/250/500 kg", 28, 17.5, 23.5, 17.5, 35.5, 24],
  ["SP SV", "1 t", 36.5, 22.5, 31, 22.5, 42.5, 31],
  ["SP SV", "2 t", 47.5, 29, 40, 29, 50, 37],
];
export const KF_TEXT = { tipi: "SP = Gancio di sospensione · SV = Gancio di carico" };

// ---------------------------------------------------------------- GANCIO KF: controllo con le misure
// Il catalogo FAS dà solo le misure standard (da nuovo). Il limite di scarto NON è del costruttore: viene dalla
// UNI EN 818-6 (apertura del gancio: l'aumento non deve superare il 10% del valore nominale). Per le altre quote
// l'app mostra solo di quanto si scostano dallo standard, senza dire «scarto»: fa fede il manuale del costruttore.
export const KF_HOOK_SOURCE = "UNI EN 818-6 (apertura del gancio: aumento massimo 10% del valore nominale, applicato alla quota «g», la bocca del gancio dalla punta al perno della sicurezza); misure standard dal " + KF_SOURCE;
export const KF_HOOK_LIMIT = 10; // %
// [id, nome, dove si misura]
export const KF_HOOK_DIMS = [
  ["a", "a · larghezza del corpo (in basso)", "la larghezza del gancio nella parte bassa, dove lavora la braca (vedi disegno)"],
  ["b", "b · altezza del corpo (in basso)", "l'altezza della sezione nella parte bassa"],
  ["c", "c · altezza della punta", "la sezione della punta, in verticale"],
  ["d", "d · larghezza della punta", "la sezione della punta, in orizzontale"],
  ["e", "e · diametro della gola", "il tondo interno dove si appoggia la braca"],
  ["g", "g · apertura della bocca", "dalla punta al perno della sicurezza: è la bocca che si allarga"],
];
// i modelli KF e il loro gancio (portata del gancio = portata del paranco)
export const KF_HOOK_MODELS = KF_CHAINS.map((c) => c[0] + " · " + c[1]);
export const kfHook = (wll) => KF_HOOKS.filter((h) => h[1] === wll || (h[1] === "125/250/500 kg" && ["125 kg", "250 kg", "500 kg"].includes(wll)));
// x = { model (es. "KF 50S1 · 500 kg"), kind: "SP" | "SV", a, b, c, d, e, g, flags }
export const checkKf = (x) => {
  const wll = (x.model || "").split(" · ")[1] || "";
  const kind = x.kind === "SP" ? "SP" : "SV";
  const hooks = kfHook(wll);
  const row = hooks.find((h) => h[0] === kind) || hooks.find((h) => h[0].includes(kind)) || hooks[0] || null;
  const std = row ? { a: row[2], b: row[3], c: row[4], d: row[5], e: row[6], g: row[7] } : null;
  const items = [];
  if (std)
    KF_HOOK_DIMS.forEach(([id, label]) => {
      const v = num(x[id]);
      if (v == null) return;
      const s0 = std[id];
      const diff = Math.round((v - s0) * 100) / 100;
      const pct = Math.round(((v - s0) / s0) * 1000) / 10;
      // solo per «g» (la bocca del gancio, dalla punta al perno della sicurezza: è l'apertura che si allarga) c'è il limite
      // della EN 818-6 (apertura +10%). Per le altre quote nessun limite del costruttore: uno scostamento oltre il 10%
      // dallo standard (in più o in meno) non è più un gancio «da nuovo» ed è segnato rosso lo stesso.
      const lim = id === "g";
      const limit = lim ? Math.round(s0 * (1 + KF_HOOK_LIMIT / 100) * 100) / 100 : null;
      const over = lim ? pct > KF_HOOK_LIMIT : Math.abs(pct) > KF_HOOK_LIMIT;
      const near = lim ? !over && pct > KF_HOOK_LIMIT / 2 : !over && Math.abs(pct) > 5;
      items.push({ id, label, v, std: s0, diff, pct, limit, over, near });
    });
  const flags = KF_FLAGS.filter((f) => x.flags && x.flags[f.id]);
  const bad = items.filter((i) => i.over);
  const level = bad.length || flags.length ? "scarto" : items.some((i) => i.near) ? "attenzione" : "ok";
  return { wll, kind, row, std, items, bad, flags, level, any: items.length > 0 || flags.length > 0 };
};
// controlli a vista del gancio (UNI EN 818-6, come per le brache dei sottoganci)
export const KF_FLAGS = [
  { id: "sicurezza", label: "Sicurezza antisgancio mancante, deformata o che non chiude", rimedio: "Sostituire la sicurezza antisgancio; non usare il gancio senza." },
  { id: "deformato", label: "Gancio deformato, piegato o storto", rimedio: "Sostituire il gancio." },
  { id: "cricche", label: "Cricche, tagli, solchi o intagli", rimedio: "Sostituire il gancio." },
  { id: "corrosione", label: "Corrosione forte o segni di calore (colore cambiato)", rimedio: "Sostituire il gancio." },
  { id: "rotazione", label: "Il gancio non ruota liberamente", rimedio: "Controllare il cuscinetto; se necessario sostituire il gancio-bozzello." },
];
export const kfVerdict = (r) => {
  const fix = [...r.bad.map((i) => `${i.label}: ${i.limit != null ? `oltre il +${KF_HOOK_LIMIT}%` : `scostamento ${i.pct > 0 ? "+" : ""}${fmtK(i.pct, 1)}% dallo standard, oltre il 10%`} (EN 818-6). Sostituire il gancio.`), ...r.flags.map((f) => `${f.label}: ${f.rimedio}`)];
  return {
    esito: r.level === "scarto" ? "NON IDONEO" : "IDONEO",
    azione: fix.length ? fix.join(" ") : `Apertura entro il +${KF_HOOK_LIMIT}% della EN 818-6; le altre quote sono confrontate con lo standard del catalogo (nessun limite del costruttore disponibile).`,
  };
};
const sgn = (v) => (v > 0 ? "+" : "");
export const kfRegister = ({ r }) => {
  const v = kfVerdict(r);
  const out = [`CONTROLLO GANCIO KITO KF ${r.kind} (${r.wll}) – ${today()}${tech() ? " – tecnico " + tech() : ""}`];
  r.items.forEach((i) => out.push(`${i.label}: ${fmtK(i.v, 2)} mm (standard catalogo ${fmtK(i.std, 2)}, ${sgn(i.diff)}${fmtK(i.diff, 2)} mm = ${sgn(i.pct)}${fmtK(i.pct, 1)}%)${i.limit != null ? ` · limite EN 818-6 ${fmtK(i.limit, 2)} mm → ${i.over ? "OLTRE IL LIMITE" : "entro il limite"}` : ""}`));
  r.flags.forEach((f) => out.push(`${f.label} → ${f.rimedio}`));
  out.push(`Esito: ${v.esito}`);
  out.push("Fonte: " + KF_HOOK_SOURCE + ". Fa fede il manuale del costruttore.");
  return out.join("\n");
};
export const kfReport = ({ r, x }) => {
  const v = kfVerdict(r);
  const rows = r.items.map((i) => [i.label, `${fmtK(i.v, 2)} mm`, i.limit != null ? `max ${fmtK(i.limit, 2)} (std ${fmtK(i.std, 2)}, EN 818-6)` : `std ${fmtK(i.std, 2)} (catalogo)`, i.limit != null ? (i.over ? "OLTRE IL LIMITE" : "entro il limite") : `${sgn(i.diff)}${fmtK(i.diff, 2)} mm (${sgn(i.pct)}${fmtK(i.pct, 1)}%)`]);
  r.flags.forEach((f) => rows.push([f.label, "SÌ", "a vista", "SCARTO"]));
  return {
    type: "paranco",
    title: "VERBALE CONTROLLO GANCIO PARANCO",
    tiles: [
      ["Gancio", `KITO KF ${r.kind}`],
      ["Misure prese", String(r.items.length)],
      ["Oltre il limite", String(r.bad.length + r.flags.length)],
    ],
    params: [
      ["Paranco", `KITO serie KF · ${x.model || ""}`],
      ["Gancio", r.kind === "SP" ? "SP · gancio di sospensione" : "SV · gancio di carico"],
      ["Portata", r.wll],
      ["Numero di serie", x.serie || ""],
    ],
    rows,
    rowHead: ["Quota", "Misurato", "Riferimento", "Esito"],
    defects: r.flags.map((f) => f.label),
    esito: v.esito,
    azione: v.azione,
    level: r.level,
    norms: [
      "Limite di scarto: UNI EN 818-6, apertura del gancio: l'aumento non deve superare il 10% del valore nominale. Non è un limite del costruttore: il catalogo KITO/FAS della serie KF riporta solo le dimensioni standard.",
      `Misure standard: ${KF_SOURCE}, tabella «Dimensioni standard del gancio» (a, b, c, d, e, g).`,
      "Limite +10% applicato alla quota g (apertura della bocca). Per le quote a, b, c, d, e il verbale riporta lo scostamento dallo standard (rosso oltre il 10%); fa fede il manuale del costruttore.",
      "D.Lgs. 81/2008, Allegato VI, punto 3.1.2: «Le funi e le catene debbono essere sottoposte a controlli trimestrali in mancanza di specifica indicazione da parte del fabbricante.»",
    ],
  };
};
