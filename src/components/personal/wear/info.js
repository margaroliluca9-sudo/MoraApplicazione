// FUNE E CATENA: il tasto «i» e le schede di spiegazione (come misurare, dove guardare).
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Info, X, ExternalLink } from "lucide-react";
import { Section, Side, TrattoArt, FiliArt, CaliperArt, ChainArt, PassoArt, DefectArt, ModeArt } from "./art";

// tasto «i» accanto a un campo: apre la spiegazione (come misurare, dove guardare)
export const InfoBtn = ({ id, label = "" }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Spiegazione${label ? ": " + label : ""}`}
        data-wear-i={id}
        className="w-7 h-7 rounded-full bg-white border border-slate-300 shadow-sm text-blue-700 inline-flex items-center justify-center shrink-0"
      >
        <Info className="w-4 h-4" />
      </button>
      {open && createPortal(<InfoSheet id={id} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
};
export const INFO = {
  6: {
    title: "Fune a 6 trefoli",
    text: "Girando intorno alla fune conti 6 trefoli (i «cordoni» attorcigliati), belli grossi. In mezzo c'è l'anima, tessile o metallica. È la più comune sui paranchi e sui carriponte piccoli e medi.",
    ex: "6×19 Seale, 6×19 Warrington, 6×25 Filler, 6×36 WS",
    fas: "http://www.fasitaly.com/Tipo/0101000011.pdf",
    art: (
      <>
        <Section n="6" big />
        <Side strands={6} />
      </>
    ),
  },
  8: {
    title: "Fune a 8 trefoli",
    text: "Conti 8 trefoli, più sottili di quelli della 6: la fune è più tonda e più morbida. Molto usata sui carriponte e sulle gru moderne, quasi sempre con anima metallica.",
    ex: "8×19 Seale, 8×25 Filler, 8×36 WS",
    fas: "http://www.fasitaly.com/Tipo/0102000001.pdf",
    art: (
      <>
        <Section n="8" big />
        <Side strands={8} />
      </>
    ),
  },
  tanti: {
    title: "Fune antigiro",
    text: "Fuori vedi tanti trefoli piccoli (più di 10, di solito da 12 a 18) e sotto c'è un altro strato di trefoli girato al contrario: col carico appeso la fune non gira su sé stessa. Si usa con il tiro singolo e le grandi altezze (gru a torre, autogru, paranchi alti). Attenzione: la norma ammette pochissimi fili rotti.",
    ex: "18×7, 19×7, 35×7, 35×K7",
    fas: "https://www.fasitaly.com/Serie/0110005.pdf",
    art: (
      <>
        <Section n="tanti" big />
        <Side strands="tanti" />
      </>
    ),
  },
  crociata: {
    title: "Cordatura crociata",
    text: "I trefoli vanno in un verso e i fili dentro ogni trefolo nel verso opposto: guardando la fune da vicino i fili sembrano quasi dritti, paralleli alla fune. È la cordatura più comune.",
    art: <Side strands={6} kind="crociata" />,
  },
  tratto: {
    title: "Cosa sono 6d e 30d",
    text: "d è il diametro nominale della fune. 6d è un tratto lungo 6 volte il diametro, 30d un tratto lungo 30 volte: con una fune da 12 mm sono 72 mm (7 cm) e 360 mm (36 cm); l'app te li calcola appena scrivi il diametro. Scorri tutta la fune e cerca il tratto messo peggio (di solito dove passa sulle pulegge, dove si avvolge sul tamburo o vicino agli attacchi): lì conti i fili rotti dentro 6d e dentro 30d.",
    art: <TrattoArt />,
  },
  fili: {
    title: "Come contare i fili rotti",
    text: "Conta i fili spezzati che vedi sulla superficie della fune (le punte che escono o i fili interrotti) dentro il tratto di 6d e di 30d. Fai scorrere la fune piano con uno straccio in mano: i fili rotti lo agganciano. Sono più gravi i fili rotti nella valle, cioè tra due trefoli dove i trefoli si toccano: per la ISO 4309 già 2 fili rotti nella valle in un passo di cordatura (circa 6d) portano allo scarto, anche se il numero totale è sotto il limite. Scarta sempre anche con un trefolo rotto, schiacciamenti, «gabbia» (trefoli che si aprono) o nodi.",
    art: <FiliArt />,
  },
  diamfune: {
    title: "Come misurare il diametro della fune",
    text: "Quante misure: ISO 4309, punto 3.2, il diametro misurato è la «media di due misurazioni, prese ad angolo retto una rispetto all'altra». Scrivi Misura 1 e Misura 2 (girata di 90°) e l'app fa la media. Il catalogo Teci dice anche: «La misura del diametro si effettua in due punti distanti almeno un metro; in ciascun punto si misurano due diametri a 90° uno dall'altro; la media dei quattro valori rilevati si assume come diametro effettivo.» Cosa si misura (Teci): «Il diametro effettivo della fune è il diametro del cerchio circoscritto alla sezione normale della fune», cioè sulle creste dei trefoli, con il calibro a becchi larghi. Il riferimento è il diametro misurato sulla fune nuova, subito dopo il rodaggio, in un tratto che non passa sulle pulegge (ISO 4309, 3.3); se non c'è vale il nominale. Il calo si calcola sul diametro nominale (ISO 4309, 6.4.2). Una fune nuova è di solito un po' più grossa del nominale: tolleranza EN 12385 per funi da sollevamento da 8 mm in su +5% / 0% (tabella del catalogo Teci).",
    art: <CaliperArt />,
  },
  nomfune: {
    title: "Diametro nominale della fune",
    text: "È il diametro scritto sul certificato o sul cartellino della fune (es. Ø12; nel codice FAS è il numero finale: FZ636A12 = 12 mm). Se non lo trovi, misura la fune in un tratto che non lavora (vicino all'attacco fisso, dove non passa sulle pulegge) e prendi il diametro standard più vicino.",
    art: <CaliperArt />,
  },
  catmisura: {
    title: "Dove misurare la catena",
    text: "La catena si consuma dove una maglia tocca l'altra, all'interno della curva. Allenta la catena, apri un po' le maglie e misura lo spessore del tondino proprio in quel punto; poi gira il calibro di 90° e misura di nuovo. Basta una misura sotto il 90% del nominale perché la catena sia da scartare (conta la misura più bassa). Controlla le maglie che lavorano di più: quelle che passano sulla noce del paranco e quelle vicino al gancio con il carico che solleva di solito. Scarto se l'usura supera il 10% del diametro nominale.",
    art: <ChainArt />,
  },
  catnominale: {
    title: "Diametro nominale della catena",
    text: "È lo spessore del tondino della maglia nuova: una catena «10×30» ha diametro 10 mm e passo 30 mm. Lo trovi sul certificato, sulla targhetta o sul manuale del paranco, a volte stampato sulle maglie. Se non c'è, misuralo sul tratto dritto di una maglia che non lavora (verso il capo libero della catena), lontano dai punti di contatto.",
    art: <ChainArt where="nominale" />,
  },
  passo: {
    title: "Passo e allungamento",
    text: "Il passo t è la lunghezza interna di una maglia (catena 10×30: passo 30 mm). Misura una maglia all'interno: scarto se è più lunga del 5%. Per la catena del paranco misura anche 11 maglie di fila con la catena tesa e confrontale con 11 volte il passo: scarto oltre il 2%. Una catena allungata non ingrana più bene nella noce e può saltare.",
    art: <PassoArt />,
  },
  imbracatura: {
    title: "Catena del paranco o dei sottoganci",
    text: "Catena del paranco: è quella che lavora dentro il paranco a catena, passa sulla noce (la ruota dentata) e solleva il gancio; si controllano usura e allungamento, anche su 11 maglie, perché se si allunga non ingrana più bene nella noce. Catena dei sottoganci: è la braca di catena (a uno, due o quattro bracci, con anello in testa e ganci in fondo) che si usa per agganciare il carico al gancio della gru; non passa su nessuna noce. Per le brache di catena l'app usa i limiti della UNI EN 818-6: usura oltre il 10%, maglia allungata oltre il 5%.",
    art: <DefectArt k="gancio" />,
  },
  s_marcatura: {
    title: "Marcatura della braca (catalogo FAS)",
    text: "«Ogni braca deve riportare le seguenti indicazioni: Identificazione del costruttore; Materiale del nastro (abbr. Poliestere: PES); Lunghezza nominale in metri; Carico massimo di esercizio; Codice di rintracciabilità; Marcatura CE; Le norme di riferimento. Tali informazioni sono riportate in modo leggibile e duraturo, tramite un'etichetta in materiale antistrappo cucita all'interno di una delle due asole o sulla guaina dell'anello.»",
    art: <ModeArt id="diritto" />,
  },
  f_valle: {
    title: "Fili rotti nella valle",
    text: "La valle è la riga dove due trefoli si toccano. Un filo che si rompe lì si vede poco (non sporge come quelli sulla cresta) ma vuol dire che la fune si consuma dentro, contro l'anima o tra i trefoli. Per la ISO 4309 bastano 2 fili rotti nella valle in un passo di cordatura (circa 6d) per scartare la fune.",
    art: <DefectArt k="valle" />,
  },
  f_terminale: {
    title: "Fili rotti vicino alla terminazione",
    text: "Vicino al capocorda, alla redancia, al morsetto o al punto fisso sul tamburo la fune lavora di più e non si può controllare dentro. Già 2 fili rotti lì portano allo scarto (o a rifare la terminazione, se il tratto si può accorciare secondo il costruttore).",
    art: <DefectArt k="terminale" />,
  },
  f_locale: {
    title: "Diametro che cala in un punto solo",
    text: "Se in un punto la fune si stringe (mentre prima e dopo è normale) di solito l'anima dentro è rotta, schiacciata o consumata: la fune ha perso il sostegno interno. Si scarta anche se i fili rotti fuori sono pochi.",
    art: <DefectArt k="locale" />,
  },
  f_anima: {
    title: "Diametro che aumenta in un punto",
    text: "Catalogo Teci (deterioramenti secondo ISO 4309), foto 9: «Incremento locale del diametro di una fune, determinato da distorsione dell'anima metallica, derivante da un carico improvviso.» → «TALE CONDIZIONE RICHIEDE L'IMMEDIATA SOSTITUZIONE!». Tra le condizioni di sostituzione Teci c'è anche: «l'anima fuoriesce dalla fune anche in un solo punto». ISO 4309:2017, punto 6.7.6: se in servizio il diametro aumenta del 5% o più (anima metallica) o del 10% o più (anima tessile), bisogna cercarne la causa e valutare lo scarto.",
    art: <DefectArt k="anima" />,
  },
  f_deforma: {
    title: "Deformazioni: gabbia d'uccello, nodo, schiacciamento",
    text: "Gabbia d'uccello: i trefoli si aprono e si allontanano dall'anima come una gabbietta (di solito per uno strappo o per la fune che gira su sé stessa). Nodo o asola: la fune si è avvolta su sé stessa e poi è stata tirata. Schiacciamento: la fune è appiattita (pulegge, avvolgimento sbagliato sul tamburo). In tutti questi casi la fune si scarta.",
    art: <DefectArt k="deforma" />,
  },
  f_cricche: {
    title: "Cricche, tagli, intagli",
    text: "Una cricca è una crepa sottile nel tondino della maglia; un taglio o un intaglio sono segni profondi fatti da spigoli o urti. Anche le saldature fatte dopo sulla catena non vanno bene. Basta una maglia così per scartare la catena.",
    art: <DefectArt k="cricche" />,
  },
  f_piegata: {
    title: "Maglie piegate, ritorte, schiacciate",
    text: "Le maglie devono essere tutte uguali e dritte. Una maglia storta, ritorta, schiacciata o allungata a vista (la catena non scorre più bene nella noce) vuol dire che la catena è stata sovraccaricata o ha preso un colpo: si scarta.",
    art: <DefectArt k="piegata" />,
  },
  f_calore: {
    title: "Calore o corrosione profonda",
    text: "Colori strani sull'acciaio (blu, viola, paglierino) indicano che la catena ha preso calore (saldature vicine, fiamma): l'acciaio perde resistenza. La ruggine superficiale si toglie; la corrosione profonda con buchi (vaiolatura) no. In questi casi si scarta.",
    art: <DefectArt k="calore" />,
  },
  f_gancio: {
    title: "Gancio aperto o sicura che non chiude",
    text: "Se la bocca del gancio si è allargata (di solito oltre il 5% rispetto a nuovo, guarda il manuale del costruttore) il gancio è stato sovraccaricato. Anche un gancio storto o la sicura che non chiude da sola vanno segnalati: si sostituisce.",
    art: <DefectArt k="gancio" />,
  },
  parallela: {
    title: "Cordatura parallela (Lang)",
    text: "Trefoli e fili vanno nello stesso verso: i fili si vedono inclinati in diagonale, come i trefoli. Si consuma più piano, ma la norma ammette circa la metà dei fili rotti.",
    art: <Side strands={6} kind="parallela" />,
  },
};
export const InfoSheet = ({ id, onClose }) => {
  const it = INFO[id];
  if (!it) return null;
  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose} data-wear-info={id}>
      <div className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl p-5 space-y-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-2">
          <h4 className="flex-1 font-black text-lg text-slate-800">{it.title}</h4>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 flex flex-col items-center gap-3 text-slate-700">{it.art}</div>
        <p className="text-sm text-slate-700 leading-relaxed">{it.text}</p>
        {it.ex && (
          <p className="text-sm text-slate-600">
            <b>Costruzioni di questo tipo:</b> {it.ex}
          </p>
        )}
        {it.fas && (
          <a href={it.fas} target="_blank" rel="noopener noreferrer" data-fas-link className="h-11 px-4 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2">
            <ExternalLink className="w-4 h-4" /> Vedi le foto nel catalogo FAS
          </a>
        )}
        {it.fas && <p className="text-[11px] text-slate-400">Il catalogo si apre sul sito di FAS (serve la rete). I disegni qui sopra sono indicativi.</p>}
      </div>
    </div>
  );
};
