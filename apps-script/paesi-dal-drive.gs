/**
 * CLIENTI E GRU DAL DRIVE → APP ASSISTENZA MORA (ogni mattina, da solo)
 *
 * Gira dentro il Google Drive di chi lo installa (Google Apps Script): non servono password né chiavi.
 * Ogni mattina guarda la cartella «Clienti / Verifiche»: per ogni cliente apre il foglio verifica più recente e
 *  - legge paese e indirizzo dall'intestazione (es. «Località: OLEGGIO (NO) Via Verbano, 56/A»);
 *  - legge la tabella delle gru: numero di fabbrica, tipo, portata, paranco, matricola INAIL, anno e
 *    com'era la fune o la catena all'ultima verifica (es. «Fune idonea, 1 filo rotto, distorta»).
 * Nell'app la gru si riconosce dal numero di fabbrica (campo Matricola/Campata) e la sua scheda mostra
 * «Dall'ultima verifica». Ogni giorno apre solo le cartelle con un foglio nuovo o cambiato.
 *
 * Sottocartelle: se dentro la cartella di un cliente ci sono altre cartelle (es. uno per stabilimento) con i loro
 * fogli di verifica, legge anche quelle (fino a due livelli) e le dà allo stesso cliente.
 *
 * Cliente ↔ cartella: di solito li abbina dal nome. Se il nome è diverso, nell'app in Admin → Drive → il cliente
 * → «Cartella nel Drive» scegli tu la cartella giusta: dal giorno dopo vale quella. Sempre in Admin → Drive si vede
 * da quale cartella e foglio arriva ogni dato e si possono correggere paese e gru (le correzioni non le tocco mai).
 *
 * I clienti segnati «Solo interventi» nell'app (niente verifiche, quindi niente cartella) non li abbino mai.
 *
 * Paese e indirizzo: aggiorna solo i clienti senza paese o quelli che aveva già aggiornato lui
 * (placeSource = "drive"); quello che scrivete a mano o importate da file non viene mai toccato.
 *
 * INSTALLAZIONE (una volta sola, 2 minuti):
 *   1. Apri https://script.google.com con l'account che vede la cartella Clienti → il progetto (o «Nuovo progetto»).
 *   2. Cancella tutto e incolla questo file. Salva (icona del dischetto).
 *   3. In alto scegli la funzione «installa» e premi «Esegui» (Google chiede i permessi: «Consenti»).
 *   Fatto: aggiorna subito e poi ogni mattina alle 10. L'esito si vede nell'app in Admin → Drive.
 *   (Per rileggere tutto da capo: esegui «ricomincia».)
 */

var CONFIG = {
  cartelle: ["Clienti", "Verifiche"], // percorso nel Drive
  apiKey: "AIzaSyCQ3VhCtvxIP2cxtdSgMzYXaTg4E1zPlZE", // chiave web pubblica dell'app (è già dentro l'app)
  progetto: "mora-app-36607",
  dati: "artifacts/mora-maintenance-v1/public/data",
  minuti: 4, // Google ferma i programmi dopo 6 minuti: mi fermo prima e riprendo il giorno dopo
};

/** Da eseguire una volta: crea l'appuntamento di ogni mattina e aggiorna subito. */
function installa() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === "aggiornaPaesi" || h === "aggiorna") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("aggiorna").timeBased().everyDays(1).atHour(10).create();
  aggiorna();
}

/** Dimentica cosa ha già letto: il prossimo giro rilegge tutte le cartelle. */
function ricomincia() {
  var props = PropertiesService.getScriptProperties();
  Object.keys(props.getProperties()).forEach(function (k) {
    if (k.indexOf("v_") === 0 || k === "visti") props.deleteProperty(k);
  });
  aggiorna();
}

/** vecchio nome (prima versione): fa la stessa cosa */
function aggiornaPaesi() {
  aggiorna();
}

/** Il lavoro di ogni mattina. Se si ferma per un errore lo scrive nell'app (Admin → Drive, riquadro rosso). */
function aggiorna() {
  try {
    giro_();
  } catch (e) {
    try {
      scriviTutto_(accedi_(), [aggiornaDoc_("settings/drive_places", { lastError: String((e && e.message) || e).slice(0, 300), lastErrorAt: new Date().toISOString() })]);
    } catch (e2) {
      Logger.log("Non riesco nemmeno a scrivere l'errore: %s", e2);
    }
    throw e;
  }
}

