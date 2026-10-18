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
| `assistant.js` + `components/AssistantPanel.js` | Assistente del tecnico: "L'ultima volta…" (cose in sospeso, spariscono da sole), guasto che si ripete (2 volte in 2 mesi), matricole scritte diversamente (stesso cliente) |
| `pdf.js` + `pdfLogo.js` + `components/PdfHost.js` | Stampe in PDF vero (libreria pdf-lib, caricata solo quando serve): rapporto del singolo intervento (dati, descrizione, foto, firme), elenco gru del cliente, report Ufficio, backup; tutti con l'intestazione Mora. La finestra PdfHost offre Condividi/Stampa, Apri, Scarica |
| `chat.js` + `components/modals/ChatModal.js` | Chat tra tecnici: gruppo con tutti + chat private, fumetti, foto (salvate a parte e caricate quando servono), messaggio fissato in alto, "Letto da…", ognuno cancella i suoi (l'admin tutti); numero dei non letti sul riquadro in Home; iscrizione dei telefoni alle notifiche (gruppo: tutti; privata: solo il destinatario) |
| `api/notify.js` | "Postino" delle notifiche (funzione Vercel, /api/notify): cifra e spedisce il messaggio ai telefoni iscritti (Web Push standard, senza librerie). La chiave privata è nel codice per scelta del titolare |
| `public/sw.js` | Service worker: solo notifiche (mostra la notifica e al tocco apre la conversazione); non memorizza pagine |
| `personal.js` + `components/modals/PersonalAreaModal.js` + `components/personal/` | La mia area (riquadro in Home), privata per ogni tecnico: Oggi, Calendario (impegni + interventi fatti), Note (con elenco da spuntare e nota fissata), Promemoria con avviso sul telefono, contatti rapidi, Chat, numeri del mese. I documenti hanno il campo `owner` e l'app carica solo quelli del tecnico collegato |
| `van.js` + `components/VanView.js` + `components/VanHost.js` + `views/VanAdmin.js` | Magazzino del furgone. L'admin (Impostazioni → Furgoni) crea i furgoni e sceglie chi li usa (più tecnici sullo stesso furgone). Chi ha un furgone gestisce il catalogo, le quantità e la scorta minima; quando salva il rapporto i pezzi montati scritti nella descrizione vengono tolti in automatico (funi, catene e motori mai), con riquadro Correggi/Ok. Chi non ha furgone non vede niente di nuovo. Lista d'ordine in PDF |
| `api/reminders.js` + `.github/workflows/promemoria.yml` | Avvisi di promemoria e impegni: ogni 5 minuti GitHub chiama /api/reminders, che manda la notifica ai telefoni del tecnico e segna l'avviso come mandato |
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
