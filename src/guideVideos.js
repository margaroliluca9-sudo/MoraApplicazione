// VIDEO DELLA GUIDA (file in public/guida/<id>.mp4 + <id>.jpg come copertina).
// Rifatti con lo script di prova "rec_guide.js": un filmato per funzione, con il dito e le scritte.
export const VIDEOS = [
  { id: "nuovo-rapporto", title: "Nuovo rapporto", about: "Dal cliente al salvataggio, con l'assistente", sec: 37 },
  { id: "rapporto-non-finito", title: "Il rapporto non si perde", about: "Se l'app si chiude a metà, «Riprendi»", sec: 33 },
  { id: "storico", title: "Storico", about: "Diviso per giorno, cerca, stampa", sec: 28, office: true },
  { id: "scheda-gru", title: "La scheda della gru", about: "Tutto su una gru e il rapporto già pronto", sec: 20, office: true },
  { id: "esplora", title: "Esplora", about: "Clienti, gru e interventi", sec: 19, office: true },
  { id: "la-mia-area", title: "La mia area", about: "Calendario, note, promemoria", sec: 38 },
  { id: "stampa-interventi", title: "Stampa interventi", about: "Tanti insieme, anche dei colleghi", sec: 21 },
  { id: "modifica-aspetto", title: "Modifica aspetto", about: "Tieni premuto, modelli di grafica", sec: 23 },
  { id: "tecnici-online", title: "Tecnici online", about: "Chi è collegato e scrivergli", sec: 23 },
  { id: "senza-rete", title: "Senza rete", about: "Nel capannone senza internet", sec: 15, office: true },
  { id: "notifiche", title: "Notifiche e impostazioni", about: "Avvisi sul telefono e le tue scelte", sec: 28 },
  { id: "cosa-ho-cambiato", title: "Cosa ho cambiato", about: "Quanti pezzi hai sostituito quest'anno", sec: 43 },
  { id: "le-mie-ore", title: "Le mie ore", about: "Orari, straordinari, ferie e permessi", sec: 40 },
  { id: "furgone", title: "Il tuo furgone", about: "Pezzi a bordo e scarico automatico", sec: 19, van: true },
];

export const videoById = (id) => VIDEOS.find((v) => v.id === id) || null;
export const videoSrc = (v) => `/guida/${v.id}.mp4`;
export const videoPoster = (v) => `/guida/${v.id}.jpg`;

// quali video vede chi: l'ufficio solo i suoi; il furgone solo chi ce l'ha
export const videosFor = ({ office = false, hasVan = false } = {}) =>
  VIDEOS.filter((v) => (office ? v.office : true) && (!v.van || hasVan));

// passi dei tutorial (titolo senza numero) → video
const BY_TITLE = {
  "apri il rapporto": "nuovo-rapporto",
  salva: "rapporto-non-finito",
  "i pezzi del furgone": "furgone",
  "stampa e manda": "storico",
  "tecnici online": "tecnici-online",
  "la ricerca": "scheda-gru",
  "cerca qualsiasi cosa": "scheda-gru",
  "la scheda della gru": "scheda-gru",
  "nuovo rapporto": "nuovo-rapporto",
  storico: "storico",
  interventi: "storico",
  stampare: "storico",
  esplora: "esplora",
  "la mia area": "la-mia-area",
  "stampa interventi": "stampa-interventi",
  calendario: "la-mia-area",
  note: "la-mia-area",
  "promemoria e contatti": "la-mia-area",
  "il tuo furgone": "furgone",
  "lo scarico automatico": "furgone",
  "modifica aspetto": "modifica-aspetto",
  "senza rete": "senza-rete",
  "app e notifiche": "notifiche",
};
export const videoForStep = (title) => BY_TITLE[String(title || "").replace(/^\d+\.\s*/, "").trim().toLowerCase()] || null;

// sezioni di "Tutte le funzioni" → video
const BY_SECTION = {
  new: ["nuovo-rapporto", "rapporto-non-finito"],
  practice: ["nuovo-rapporto"],
  history: ["storico"],
  print: ["stampa-interventi", "storico"],
  online: ["tecnici-online"],
  search: ["scheda-gru"],
  machine: ["scheda-gru"],
  explore: ["esplora"],
  area: ["la-mia-area", "cosa-ho-cambiato", "notifiche", "le-mie-ore"],
  phone: ["notifiche"],
  van: ["furgone"],
  home: ["modifica-aspetto"],
  offline: ["senza-rete"],
};
// (l'ufficio non ha La mia area: niente video delle notifiche per lui)
export const videosForSection = (id) => BY_SECTION[id] || [];
