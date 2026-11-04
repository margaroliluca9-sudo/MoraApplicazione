// BRACHE DI CATENA (sottoganci): portata secondo il modo di imbracare e limitazioni d'uso.
// Dal catalogo FAS «Catene e accessori» (Pewag Winner Grado 10, Winner Plus Grado 12, Grado 8, inox Grado 6; rev. 09/2025):
// tabelle «Portata delle imbragature» (coefficiente di sicurezza 4, valori in kg copiati dalla tabella) e
// «Limitazioni all'uso delle brache» (testi e fattori copiati parola per parola). Passo della catena dalle tabelle delle catene.
export const CHAIN_SOURCE = "Catalogo FAS «Catene e accessori» (Pewag; rev. 09/2025)";

// colonne della tabella «Portata delle imbragature»
export const CHAIN_MODES = {
  d1: { label: "1 braccio", factor: 1, legs: 1 },
  d1s: { label: "1 braccio a strozzo", factor: 0.8, legs: 1 },
  d2a: { label: "2 bracci (β 0°-45°)", factor: 1.4, legs: 2 },
  d2b: { label: "2 bracci (β 45°-60°)", factor: 1, legs: 2 },
  d2sa: { label: "2 bracci a strozzo (β 0°-45°)", factor: 1.12, legs: 2 },
  d2sb: { label: "2 bracci a strozzo (β 45°-60°)", factor: 0.8, legs: 2 },
  d34a: { label: "3 e 4 bracci (β 0°-45°)", factor: 2.1, legs: 4 },
  d34b: { label: "3 e 4 bracci (β 45°-60°)", factor: 1.5, legs: 4 },
  dda: { label: "3 e 4 bracci con distributore (β 0°-45°)", factor: 2.8, legs: 4 },
  ddb: { label: "3 e 4 bracci con distributore (β 45°-60°)", factor: 2, legs: 4 },
  an: { label: "Anello continuo", factor: 1.6, legs: 1 },
  ca: { label: "A canestro, 1 braccio (β 0°-45°)", factor: 1.4, legs: 1 },
  cb: { label: "A canestro, 1 braccio (β 45°-60°)", factor: 1, legs: 1 },
  c2a: { label: "A canestro, 2 bracci (β 0°-45°)", factor: 2.1, legs: 2 },
  c2b: { label: "A canestro, 2 bracci (β 45°-60°)", factor: 1.5, legs: 2 },
  u: { label: "Imbragatura a U", factor: 2, legs: 2 },
};

