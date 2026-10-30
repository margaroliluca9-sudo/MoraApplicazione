// GUIDA ALL'APP: tutorial a passi + spiegazione di tutte le funzioni.
// Si apre dal riquadro "Guida all'app" in fondo alla Home.
import React, { useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  PlusCircle,
  History,
  Printer,
  UserCircle,
  Bell,
  LayoutGrid,
  Truck,
  MessageSquare,
  Folder,
  Briefcase,
  Settings,
  Smartphone,
  Hand,
  Monitor,
  Sun,
  BookOpen,
  WifiOff,
  Users,
  CalendarDays,
  Building2,
  Factory,
  Lightbulb,
  FileText,
  Link2,
  Camera,
  Save,
  Pencil,
  StickyNote,
  FlaskConical,
  PlayCircle,
} from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";
import { videosFor, videoById, videoForStep, videosForSection, videoPoster } from "../../guideVideos";

// TUTORIAL 1: solo l'intervento, passo per passo (go = pulsante "Prova adesso")
const reportStepsFor = ({ hasVan }) =>
  [
    {
      icon: PlusCircle,
      title: "1. Apri il rapporto",
      text: "Tocca «Nuovo Rapporto» in Home oppure «Nuovo» nella barra in basso. I campi con l'asterisco rosso sono obbligatori. Vuoi esercitarti? «Prova un rapporto» usa clienti di esempio e non salva niente. Se l'app si chiude a metà, la prossima volta trovi «Hai un rapporto non finito»: tocca «Riprendi».",
      go: { label: "Prova un rapporto (non salva)", to: "practice" },
    },
    {
      icon: Users,
      title: "2. Chi ha lavorato",
      text: "Scegli il «Tecnico Principale» (i più usati hanno la stellina). Se eravate in più di uno tocca «Aggiungi Tecnico» per ognuno.",
    },
    {
      icon: CalendarDays,
      title: "3. Data e N. assistenza",
      text: "La data è già quella di oggi: cambiala solo se scrivi un lavoro di un altro giorno. Scrivi il N. assistenza se c'è: poi lo ritrovi con la ricerca e in Ufficio. Se quel numero c'è già nello stesso anno l'app te lo dice (va bene se è la stessa assistenza su un'altra gru).",
    },
    {
      icon: Building2,
      title: "4. Il cliente",
      text: "Inizia a scrivere il nome: compaiono i clienti già presenti, tocca quello giusto. Se è nuovo scrivilo per intero: viene aggiunto da solo quando salvi.",
    },
    {
      icon: Factory,
      title: "5. La gru",
      text: "In «Matricola/Campata» compaiono le gru di quel cliente: toccandone una, tipo e portata si compilano da soli. Se scrivi una matricola quasi uguale a una esistente, l'app chiede «è la stessa?» per evitare doppioni.",
    },
    {
      icon: Lightbulb,
      title: "6. Guarda l'assistente",
      text: "Sotto la gru compare quello che era rimasto in sospeso l'ultima volta (es. «da sostituire…») e i guasti che si ripetono. In basso vedi anche l'ultimo intervento su quella gru.",
    },
    {
      icon: FileText,
      title: "7. Scrivi la descrizione",
      text: "Scrivi chiaro cosa hai fatto, una cosa per frase: «Sostituito contattore salita. Regolato freno. Prove funzionali ok». Così l'assistente e" + (hasVan ? " il magazzino del furgone capiscono" : " la ricerca trovano") + " tutto.",
    },
    {
      icon: Link2,
      title: "8. Fune o catena",
      text: "Se scrivi che hai sostituito la fune o la catena, compaiono i campi: certificato, diametro e lunghezza. Se ora non li hai, tocca «dati non disponibili» e scrivi il motivo.",
    },
    {
      icon: Camera,
      title: "9. Le foto",
      text: "In «Allega Foto» puoi aggiungere fino a 3 foto dalla fotocamera o dalla galleria. Vengono ridotte da sole e finiscono anche nel foglio stampato. Per indicare il punto rotto tocca la foto (o la matita sull'angolo): puoi disegnarci sopra una freccia, un cerchio o un tratto a mano libera, in rosso, giallo o bianco; ↶ toglie l'ultimo segno, il cestino li toglie tutti, «Fatto» salva la foto con i segni (va anche nel rapporto stampato), la X esce senza cambiare niente. Si può fare anche quando modifichi un rapporto.",
    },
    {
      icon: Save,
      title: "10. Salva",
      text: "Tocca «Salva» (resta sempre in fondo allo schermo). Se manca qualcosa l'app te lo dice in rosso. Senza rete il rapporto resta sul telefono e parte da solo quando torna la connessione. Dopo il salvataggio il telefono fa due piccole vibrazioni (si spengono da La mia area → ⚙ Impostazioni) e vedi «Rapporto salvato»: «Altra gru, stesso cliente» per la gru successiva (tecnici, data e cliente restano), «Stampa» o «Vai allo Storico».",
    },
    hasVan && {
      icon: Truck,
      title: "11. I pezzi del furgone",
      text: "Dopo il salvataggio compare il riepilogo dei pezzi tolti dal furgone. Se è giusto non fare niente (si chiude da solo), altrimenti tocca «Correggi». Funi, catene e motori non vengono scalati.",
    },
    {
      icon: Pencil,
      title: (hasVan ? "12" : "11") + ". Hai sbagliato?",
      text: "Nello Storico puoi modificare o eliminare il rapporto entro 3 minuti dal salvataggio. Dopo compare un lucchetto: toccalo e serve la password dell'admin.",
    },
    {
      icon: Printer,
      title: (hasVan ? "13" : "12") + ". Stampa e manda",
      text: "Tocca «Stampa» sull'intervento: si crea il foglio con l'intestazione Mora. Con «Condividi o stampa» lo mandi su WhatsApp o per mail, oppure lo stampi. Per stamparne tanti insieme (anche dei colleghi) usa «Stampa interventi» nella tua area.",
    },
  ].filter(Boolean);

