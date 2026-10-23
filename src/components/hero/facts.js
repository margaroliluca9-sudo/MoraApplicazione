// CURIOSITÀ della scritta in cima alla Home: del periodo dell'anno, conti alla rovescia,
// e curiosità varie (anche fuori dal lavoro). Si mischiano a ogni apertura.
import { easterOf } from "../../season";

const DAY = 86400000;
const dOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysTo = (now, target) => Math.round((dOnly(target) - dOnly(now)) / DAY);
const lastSunday = (y, m) => {
  const d = new Date(y, m + 1, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

// del mese (sempre vere)
const BY_MONTH = [
  ["Gennaio prende il nome da Giano, il dio romano delle porte e degli inizi.", "Il 6 gennaio: «l'Epifania tutte le feste porta via»."],
  ["Febbraio è l'unico mese che può passare senza una luna piena.", "Febbraio ha 29 giorni negli anni bisestili, uno ogni quattro (quasi)."],
  ["Verso il 20-21 marzo c'è l'equinozio di primavera: giorno e notte quasi uguali.", "Marzo prende il nome da Marte: per i romani era il primo mese dell'anno."],
  ["Il 25 aprile è la Festa della Liberazione.", "Aprile viene probabilmente dal latino «aperire», aprire: la stagione in cui si aprono i fiori."],
  ["Il 1° maggio è la Festa dei lavoratori.", "Maggio prende il nome dalla dea Maia, legata alla crescita della natura."],
  ["Il 2 giugno è la Festa della Repubblica: il referendum fu nel 1946.", "Verso il 21 giugno c'è il solstizio: il giorno più lungo dell'anno."],
  ["Luglio prende il nome da Giulio Cesare.", "In estate l'acciaio si allunga: una trave di 20 m con 30 °C in più cresce di circa 7 mm."],
  ["Ferragosto viene da «Feriae Augusti», il riposo voluto dall'imperatore Augusto.", "Le stelle cadenti di San Lorenzo (intorno al 10 agosto) sono lo sciame delle Perseidi."],
  ["Settembre viene da «septem»: per i romani era il settimo mese.", "Verso il 22-23 settembre c'è l'equinozio d'autunno."],
  ["Ottobre viene da «octo»: per i romani era l'ottavo mese.", "In autunno le foglie diventano gialle e rosse perché la clorofilla verde si consuma e restano gli altri colori."],
  ["Il 4 novembre è la Giornata dell'Unità nazionale e delle Forze armate.", "Novembre viene da «novem»: per i romani era il nono mese."],
  ["Verso il 21 dicembre c'è il solstizio d'inverno: il giorno più corto dell'anno.", "Il panettone è nato a Milano."],
];

// curiosità varie
const GENERAL = [
  "La Torre Eiffel d'estate è più alta di circa 15 cm: il caldo dilata il ferro.",
  "Una fune d'acciaio è fatta di trefoli e ogni trefolo di tanti fili: per questo non cede di colpo se si rompe un filo.",
  "L'acciaio si allunga di circa 1,2 mm per ogni metro se la temperatura sale di 100 °C.",
  "Un fulmine è circa cinque volte più caldo della superficie del Sole.",
  "La luce del Sole impiega circa 8 minuti e 20 secondi per arrivare sulla Terra.",
  "Le gru a torre si alzano da sole: aggiungono pezzi di torre con un sistema idraulico.",
  "Il cuore umano batte circa 100.000 volte al giorno.",
  "Il Colosseo poteva ospitare circa 50.000 spettatori.",
  "La Mole Antonelliana di Torino è alta 167,5 metri.",
  "Il Po è il fiume più lungo d'Italia: 652 km.",
  "Il Duomo di Milano ha circa 3.400 statue.",
  "La prima autostrada del mondo è italiana: la Milano-Laghi, aperta nel 1924.",
  "Una goccia di pioggia cade a circa 30 km/h.",
  "Un bullone M12 a passo grosso ha un passo di 1,75 mm.",
  "1 kW vale circa 1,36 cavalli.",
  "Gli astronauti sulla Stazione spaziale vedono circa 16 albe al giorno.",
  "Dallo spazio la Grande Muraglia cinese non si vede a occhio nudo: è un mito.",
  "Un elefante africano adulto pesa più o meno come il carico di un paranco da 5 t.",
  "In un anno la Terra percorre circa 940 milioni di km intorno al Sole.",
  "Il miele ben chiuso non scade: ne è stato trovato di ancora buono nelle tombe egizie.",
  "I gatti passano dormendo circa due terzi della giornata.",
  "Il caffè espresso è nato in Italia all'inizio del Novecento.",
  "Il Monte Bianco è alto circa 4.806 metri, e la cima cambia un po' ogni anno per la neve.",
  "Il simbolo «@» in italiano si chiama chiocciola.",
  "Le api, per fare mezzo chilo di miele, visitano circa due milioni di fiori.",
  "Il suono nell'aria viaggia a circa 343 metri al secondo: conta i secondi tra lampo e tuono e dividi per 3, sono i km.",
];

// del periodo: ora legale/solare, conti alla rovescia
const seasonal = (now) => {
  const y = now.getFullYear();
  const m = now.getMonth();
  const out = [...BY_MONTH[m]];
  const solare = lastSunday(y, 9);
  const legale = lastSunday(y, 2);
  const dSol = daysTo(now, solare);
  const dLeg = daysTo(now, legale);
  if (dSol > 0 && dSol <= 20) out.push(`Domenica ${solare.getDate()} ottobre torna l'ora solare: lancette indietro di un'ora, si dorme un'ora in più.`);
  if (dSol === 0) out.push("Oggi è tornata l'ora solare: un'ora in più di sonno.");
  if (dSol < 0 && dSol >= -14) out.push("È tornata l'ora solare: la sera fa buio prima.");
  if (dLeg > 0 && dLeg <= 20) out.push(`Domenica ${legale.getDate()} marzo torna l'ora legale: lancette avanti di un'ora.`);
  const natale = new Date(y, 11, 25);
  const dNat = daysTo(now, natale);
  if (dNat > 0 && dNat <= 40) out.push(`Mancano ${dNat} giorni a Natale.`);
  const capo = new Date(y + 1, 0, 1);
  const dCap = daysTo(now, capo);
  if (dCap > 0 && dCap <= 6) out.push(`Mancano ${dCap} giorni a Capodanno.`);
  const ferr = new Date(y, 7, 15);
  const dFer = daysTo(now, ferr);
  if (dFer > 0 && dFer <= 30) out.push(`Mancano ${dFer} giorni a Ferragosto.`);
  const pasqua = easterOf(y);
  const dPas = daysTo(now, pasqua);
  if (dPas > 0 && dPas <= 30) out.push(`Mancano ${dPas} giorni a Pasqua (${pasqua.getDate()} ${MESI[pasqua.getMonth()]}).`);
  const dow = now.getDay();
  if (dow >= 1 && dow <= 4) out.push(`Mancano ${6 - dow} giorni al weekend.`);
  if (dow === 5) out.push("È venerdì: ultimo sforzo prima del weekend.");
  return out;
};

const shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

// la scaletta delle scritte: curiosità sui propri interventi alternate a quelle del periodo e varie
export const heroLines = (personal = [], now = new Date()) => {
  const season = shuffle(seasonal(now));
  const general = shuffle(GENERAL).slice(0, 8);
  const mine = shuffle(personal);
  const out = [];
  const n = Math.max(mine.length, season.length, general.length);
  for (let i = 0; i < n; i++) {
    if (season[i]) out.push(season[i]);
    if (mine[i]) out.push(mine[i]);
    if (general[i]) out.push("Lo sapevi? " + general[i]);
  }
  return out.length ? out : ["Buon lavoro!"];
};
export const _test = { seasonal, lastSunday, GENERAL };
