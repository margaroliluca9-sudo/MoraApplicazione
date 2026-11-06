// CARICO DI ROTTURA MINIMO della fune (o catena) su una gru: coefficiente × tiro massimo su un ramo.
// Coefficienti con le parole delle leggi (niente valori inventati):
//  - macchina NON CE (costruita prima o senza le direttive): D.Lgs. 81/2008, Allegato V, Parte II, punto 3.1.11
//  - macchina CE: Direttiva Macchine (D.Lgs. 17/2010), Allegato I, punto 4.1.2.5 (accessori di sollevamento e componenti)
//  - oppure il coefficiente scritto dal costruttore (manuale o targa): se c'è, vale quello.

export const BREAK_TEXT = {
  noce: "Le funi e le catene degli impianti e degli apparecchi di sollevamento e di trazione devono avere, in rapporto alla portata e allo sforzo massimo ammissibile, un coefficiente di sicurezza di almeno 6 per le funi metalliche, 10 per le funi composte di fibre e 5 per le catene.",
  noceSrc: "D.Lgs. 81/2008, Allegato V, Parte II, punto 3.1.11 (attrezzature costruite in assenza delle direttive o messe a disposizione prima)",
  argani: "Le funi e le catene degli argani a motore devono essere calcolate per un carico di sicurezza non minore di 8.",
  arganiSrc: "D.Lgs. 81/2008, Allegato V, Parte II, punto 3.3.2",
  ceFune: "il coefficiente di utilizzazione degli insiemi fune metallico e terminale deve essere scelto in modo tale da garantire un livello adeguato di sicurezza; questo coefficiente è, in generale, pari a 5.",
  ceCatena: "Il coefficiente di utilizzazione delle catene deve essere scelto in modo tale da garantire un livello adeguato di sicurezza; questo coefficiente è, in generale, pari a 4;",
  ceTessile: "il coefficiente d'utilizzazione delle funi o cinghie di fibre tessili dipende dal materiale, dal processo di fabbricazione, dalle dimensioni e dall'utilizzazione. … esso è, in generale, pari a 7, a condizione che i materiali utilizzati siano di ottima qualità controllata",
  ceSrc: "Direttiva Macchine 2006/42/CE (D.Lgs. 17/2010), Allegato I, punto 4.1.2.5",
  coeff: "«coefficiente di utilizzazione»: rapporto aritmetico tra il carico garantito dal fabbricante o dal suo mandatario, fino al quale un componente è in grado di trattenere tale carico, ed il carico massimo di esercizio marcato sul componente.",
  coeffSrc: "Direttiva Macchine, Allegato I, punto 4.1.1, lettera c)",
};

// [che cosa, etichetta, coefficiente CE, coefficiente non CE]
export const BREAK_KINDS = [
  ["fune", "Fune metallica", 5, 6],
  ["catena", "Catena", 4, 5],
  ["tessile", "Fune tessile", 7, 10],
];

const num = (v) => {
  const n = Number(String(v == null ? "" : v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const G = 9.80665;

// x = { machine: "ce" | "noce" | "argano" | "costr", kind, coeff (se «costr»), portata (kg), bozzello (kg), rami, mbl (kN, facoltativo) }
export const breakCalc = (x) => {
  const k = BREAK_KINDS.find((r) => r[0] === x.kind) || BREAK_KINDS[0];
  const coeff = x.machine === "costr" ? num(x.coeff) : x.machine === "argano" ? 8 : x.machine === "noce" ? k[3] : k[2];
  const portata = num(x.portata);
  const bozzello = num(x.bozzello);
  const rami = Math.max(1, Math.round(num(x.rami) || 1));
  const kg = portata + bozzello;
  // tiro su un ramo (kN), senza rendimento delle pulegge
  const tiro = kg > 0 ? Math.round(((kg * G) / 1000 / rami) * 100) / 100 : 0;
  const min = coeff && tiro ? Math.round(coeff * tiro * 10) / 10 : 0;
  const mbl = num(x.mbl);
  const ok = mbl && min ? mbl >= min : null;
  const ratio = mbl && tiro ? Math.round((mbl / tiro) * 100) / 100 : null;
  return { kind: k, coeff, portata, bozzello, rami, kg, tiro, min, minKg: min ? Math.round((min * 1000) / G) : 0, mbl, ok, ratio };
};

export const fmtB = (v, dec = 1) => (v == null || Number.isNaN(v) ? "—" : Number(v).toLocaleString("it-IT", { maximumFractionDigits: dec, minimumFractionDigits: 0 }));

export const breakText = (r, x) => {
  const m = x.machine === "ce" ? "macchina CE" : x.machine === "noce" ? "macchina non CE" : x.machine === "argano" ? "argano a motore" : "coefficiente del costruttore";
  const out = [`Carico di rottura minimo (${r.kind[1].toLowerCase()}, ${m}, coefficiente ${fmtB(r.coeff)}): ${fmtB(r.min)} kN`];
  out.push(`Tiro su un ramo: (${fmtB(r.portata, 0)} kg portata${r.bozzello ? ` + ${fmtB(r.bozzello, 0)} kg bozzello` : ""}) / ${r.rami} ${r.rami === 1 ? "ramo" : "rami"} = ${fmtB(r.tiro, 2)} kN`);
  if (r.mbl) out.push(`Fune montata: carico di rottura ${fmtB(r.mbl)} kN → ${r.ok ? "va bene" : "NON basta"} (coefficiente reale ${fmtB(r.ratio, 2)})`);
  return out.join("\n");
};