// TUTORIAL 2: tutta l'app, pagina per pagina
const appStepsFor = ({ hasVan, chatEnabled, isAdmin }) =>
  [
    {
      icon: BookOpen,
      title: "Benvenuto",
      text: "Un giro completo dell'app, pagina per pagina. Per scrivere un rapporto passo per passo c'è il tutorial «Solo l'intervento». Per esercitarti senza salvare niente usa «Prova un rapporto».",
      go: { label: "Prova un rapporto (non salva)", to: "practice" },
    },
    {
      icon: LayoutGrid,
      title: "La Home",
      text: "In alto la ricerca, poi i riquadri delle pagine. In basso la barra con Nuovo, Storico e Admin. Il pulsante in alto a destra (sole e luna) cambia tema: automatico, chiaro o scuro.",
    },
    {
      icon: Users,
      title: "Tecnici online",
      text: "In alto a destra c'è la pillola verde con il pallino e il numero dei colleghi online: toccala e vedi chi è collegato adesso. Con «Scrivi» mandi un messaggio privato a un collega (anche a chi hai scritto di recente e ora non è collegato). Il pallino rosso dice quanti messaggi devi leggere.",
    },
    {
      icon: Search,
      title: "La ricerca",
      text: "Scrivi un cliente, una matricola, un N. assistenza, un tecnico o una parola della descrizione: trovi clienti, gru e interventi. Non serve scrivere giusto: «rosi» trova Rossi, «biachi» trova Bianchi (prima i risultati scritti uguali, poi quelli «quasi»); solo i numeri devono essere esatti. Vale anche nello Storico e in Esplora. Tocca un risultato per aprire la gru. Il N. assistenza riparte ogni anno: «5» trova i n. 5 di tutti gli anni (il più recente in cima), «5/2027» solo quello del 2027.",
    },
    {
      icon: Factory,
      title: "La scheda della gru",
      text: "Si apre toccando una gru (dalla ricerca, da Esplora o dallo Storico): in cima quanti interventi e l'ultimo, poi tutti gli interventi su quella gru, foto, fune e catena sostituite e l'assistente con le cose in sospeso. Con «Nuovo rapporto su questa gru» il modulo si apre con cliente e gru già scritti. In cima c'è anche «Dall'ultima verifica»: com'era la fune o la catena nell'ultimo foglio di verifica del Drive (verde a posto, giallo da tenere d'occhio, rosso da sostituire), con numero di fabbrica, tipo, portata, paranco, matricola INAIL e anno. La gru si riconosce dal numero di fabbrica scritto in Matricola.",
    },
    {
      icon: PlusCircle,
      title: "Nuovo Rapporto",
      text: "Cliente, gru, descrizione, foto e salva. Il tutorial «Solo l'intervento» lo spiega passo per passo.",
      go: { label: "Apri Nuovo Rapporto", to: "new" },
    },
    {
      icon: History,
      title: "Storico",
      text: "Tutti gli interventi divisi per giorno (Oggi, Ieri, Settimana scorsa, poi mese per mese), con la ricerca per cliente, gru o parole della descrizione e i filtri «I miei» e «Con foto». Da qui stampi, modifichi (entro 3 minuti, poi con il lucchetto e la password admin) e apri le foto.",
    },
    {
      icon: Printer,
      title: "Stampare",
      text: "Il pulsante «Stampa» c'è su ogni intervento, in ogni pagina. Il foglio ha intestazione Mora, dati, descrizione e foto. Poi: Condividi o stampa, Apri PDF, Scarica.",
    },
    {
      icon: Folder,
      title: "Esplora",
      text: "«Per cliente»: sfogli i clienti, apri le loro gru e leggi gli interventi di ognuna. «Elenco gru e interventi»: tutte le gru e tutti gli interventi in un elenco, con ricerca (era il Database). Mappa (riquadro in Home e nel menu): tutti i clienti con paese o indirizzo su una cartina come Google Maps (trascini col dito, + e − o due dita per lo zoom, il pallino col numero sono più clienti vicini: toccalo per avvicinarti). Tocca un cliente: paese, quante gru, «Vedi le gru» (apre Esplora su quel cliente) e «Portami qui» (apre la strada su Google Maps). In alto cerchi per nome o paese (es. «novara»). Il pallino blu sei tu (GPS del telefono): aprendo la mappa parte da dove sei, con i clienti qui intorno; il tasto col mirino ti riporta lì e nella scheda del cliente c'è quanto è lontano da te. La prima volta il telefono chiede il permesso della posizione: «Consenti». La posizione la trova ogni mattina il programma del Drive dal paese e dall'indirizzo; il segnaposto chiaro vuol dire che c'è solo il paese, senza via.",
    },
    {
      icon: Briefcase,
      title: "Ufficio",
      text: "Calendario degli interventi del mese o dell'anno, ricerca per N. assistenza e report in PDF o Excel filtrando per date, cliente, gru e tecnico. In più due grafici del mese o dell'anno scelto: «Gru con più guasti» (contano le riparazioni: sostituito, riparato, guasto…) e «Clienti con più interventi» con quante riparazioni. Tocca una riga per vedere gli interventi. «Riepilogo del mese»: il PDF del mese appena finito è sempre pronto (numeri, tecnici, clienti, gru con più guasti e tutti gli interventi); si può scegliere anche un mese prima. Il 1° di ogni mese alle 9 all'admin arriva l'avviso sul telefono. Lo «Schermo TV» ora è in Area admin → System: apre a tutto schermo, per la TV dell'ufficio, gli interventi di oggi, i tecnici online, i numeri del mese, gli ultimi 7 giorni e gli avvisi; si aggiorna da solo e lo schermo non si spegne. Sulla TV puoi salvare come preferito l'indirizzo dell'app con ?tv=1 alla fine: si apre direttamente così.",
    },
    {
      icon: UserCircle,
      title: "La mia area",
      text: "Il riquadro «La mia area»: è solo tuo. In cima «Oggi» con impegni e promemoria, poi I miei interventi, Stampa interventi, Calendario, Note, Promemoria" + (hasVan ? ", Magazzino" : "") + " e i numeri del mese. Con ⚙ in alto a destra le tue Impostazioni (notifiche e altro); lì puoi accendere anche «Le mie ore», il calendario degli orari (straordinari, ferie, permessi).",
      go: { label: "Apri La mia area", to: "area" },
    },
    {
      icon: Printer,
      title: "Stampa interventi",
      text: "Nella tua area: scegli il giorno (o un periodo) e il tecnico, tocca gli interventi che vuoi, tuoi o dei colleghi, e stampali tutti insieme. «Stampa rapporti» fa un foglio per intervento, «Elenco» una tabella riassuntiva.",
      go: { label: "Apri Stampa interventi", to: "print" },
    },
    {
      icon: CalendarDays,
      title: "Calendario",
      text: "Tocca un giorno: vedi i tuoi impegni e gli interventi fatti (pallino verde). Con «Impegno» ne aggiungi uno, anche con l'avviso sul telefono.",
    },
    {
      icon: StickyNote,
      title: "Note",
      text: "Appunti tuoi: codici, misure, accessi ai clienti. Puoi fare un elenco da spuntare e fissare una nota in cima.",
    },
    {
      icon: Bell,
      title: "Promemoria e contatti",
      text: "Un promemoria con giorno e ora ti avvisa sul telefono (senza ora alle 8:00). Sotto ci sono i contatti rapidi con il tasto per chiamare.",
    },
    hasVan && {
      icon: Truck,
      title: "Il tuo furgone",
      text: "Con «Articolo» inserisci i pezzi che hai a bordo, la quantità e la scorta minima. In rosso quelli da riordinare. «Rifornito» quando ricarichi, «Conta» per l'inventario.",
      go: { label: "Apri il furgone", to: "van" },
    },
    hasVan && {
      icon: Truck,
      title: "Lo scarico automatico",
      text: "Quando salvi un rapporto, i pezzi scritti come «sostituito / montato / cambiato» vengono tolti dal furgone. In «Altri modi in cui lo scrivete» metti i nomi che usate (es. «teleruttore»).",
    },
    chatEnabled && {
      icon: MessageSquare,
      title: "Chat",
      text: "Dalla tua area: gruppo con tutti o messaggi privati, foto, messaggio fissato e «Letto da…».",
      go: { label: "Apri la chat", to: "chat" },
    },
    {
      icon: LayoutGrid,
      title: "Modifica aspetto",
      text: "Tieni premuto un riquadro della Home (come sull'iPhone) oppure tocca «Modifica aspetto» in fondo: scegli un modello di grafica (Classico Mora, Officina, Notte, Compatto, Elegante, Lettura facile, Rosso Mora) oppure personalizza colore, tema, carattere, lettere, angoli e spaziatura. I riquadri li trascini col dito, scegli grandezza e colore, nascondi quelli che non usi e aggiungi Oggi, Ultimi interventi, Il mio mese" + (hasVan ? ", Furgone." : ".") + " Vale solo per te.",
      go: { label: "Apri Modifica aspetto", to: "home-edit" },
    },
    {
      icon: Smartphone,
      title: "App e notifiche",
      text: "Installa l'app sul telefono (iPhone: Condividi → «Aggiungi alla schermata Home»; Android: «Installa app»). Le notifiche le attivi da La mia area → ⚙ Impostazioni (in alto a destra): lì scegli anche quali ricevere e fai una notifica di prova.",
    },
    {
      icon: WifiOff,
      title: "Senza rete",
      text: "In un capannone senza internet l'app si apre lo stesso e mostra quello che è salvato sul telefono: La mia area (note, calendario, promemoria), interventi e clienti. La striscia gialla in alto dice da quando sono aggiornati. Quello che scrivi parte da solo appena torna la connessione; le novità dei colleghi arrivano dopo. Le foto dei rapporti degli ultimi mesi restano sul telefono; quelle più vecchie, se non le hai mai aperte, si vedono quando torna la rete.",
    },
    isAdmin && {
      icon: Settings,
      title: "Impostazioni (admin)",
      text: "Design (colori, lettere, chat sì/no, messaggi da «Tecnici online» sì/no), Staff, Tipi, Clienti, Gru («Doppioni»: una coppia alla volta, scegli quale tenere), Furgoni (chi usa quale furgone, lista d'ordine), Azienda (avvisi in Home, chiusure, intestazione dei fogli, password) e System (collegati e backup).",
    },
    {
      icon: BookOpen,
      title: "Fatto!",
      text: "Se hai un dubbio apri «Tutte le funzioni» e cerca una parola (es. stampa, fune, promemoria).",
    },
  ].filter(Boolean);

