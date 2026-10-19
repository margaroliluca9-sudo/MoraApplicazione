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
| `chat.js` + `components/modals/ChatModal.js` | Chat tra tecnici (si attiva/disattiva da Impostazioni → Design; spenta di partenza): gruppo con tutti + chat private, fumetti, foto (salvate a parte e caricate quando servono), messaggio fissato in alto, "Letto da…", ognuno cancella i suoi (l'admin tutti); numero dei non letti sul riquadro in Home; iscrizione dei telefoni alle notifiche (gruppo: tutti; privata: solo il destinatario) |
| `api/notify.js` | "Postino" delle notifiche (funzione Vercel, /api/notify): cifra e spedisce il messaggio ai telefoni iscritti (Web Push standard, senza librerie). La chiave privata è nel codice per scelta del titolare |
| `public/sw.js` | Service worker: solo notifiche (mostra la notifica e al tocco apre la conversazione); non memorizza pagine |
| `personal.js` + `components/modals/PersonalAreaModal.js` + `components/personal/` | La mia area (riquadro in Home), privata per ogni tecnico: Oggi, Calendario (impegni + interventi fatti), Note (con elenco da spuntare e nota fissata), Promemoria con avviso sul telefono, contatti rapidi, Chat, numeri del mese. I documenti hanno il campo `owner` e l'app carica solo quelli del tecnico collegato |
| `van.js` + `components/VanView.js` + `components/VanHost.js` + `views/VanAdmin.js` | Magazzino del furgone. L'admin (Impostazioni → Furgoni) crea i furgoni e sceglie chi li usa (più tecnici sullo stesso furgone). Chi ha un furgone gestisce il catalogo, le quantità e la scorta minima; quando salva il rapporto i pezzi montati scritti nella descrizione vengono tolti in automatico (funi, catene e motori mai), con riquadro Correggi/Ok. Chi non ha furgone non vede niente di nuovo. Lista d'ordine in PDF |
| `api/reminders.js` + `.github/workflows/promemoria.yml` | Avvisi di promemoria e impegni: ogni 5 minuti GitHub chiama /api/reminders, che manda la notifica ai telefoni del tecnico e segna l'avviso come mandato |
| `home.js` + `components/HomeGrid.js` | Home personalizzata da ogni tecnico ("Modifica la tua Home"): ordine col dito, grandezza Piccolo/Medio/Grande, colore, riquadri nascosti, riquadri informativi (Oggi, Ultimi interventi, Il mio mese, Furgone), barra di ricerca sì/no, riquadri compatti, ripristino. Salvata in `home_prefs/<tecnico>` |
| `components/PrintLogButton.js` | Pulsante «Stampa» del singolo intervento, presente in ogni pagina dove compare un intervento (foglio senza firme) |
| `components/LookEditor.js` + `home.js` (look) | «Modifica aspetto»: modelli di grafica pronti (Classico Mora, Officina, Notte, Compatto, Elegante, Lettura facile, Rosso Mora) e ogni dettaglio (colore, tema, carattere, lettere, angoli, spaziatura), solo per il tecnico. Tenendo premuto un riquadro della Home si entra in modifica e lo si trascina (come sull'iPhone) |
| `components/modals/GuideModal.js` + `components/modals/PracticeModal.js` | Guida all'app (in fondo alla Home): tutorial «Solo l'intervento», «Tutta l'app», «Tutte le funzioni», guida dedicata all'ufficio, «Prova un rapporto» con dati di esempio che non salva niente |
| `season.js` + `components/SplashScreen.js` | Animazione di avvio che cambia col periodo: Natale, Pasqua (calcolata ogni anno), estate, Halloween; si spegne da Design. Per vederla: `?stagione=natale` |
| `public/sw.js` + `index.js` | Senza rete: il service worker tiene una copia dell'app (prima la rete, poi la copia: con internet arriva sempre la versione nuova) così l'app si apre anche offline; i dati li tiene Firebase sul telefono. Striscia gialla «Sei senza rete: vedi i dati salvati sul telefono (aggiornati …)». Notifiche chat e promemoria |
| `reportHelpers.js` + `views/NewEntryForm.js` | Nuovo Rapporto: bozza salvata da sola sul telefono («Hai un rapporto non finito» → Riprendi/Scarta), riepilogo dopo «Salva» («Altra gru, stesso cliente», Stampa, Vai allo Storico), «Salva» sempre visibile in fondo; dalla scheda della gru «Nuovo rapporto su questa gru» apre il modulo già compilato |
| `views/HistoryView.js` | Storico diviso per giorno (Oggi, Ieri, Questa settimana, Settimana scorsa, poi mese per mese); dopo 3 minuti matita e cestino diventano un lucchetto (password admin). Il Database è dentro Esplora («Elenco gru e interventi») |
| Ruoli (Impostazioni → Staff) | «Tecnico» (tutta l'app) o «Ufficio» (solo Interventi ed Esplora, sola lettura con stampa, guida dedicata; escluso dagli elenchi dei tecnici) |
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
