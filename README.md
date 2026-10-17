# MoraApplicazione

App "Assistenza Mora" per registrare e consultare gli interventi sulle gru
(React + Firebase). Creata con CodeSandbox.

## Dove si trova cosa (`src/`)

| File | Contenuto |
| --- | --- |
| `App.js` | Struttura dell'app: login, caricamento dati, navigazione tra le schermate |
| `firebase.js` | Connessione a Firebase |
| `constants.js` | Costanti (password admin, impostazioni grafiche di default) |
| `utils.js` | Funzioni di supporto (date, compressione foto, matricole, CSV, messaggi di errore) |
| `ui.js` | Classi grafiche comuni (input, bottoni, pannelli) |
| `theme.js`, `theme.css` | Tema chiaro/scuro (scelto su ogni dispositivo), caratteri, sfondo |
| `dark.css` | Colori del tema scuro (file generato, non modificare a mano) |
| `appearance.js`, `appearance.css` | Opzioni di Admin > Design: carattere, grandezza lettere, angoli, spaziatura, avvio (CSS generato) |
| `ropes.js` | Fune e catena sostituite: riconoscimento dalla descrizione, dati obbligatori (certificato, diametro, lunghezza) |
| `assistant.js` + `components/AssistantPanel.js` | Assistente del tecnico: "L'ultima volta…" (cose in sospeso, spariscono da sole), guasto che si ripete (2 volte in 2 mesi), riassunto della gru, matricole scritte diversamente (stesso cliente) |
| `reports.js` | Report stampabili (elenco interventi di Ufficio, rapporto del singolo intervento dallo Storico, backup PDF) |
| `views/DashboardView.js` | Home: ricerca unica, riquadri, "I miei interventi" |
| `views/NewEntryForm.js` | Nuovo rapporto d'intervento |
| `views/ExploreView.js` | Esplora clienti e macchine |
| `views/HistoryView.js` | Storico interventi |
| `views/DatabaseView.js` | Database (anagrafiche) |
| `views/OfficeView.js` | Ufficio: statistiche, calendario, report PDF ed Excel |
| `views/AdminPanel.js` | Admin: grafica, staff, tipi, clienti, gru, conflitti, sistema |
| `components/` | Pezzi riutilizzati (animazione di avvio, simbolo carroponte, login, calendario, foto...) |
| `components/modals/` | Finestre di modifica, unione e dettaglio (cliente, gru, intervento) |

## Icone

In `public/icons/` (simbolo del carroponte): usate dal manifest e dalla schermata Home del telefono.

## Comandi

- `npm start` – avvia l'app in locale
- `npm run build` – crea la versione da pubblicare