// tutte le funzioni, pagina per pagina
const sectionsFor = ({ hasVan, chatEnabled, isAdmin }) =>
  [
    {
      id: "new",
      icon: PlusCircle,
      title: "Nuovo Rapporto",
      points: [
        "Il modulo è diviso in schede numerate: 1 Chi e quando, 2 Cliente e gru, 3 Cosa hai fatto, 4 Foto. In alto la barra mostra quali sono complete; la scheda completa diventa verde con la spunta.",
        "Scegli tecnico principale (e quelli aggiuntivi), data, N. assistenza, cliente e gru.",
        "Tasti grandi (con i guanti): tocca «Guanti» in cima al Nuovo rapporto, oppure La mia area → ⚙ Impostazioni → «Tasti grandi». Campi, scritte e pulsanti diventano più grandi e più distanziati; il telefono se lo ricorda. Ritocca («Grandi») per tornare normale.",
        "Portata: sotto il campo le portate più usate, in ordine di utilizzo (si aggiornano da sole con i rapporti).",
        "Scrivendo il cliente compaiono le sue gru: tocca quella giusta e tipo e portata si compilano da soli.",
        "Sotto la gru l'assistente ricorda cosa era rimasto in sospeso l'ultima volta e i guasti che si ripetono.",
        "Fune o catena sostituita: se lo scrivi nella descrizione, l'app chiede certificato, diametro e lunghezza (o «dati non disponibili» con il motivo).",
        "Foto: «Scatta» apre la fotocamera, «Galleria» prende le foto già fatte (fino a 3).",
        "Disegnare sulla foto: tocca la foto o la matita sull'angolo, scegli Freccia, Cerchio o Penna e il colore, disegna col dito e tocca «Fatto». Utile per far vedere dov'è il filo rotto della fune o la crepa.",
        "Il pulsante «Salva» resta sempre in fondo allo schermo, anche mentre scorri il modulo.",
        "Il rapporto si salva da solo sul telefono mentre scrivi: se l'app si chiude, riaprendo trovi «Hai un rapporto non finito» con «Riprendi» o «Scarta».",
        "Quando il rapporto è salvato il telefono vibra con due colpetti; se c'è un errore vibra una volta, più a lungo (Android: su iPhone il browser non può vibrare). Si spegne da La mia area → ⚙ Impostazioni → «Vibrazione al salvataggio».",
        "Dopo «Salva» compare «Rapporto salvato» per 3 secondi, poi si va da soli allo Storico. Se in quei 3 secondi tocchi «Altra gru, stesso cliente» (tiene tecnici, data e cliente) o «Stampa», resti lì.",
        "Senza rete il rapporto resta salvato sul telefono e parte da solo quando torna la connessione.",
      ],
    },
    {
      id: "practice",
      icon: FlaskConical,
      title: "Prova un rapporto (senza salvare)",
      points: [
        "Dalla Guida tocca «Prova un rapporto»: si apre il modulo vero con clienti e gru di esempio (ESEMPIO SRL, OFFICINA PROVA SPA).",
        "Puoi provare tutto: assistente, fune e catena, foto. Quando tocchi Salva non viene salvato niente: l'app ti mostra cosa sarebbe successo" + (hasVan ? ", anche quali pezzi verrebbero tolti dal furgone." : "."),
      ],
    },
    {
      id: "history",
      icon: History,
      title: "Storico",
      points: [
        "Tutti gli interventi, dal più recente, divisi per giorno: Oggi, Ieri, Questa settimana, Settimana scorsa e poi mese per mese.",
        "La ricerca trova cliente, gru, parole della descrizione, fune e catena.",
        "Sotto la ricerca: «Tutti», «I miei» (solo quelli dove c'eri tu) e «Con foto».",
        "Tocca «Gru …» su un intervento per aprire la scheda di quella gru.",
        "Fune e catena sostituite sono indicate sotto la descrizione.",
        "Modificare o eliminare: entro 3 minuti dal salvataggio lo puoi fare tu (matita e cestino), dopo compare un lucchetto e serve la password admin. Se un rapporto è stato modificato, chi è entrato come admin vede «Modificato 2 volte» (gli altri no): toccalo per vedere chi l'ha cambiato, quando e cosa (prima → dopo). Un rapporto eliminato non si perde: va nel cestino e l'admin lo può recuperare per 30 giorni (Area admin → Cestino).",
      ],
    },
    {
      id: "print",
      icon: Printer,
      title: "Stampare",
      points: [
        "Il pulsante «Stampa» c'è su ogni intervento: Storico, scheda della gru, I miei interventi, Esplora, Ufficio, ricerca e calendario.",
        "Nel rapporto stampato ci sono anche i dati presi dal Drive: il paese e l'indirizzo del cliente (riga «Luogo») e, se la gru è nel Drive, paranco, matricola INAIL e anno nella stessa tabella dei dati della gru (il numero di fabbrica solo se è diverso dalla matricola; tipo e portata non si ripetono; valgono le correzioni fatte in Admin → Drive). L'esito della verifica (fune o catena) non viene stampato. Se la gru non è nel Drive il rapporto esce come prima.",
        "Il foglio ha l'intestazione Mora, i dati della gru, la descrizione e le foto.",
        "Dalla finestra del PDF: «Condividi o stampa» (WhatsApp, mail, stampante), «Apri PDF» oppure «Scarica».",
        "Più interventi insieme: La mia area → «Stampa interventi». Scegli giorno o periodo (Oggi, Ieri, Ultimi 7 giorni o le date), il tecnico (tutti, solo i tuoi o un collega), tocca quelli che vuoi o «Seleziona tutti».",
        "«Stampa rapporti» crea un unico PDF con un foglio per ogni intervento; «Elenco» crea una tabella riassuntiva.",
      ],
    },
    {
      id: "online",
      icon: Users,
      title: "Tecnici online e messaggi",
      points: [
        "In alto a destra la pillola verde con il pallino e il numero dei colleghi online. Toccala per vedere chi è collegato adesso e da quanto.",
        "«Scrivi» apre una conversazione privata con quel collega; sotto, in «Messaggi recenti», ritrovi chi ti ha scritto anche se ora non è collegato.",
        "Il pallino rosso sulla scritta dice quanti messaggi devi leggere. Con le notifiche attive (La mia area → ⚙ Impostazioni) arriva anche sul telefono.",
        "Vocali anche da qui: con la casella vuota a destra c'è il microfono (tocca, parla, ■, poi Invia); i vocali ricevuti si ascoltano toccando ▶.",
        "Sono gli stessi messaggi privati della Chat: se l'admin accende la Chat in «La mia area» li ritrovi anche lì. L'admin può spegnere i messaggi da Impostazioni → Design.",
      ],
    },
    {
      id: "search",
      icon: Search,
      title: "Ricerca in Home",
      points: [
        "Cerca insieme clienti, gru e interventi: nome, matricola, N. assistenza, tecnico, data o parole della descrizione.",
        "Il N. assistenza riparte ogni anno: «5» trova i n. 5 di tutti gli anni (il più recente in cima), «5/2027» solo quello del 2027.",
        "Tocca un risultato per aprire la scheda della gru con tutto il suo storico.",
        "Nella scheda della gru: in cima quanti interventi e, in un riquadro, l'ultimo intervento (quando, chi e cosa è stato fatto); «Nuovo rapporto su questa gru» apre il modulo con cliente, gru, tipo e portata già scritti.",
      ],
    },
    {
      id: "explore",
      icon: Folder,
      title: "Esplora",
      points: [
        "«Per cliente»: sfoglia i clienti, apri le loro gru e leggi gli interventi di ogni gru, con foto e stampa.",
        "«Elenco gru e interventi» (era il Database): tutti i clienti, le gru e gli interventi in elenco, con ricerca veloce.",
        "Stampa scheda cliente: aprendo un cliente in Esplora (o la sua scheda) c'è «Stampa scheda cliente»: un PDF con nome, paese e indirizzo e tutte le sue gru, con tipo e portata, paranco, matricola INAIL e anno (presi dal Drive quando ci sono) e quanti interventi ha avuto ogni gru con la data dell'ultimo.",
        "Mappa (riquadro in Home e nel menu): tutti i clienti con paese o indirizzo su una cartina come Google Maps (trascini col dito, + e − o due dita per lo zoom, il pallino col numero sono più clienti vicini: toccalo per avvicinarti). Tocca un cliente: paese, quante gru, «Vedi le gru» (apre Esplora su quel cliente) e «Portami qui» (apre la strada su Google Maps). In alto cerchi per nome o paese (es. «novara»). Il pallino blu sei tu (GPS del telefono): aprendo la mappa parte da dove sei, con i clienti qui intorno; il tasto col mirino ti riporta lì e nella scheda del cliente c'è quanto è lontano da te. La prima volta il telefono chiede il permesso della posizione: «Consenti». La posizione la trova ogni mattina il programma del Drive dal paese e dall'indirizzo; il segnaposto chiaro vuol dire che c'è solo il paese, senza via.",
      ],
    },
    {
      id: "office",
      icon: Briefcase,
      title: "Ufficio",
      points: [
        "Calendario degli interventi del mese o dell'anno.",
        "Ricerca per N. assistenza, con l'anno (il numero riparte ogni anno): esce prima il numero esatto.",
        "Report in PDF o file Excel, filtrando per date, cliente, gru e tecnico.",
      ],
    },
    {
      id: "area",
      icon: UserCircle,
      title: "La mia area",
      points: [
        "È personale: le tue cose non le vede nessun altro.",
        "Il mio profilo (tocca la tua foto o iniziale in cima, oppure «Il mio profilo» in fondo): metti la tua foto (facoltativa: la vedono i colleghi in chat, in «Tecnici online», nello Storico accanto agli interventi che hai fatto e in alto nell'app), il cognome e l'email della ditta. Il nome per entrare lo cambia l'admin.",
        "La mia password: sempre in Il mio profilo puoi metterti una password solo tua (almeno 6 caratteri): da quel momento entri con quella e non più con la password aziendale. Se la dimentichi, l'admin in Staff tocca «Pass. sua ✕» accanto al tuo nome e torni alla password aziendale.",
        "Oggi: impegni e promemoria del giorno.",
        "I miei interventi: quelli di questo mese o tutti.",
        "Stampa interventi: scegli e stampa insieme i rapporti tuoi e dei colleghi.",
        "Calendario: i tuoi impegni (con avviso) e i pallini verdi dei giorni in cui hai fatto interventi.",
        "Note: testo, elenco da spuntare, nota fissata in cima. «Foto» scatta con la fotocamera, «Galleria» aggiunge foto già fatte; sotto ogni foto puoi ruotarla o toglierla. Fino a 3 foto per nota. (La lettura automatica dei fogli con l'intelligenza artificiale è stata tolta: l'app è tutta gratuita.)",
        "Promemoria: con giorno e ora ti avvisa sul telefono; senza ora alle 8:00. Sotto ci sono i contatti rapidi con il tasto per chiamare.",
        "In fondo: interventi fatti e clienti visitati nel mese; toccandoli si apre l'elenco dei tuoi interventi.",
        "Cosa ho cambiato (in fondo): quanti pezzi hai sostituito quest'anno, dal più cambiato (es. «11 funi, 15 guidafuni, 7 contattori»). Conta quello che scrivi nei rapporti come «sostituito», «cambiato», «montato» e la fune o catena sostituita; «da sostituire» o «consigliato» non contano. Sotto ogni pezzo i dettagli letti dai rapporti (diametro e metri delle funi, ampere dei fusibili, modelli dei contattori, kW dei motori, finecorsa salita/discesa…) e il cliente dove l'hai cambiato di più; toccandolo vedi dettagli, clienti e interventi. In alto i metri di fune montati; in fondo «Altri pezzi cambiati» con quello che non è nella lista. «Anno» o il mese corrente, frecce per gli anni passati.",
        "⚙ Impostazioni (in alto a destra o in fondo): notifiche sì/no e quali, animazione all'avvio, farti vedere o no tra i «Tecnici online». Valgono per il tuo telefono.",
        "Le mie ore (da accendere in ⚙ Impostazioni → Funzioni in più): un calendario solo per gli orari. Dal lunedì al venerdì ogni giorno conta da solo come giornata normale (8 h, in grigio), festivi esclusi; le chiusure aziendali decise dall'admin si segnano da sole come ferie o festa. Segni solo quando cambia qualcosa. Per oggi «+30 min» o «+1 h»; toccando un giorno scegli Lavoro (ore fatte a passi di 15 minuti), Ferie, Permesso (quante ore), Malattia o Riposo, con una nota.",
        "«Manda» (nel riquadro blu di Le mie ore): scegli il periodo (questo mese, mese scorso, questa settimana, settimana scorsa, quest'anno o le date che vuoi) e poi «PDF» (foglio ore con riepilogo e un giorno per riga con le note) o «Testo» per WhatsApp o mail.",
        "Nel calendario: il numero sono le ore fatte, in verde «+» lo straordinario, in arancio «−» le ore in meno (sabato, domenica e feste: tutte le ore segnate sono straordinario), F ferie, P permesso, M malattia, R riposo. Sotto il riepilogo del mese (ore lavorate, straordinari, ore in meno, permessi, ferie, malattia) e «Manda» per mandarlo su WhatsApp o per mail. «Orario normale» (8 h) si cambia in fondo. Le vedi solo tu.",
        "«Ricordamelo» (in fondo a Le mie ore): dal lunedì al venerdì all'ora che scegli (17:30 di base) arriva la notifica «Hai fatto ore in più o in meno?». Toccala e segni il giorno. Se l'hai già segnato non arriva. Servono le notifiche accese.",
      ],
    },
    hasVan && {
      id: "van",
      icon: Truck,
      title: "Magazzino del furgone",
      points: [
        "Lo vedi perché l'admin ti ha assegnato un furgone (anche condiviso con altri tecnici).",
        "«Articolo» per aggiungere un pezzo: nome, quantità a bordo, scorta minima, dove sta.",
        "«Altri modi in cui lo scrivete» (es. «teleruttore, contattore») aiuta l'app a riconoscerlo nei rapporti.",
        "Salvando un rapporto, i pezzi scritti come «sostituito / montato / cambiato» vengono tolti in automatico. «Controllato» o «da sostituire» non contano.",
        "Funi, catene e motori non vengono mai scalati: si prendono in ditta.",
        "Dopo il salvataggio compare il riepilogo: «Correggi» se qualcosa non va.",
        "Nella scheda del pezzo: −/+ a mano, «Rifornito», «Conta (inventario)» e tutti i movimenti.",
        "In rosso i pezzi sotto la scorta minima.",
      ],
    },
    {
      id: "hero",
      icon: Sun,
      title: "Il cielo in cima alla Home",
      points: [
        "In cima alla Home c'è il saluto con il giorno, quante cose hai da fare e una scritta, diversa ogni volta che apri la Home: i tuoi numeri (anche il confronto con l'anno scorso e dove eri un anno fa), cose del periodo dell'anno (feste, ora legale o solare, quanti giorni mancano a Natale o al weekend) e curiosità varie («Lo sapevi?»). Gli avvisi dell'azienda (📢) escono nei giorni decisi dall'admin.",
        "Il cielo segue l'ora vera: alba, giorno, tramonto e notte con il sole, la luna (con la sua fase vera) e le stelle.",
        "A ogni apertura cambia tutto: il tipo di gru (carroponte, gru a portale, semiportale, monotrave con paranco, gru a bandiera), il colore e la portata della trave, il carico, lo sfondo (capannone, città, colline, montagne).",
        "Mentre la guardi il tempo cambia da solo (sole, nuvole, pioggia, temporale, arcobaleno, nebbia, vento, neve d'inverno) e passa qualcuno: camion da caricare o scaricare, muletto, aerei, elicottero, uccelli, mongolfiere, un gatto sulla trave; di notte stelle cadenti, fuochi d'artificio… e ogni tanto qualcosa di molto strano.",
        "La gru lavora da sola: sposta casse, bobine e travi e carica i camion, con il carico che dondola come uno vero.",
        "Puoi guidarla tu: trascina il dito sul cielo per spostare il carrello; tocca e il gancio scende, aggancia (o sgancia) e risale.",
        "Un segreto: tocca il cielo 5 volte di fila e si apre il gioco del carroponte. Si gioca con i tasti come un Game Boy: ◀ ▶ spostano il carrello, B lo ferma, tieni premuto A (o ▼) per calare il gancio, START mette in pausa e SELECT accende o spegne i suoni (si può anche trascinare il dito sul capannone; tenendo premuto un tasto su iPhone non compare più il menu «Copia / Traduci»): carica sui camion i pezzi che chiedono, appoggiandoli piano («Perfetto!»). Si parte facile, con una freccia verde che indica cosa prendere e dove metterlo; ogni 2 camion si passa di livello e diventa più difficile (più pezzi, meno tempo, vento, gancio che dondola di più, vetro fragile che se lo sbatti si rompe). Hai 3 vite e ogni 3 livelli ne guadagni una; c'è il tasto pausa e la classifica tra i tecnici. In «Il tuo carroponte» scegli il colore della trave (i colori si sbloccano col tuo record: 100, 250, 500, 800, 1200 e 2000 punti) e scrivi il tuo nome sulla trave; il colore si vede anche accanto al tuo nome in classifica. Il gioco si ricorda il livello più alto che hai raggiunto, anche su un altro telefono: all'inizio scegli «Continua dal livello N» oppure «Ricomincia dal livello 1».",
        "Durante l'anno: lucine a Natale, cuori a San Valentino, coriandoli a Carnevale, Frecce Tricolori il 2 giugno, lucciole d'estate, foglie che cadono in autunno, pipistrelli e zucca ad Halloween. Anche l'animazione di avvio cambia con la festa. Ogni 50 interventi nell'anno arrivano i coriandoli.",
        "Se preferisci un'immagine ferma: La mia area → ⚙ Impostazioni → «Cielo animato in Home».",
      ],
    },
    {
      id: "home",
      icon: LayoutGrid,
      title: "Modifica aspetto",
      points: [
        "In fondo alla Home tocca «Modifica aspetto». Quello che scegli vale solo per te e lo vedi subito.",
        "Modelli pronti: Classico Mora, Officina (lettere grandi, per i guanti), Notte (scuro), Compatto, Elegante, Lettura facile, Rosso Mora.",
        "«Personalizza ogni dettaglio»: colore principale, tema (automatico, chiaro, scuro), carattere, grandezza delle lettere, angoli e spaziatura. «Come l'app» torna alla grafica dell'admin.",
        "Come sull'iPhone: tieni premuto un riquadro della Home per mezzo secondo, i riquadri iniziano a muoversi e, senza staccare il dito, lo trascini dove vuoi.",
        "In modifica: trascina qualsiasi riquadro, toccalo per grandezza e colore, × per nasconderlo.",
        "Tocca un riquadro per scegliere grandezza (Piccolo, Medio, Grande), colore e posizione.",
        "«Aggiungi riquadro»: rimetti quelli nascosti o aggiungi Oggi, Ultimi interventi, Il mio mese" + (hasVan ? ", Furgone." : "."),
        "Opzioni: barra di ricerca, riquadri compatti, «Ripristina tutto come prima».",
        "«Fatto» salva, «Annulla» rimette com'era. Ritrovi tutto uguale anche su un altro telefono.",
      ],
    },
    chatEnabled && {
      id: "chat",
      icon: MessageSquare,
      title: "Chat",
      points: [
        "Si apre dalla tua area: gruppo con tutti i tecnici o chat private.",
        "Puoi mandare foto e fissare un messaggio importante in alto.",
        "Vocali: con la casella vuota a destra c'è il microfono. Toccalo e parla (la prima volta il telefono chiede il permesso del microfono: «Consenti»), tocca ■ per fermare (si ferma da solo a 2 minuti), riascoltalo se vuoi e tocca Invia; il cestino lo butta. Chi lo riceve tocca ▶ per ascoltarlo.",
        "Modificare o eliminare: tocca un tuo messaggio e compaiono «Modifica» ed «Elimina». Modifica: il testo torna nella casella, lo correggi e tocchi Invia (la scritta «modificato» sul messaggio la vede solo chi è entrato come admin). Elimina lo toglie per tutti, con la foto o il vocale.",
        "«Letto da…» mostra chi l'ha letto.",
      ],
    },
    {
      id: "gesti",
      icon: Hand,
      title: "Gesti",
      points: [
        "Scorri dal bordo sinistro dello schermo verso destra: torna indietro (chiude la finestra aperta o torna alla Home).",
        "Sui telefoni Android anche il tasto o il gesto «indietro» del telefono fa la stessa cosa, senza uscire dall'app.",
        "Le finestre che salgono dal basso si chiudono tirandole giù dalla barretta in alto.",
        "Tieni premuto un intervento nello Storico: compare il menu con le sue azioni (stampa, modifica, scheda della gru…).",
        "Scorri verso sinistra su una nota, un promemoria, un contatto, un impegno o un intervento dello Storico: escono i pulsanti (Fissa, Fatto, Modifica, Stampa, Elimina…). «Elimina» chiede «Sicuro?» prima di farlo. Scorri indietro o tocca la riga per richiuderla.",
        "Foto: si aprono subito (se è la prima volta su quel telefono compare «Carico le foto…» per un attimo). Scorri a destra o a sinistra per cambiarla, doppio tocco o due dita per ingrandire, tira giù per chiudere.",
        "In Home: tieni premuto un riquadro per spostarlo; tira giù dall'alto per ricaricare l'app.",
      ],
    },
    {
      id: "pc",
      icon: Monitor,
      title: "Su tablet e computer",
      points: [
        "Da tablet e computer l'app è come un programma: a sinistra il menu sempre visibile (Home, Nuovo rapporto, Storico, Esplora, Ufficio, La mia area, Impostazioni).",
        "In alto le schede aperte, come nel browser: passi da una all'altra con un tocco e le chiudi con la ×. Anche «La mia area» si apre in una scheda, come le altre pagine.",
        "Sui tablet stretti il menu mostra solo le icone con il nome sotto.",
      ],
    },
    {
      id: "account",
      icon: UserCircle,
      title: "Esci e impostazioni su tutti i telefoni",
      points: [
        "In alto a destra il cerchio con la tua foto (o la tua iniziale): toccandolo vedi chi è collegato e «Esci» (vale per tutti, anche per l'ufficio). Per rientrare servono di nuovo nome e password.",
        "Le tue impostazioni (quali notifiche, animazioni, Le mie ore e il tuo orario normale, farti vedere online) ti seguono su tutti i telefoni dove entri con il tuo nome. Solo «Notifiche accese» resta del singolo telefono, perché il permesso lo dà il telefono.",
        "Su iPhone con l'app installata la barra in alto (ora e batteria) è del colore dell'app.",
      ],
    },
    {
      id: "phone",
      icon: Smartphone,
      title: "Installare l'app e le notifiche",
      points: [
        "iPhone: apri l'app in Safari, tocca Condividi → «Aggiungi alla schermata Home» e poi aprila da lì.",
        "Android: dal menu di Chrome tocca «Installa app» o «Aggiungi a schermata Home».",
        "Notifiche: La mia area → ⚙ Impostazioni (in alto a destra o in fondo) → «Notifiche». Il telefono chiede il permesso: tocca «Consenti».",
        "Sempre lì scegli quali ricevere (messaggi dei colleghi, promemoria e impegni) e con «Prova una notifica» controlli che arrivino.",
        "Se il telefono le ha bloccate: impostazioni del telefono → Notifiche → Assistenza Mora (o il browser) → Consenti. Gli avvisi possono arrivare con qualche minuto di ritardo.",
      ],
    },
    {
      id: "theme",
      icon: Sun,
      title: "Tema chiaro o scuro",
      points: ["Il pulsante in alto a destra (sole e luna) cambia tema: automatico (come il telefono), chiaro o scuro."],
    },
    {
      id: "offline",
      icon: WifiOff,
      title: "Senza rete",
      points: [
        "L'app si apre anche senza internet (in un capannone, in cantina): usa la copia salvata sul telefono.",
        "Vedi La mia area (note, calendario, promemoria, contatti), gli interventi, i clienti e le gru com'erano l'ultima volta che c'era la rete: la striscia gialla in alto dice «aggiornati oggi alle…».",
        "Puoi scrivere rapporti, note e impegni: partono da soli appena torna la rete. Le novità dei colleghi arrivano quando torni online.",
        "Le foto dei rapporti degli ultimi mesi restano sul telefono e si vedono anche senza rete; quelle più vecchie, se non le hai mai aperte, compaiono quando torna la rete.",
        "Serve averla aperta almeno una volta con la rete su quel telefono.",
      ],
    },
    isAdmin && {
      id: "admin",
      icon: Settings,
      title: "Impostazioni (solo admin)",
      points: [
        "Persone → Modifiche: l'elenco di tutte le modifiche e le eliminazioni degli interventi, dalla più recente. Per ognuna: chi, quando, su quale intervento (cliente, gru, data, N. assistenza, chi l'aveva fatto), cosa è cambiato (prima → dopo) e dopo quanto dal salvataggio: «nei primi 3 minuti» (il tecnico da solo) o «con la password admin» (dopo). Filtri per tecnico, modifiche/eliminazioni e tempo. Sulle eliminazioni «Recupera dal Cestino».",
        "Le schede sono in 4 gruppi: «Persone» (Staff: i tecnici; Modifiche: chi ha modificato o eliminato un intervento), «Clienti e gru» (Clienti, Gru, Tipi, Drive), «Azienda» (Azienda con avvisi, chiusure e password, Furgoni, Design) e «Sistema» (System con backup, Excel, letture e schermo TV, Cestino). Tocchi il gruppo e sotto compaiono le sue schede; l'app si ricorda l'ultima che hai aperto.",
        "Design: nome dell'app (si vede in alto e nell'avvio), colore (10 colori), carattere, grandezza delle lettere. «Animazioni dell'anno»: l'elenco di tutte le feste (Classica, Natale, San Valentino, Carnevale, Pasqua, Festa della Repubblica, Estate, Autunno, Halloween) con le date; «Avvio» mostra subito a tutto schermo l'animazione di apertura («Rivedi» per riguardarla), «Cielo» mostra il cielo della Home di quella festa (di giorno o di notte). In «Quale usare»: Automatica (cambia da sola), sempre la classica, oppure una festa fissa per tutti. Poi animazione di avvio sì/no, chat tra tecnici sì/no, messaggi da «Tecnici online» sì/no. «La mia area: cosa vedono i tecnici»: accendi o spegni per tutti Oggi, I miei interventi, Stampa, Calendario, Note, Promemoria, Magazzino, Le mie ore, Cosa ho cambiato e i numeri del mese (i dati restano salvati).",
        "Staff: tecnici e password. Chi si è messo una password sua (Il mio profilo) ha accanto «Pass. sua ✕»: toccalo per togliergliela se l'ha dimenticata (torna a entrare con la password aziendale). Tipi, Clienti, Gru: anagrafiche e unione.",
        "Paese e indirizzo dei clienti: Clienti → matita per scriverli a mano, oppure «Importa paesi» per prenderli da un file Excel o CSV (colonne CLIENTE o RAGIONE SOCIALE, PAESE, INDIRIZZO). L'app abbina i nomi ai clienti che ci sono già e ti mostra l'elenco: spunti quelli da salvare (di base solo quelli che non hanno ancora il paese) e tocchi «Salva». Il paese compare sotto il nome in Esplora, nel Nuovo rapporto e nella scheda del cliente (con «Mappa» per aprirlo su Google Maps); in Esplora puoi anche cercare per paese.",
        "Paesi dal Drive in automatico: un programmino installato una volta nel Google Drive (file apps-script/paesi-dal-drive.gs, istruzioni in cima al file) ogni mattina alle 10 apre l'ultimo foglio di verifica di ogni cliente in Clienti / Verifiche (solo quelli nuovi o cambiati). Dall'intestazione aggiorna paese e indirizzo: riempie solo i clienti senza paese o quelli che aveva già aggiornato lui, quello che scrivi a mano o importi da file non viene mai toccato. Dalla tabella prende le gru: stato di fune o catena, tipo, portata, paranco, matricola INAIL e anno, che si vedono nella scheda della gru («Dall'ultima verifica»). In Admin → Drive vedi la data dell'ultimo giro, quanti clienti e quante gru.",
        "«Aggiorna adesso» (nel riquadro del Drive in Admin → Drive): chiede al programma di Google di fare subito un giro, senza aspettare le 10 di mattina e senza aprire Google Script. Il programma controlla ogni 5 minuti, quindi parte entro 5 minuti; il riquadro si aggiorna da solo quando ha finito. Serve aver incollato l'ultima versione del programma e premuto Esegui su «installa» una volta.",
        "Fogli Excel: oltre ai documenti (Google Docs e Word) il programma legge anche i fogli di calcolo (Google Fogli ed Excel) quando il nome sembra una verifica, es. «Cliente T10/26 Excel» o «A04.26»; prende sempre il più recente. Le cartelle e i fogli dei sottoganci (nome con «sottoganci», «imbracature» o «brache») non li apre: lì non ci sono gru. Capisce anche le tabelle con le colonne «N.F.» (numero di fabbrica), «N. …» (il numero che usa il cliente, es. «52 R» o «1 OFF»), la prima colonna senza titolo (tipo di gru) e «Note» (com'è la fune o la catena). La gru dell'app si riconosce dal numero di fabbrica oppure dal numero del cliente scritto in Matricola.",
        "Sottocartelle: se dentro la cartella di un cliente ci sono altre cartelle (es. una per stabilimento, ognuna con i suoi fogli di verifica), il programma legge anche quelle, fino a due livelli, e le dà allo stesso cliente. In Admin → Drive accanto alla cartella vedi «+ 2 sottocartelle»; quando scegli la cartella a mano compaiono anche le sottocartelle (es. «CLIENTE › STABILIMENTO B»), così puoi dare uno stabilimento a un altro cliente. Paese e indirizzo arrivano dalla cartella principale.",
        "Admin → Drive: la parte apposta per tutto quello che arriva dal Drive. In cima il semaforo del programma: verde «Tutto a posto»; giallo se ha letto solo una parte delle cartelle (finisce da solo la mattina dopo) o se qualche cartella non l'ha letta («Cosa non è andato» dice quali e perché); rosso se l'ultimo giro si è fermato con un errore o se non gira da più di un giorno (apri Google Script e premi Esegui su «installa»). Sotto: giorno e ora dell'ultimo giro, quante cartelle ci sono nel Drive, quante sono abbinate a un cliente e quante gru ha letto. «Da controllare»: l'app controlla da sola gli abbinamenti e ti mostra il paragone «Sul Drive / Nell'app» (numero, tipo, portata; in giallo quello che non torna) quando ha un dubbio: cliente e cartella con nomi diversi, gru con tipo o portata diversi, gru abbinata col numero interno, due righe sulla stessa gru, oppure una gru del Drive che nell'app non c'è ma ce n'è una quasi uguale («Forse è la …?»). Se il numero di fabbrica è uguale non chiede niente: la gru è quella. Per non rispondere una alla volta in cima ci sono «Sono tutte giuste (N)» e «Accetta tutti i «Forse è…» (N)»: al primo tocco chiede «Sicuro?», al secondo salva tutto. Oppure, una per una, rispondi «È giusta» / «Sì, è questa» (non lo chiede più), «Non è giusta» / «No» (la stacca) o «Modifica» (apre il cliente). «Solo interventi»: per i clienti che non hanno cartella nel Drive perché non facciamo le verifiche ma solo lavori, apri il cliente e spunta «Solo interventi, niente verifiche»: non compaiono più tra quelli «Senza cartella» e il programma non gli abbina nessuna cartella. Poi, per ogni cliente, da quale cartella ha preso i dati (scelta da te o trovata dal nome) e se paese e indirizzo sono «dal Drive», «scritti a mano» o «da file»; «Senza cartella» mostra i clienti che non ha abbinato. Tocchi un cliente e puoi: scegliere la cartella giusta («Cambia», cerchi, «Salva la cartella»: vale dal giro del mattino dopo); correggere paese e indirizzo (vedi cartella e foglio da cui li ha presi, con «Apri il foglio»; se li correggi il Drive non li cambia più); vedere le gru lette dall'ultima verifica con la gru dell'app su cui compaiono. Su ogni gru: «Correggi» per scrivere lo stato giusto di fune o catena e gli altri dati, o per abbinarla a mano a una gru dell'app quando il numero di fabbrica non corrisponde; «Nascondi» per non mostrarla; «Torna ai dati del Drive» per togliere le correzioni. Le correzioni restano anche quando il programma rilegge il foglio.",
        "«Doppioni» (in Clienti e in Gru): ti mostra una coppia alla volta di nomi che sembrano uguali, con quanti interventi e gru ha ognuno. L'app consiglia quale tenere (quello con più storia): «Tieni questo» sposta tutto sull'altro dopo averti chiesto conferma; «Sono diversi» non te li ripropone più; «Salta» li lascia per la prossima volta.",
        "Furgoni: crei i furgoni, scegli chi li usa («Nessuno» = tutto come prima), vedi tutti i magazzini e stampi la lista d'ordine.",
        "Azienda: avvisi in Home (con data di inizio e fine, poi spariscono da soli), chiusure aziendali (ferie collettive, ponti, patrono, anche «ogni anno»: Le mie ore le segna da sole e il promemoria delle ore non arriva), intestazione dei fogli stampati e password di tecnici e admin.",
        "Impronta / Face ID: dopo aver scritto la password admin il telefono chiede «Entrare con l'impronta?». Se dici sì, su quel telefono per entrare in Admin basta l'impronta (o Face ID). La password resta valida; se cambi la password admin l'impronta va riattivata. Si attiva o disattiva anche da System → «Entra con l'impronta / Face ID».",
        "Per restare gratis l'app non riscarica più tutto a ogni apertura: interventi, clienti e gru restano sul telefono e dal server arriva solo quello che è cambiato (ogni modifica lascia un «biglietto» che gli altri telefoni leggono). Per sicurezza i clienti si rileggono tutti una volta al giorno, gru e interventi una volta alla settimana; gli interventi degli ultimi 3 giorni sono sempre in diretta. Prima ogni apertura costava circa 1.400 letture, ora qualche decina.",
        "Letture del database oggi: Firebase è gratis fino a 50.000 letture al giorno (il conteggio riparte alle 9). Qui vedi a che punto siamo, da quale parte dell'app arrivano e da chi; i telefoni aggiornano il conteggio ogni 10 minuti. Se si supera l'80%, all'admin compare un avviso in Home.",
        "Versione nuova: quando pubblichiamo una versione nuova e tu hai l'app già aperta, in basso compare «È uscita una versione nuova dell'app · Aggiorna»: toccalo e l'app si ricarica con le novità (sull'iPhone, senza questo, restava la vecchia finché non chiudevi l'app del tutto).",
        "Aggiornamenti sicuri: prima di arrivare sui telefoni, ogni nuova versione dell'app viene provata da sola su GitHub («Controllo app»: pagine principali, Area admin, Ufficio, schermo TV, gioco) con dati finti. Se qualcosa non va non viene pubblicata e resta la versione di prima.",
        "Cestino: i rapporti eliminati restano qui 30 giorni, con le foto, chi li ha eliminati e quando. «Recupera» li rimette nello Storico com'erano; «Per sempre» li cancella subito. Dopo 30 giorni si cancellano da soli.",
        "Esporta tutto in Excel (System): «Prepara il file Excel» e poi «Scarica» o «Condividi». Il file ha tre fogli: Interventi (tutti, dal più recente: data, rapportino, tecnici, cliente, gru, descrizione, riparazione sì/no, fune/catena, foto), Clienti (gru, interventi, primo e ultimo) e Gru (tipo, portata, interventi, riparazioni, ultimo). Prima riga bloccata e filtri già pronti; si apre con Excel, Numbers o Google Fogli.",
        "Schermo TV (System): «Apri lo schermo TV» mostra a tutto schermo gli interventi di oggi, i tecnici online, i numeri del mese e gli avvisi, per la TV dell'ufficio. Sul computer della TV si può aprire direttamente l'indirizzo dell'app con ?tv=1 alla fine.",
        "System: copia di sicurezza (si fa da sola ogni domenica mattina, appena Firebase rimette a zero le letture; salva anche le foto dei rapporti e il Cestino; «Fai una copia adesso» con la password admin, e la data dell'ultima riuscita), «Errori e segnalazioni» (se l'app va in errore sul telefono di qualcuno, o se qualcuno usa «Segnala un problema», qui vedi cosa è successo, a chi, in che schermata e su che telefono, con la foto dello schermo se c'è; si cancellano da soli dopo 60 giorni), tecnici collegati, archivio e backup in PDF.",
        "Qualcosa non va? Tocca il tuo nome in alto a destra → «Segnala un problema»: scrivi cosa è successo e, se puoi, aggiungi una foto dello schermo. La segnalazione arriva all'admin. Se una schermata va in errore non resta la pagina bianca: compare «Qualcosa è andato storto» con il tasto «Riprova», e l'errore arriva da solo in Area admin → System.",
      ],
    },
  ].filter(Boolean);

