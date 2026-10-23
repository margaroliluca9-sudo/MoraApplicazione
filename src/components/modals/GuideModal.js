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
      text: "La data è già quella di oggi: cambiala solo se scrivi un lavoro di un altro giorno. Scrivi il N. assistenza se c'è: poi lo ritrovi con la ricerca e in Ufficio.",
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
      text: "In «Allega Foto» puoi aggiungere fino a 3 foto dalla fotocamera o dalla galleria. Vengono ridotte da sole e finiscono anche nel foglio stampato.",
    },
    {
      icon: Save,
      title: "10. Salva",
      text: "Tocca «Salva» (resta sempre in fondo allo schermo). Se manca qualcosa l'app te lo dice in rosso. Senza rete il rapporto resta sul telefono e parte da solo quando torna la connessione. Dopo il salvataggio vedi «Rapporto salvato»: «Altra gru, stesso cliente» per la gru successiva (tecnici, data e cliente restano), «Stampa» o «Vai allo Storico».",
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
      text: "In alto accanto al nome dell'app c'è «… tecnici online»: toccalo e vedi chi è collegato adesso. Con «Scrivi» mandi un messaggio privato a un collega (anche a chi hai scritto di recente e ora non è collegato). Il pallino rosso dice quanti messaggi devi leggere.",
    },
    {
      icon: Search,
      title: "La ricerca",
      text: "Scrivi un cliente, una matricola, un N. assistenza, un tecnico o una parola della descrizione: trovi clienti, gru e interventi. Tocca un risultato per aprire la gru.",
    },
    {
      icon: Factory,
      title: "La scheda della gru",
      text: "Si apre toccando una gru (dalla ricerca, da Esplora o dallo Storico): in cima quanti interventi e l'ultimo, poi tutti gli interventi su quella gru, foto, fune e catena sostituite e l'assistente con le cose in sospeso. Con «Nuovo rapporto su questa gru» il modulo si apre con cliente e gru già scritti.",
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
      text: "«Per cliente»: sfogli i clienti, apri le loro gru e leggi gli interventi di ognuna. «Elenco gru e interventi»: tutte le gru e tutti gli interventi in un elenco, con ricerca (era il Database).",
    },
    {
      icon: Briefcase,
      title: "Ufficio",
      text: "Calendario degli interventi del mese o dell'anno, ricerca per N. assistenza e report in PDF o Excel filtrando per date, cliente, gru e tecnico.",
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
      text: "In un capannone senza internet l'app si apre lo stesso e mostra quello che è salvato sul telefono: La mia area (note, calendario, promemoria), interventi e clienti. La striscia gialla in alto dice da quando sono aggiornati. Quello che scrivi parte da solo appena torna la connessione; le novità dei colleghi arrivano dopo.",
    },
    isAdmin && {
      icon: Settings,
      title: "Impostazioni (admin)",
      text: "Design (colori, lettere, chat sì/no, messaggi da «Tecnici online» sì/no), Staff, Tipi, Clienti, Gru (doppioni e unione), Furgoni (chi usa quale furgone, lista d'ordine) e System (collegati e backup).",
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
        "Portata: sotto il campo le portate più usate, in ordine di utilizzo (si aggiornano da sole con i rapporti).",
        "Scrivendo il cliente compaiono le sue gru: tocca quella giusta e tipo e portata si compilano da soli.",
        "Sotto la gru l'assistente ricorda cosa era rimasto in sospeso l'ultima volta e i guasti che si ripetono.",
        "Fune o catena sostituita: se lo scrivi nella descrizione, l'app chiede certificato, diametro e lunghezza (o «dati non disponibili» con il motivo).",
        "Foto: «Scatta» apre la fotocamera, «Galleria» prende le foto già fatte (fino a 3).",
        "Il pulsante «Salva» resta sempre in fondo allo schermo, anche mentre scorri il modulo.",
        "Il rapporto si salva da solo sul telefono mentre scrivi: se l'app si chiude, riaprendo trovi «Hai un rapporto non finito» con «Riprendi» o «Scarta».",
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
        "Modificare o eliminare: entro 3 minuti dal salvataggio lo puoi fare tu (matita e cestino), dopo compare un lucchetto e serve la password admin.",
      ],
    },
    {
      id: "print",
      icon: Printer,
      title: "Stampare",
      points: [
        "Il pulsante «Stampa» c'è su ogni intervento: Storico, scheda della gru, I miei interventi, Esplora, Ufficio, ricerca e calendario.",
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
        "In alto accanto al nome dell'app: «… tecnici online». Toccalo per vedere chi è collegato adesso e da quanto.",
        "«Scrivi» apre una conversazione privata con quel collega; sotto, in «Messaggi recenti», ritrovi chi ti ha scritto anche se ora non è collegato.",
        "Il pallino rosso sulla scritta dice quanti messaggi devi leggere. Con le notifiche attive (La mia area → ⚙ Impostazioni) arriva anche sul telefono.",
        "Sono gli stessi messaggi privati della Chat: se l'admin accende la Chat in «La mia area» li ritrovi anche lì. L'admin può spegnere i messaggi da Impostazioni → Design.",
      ],
    },
    {
      id: "search",
      icon: Search,
      title: "Ricerca in Home",
      points: [
        "Cerca insieme clienti, gru e interventi: nome, matricola, N. assistenza, tecnico, data o parole della descrizione.",
        "Tocca un risultato per aprire la scheda della gru con tutto il suo storico.",
        "Nella scheda della gru: in cima quanti interventi e l'ultimo; «Nuovo rapporto su questa gru» apre il modulo con cliente, gru, tipo e portata già scritti.",
      ],
    },
    {
      id: "explore",
      icon: Folder,
      title: "Esplora",
      points: [
        "«Per cliente»: sfoglia i clienti, apri le loro gru e leggi gli interventi di ogni gru, con foto e stampa.",
        "«Elenco gru e interventi» (era il Database): tutti i clienti, le gru e gli interventi in elenco, con ricerca veloce.",
      ],
    },
    {
      id: "office",
      icon: Briefcase,
      title: "Ufficio",
      points: [
        "Calendario degli interventi del mese o dell'anno.",
        "Ricerca per N. assistenza.",
        "Report in PDF o file Excel, filtrando per date, cliente, gru e tecnico.",
      ],
    },
    {
      id: "area",
      icon: UserCircle,
      title: "La mia area",
      points: [
        "È personale: le tue cose non le vede nessun altro.",
        "Oggi: impegni e promemoria del giorno.",
        "I miei interventi: quelli di questo mese o tutti.",
        "Stampa interventi: scegli e stampa insieme i rapporti tuoi e dei colleghi.",
        "Calendario: i tuoi impegni (con avviso) e i pallini verdi dei giorni in cui hai fatto interventi.",
        "Note: testo, elenco da spuntare, nota fissata in cima. «Galleria» aggiunge foto già fatte. «Scansiona foglio»: fotografi il foglio dove hai preso le misure, la foto diventa come una scansione e l'intelligenza artificiale scrive nel testo quello che c'è sul foglio (controlla sempre le misure). «Foto» tiene solo la foto; ✨ sotto una foto la fa leggere dopo. Fino a 3 foto per nota. Senza rete la foto si salva, la lettura si fa quando torna la rete.",
        "Promemoria: con giorno e ora ti avvisa sul telefono; senza ora alle 8:00. Sotto ci sono i contatti rapidi con il tasto per chiamare.",
        "In fondo: interventi fatti e clienti visitati nel mese; toccandoli si apre l'elenco dei tuoi interventi.",
        "Cosa ho cambiato (in fondo): quanti pezzi hai sostituito quest'anno, dal più cambiato (es. «11 funi, 15 guidafuni, 7 contattori»). Conta quello che scrivi nei rapporti come «sostituito», «cambiato», «montato» e la fune o catena sostituita; «da sostituire» o «consigliato» non contano. Sotto ogni pezzo i dettagli letti dai rapporti (diametro e metri delle funi, ampere dei fusibili, modelli dei contattori, kW dei motori, finecorsa salita/discesa…) e il cliente dove l'hai cambiato di più; toccandolo vedi dettagli, clienti e interventi. In alto i metri di fune montati; in fondo «Altri pezzi cambiati» con quello che non è nella lista. «Anno» o il mese corrente, frecce per gli anni passati.",
        "⚙ Impostazioni (in alto a destra o in fondo): notifiche sì/no e quali, animazione all'avvio, farti vedere o no tra i «Tecnici online». Valgono per il tuo telefono.",
        "Le mie ore (da accendere in ⚙ Impostazioni → Funzioni in più): un calendario solo per gli orari. Dal lunedì al venerdì ogni giorno conta da solo come giornata normale (8 h, in grigio), festivi esclusi: segni solo quando cambia qualcosa. Per oggi «+30 min» o «+1 h»; toccando un giorno scegli Lavoro (ore fatte a passi di 15 minuti), Ferie, Permesso (quante ore), Malattia o Riposo, con una nota.",
        "«Manda» (nel riquadro blu di Le mie ore): scegli il periodo (questo mese, mese scorso, questa settimana, settimana scorsa, quest'anno o le date che vuoi) e poi «PDF» (foglio ore con riepilogo, un giorno per riga con le note e lo spazio per le firme) o «Testo» per WhatsApp o mail.",
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
        "In cima alla Home c'è il saluto con il giorno, quante cose hai da fare e una scritta che cambia ogni pochi secondi: i tuoi numeri, cose del periodo dell'anno (feste, ora legale o solare, quanti giorni mancano a Natale o al weekend) e curiosità varie («Lo sapevi?»).",
        "Il cielo segue l'ora vera: alba, giorno, tramonto e notte con il sole, la luna (con la sua fase vera) e le stelle.",
        "A ogni apertura cambia tutto: il tipo di gru (carroponte, gru a portale, semiportale, monotrave con paranco, gru a bandiera), il colore e la portata della trave, il carico, lo sfondo (capannone, città, colline, montagne).",
        "Mentre la guardi il tempo cambia da solo (sole, nuvole, pioggia, temporale, arcobaleno, nebbia, vento, neve d'inverno) e passa qualcuno: camion da caricare o scaricare, muletto, aerei, elicottero, uccelli, mongolfiere, un gatto sulla trave; di notte stelle cadenti, fuochi d'artificio… e ogni tanto qualcosa di molto strano.",
        "La gru lavora da sola: sposta casse, bobine e travi e carica i camion, con il carico che dondola come uno vero.",
        "Puoi guidarla tu: trascina il dito sul cielo per spostare il carrello; tocca e il gancio scende, aggancia (o sgancia) e risale.",
        "Durante l'anno: lucine a Natale, pipistrelli e zucca ad Halloween, lucciole d'estate. Ogni 50 interventi nell'anno arrivano i coriandoli.",
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
        "«Letto da…» mostra chi l'ha letto. Ognuno può cancellare i suoi messaggi.",
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
        "Foto: scorri a destra o a sinistra per cambiarla, doppio tocco o due dita per ingrandire, tira giù per chiudere.",
        "In Home: tieni premuto un riquadro per spostarlo; tira giù dall'alto per ricaricare l'app.",
      ],
    },
    {
      id: "pc",
      icon: Monitor,
      title: "Su tablet e computer",
      points: [
        "Da tablet e computer l'app è come un programma: a sinistra il menu sempre visibile (Home, Nuovo rapporto, Storico, Esplora, Ufficio, La mia area, Impostazioni).",
        "In alto le schede aperte, come nel browser: passi da una all'altra con un tocco e le chiudi con la ×.",
        "Sui tablet stretti il menu mostra solo le icone con il nome sotto.",
      ],
    },
    {
      id: "account",
      icon: UserCircle,
      title: "Esci e impostazioni su tutti i telefoni",
      points: [
        "In alto a destra il cerchio con la tua iniziale: toccandolo vedi chi è collegato e «Esci» (vale per tutti, anche per l'ufficio). Per rientrare servono di nuovo nome e password.",
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
        "Serve averla aperta almeno una volta con la rete su quel telefono.",
      ],
    },
    isAdmin && {
      id: "admin",
      icon: Settings,
      title: "Impostazioni (solo admin)",
      points: [
        "Design: colori, carattere, grandezza delle lettere, animazione di avvio, chat tra tecnici sì/no, messaggi da «Tecnici online» sì/no. «La mia area: cosa vedono i tecnici»: accendi o spegni per tutti Oggi, I miei interventi, Stampa, Calendario, Note, Scansiona foglio, Promemoria, Magazzino, Le mie ore, Cosa ho cambiato e i numeri del mese (i dati restano salvati).",
        "Staff: tecnici e password. Tipi, Clienti, Gru: anagrafiche, doppioni e unione.",
        "Furgoni: crei i furgoni, scegli chi li usa («Nessuno» = tutto come prima), vedi tutti i magazzini e stampi la lista d'ordine.",
        "System: tecnici collegati, archivio e backup in PDF.",
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
    text: "Nella barra in alto scrivi un cliente, una matricola, un N. assistenza, un tecnico, una data o una parola della descrizione: trovi clienti, gru e interventi.",
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
    text: "Sfogli i clienti, apri le loro gru e leggi gli interventi di ognuna, con foto e stampa.",
    go: { label: "Apri Esplora", to: "explore" },
  },
  {
    icon: Factory,
    title: "La scheda della gru",
    text: "Toccando una gru vedi tutto il suo storico: date, tecnici, descrizioni, foto, fune e catena sostituite, e cosa era rimasto in sospeso.",
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
    points: ["Sfoglia i clienti, apri le loro gru e leggi gli interventi di ognuna, con foto e stampa."],
  },
  {
    id: "machine",
    icon: Factory,
    title: "Scheda della gru",
    points: ["Storico completo della gru: date, tecnici, descrizioni, foto, fune e catena sostituite, cose rimaste in sospeso."],
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
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center text-center gap-4 px-2">
        <span className={`w-20 h-20 rounded-3xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
          <Icon className="w-10 h-10" />
        </span>
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider" data-step>
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