export const CHAIN_GRADES = [{"id":"G10","label":"Winner Grado 10 (WIN)","code":"WIN","cols":["d1","d1s","d2a","d2b","d2sa","d2sb","d34a","d34b","dda","ddb","an","ca","cb","c2a","c2b"],"temp":"-40°C ÷ 200°C: 1 · 200°C ÷ 300°C e 300°C ÷ 400°C: non ammissibile","tf":{"t1":1,"t2":null,"t3":null},"rows":{"5":[1000,800,1400,1000,1120,800,2000,1500,2800,2000,1600,1400,1000,2000,1500],"6":[1400,1120,2000,1400,1600,1120,3000,2120,4000,2800,2240,2000,1400,3000,2120],"7":[1900,1500,2650,1900,2120,1500,4000,2800,5300,3750,3000,2650,1900,4000,2800],"8":[2500,2000,3550,2500,2800,2000,5300,3750,7100,5000,4000,3550,2500,5300,3750],"10":[4000,3150,5600,4000,4250,3150,8000,6000,11200,8000,6300,5600,4000,8000,6000],"13":[6700,5300,9500,6700,7500,5300,14000,10000,19000,13200,10600,9500,6700,14000,10000],"16":[10000,8000,14000,10000,11200,8000,21200,15000,28000,20000,16000,14000,10000,21200,15000],"19":[14000,11200,20000,14000,16000,11200,30000,21200,null,null,22400,20000,14000,30000,21200],"20":[16000,12800,22400,16000,17920,12800,33600,24000,null,null,25600,22400,16000,33600,24000],"22":[19000,15000,26500,19000,21200,15000,40000,28000,null,null,30000,26500,19000,40000,28000],"26":[26500,21200,37500,26500,30000,21200,56000,40000,null,null,42500,37500,26500,56000,40000],"32":[40000,31500,56000,40000,45000,31500,85000,60000,null,null,63000,56000,40000,85000,60000]},"pitch":{"5":16,"6":18,"7":21,"8":24,"10":30,"13":39,"16":48,"19":57,"20":60,"22":66,"26":78,"32":96}},{"id":"G12","label":"Winner Plus Grado 12 (WINPLUS)","code":"WINPLUS","cols":["d1","d1s","d2a","d2b","d2sa","d2sb","d34a","d34b","dda","ddb","an","ca","cb","c2a","c2b"],"temp":"-40°C ÷ 200°C: 1 · > 200°C ÷ 300°C: non ammissibile · > 300°C: non ammissibile","tf":{"t1":1,"t2":null,"t3":null},"rows":{"7":[2360,1900,3350,2360,2650,1900,5000,3550,6700,4750,3750,3350,2360,5000,3550],"8":[3000,2360,4250,3000,3350,2360,6300,4500,8500,6000,4750,4250,3000,6300,4500],"10":[5000,4000,7100,5000,5600,4000,10600,7500,14000,10000,8000,7100,5000,10600,7500],"13":[8000,6300,11200,8000,9000,6300,17000,11800,null,null,12500,11200,8000,17000,11800],"16":[12500,10000,17500,12500,14000,10000,26500,19000,null,null,20000,17500,12500,26500,19000]},"pitch":{"7":22.3,"8":25.8,"10":34.6,"13":41.6,"16":51}},{"id":"G8","label":"Grado 8 (WB)","code":"WB","cols":["d1","d1s","d2a","d2b","d2sa","d2sb","d34a","d34b","an","ca","cb","c2a","c2b"],"temp":"-40°C ÷ 200°C: 1 · 200°C ÷ 300°C: 0,9 · 300°C ÷ 400°C: 0,75","tf":{"t1":1,"t2":0.9,"t3":0.75},"rows":{"7":[1500,1200,2120,1500,1700,1200,3150,2240,2500,2120,1500,3150,2240],"8":[2000,1600,2800,2000,2240,1600,4250,3000,3150,2800,2000,4250,3000],"10":[3150,2500,4250,3150,3550,2500,6700,4750,5000,4250,3150,6700,4750],"13":[5300,4250,7500,5300,5900,4250,11200,8000,8500,7500,5300,11200,8000],"16":[8000,6300,11200,8000,9000,6300,17000,11800,12500,11200,8000,17000,11800],"20":[12500,10000,17000,12500,14000,10000,26500,19000,20000,17500,12500,26200,18700],"22":[15000,12000,21200,15000,17000,12000,31500,22400,23600,21200,15000,31500,22400],"26":[21200,16950,30000,21200,23700,16950,45000,31500,33500,30000,21200,45000,31500],"32":[31500,25200,45000,31500,35200,25200,67000,47500,50000,45000,31500,67000,47500],"40":[50000,40000,71000,50000,56000,40000,106000,75000,80000,56000,40000,85000,60000],"45":[63000,50000,90000,63000,71000,50000,132000,95000,100000,71000,50000,106000,75600]},"pitch":{"7":21,"8":24,"10":30,"13":39,"16":48,"20":60,"22":66,"26":78,"32":96,"40":120,"45":135}},{"id":"G6","label":"Inox Grado 6 (WOX)","code":"WOX","cols":["d1","d1s","d2a","d2b","d2sa","d2sb","d34a","d34b","an","ca","cb","c2a","c2b","u"],"temp":"-40°C ÷ 350°C: 1 · > 350°C: non ammissibile","tf":{"t1":1,"t2":1,"t3":null},"rows":{"4":[400,320,560,400,450,320,840,600,640,560,400,840,600,800],"5":[630,500,850,630,700,500,1300,940,1000,850,630,1300,940,1260],"6":[900,720,1250,900,1000,720,1850,1350,1400,1250,900,1850,1350,1800],"7":[1250,1000,1750,1250,1400,1000,2600,1850,2000,1750,1250,2600,1850,2500],"8":[1600,1280,2200,1600,1800,1280,3350,2400,2500,2220,1600,3350,2400,3200],"10":[2500,2000,3500,2500,2800,2000,5250,3750,4000,3500,2500,5250,3750,5000],"13":[4250,3400,5950,4250,4750,3400,8900,6350,6800,5950,4250,8900,6350,8500],"16":[6300,5040,8800,6300,7050,5040,13200,9400,10000,8800,6300,13200,9400,12600],"20":[8000,6400,11200,8000,null,null,null,null,12800,11200,8000,null,null,16000],"26":[12000,9600,null,null,null,null,null,null,19200,null,null,null,null,24000]},"pitch":{"4":12,"5":15,"6":18,"7":21,"8":24,"10":30,"13":39,"16":48,"20":60,"26":78}}];