// GUIDA DI CHI È IN UFFICIO: vede solo gli interventi ed Esplora
const officeSteps = [
  {
    icon: BookOpen,
    title: "Benvenuto",
    text: "La tua app è fatta per consultare: trovi tutti gli interventi dei tecnici, le schede delle gru e dei clienti, e stampi i rapporti che ti servono.",
  },
  {
    icon: LayoutGrid,
    title: "La Home",
    text: "In alto la ricerca, poi due riquadri: «Interventi» ed «Esplora». Gli stessi li trovi nella barra in basso, con «Home». In fondo c'è sempre questa guida.",
  },
  {
    icon: Search,
    title: "Cerca qualsiasi cosa",
    text: "Nella barra in alto scrivi un cliente, una matricola, un N. assistenza, un tecnico, una data o una parola della descrizione: trovi clienti, gru e interventi. Il N. assistenza riparte ogni anno: «5» trova i n. 5 di tutti gli anni (il più recente in cima), «5/2027» solo quello del 2027.",
  },
  {
    icon: History,
    title: "Interventi",
    text: "Tutti gli interventi dal più recente. Con «Cerca» trovi quelli di un cliente, di una gru o con una parola della descrizione; apri le foto e vedere fune e catena sostituite. Qui si consulta soltanto: non si modifica niente.",
    go: { label: "Apri Interventi", to: "history" },
  },
  {
    icon: Printer,
    title: "Stampare",
    text: "Ogni intervento ha il pulsante «Stampa»: crea il rapporto con l'intestazione Mora, i dati della gru, la descrizione e le foto. Poi «Condividi o stampa» (mail, WhatsApp, stampante), «Apri PDF» o «Scarica».",
  },
  {
    icon: Folder,
    title: "Esplora",
    text: "Sfogli i clienti, apri le loro gru e leggi gli interventi di ognuna, con foto e stampa. Con «Mappa» vedi dove sono tutti i clienti e con «Portami qui» apri la strada su Google Maps.",
    go: { label: "Apri Esplora", to: "explore" },
  },
  {
    icon: Factory,
    title: "La scheda della gru",
    text: "Toccando una gru vedi tutto il suo storico: date, tecnici, descrizioni, foto, fune e catena sostituite, e cosa era rimasto in sospeso. In cima c'è anche «Dall'ultima verifica»: com'era la fune o la catena nell'ultimo foglio di verifica del Drive (verde a posto, giallo da tenere d'occhio, rosso da sostituire), con numero di fabbrica, tipo, portata, paranco, matricola INAIL e anno. La gru si riconosce dal numero di fabbrica scritto in Matricola.",
  },
  {
    icon: Sun,
    title: "Tema e app sul telefono",
    text: "Il pulsante in alto a destra cambia tema (automatico, chiaro, scuro). Puoi installare l'app: iPhone → Condividi → «Aggiungi alla schermata Home»; Android → «Installa app».",
  },
  {
    icon: BookOpen,
    title: "Fatto!",
    text: "Per i dettagli apri «Tutte le funzioni» e cerca una parola (es. stampa, foto, cliente).",
  },
];
const officeSections = [
  {
    id: "search",
    icon: Search,
    title: "Ricerca",
    points: [
      "In Home: cerca insieme clienti, gru e interventi (nome, matricola, N. assistenza, tecnico, data, parole della descrizione).",
      "Tocca un risultato per aprire la scheda della gru con tutto il suo storico.",
    ],
  },
  {
    id: "history",
    icon: History,
    title: "Interventi",
    points: [
      "Tutti gli interventi dal più recente. «Cerca» trova cliente, gru o parole della descrizione. Per un tecnico o una data usa la ricerca in Home.",
      "Foto: tocca «FOTO» per vederle. Fune e catena sostituite sono scritte sotto la descrizione.",
      "Solo consultazione: modifiche ed eliminazioni le fanno i tecnici o l'admin.",
    ],
  },
  {
    id: "print",
    icon: Printer,
    title: "Stampare",
    points: [
      "Il pulsante «Stampa» c'è su ogni intervento (Interventi, scheda della gru, Esplora, ricerca).",
      "Il foglio ha l'intestazione Mora, i dati della gru, la descrizione e le foto.",
      "Dalla finestra del PDF: «Condividi o stampa», «Apri PDF» oppure «Scarica».",
    ],
  },
  {
    id: "explore",
    icon: Folder,
    title: "Esplora",
    points: ["Sfoglia i clienti, apri le loro gru e leggi gli interventi di ognuna, con foto e stampa.", "«Mappa»: dove sono tutti i clienti; tocca un cliente per «Portami qui»."],
  },
  {
    id: "machine",
    icon: Factory,
    title: "Scheda della gru",
    points: ["Storico completo della gru: date, tecnici, descrizioni, foto, fune e catena sostituite, cose rimaste in sospeso.", "«Dall'ultima verifica»: stato di fune o catena e dati della gru presi ogni mattina dall'ultimo foglio di verifica nel Drive (si abbina col numero di fabbrica in Matricola)."],
  },
  {
    id: "phone",
    icon: Smartphone,
    title: "Installare l'app",
    points: [
      "iPhone: apri l'app in Safari, tocca Condividi → «Aggiungi alla schermata Home».",
      "Android: dal menu di Chrome tocca «Installa app».",
    ],
  },
  {
    id: "theme",
    icon: Sun,
    title: "Tema chiaro o scuro",
    points: ["Il pulsante in alto a destra cambia tema: automatico, chiaro o scuro."],
  },
];

