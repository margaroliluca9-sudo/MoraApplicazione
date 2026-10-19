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
  Database,
  Settings,
  Smartphone,
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
} from "lucide-react";

// TUTORIAL 1: solo l'intervento, passo per passo (go = pulsante "Prova adesso")
const reportStepsFor = ({ hasVan }) =>
  [
    {
      icon: PlusCircle,
      title: "1. Apri il rapporto",
      text: "Tocca «Nuovo Rapporto» in Home oppure «Nuovo» nella barra in basso. I campi con l'asterisco rosso sono obbligatori. Vuoi esercitarti? «Prova un rapporto» usa clienti di esempio e non salva niente.",
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
      text: "Tocca «Salva». Se manca qualcosa l'app te lo dice in rosso. Senza rete il rapporto resta sul telefono e parte da solo quando torna la connessione.",
    },
    hasVan && {
      icon: Truck,
      title: "11. I pezzi del furgone",
      text: "Dopo il salvataggio compare il riepilogo dei pezzi tolti dal furgone. Se è giusto non fare niente (si chiude da solo), altrimenti tocca «Correggi». Funi, catene e motori non vengono scalati.",
    },
    {
      icon: Pencil,
      title: (hasVan ? "12" : "11") + ". Hai sbagliato?",
      text: "Nello Storico puoi modificare o eliminare il rapporto entro 3 minuti dal salvataggio. Dopo serve la password dell'admin.",
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
      text: "In alto la ricerca, poi i riquadri delle pagine. In basso la barra con Nuovo, Storico e Admin. Il pulsante in alto a destra cambia tema: automatico, chiaro o scuro.",
    },
    {
      icon: Search,
      title: "La ricerca",
      text: "Scrivi un cliente, una matricola, un N. assistenza, un tecnico o una parola della descrizione: trovi clienti, gru e interventi. Tocca un risultato per aprire la gru.",
    },
    {
      icon: Factory,
      title: "La scheda della gru",
      text: "Si apre toccando una gru (dalla ricerca, da Esplora o dallo Storico): tutti gli interventi su quella gru, foto, fune e catena sostituite e l'assistente con le cose in sospeso.",
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
      text: "Tutti gli interventi dal più recente, con la ricerca per cliente, gru o parole della descrizione. Da qui stampi, modifichi (entro 3 minuti, poi con la password admin) e apri le foto.",
    },
    {
      icon: Printer,
      title: "Stampare",
      text: "Il pulsante «Stampa» c'è su ogni intervento, in ogni pagina. Il foglio ha intestazione Mora, dati, descrizione e foto. Poi: Condividi o stampa, Apri PDF, Scarica.",
    },
    {
      icon: Folder,
      title: "Esplora",
      text: "Sfogli i clienti, apri le loro gru e leggi gli interventi di ognuna.",
    },
    {
      icon: Briefcase,
      title: "Ufficio",
      text: "Calendario degli interventi del mese o dell'anno, ricerca per N. assistenza e report in PDF o Excel filtrando per date, cliente, gru e tecnico.",
    },
    {
      icon: Database,
      title: "Database",
      text: "Elenco veloce di clienti, gru e interventi, con ricerca.",
    },
    {
      icon: UserCircle,
      title: "La mia area",
      text: "Il riquadro «La mia area»: è solo tuo. In cima «Oggi» con impegni e promemoria, poi I miei interventi, Stampa interventi, Calendario, Note, Promemoria" + (hasVan ? ", Magazzino" : "") + " e i numeri del mese.",
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
      text: "Installa l'app sul telefono (iPhone: Condividi → «Aggiungi alla schermata Home»; Android: «Installa app»). Poi in Promemoria tocca «Attiva notifiche».",
    },
    {
      icon: WifiOff,
      title: "Senza rete",
      text: "Puoi lavorare anche senza rete: una striscia in alto ti avvisa e i rapporti partono da soli appena torna la connessione.",
    },
    isAdmin && {
      icon: Settings,
      title: "Impostazioni (admin)",
      text: "Design (colori, lettere, chat sì/no), Staff, Tipi, Clienti, Gru (doppioni e unione), Furgoni (chi usa quale furgone, lista d'ordine) e System (collegati e backup).",
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
        "Scegli tecnico principale (e quelli aggiuntivi), data, N. assistenza, cliente e gru.",
        "Scrivendo il cliente compaiono le sue gru: tocca quella giusta e tipo e portata si compilano da soli.",
        "Sotto la gru l'assistente ricorda cosa era rimasto in sospeso l'ultima volta e i guasti che si ripetono.",
        "Fune o catena sostituita: se lo scrivi nella descrizione, l'app chiede certificato, diametro e lunghezza (o «dati non disponibili» con il motivo).",
        "Puoi aggiungere fino a 3 foto dalla fotocamera o dalla galleria.",
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
        "Tutti gli interventi, dal più recente, con la ricerca (cliente, gru, parole della descrizione, fune e catena).",
        "Fune e catena sostituite sono indicate sotto la descrizione.",
        "Modificare o eliminare: entro 3 minuti dal salvataggio lo puoi fare tu, dopo serve la password admin.",
      ],
    },
    {
      id: "print",
      icon: Printer,
      title: "Stampare",
      points: [
        "Il pulsante «Stampa» c'è su ogni intervento: Storico, storico della gru, I miei interventi, Esplora, Database, Ufficio, ricerca e calendario.",
        "Il foglio ha l'intestazione Mora, i dati della gru, la descrizione e le foto.",
        "Dalla finestra del PDF: «Condividi o stampa» (WhatsApp, mail, stampante), «Apri PDF» oppure «Scarica».",
        "Più interventi insieme: La mia area → «Stampa interventi». Scegli giorno o periodo (Oggi, Ieri, Ultimi 7 giorni o le date), il tecnico (tutti, solo i tuoi o un collega), tocca quelli che vuoi o «Seleziona tutti».",
        "«Stampa rapporti» crea un unico PDF con un foglio per ogni intervento; «Elenco» crea una tabella riassuntiva.",
      ],
    },
    {
      id: "search",
      icon: Search,
      title: "Ricerca in Home",
      points: [
        "Cerca insieme clienti, gru e interventi: nome, matricola, N. assistenza, tecnico, data o parole della descrizione.",
        "Tocca un risultato per aprire la scheda della gru con tutto il suo storico.",
      ],
    },
    {
      id: "explore",
      icon: Folder,
      title: "Esplora",
      points: ["Sfoglia i clienti, apri le loro gru e leggi gli interventi di ogni gru, con foto e stampa."],
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
      id: "database",
      icon: Database,
      title: "Database",
      points: ["Elenco di clienti, gru e interventi con ricerca veloce."],
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
        "Note: testo, elenco da spuntare, nota fissata in cima.",
        "Promemoria: con giorno e ora ti avvisa sul telefono; senza ora alle 8:00. Sotto ci sono i contatti rapidi con il tasto per chiamare.",
        "In fondo: interventi fatti e clienti visitati nel mese.",
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
      id: "phone",
      icon: Smartphone,
      title: "Installare l'app e le notifiche",
      points: [
        "iPhone: apri l'app in Safari, tocca Condividi → «Aggiungi alla schermata Home» e poi aprila da lì.",
        "Android: dal menu di Chrome tocca «Installa app» o «Aggiungi a schermata Home».",
        "Poi in Promemoria tocca «Attiva notifiche». Gli avvisi possono arrivare con qualche minuto di ritardo.",
      ],
    },
    {
      id: "theme",
      icon: Sun,
      title: "Tema chiaro o scuro",
      points: ["Il pulsante in alto a destra cambia tema: automatico (come il telefono), chiaro o scuro."],
    },
    {
      id: "offline",
      icon: WifiOff,
      title: "Senza rete",
      points: ["Una striscia in alto avvisa quando sei offline o quando ci sono rapporti ancora da inviare: partono da soli appena torna la rete."],
    },
    isAdmin && {
      id: "admin",
      icon: Settings,
      title: "Impostazioni (solo admin)",
      points: [
        "Design: colori, carattere, grandezza delle lettere, animazione di avvio, chat tra tecnici sì/no.",
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
const Tour = ({ steps, onGo, onEnd, endLabel, color, id }) => {
  const [step, setStep] = useState(0);
  const s = steps[Math.min(step, steps.length - 1)];
  const Icon = s.icon;
  const last = step >= steps.length - 1;
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
          <div className={`grid ${office ? "grid-cols-2" : "grid-cols-3"} p-1 rounded-2xl bg-slate-100`} role="tablist">
            {(office
              ? [
                  ["office", "Tutorial"],
                  ["all", "Tutte le funzioni"],
                ]
              : [
                  ["report", "Solo l'intervento"],
                  ["app", "Tutta l'app"],
                  ["all", "Tutte le funzioni"],
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
          <Tour key="office" id="office" steps={officeSteps} onGo={onGo} color={color}
            endLabel="Tutte le funzioni" onEnd={() => setTab("all")} />
        )}
        {!office && tab !== "all" && (
          <div className="px-4 pt-3 shrink-0">
            <button type="button" data-guide-go="practice" onClick={() => onGo("practice")}
              className="w-full h-12 rounded-2xl bg-amber-400 text-amber-950 font-black text-sm flex items-center justify-center gap-2">
              <FlaskConical className="w-5 h-5" /> Prova un rapporto · non salva niente
            </button>
          </div>
        )}
        {tab === "report" && (
          <Tour key="report" id="report" steps={reportStepsFor({ hasVan })} onGo={onGo} color={color}
            endLabel="Tutta l'app" onEnd={() => setTab("app")} />
        )}
        {tab === "app" && (
          <Tour key="app" id="app" steps={appStepsFor({ hasVan, chatEnabled, isAdmin })} onGo={onGo} color={color}
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
      </div>
    </div>
  );
};