// testi del catalogo, parola per parola
export const CHAIN_TEXT = {
  asimmetrico:
    "La portata della braca deve essere diminuita di un braccio. Nel caso di brache a 3-4 bracci, la portata sarà quella di una braca a 2 bracci della catena corrispondente. Nel caso di brache a 2 bracci, la portata sarà quella della braca ad un braccio. Se la distribuzione del carico non è chiara, considerare sempre la portata della braca ad 1 braccio.",
  asimmetricoG6: "Il carico massimo di lavoro dell'imbragatura deve essere ridotto di almeno un braccio. In caso di dubbi, considerare la portata di un singolo braccio di catena.",
  perno: "Quando la catena viene avvolta su un perno o intorno al carico, il diametro dello stesso deve essere almeno 3 volte il passo della catena. In caso contrario, la portata della braca deve esssere ridotta del 50%.",
  ridurre: "Se l'imbragatura è sottoposta a temperature estreme, carichi asimmetrici o a spigoli vivi, è necessario ridurre i valori indicati in tabella, utilizzando i fattori riportati nella pagina accanto.",
  marcatura: "Le catene Pewag-Winner sono marcate con il simbolo di identificazione del produttore, il grado qualitativo (10) e il numero di identificazione del lotto di produzione. Tutti i tiranti vengono consegnati completi di targhetta metallica di identificazione e dichiarazione di conformità CE.",
  usura: "Per le sostituzioni dovute allo stato dell'usura, seguire le disposizioni della norma EN 818-6.",
};
// spigoli e shock (uguali per tutti i gradi nel catalogo)
export const EDGE = [
  ["r2", "R > 2 × Ø catena", 1],
  ["r1", "R > Ø catena", 0.7],
  ["r0", "R < Ø catena", 0.5],
];
export const SHOCK = [
  ["s1", "Shock leggero", 1],
  ["s2", "Shock medio", 0.7],
  ["s3", "Shock pesante", null],
];

export const chainGrade = (id) => CHAIN_GRADES.find((g) => g.id === id) || CHAIN_GRADES[0];
// portata dalla tabella (kg) e con le riduzioni scelte
export const chainSlingWll = ({ grade, d, mode, temp = "t1", edge = "r2", shock = "s1", lug = false, asym = false }) => {
  const g = chainGrade(grade);
  const row = g.rows[String(d)] || g.rows[d];
  const i = g.cols.indexOf(mode);
  const table = row && i >= 0 ? row[i] : null;
  if (table == null) return { g, table: null, cap: null, factors: [], notAllowed: false };
  const factors = [];
  let notAllowed = false;
  const tf = g.tf[temp];
  if (temp !== "t1") {
    if (tf == null) notAllowed = true;
    else factors.push(["Temperatura", tf]);
  }
  const ef = EDGE.find((e) => e[0] === edge);
  if (ef && ef[2] !== 1) factors.push([`Spigoli: ${ef[1]}`, ef[2]]);
  const sf = SHOCK.find((x) => x[0] === shock);
  if (sf && sf[2] == null) notAllowed = true;
  else if (sf && sf[2] !== 1) factors.push([sf[1], sf[2]]);
  if (lug) factors.push(["Perno o carico tondo sotto 3 × passo", 0.5]);
  // carico asimmetrico: si conta un braccio in meno (3-4 bracci → 2 bracci; 2 bracci → 1 braccio)
  let base = table;
  let asymNote = "";
  if (asym) {
    const m = CHAIN_MODES[mode];
    const alt = m.legs >= 3 ? (mode.endsWith("b") ? "d2b" : "d2a") : m.legs === 2 ? (mode.startsWith("d2s") ? "d1s" : "d1") : null;
    if (alt && g.cols.includes(alt)) {
      base = row[g.cols.indexOf(alt)];
      asymNote = CHAIN_MODES[alt].label;
    }
  }
  const k = factors.reduce((a, f) => a * f[1], 1);
  return { g, table, base, cap: notAllowed ? 0 : Math.floor(base * k), factors, notAllowed, asymNote, pitch: g.pitch[String(d)] || g.pitch[d] || null };
};
