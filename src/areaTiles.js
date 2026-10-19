// COSA SI VEDE IN «LA MIA AREA»: l'admin accende o spegne ogni parte per tutti i tecnici
// (Admin → Design → «La mia area»). Salvato in layoutConfig.areaTiles { id: false } (di base tutto acceso).
export const AREA_TILES = [
  { id: "today", label: "Oggi", sub: "Impegni e promemoria del giorno, in cima" },
  { id: "mine", label: "I miei interventi", sub: "Quelli del mese o tutti" },
  { id: "print", label: "Stampa interventi", sub: "Tuoi e dei colleghi" },
  { id: "calendar", label: "Calendario", sub: "Impegni e giorni con interventi" },
  { id: "notes", label: "Note", sub: "Testo, elenchi, foto" },
  { id: "noteScan", label: "Scansiona foglio (nelle Note)", sub: "Foto del foglio letta dall'intelligenza artificiale" },
  { id: "reminders", label: "Promemoria e contatti", sub: "Con avviso sul telefono" },
  { id: "van", label: "Magazzino del furgone", sub: "Solo chi ha un furgone assegnato" },
  { id: "hours", label: "Le mie ore", sub: "Poi ognuno la accende nelle sue Impostazioni" },
  { id: "parts", label: "Cosa ho cambiato", sub: "Pezzi sostituiti quest'anno" },
  { id: "numbers", label: "Numeri del mese", sub: "Interventi fatti e clienti visitati" },
];
export const areaOn = (cfg, id) => !(cfg && cfg.areaTiles && cfg.areaTiles[id] === false);