function giro_() {
  var inizio = Date.now();
  var props = PropertiesService.getScriptProperties();
  // cosa ho già letto, una voce per cartella (Google tiene al massimo 9 KB per voce):
  // v_<cartella> = { k: foglio letto, c: cliente abbinato, n: quanti clienti c'erano, g: gru scritte }
  var tutte = props.getProperties();
  var visto = function (id) {
    try {
      return JSON.parse(tutte["v_" + id] || "null");
    } catch (e) {
      return null;
    }
  };
  var nuoviVisti = {};
  var cartella = trovaCartella_(CONFIG.cartelle);
  var token = accedi_();
  var clienti = leggiClienti_(token);
  // cartelle scelte a mano nell'app (cliente → cartella): valgono prima del nome
  var scelte = {};
  clienti.forEach(function (c) {
    if (c.driveFolderId && !c.driveNone) scelte[c.driveFolderId] = c;
  });
  var custs = indiceClienti_(
    clienti.filter(function (c) {
      return !c.driveFolderId && !c.driveNone; // «Solo interventi»: nessuna cartella
    })
  );
  var perId = {};
  clienti.forEach(function (c) {
    perId[c.id] = c;
  });
  var elenco = []; // tutte le cartelle, per la scelta nell'app
  var scritture = [];
  var conti = { cartelle: 0, lette: 0, abbinati: 0, clientiAggiornati: 0, gru: 0, errori: [] };
  var finito = true;
  var cartelle = [];
  var it = cartella.getFolders();
  while (it.hasNext()) cartelle.push(it.next());
  cartelle.sort(function (a, b) {
    return a.getName().localeCompare(b.getName());
  });
  // ogni cartella cliente e anche le sue sottocartelle (es. un cliente con più stabilimenti, ognuno con i suoi
  // fogli di verifica): le sottocartelle sono del cliente della cartella sopra, se nell'app non scegli diversamente
  var unita = [];
  var sotto = function (f) {
    var out = [];
    var it2 = f.getFolders();
    while (it2.hasNext()) out.push(it2.next());
    return out.sort(function (a, b) {
      return a.getName().localeCompare(b.getName());
    });
  };
  cartelle.forEach(function (t) {
    unita.push({ f: t, nome: t.getName().trim(), top: null });
    try {
      sotto(t).forEach(function (s1) {
        unita.push({ f: s1, nome: t.getName().trim() + " › " + s1.getName().trim(), top: t, su: t });
        sotto(s1).forEach(function (s2) {
          unita.push({ f: s2, nome: t.getName().trim() + " › " + s1.getName().trim() + " › " + s2.getName().trim(), top: t, su: s1 });
        });
      });
    } catch (e) {
      Logger.log("Sottocartelle di %s: %s", t.getName(), e);
    }
  });
  var clienteDiCima = {}; // cartella in cima → cliente
  var cimaDi = function (t) {
    var id = t.getId();
    if (!(id in clienteDiCima)) {
      var c = scelte[id] || null;
      if (!c) {
        var pr = visto(id);
        if (pr && pr.c && perId[pr.c] && !perId[pr.c].driveFolderId && !perId[pr.c].driveNone) c = perId[pr.c];
      }
      clienteDiCima[id] = c || abbinaUno_([t.getName()], custs);
    }
    return clienteDiCima[id];
  };
  unita.forEach(function (u) {
    var cart = u.f;
    var voce = { id: cart.getId(), n: u.nome, c: "" };
    if (u.top) voce.p = u.top.getId();
    elenco.push(voce);
    var cima = u.top ? cimaDi(u.top) : null;
    // scelta fatta nell'app: per questa cartella, oppure per quella appena sopra, oppure per quella in cima
    var scelto = scelte[voce.id] || (u.su ? scelte[u.su.getId()] : null) || (u.top ? scelte[voce.p] : null);
    var prima = visto(voce.id) || {};
    if (scelto) voce.c = scelto.id;
    else if (prima.c && perId[prima.c] && !perId[prima.c].driveFolderId) voce.c = prima.c;
    if (!finito) return;
    if (Date.now() - inizio > CONFIG.minuti * 60000) {
      finito = false;
      return;
    }
    conti.cartelle++;
    try {
      var file = ultimoFoglio_(cart);
      if (!file) {
        // cartella senza fogli (es. ha solo le sottocartelle degli stabilimenti): mostro lo stesso di chi è
        if (!u.top && !voce.c) {
          var cm = cimaDi(cart);
          if (cm) voce.c = cm.id;
        }
        return;
      }
      // la chiave cambia se cambia il foglio o se nell'app scegli un altro cliente per questa cartella
      var chiave = file.getId() + "|" + file.getLastUpdated().getTime() + "|" + (scelto ? scelto.id : "") + (cima ? "|" + cima.id : "");
      // già letto e abbinato: salto. Non abbinato: riprovo solo se nell'app sono cambiati i clienti
      if (prima.k === chiave && ((prima.c && voce.c) || (!prima.c && prima.n === clienti.length))) return;
      conti.lette++;
      var foglio = leggiFoglio_(file);
      var info = estrai(foglio.testo);
      var cliente = scelto || cima || abbinaUno_([cart.getName(), info.cliente].filter(String), custs);
      if (!u.top && cliente) clienteDiCima[voce.id] = cliente;
      var dove = { placeFolder: voce.n, placeSheet: file.getName(), placeSheetUrl: file.getUrl() };
      var ora = { k: chiave, c: cliente ? cliente.id : "", n: clienti.length, g: [] };
      voce.c = ora.c;
      if (cliente) {
        conti.abbinati++;
        // paese e indirizzo (+ da quale cartella e foglio li ho presi, si vede in Admin → Drive)
        if (info.city || info.address) {
          var libero = !String(cliente.city || "").trim() && !String(cliente.address || "").trim();
          var cambia = cliente.city !== info.city || (cliente.address || "") !== info.address;
          // da una sottocartella solo se il cliente non ha ancora il paese (di solito vale quello della cartella in cima)
          if (libero || (cliente.placeSource === "drive" && !u.top)) {
            if (cambia) conti.clientiAggiornati++;
            if (cambia || cliente.placeSheet !== dove.placeSheet || cliente.placeFolder !== dove.placeFolder) {
              scritture.push(
                aggiornaDoc_("customers/" + cliente.id, {
                  city: info.city,
                  address: info.address,
                  placeSource: "drive",
                  placeFolder: dove.placeFolder,
                  placeSheet: dove.placeSheet,
                  placeSheetUrl: dove.placeSheetUrl,
                })
              );
              cliente.city = info.city; // così le altre cartelle dello stesso cliente non lo riscrivono
              cliente.address = info.address;
              cliente.placeSource = "drive";
            }
          }
        }
        // gru del foglio (le correzioni fatte nell'app restano: qui scrivo solo i campi del Drive)
        var etichetta = etichettaFoglio_(file.getName());
        estraiGru(foglio.tabelle).forEach(function (g, i) {
          var id = (cliente.id + "_" + (u.top ? voce.id.slice(-6) + "_" : "") + (g.fabKey || (g.internoKey ? "INT" + g.internoKey : "R" + i))).replace(/[^A-Za-z0-9_-]/g, "_");
          if (ora.g.indexOf(id) >= 0) return;
          ora.g.push(id);
          scritture.push(
            aggiornaDoc_("drive_cranes/" + id, {
              customerId: cliente.id,
              customerName: cliente.name,
              fab: g.fab,
              fabKey: g.fabKey,
              interno: g.interno,
              internoKey: g.internoKey,
              tipo: g.tipo,
              portata: g.portata,
              paranco: g.paranco,
              matricola: g.matricola,
              anno: g.anno,
              stato: g.stato,
              foglio: etichetta,
              foglioNome: file.getName(),
              foglioUrl: file.getUrl(),
              foglioData: file.getLastUpdated().toISOString(),
              cartella: voce.n,
              cartellaId: voce.id,
              updatedAt: new Date().toISOString(),
            })
          );
          conti.gru++;
        });
      }
      // gru scritte la volta prima e che ora non ci sono più (foglio cambiato o cliente cambiato): le tolgo
      (prima.g || []).forEach(function (id) {
        if (ora.g.indexOf(id) < 0) scritture.push({ delete: radice_() + "/" + CONFIG.dati + "/drive_cranes/" + id });
      });
      nuoviVisti["v_" + voce.id] = JSON.stringify(ora);
    } catch (e) {
      Logger.log("Salto %s: %s", voce.n, e);
      conti.errori.push(voce.n + ": " + String((e && e.message) || e).slice(0, 120));
    }
  });
  var falliti = scriviTutto_(token, scritture);
  if (falliti) conti.errori.push("Database: " + falliti + " scritture non riuscite");
  if (Object.keys(nuoviVisti).length) props.setProperties(nuoviVisti);
  props.deleteProperty("visti"); // formato vecchio
  // totali (anche delle cartelle non rilette oggi): quante abbinate a un cliente e quante gru in tutto
  var gruTotali = 0;
  elenco.forEach(function (v) {
    var rec = nuoviVisti["v_" + v.id] ? JSON.parse(nuoviVisti["v_" + v.id]) : visto(v.id);
    gruTotali += ((rec && rec.g) || []).length;
  });
  scriviTutto_(token, [
    aggiornaDoc_("settings/drive_places", {
      lastRun: new Date().toISOString(),
      cartelle: conti.cartelle,
      lette: conti.lette,
      abbinati: conti.abbinati,
      aggiornati: conti.clientiAggiornati,
      gru: conti.gru,
      finito: finito ? "sì" : "no",
      cartelleTotali: elenco.length,
      cartelleAbbinate: elenco.filter(function (v) {
        return v.c;
      }).length,
      gruTotali: gruTotali,
      errori: conti.errori.length,
      erroriLista: JSON.stringify(conti.errori.slice(0, 15)),
      durata: Math.round((Date.now() - inizio) / 1000),
      lastError: "",
      versione: 5,
    }),
    aggiornaDoc_("settings/drive_folders", { list: JSON.stringify(elenco), updatedAt: new Date().toISOString() }),
  ]);
  Logger.log(
    "Cartelle: %s · lette oggi: %s · clienti abbinati: %s · paesi aggiornati: %s · gru aggiornate: %s · problemi: %s%s",
    conti.cartelle, conti.lette, conti.abbinati, conti.clientiAggiornati, conti.gru, conti.errori.length, finito ? "" : " · continua domani"
  );
}