// un tutorial a passi
const Tour = ({ steps, onGo, onEnd, endLabel, color, id, videos = [], onVideo = () => {} }) => {
  const [step, setStep] = useState(0);
  const s = steps[Math.min(step, steps.length - 1)];
  const Icon = s.icon;
  const last = step >= steps.length - 1;
  const vid = videoForStep(s.title);
  const video = vid && videos.some((v) => v.id === vid) ? videoById(vid) : null;
  return (
    <div className="flex-1 flex flex-col p-5 min-h-0" data-section={"guide-tour-" + id}>
      {/* m-auto e non justify-center: se il testo è lungo (telefono piccolo) si scorre dall'inizio, senza tagliare il titolo */}
      <div className="flex-1 overflow-y-auto flex flex-col px-2">
      <div className="m-auto flex flex-col items-center text-center gap-4 py-2">
        <span className={`w-20 h-20 rounded-3xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
          <Icon className="w-10 h-10" />
        </span>
        <p className="text-xs font-black text-slate-400" data-step>
          Passo {step + 1} di {steps.length}
        </p>
        <h4 className="text-2xl font-black text-slate-800 leading-tight">{s.title}</h4>
        <p className="text-base text-slate-600 leading-relaxed max-w-md">{s.text}</p>
        {video && (
          <button type="button" data-guide-video={video.id} onClick={() => onVideo(video)}
            className={`h-11 pl-3 pr-5 rounded-full bg-${color}-600 text-white font-black text-sm flex items-center gap-2 shadow-sm`}>
            <PlayCircle className="w-5 h-5" /> Guarda il video · {video.sec} s
          </button>
        )}
        {s.go && (
          <button type="button" data-guide-go={s.go.to} onClick={() => onGo(s.go.to)}
            className={`h-11 px-5 rounded-full border-2 border-${color}-600 text-${color}-700 font-black text-sm`}>
            {s.go.label}
          </button>
        )}
      </div>
      </div>
      <div className="flex justify-center flex-wrap gap-1.5 py-4">
        {steps.map((_, i) => (
          <button key={i} type="button" aria-label={"Passo " + (i + 1)} onClick={() => setStep(i)}
            className={`h-2 rounded-full transition-all ${i === step ? `w-6 bg-${color}-600` : "w-2 bg-slate-300"}`} />
        ))}
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          className="h-12 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold flex items-center gap-1 disabled:opacity-40">
          <ChevronLeft className="w-5 h-5" /> Indietro
        </button>
        <button type="button" data-action="guide-next" onClick={() => (last ? onEnd() : setStep(step + 1))}
          className={`flex-1 h-12 rounded-xl bg-${color}-600 text-white font-black flex items-center justify-center gap-1`}>
          {last ? endLabel : "Avanti"} <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export const GuideModal = ({ onClose, onGo = () => {}, hasVan = false, chatEnabled = false, isAdmin = false, color = "blue", role = "tecnico" }) => {
  const office = role === "ufficio";
  const [tab, setTab] = useState(office ? "office" : "report");
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState(null); // video aperto
  const videos = videosFor({ office, hasVan });
  const sections = office ? officeSections : sectionsFor({ hasVan, chatEnabled, isAdmin });
  const norm = (t) => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const shown = q.trim()
    ? sections.filter((x) => norm(x.title + " " + x.points.join(" ")).includes(norm(q.trim())))
    : sections;

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[160] flex items-stretch md:items-center justify-center md:p-4 backdrop-blur-md">
      <div className="w-full md:max-w-xl h-full md:h-[90vh] flex flex-col md:rounded-3xl overflow-hidden bg-white shadow-2xl" data-section="guide">
        <div className={`px-4 py-3 border-b border-slate-200 border-t-4 border-t-${color}-600 flex items-center gap-3 shrink-0`}>
          <span className={`p-2 rounded-xl bg-${color}-50 text-${color}-600`}>
            <BookOpen className="w-5 h-5" />
          </span>
          <h3 className="flex-1 font-black text-slate-800 text-lg">Guida all'app</h3>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="p-2.5 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="px-4 pt-3 shrink-0">
          <div className={`grid ${office ? "grid-cols-3" : "grid-cols-4"} p-1 rounded-2xl bg-slate-100`} role="tablist">
            {(office
              ? [
                  ["office", "Tutorial"],
                  ["all", "Tutte le funzioni"],
                  ["video", "Video"],
                ]
              : [
                  ["report", "Solo l'intervento"],
                  ["app", "Tutta l'app"],
                  ["all", "Tutte le funzioni"],
                  ["video", "Video"],
                ]
            ).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} data-guide-tab={id} onClick={() => setTab(id)}
                className={`min-h-[40px] px-1 rounded-xl text-[13px] leading-tight font-black ${tab === id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {office && tab === "office" && (
          <Tour key="office" id="office" steps={officeSteps} onGo={onGo} color={color} videos={videos} onVideo={setPlaying}
            endLabel="Tutte le funzioni" onEnd={() => setTab("all")} />
        )}
        {!office && (tab === "report" || tab === "app") && (
          <div className="px-4 pt-3 shrink-0">
            <button type="button" data-guide-go="practice" onClick={() => onGo("practice")}
              className="w-full h-12 rounded-2xl bg-amber-400 text-amber-950 font-black text-sm flex items-center justify-center gap-2">
              <FlaskConical className="w-5 h-5" /> Prova un rapporto · non salva niente
            </button>
          </div>
        )}
        {tab === "report" && (
          <Tour key="report" id="report" steps={reportStepsFor({ hasVan })} onGo={onGo} color={color} videos={videos} onVideo={setPlaying}
            endLabel="Tutta l'app" onEnd={() => setTab("app")} />
        )}
        {tab === "app" && (
          <Tour key="app" id="app" steps={appStepsFor({ hasVan, chatEnabled, isAdmin })} onGo={onGo} color={color} videos={videos} onVideo={setPlaying}
            endLabel="Tutte le funzioni" onEnd={() => setTab("all")} />
        )}
        {tab === "all" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2" data-section="guide-all">
            <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-11 mb-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nella guida (es. stampa, fune, furgone)" aria-label="Cerca nella guida" className="flex-1 bg-transparent outline-none text-base text-slate-800" />
            </label>
            {!shown.length && <p className="text-sm text-slate-500 text-center py-6">Niente trovato.</p>}
            {shown.map((x) => {
              const SIcon = x.icon;
              const isOpen = open === x.id || !!q.trim();
              return (
                <div key={x.id} className="border border-slate-200 rounded-2xl overflow-hidden" data-guide-section={x.id}>
                  <button type="button" onClick={() => setOpen(isOpen && !q.trim() ? null : x.id)} aria-expanded={isOpen}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white">
                    <span className={`p-2 rounded-xl bg-${color}-50 text-${color}-600`}><SIcon className="w-5 h-5" /></span>
                    <span className="flex-1 font-black text-slate-800">{x.title}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && videosForSection(x.id).some((id) => videos.some((v) => v.id === id)) && (
                    <div className="px-4 pt-1 pb-2 flex flex-wrap gap-2 bg-white">
                      {videosForSection(x.id)
                        .filter((id) => videos.some((v) => v.id === id))
                        .map((id) => videoById(id))
                        .map((v) => (
                          <button key={v.id} type="button" data-guide-video={v.id} onClick={() => setPlaying(v)}
                            className={`h-9 pl-2.5 pr-3.5 rounded-full bg-${color}-50 text-${color}-700 border border-${color}-200 font-black text-xs flex items-center gap-1.5`}>
                            <PlayCircle className="w-4 h-4" /> Video: {v.title}
                          </button>
                        ))}
                    </div>
                  )}
                  {isOpen && (
                    <ul className="px-5 pb-4 pt-1 space-y-2 bg-white">
                      {x.points.map((pt, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
                          <span className={`mt-2 w-1.5 h-1.5 rounded-full bg-${color}-500 shrink-0`} />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {tab === "video" && (
          <div className="flex-1 overflow-y-auto p-4" data-section="guide-videos">
            <p className="text-sm text-slate-500 font-semibold mb-3">Brevi video: tocca e guarda come si fa. Servono la rete.</p>
            <div className="grid grid-cols-2 gap-3">
              {videos.map((v) => (
                <button key={v.id} type="button" data-guide-video={v.id} onClick={() => setPlaying(v)}
                  className="text-left rounded-2xl border border-slate-200 overflow-hidden bg-white active:scale-[0.98]">
                  <span className="relative block aspect-[3/4] bg-slate-100 overflow-hidden">
                    <img src={videoPoster(v)} alt="" loading="lazy" className="w-full h-full object-cover object-top" />
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-900/10">
                      <span className={`w-12 h-12 rounded-full bg-${color}-600/90 text-white flex items-center justify-center shadow-lg`}>
                        <PlayCircle className="w-7 h-7" />
                      </span>
                    </span>
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-slate-900/75 text-white text-[11px] font-bold">{v.sec} s</span>
                  </span>
                  <span className="block px-3 py-2">
                    <span className="block font-black text-slate-800 text-sm leading-tight">{v.title}</span>
                    <span className="block text-[11px] text-slate-500 leading-tight mt-0.5">{v.about}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {playing && <VideoPlayer video={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
};