// ---------- Drive ----------
// cerca le cartelle per nome senza badare a spazi e maiuscole («Verifiche » = «verifiche»)
function stessoNome_(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}
function sottocartella_(cur, nome) {
  var it = cur.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    if (stessoNome_(f.getName(), nome)) return f;
  }
  return null;
}
function trovaCartella_(percorso) {
  var it = DriveApp.searchFolders("title contains '" + percorso[0].replace(/'/g, "\\'") + "' and trashed = false");
  while (it.hasNext()) {
    var cur = it.next();
    if (!stessoNome_(cur.getName(), percorso[0])) continue;
    for (var i = 1; i < percorso.length && cur; i++) cur = sottocartella_(cur, percorso[i]);
    if (cur) return cur;
  }
  throw new Error("Non trovo la cartella " + percorso.join(" / ") + " nel Drive.");
}

var DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
function ultimoFoglio_(cart) {
  var files = cart.getFiles();
  var best = null;
  while (files.hasNext()) {
    var f = files.next();
    var m = f.getMimeType();
    if (m !== MimeType.GOOGLE_DOCS && m !== DOCX) continue;
    if (!best || f.getLastUpdated() > best.getLastUpdated()) best = f;
  }
  return best;
}

function xmlTesto_(s) {
  return String(s)
    .replace(/<w:tab\/>/g, " ")
    .replace(/<w:br\/>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// { testo: "…intestazione…", tabelle: [ [ ["TIPO","PORTATA",…], [...] ], … ] }
function leggiFoglio_(file) {
  if (file.getMimeType() === MimeType.GOOGLE_DOCS) {
    var body = DocumentApp.openById(file.getId()).getBody();
    var tabelle = body.getTables().map(function (t) {
      var righe = [];
      for (var r = 0; r < t.getNumRows(); r++) {
        var row = t.getRow(r);
        var celle = [];
        for (var c = 0; c < row.getNumCells(); c++) celle.push(row.getCell(c).getText().replace(/\s+/g, " ").trim());
        righe.push(celle);
      }
      return righe;
    });
    return { testo: body.getText().slice(0, 3000), tabelle: tabelle };
  }
  var parti = Utilities.unzip(file.getBlob().setContentType("application/zip"));
  for (var i = 0; i < parti.length; i++) {
    if (parti[i].getName() !== "word/document.xml") continue;
    var xml = parti[i].getDataAsString("UTF-8");
    return { testo: xmlTesto_(xml.replace(/<\/w:p>/g, "\n")).slice(0, 3000), tabelle: tabelleDocx(xml) };
  }
  return { testo: "", tabelle: [] };
}

function tabelleDocx(xml) {
  var out = [];
  (String(xml).match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || []).forEach(function (tbl) {
    var righe = (tbl.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) || []).map(function (tr) {
      return (tr.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) || []).map(function (tc) {
        return xmlTesto_(tc.replace(/<\/w:p>/g, " ")).replace(/\s+/g, " ").trim();
      });
    });
    out.push(righe);
  });
  return out;
}

// «UNIMETAL T10.26.docx» → «Trimestrale 10/2026»
function etichettaFoglio_(nome) {
  var m = String(nome || "").match(/\b([AT])\s?(\d{2})\s?[.\/,]\s?(\d{2})\b/i) || String(nome || "").match(/([AT])\s?(\d{2})\s?(?:\.|%2c|,)\s?(\d{2})/i);
  if (!m) return "";
  return (m[1].toUpperCase() === "A" ? "Annuale" : "Trimestrale") + " " + m[2] + "/20" + m[3];
}

// ---------- tabella delle gru ----------
// numero di fabbrica «pulito» (uguale nell'app: src/driveCranes.js): «4738 A» → 4738A, «2774 (1)» → 2774
function fabKey(s) {
  var t = String(s || "").toUpperCase().replace(/[.\s]/g, "");
  var m = t.match(/^[A-Z]{0,4}\d{2,8}(?:[A-Z](?![A-Z])|\/\d{1,4}|-\d{1,3})?/);
  return m ? m[0] : "";
}
var STATO_RE = /(fune|funi|catena|catene|idone|sostitu|controllo|fuori servizio|smantellat|dismess|resto (nella norma|ok)|distort|gobb|fili? rott)/i;

function estraiGru(tabelle) {
  var out = [];
  (tabelle || []).forEach(function (righe) {
    var h = -1;
    for (var r = 0; r < righe.length && r < 4; r++) {
      var joined = righe[r].join(" | ").toUpperCase();
      if (/PORTATA/.test(joined) && /(FABBRICA|TIPO|MATRICOLA|DESCRIZIONE)/.test(joined)) {
        h = r;
        break;
      }
    }
    if (h < 0) return;
    var head = righe[h].map(function (x) {
      return String(x).toUpperCase().replace(/\s+/g, " ").trim();
    });
    var idx = function (re, not) {
      for (var i = 0; i < head.length; i++) if (re.test(head[i]) && !(not && not.test(head[i]))) return i;
      return -1;
    };
    var iFab = idx(/FABBRICA/);
    var iMatr = idx(/ENPI|ISPESL|INAIL/);
    if (iFab < 0) iFab = idx(/^MATRICOLA$|^N\.? ?MATRICOLA$/); // es. «DEN. INTERNA | DESCRIZIONE | MATRICOLA | PORTATA»
    var iInt = idx(/INTERN|RIF/);
    var iTipo = idx(/TIPO|DESCRIZIONE/, /PARANCO/);
    var iPort = idx(/PORTATA/);
    var iPar = idx(/PARANCO/);
    var iAnno = idx(/ANNO/);
    for (var k = h + 1; k < righe.length; k++) {
      var c = righe[k];
      if (!c || c.length < 2 || !c.join("").trim()) continue;
      var get = function (i) {
        return i >= 0 && i < c.length ? String(c[i] || "").trim() : "";
      };
      var fab = get(iFab);
      var interno = get(iInt);
      var tipo = get(iTipo);
      if (!fabKey(fab) && !interno) continue;
      var stato = "";
      c.forEach(function (x, j) {
        if (j === iTipo || j === iPar) return;
        if (STATO_RE.test(x) && x.length > stato.length) stato = x;
      });
      out.push({
        fab: fab.slice(0, 80),
        fabKey: fabKey(fab),
        interno: interno.slice(0, 40),
        internoKey: fabKey(interno) || interno.toUpperCase().replace(/\s/g, ""),
        tipo: tipo.slice(0, 80),
        portata: (get(iPort).match(/^[\d.,+\s]+(kg)?/i) || [""])[0].trim(),
        paranco: get(iPar).slice(0, 120),
        matricola: get(iMatr).slice(0, 60),
        anno: get(iAnno).slice(0, 40),
        stato: stato.slice(0, 500),
      });
    }
  });
  return out;
}

// ---------- lettura dell'intestazione del foglio verifica ----------
// Esempi: «Località: OLEGGIO (NO) Via Verbano, 56/A» · «Via Matteotti n.249 / 28062 CAMERI (NO).»
//         «Via Libertà, 16 - 28043 Bellinzago Novarese (No)» · «Filiale di S. Pietro Mosezzo (NO).»
var VIA_RE = /\b(Via|Viale|V\.le|Corso|C\.so|Strada|Str\.|Piazza|P\.zza|Piazzale|Largo|Località|Loc\.|Frazione|Fraz\.|Cascina|Regione|Reg\.|S\.S\.|S\.R\.|SS|SR|Tangenziale|Vicolo)\b[^\n]*/i;
var CITTA_RE = /(?:\b\d{5}\s+)?([A-Za-zÀ-ÿ'’.\- ]{2,40}?)\s*\(\s*([A-Za-z]{2})\s*\)/;

function titolo_(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/(^|[\s'’\-.(])([a-zà-ÿ])/g, function (m, a, b) {
      return a + b.toUpperCase();
    })
    .replace(/\b(Di|Del|Della|Con|Sul|Al|E|D')\b/g, function (m) {
      return m.toLowerCase();
    })
    .trim();
}

function estrai(testo) {
  var righe = String(testo)
    .split(/\n+/)
    .map(function (r) {
      return r.replace(/\s+/g, " ").trim();
    })
    .filter(String);
  var stop = righe.findIndex(function (r) {
    return /APPARECCHI DA VERIFICARE|^\|/i.test(r);
  });
  var testa = righe.slice(0, stop > 0 ? Math.min(stop, 14) : 14);
  var cliente = "";
  testa.some(function (r) {
    var m = r.match(/CLIENTE\s*:?\s*(.+)/i);
    if (m) cliente = m[1].replace(/\b[AT]\s?\d{2}[./]\d{2}\b.*$/, "").trim();
    return !!m;
  });
  var city = "";
  var prov = "";
  var address = "";
  for (var i = 0; i < testa.length; i++) {
    var r = testa[i].replace(/^Localit[aà]\s*:\s*/i, "").replace(/^Sede\s*(legale)?\s*:?\s*/i, "");
    if (/^(Tel|Telefono|Fax|NOTE|Sig|cell)/i.test(r)) continue;
    if (!city) {
      var c = r.match(CITTA_RE);
      if (c && !/CLIENTE/i.test(r.slice(0, c.index))) {
        city = c[1].replace(/^(Filiale di|Località|Loc\.)\s*/i, "").replace(/[-–,]\s*$/, "").trim();
        prov = c[2].toUpperCase();
        var resto = (r.slice(0, c.index) + " " + r.slice(c.index + c[0].length)).replace(/\b\d{5}\b/g, " ");
        var v = resto.match(VIA_RE);
        if (v && !address) address = v[0];
      }
    }
    if (!address) {
      var v2 = r.match(VIA_RE);
      if (v2 && !/CLIENTE/i.test(r)) address = v2[0];
    }
    if (city && address) break;
  }
  address = String(address)
    .split(/\s+[-–|]\s+/)[0]
    .replace(CITTA_RE, " ")
    .replace(/\b\d{5}\b.*$/, "")
    .replace(/\s*[-–|]\s*$/, "")
    .replace(/[.;,\s]+$/, "")
    .replace(/\bn\.\s*(\d)/i, "$1")
    .trim();
  city = city.replace(/^[\d\s]+/, "").replace(/[.\s]+$/, "");
  return { cliente: cliente, city: city ? titolo_(city) + (prov ? " (" + prov + ")" : "") : "", address: address };
}

// ---------- abbinamento nomi (come nell'app: src/places.js) ----------
var FORMS = /\b(S\s?R\s?L|S\s?P\s?A|S\s?N\s?C|S\s?A\s?S|S\s?S|SPA|SRL|SNC|SAS|SOCIETA|UNIPERSONALE|A SOCIO UNICO|SOCIO UNICO|BENEFIT|ITALIA|ITALIANA|F\s?LLI|FRATELLI|OFF|OFFICINA|MECC|DI|E|C)\b/g;
function normName(s) {
  return String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.'’]/g, "")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(FORMS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function indiceClienti_(clienti) {
  return clienti
    .map(function (c) {
      return { c: c, k: normName(c.name) };
    })
    .filter(function (x) {
      return x.k;
    });
}

// nome uguale; altrimenti «contiene» se il cliente possibile è uno solo
function abbinaUno_(nomi, custs) {
  var keys = nomi.map(normName).filter(String);
  var hit = custs.filter(function (x) {
    return keys.indexOf(x.k) >= 0;
  })[0];
  if (hit) return hit.c;
  var cands = custs.filter(function (x) {
    return keys.some(function (k) {
      var a = k.length <= x.k.length ? k : x.k;
      var b = k.length <= x.k.length ? x.k : k;
      return a.length >= 4 && (" " + b + " ").indexOf(" " + a + " ") >= 0;
    });
  });
  return cands.length === 1 ? cands[0].c : null;
}

// ---------- database dell'app ----------
function radice_() {
  return "projects/" + CONFIG.progetto + "/databases/(default)/documents";
}

function accedi_() {
  var r = UrlFetchApp.fetch("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + CONFIG.apiKey, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ returnSecureToken: true }),
  });
  return JSON.parse(r.getContentText()).idToken;
}

function valore_(v) {
  if (!v) return "";
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("booleanValue" in v) return v.booleanValue;
  return "";
}

function leggiClienti_(token) {
  var out = [];
  var pagina = "";
  do {
    var url = "https://firestore.googleapis.com/v1/" + radice_() + "/" + CONFIG.dati + "/customers?pageSize=300" + (pagina ? "&pageToken=" + encodeURIComponent(pagina) : "");
    var j = JSON.parse(UrlFetchApp.fetch(url, { headers: { Authorization: "Bearer " + token } }).getContentText());
    (j.documents || []).forEach(function (d) {
      var f = d.fields || {};
      out.push({ id: d.name.split("/").pop(), name: valore_(f.name), city: valore_(f.city), address: valore_(f.address), placeSource: valore_(f.placeSource), placeFolder: valore_(f.placeFolder), placeSheet: valore_(f.placeSheet), driveFolderId: valore_(f.driveFolderId), driveNone: valore_(f.driveNone) === true });
    });
    pagina = j.nextPageToken || "";
  } while (pagina);
  return out;
}

function campi_(o) {
  var f = {};
  Object.keys(o).forEach(function (k) {
    f[k] = typeof o[k] === "number" ? { integerValue: String(o[k]) } : { stringValue: String(o[k] == null ? "" : o[k]) };
  });
  return f;
}

// una scrittura «aggiorna questi campi» (il resto del documento resta com'è)
function aggiornaDoc_(percorso, dati) {
  return {
    update: { name: radice_() + "/" + CONFIG.dati + "/" + percorso, fields: campi_(dati) },
    updateMask: { fieldPaths: Object.keys(dati) },
  };
}

// scrive a pacchi di 300 (una chiamata per pacco)
function scriviTutto_(token, scritture) {
  var falliti = 0;
  for (var i = 0; i < scritture.length; i += 300) {
    var r = UrlFetchApp.fetch("https://firestore.googleapis.com/v1/" + radice_() + ":commit", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + token },
      payload: JSON.stringify({ writes: scritture.slice(i, i + 300) }),
      muteHttpExceptions: true,
    });
    if (r.getResponseCode() >= 300) {
      Logger.log("Scrittura non riuscita: %s", r.getContentText().slice(0, 300));
      falliti += Math.min(300, scritture.length - i);
    }
  }
  return falliti;
}

// per le prove fuori da Google (node)
if (typeof module !== "undefined") module.exports = { estrai: estrai, normName: normName, abbinaUno: abbinaUno_, estraiGru: estraiGru, tabelleDocx: tabelleDocx, fabKey: fabKey, etichettaFoglio: etichettaFoglio_ };
