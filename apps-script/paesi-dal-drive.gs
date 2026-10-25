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
 * Non apre le cartelle e i fogli dei sottoganci (nome con «sottoganci», «imbracature» o «brache»): lì non ci sono gru.
 *
 * Fogli letti: documenti Google e Word e anche fogli di calcolo (Google Fogli ed Excel) se il nome sembra una
 * verifica (es. «Cliente T10/26 Excel»). Del foglio prende la tabella delle gru come dai documenti.
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
 *   Fatto: aggiorna subito e poi ogni mattina alle 10. In Admin → Drive c'è anche «Aggiorna adesso»: parte entro 5 minuti. L'esito si vede nell'app in Admin → Drive.
 *   (Per rileggere tutto da capo: esegui «ricomincia».)
 */

var CONFIG = {
  cartelle: ["Clienti", "Verifiche"], // percorso nel Drive
  apiKey: "AIzaSyCQ3VhCtvxIP2cxtdSgMzYXaTg4E1zPlZE", // chiave web pubblica dell'app (è già dentro l'app)
  progetto: "mora-app-36607",
  dati: "artifacts/mora-maintenance-v1/public/data",
  minuti: 4, // Google ferma i programmi dopo 6 minuti: mi fermo prima e riprendo il giorno dopo
};

/** Da eseguire una volta: crea l'appuntamento di ogni mattina (e il controllo del tasto nell'app) e aggiorna subito. */
function installa() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === "aggiornaPaesi" || h === "aggiorna" || h === "controlla") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("aggiorna").timeBased().everyDays(1).atHour(10).create();
  ScriptApp.newTrigger("controlla").timeBased().everyMinutes(5).create();
  aggiorna();
}

/**
 * Ogni 5 minuti: qualcuno ha premuto «Aggiorna adesso» in Admin → Drive? Allora faccio il giro subito.
 * (L'app scrive l'ora della richiesta in settings/drive_places.request; io segno requestDone per non ripeterlo.)
 */
function controlla() {
  var token = accedi_();
  var r = UrlFetchApp.fetch("https://firestore.googleapis.com/v1/" + radice_() + "/" + CONFIG.dati + "/settings/drive_places", {
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() !== 200) return;
  var f = JSON.parse(r.getContentText()).fields || {};
  // «Compila verifica» (prova): fogli da preparare e note da scrivere nel Drive
  var comp = valore_(f.compila);
  var compFatto = valore_(f.compilaDone);
  if (comp && !(compFatto && compFatto >= comp)) {
    scriviTutto_(token, [aggiornaDoc_("settings/drive_places", { compilaDone: comp })]);
    try {
      compila_(token, valore_(f.prep) || {});
    } catch (e) {
      Logger.log("Compila: %s", e);
    }
  }
  var req = valore_(f.request);
  var fatto = valore_(f.requestDone);
  if (!req || (fatto && fatto >= req)) return;
  scriviTutto_(token, [aggiornaDoc_("settings/drive_places", { requestDone: req })]);
  aggiorna();
}

// =====================================================================================================
// COMPILA VERIFICA DALL'APP (PROVA). Il tecnico in cantiere compila la verifica nell'app; io scrivo le sue
// note nel foglio della verifica nel Drive (colonna «Note»; se non c'è la aggiungo), così l'ufficio la vede.
// Tocco SOLO il foglio della verifica scelta e solo la colonna delle note, nelle righe compilate.
//  - field_checks/<id file>: il foglio preparato per l'app (righe delle gru), lo scrivo io quando l'app lo chiede
//  - field_entries/<id file>__<riga>: quello che ha scritto il tecnico; dopo averlo scritto nel Drive segno written
// =====================================================================================================
var CHIAVE_RIGA = function (g, i) {
  return g.fabKey ? "F" + g.fabKey : g.internoKey ? "I" + g.internoKey : "R" + i;
};
function chiaveSicura_(k) {
  return String(k).replace(/[^A-Za-z0-9_-]/g, "_");
}

function compila_(token, prep) {
  var fatti = JSON.parse(PropertiesService.getScriptProperties().getProperty("prepFatti") || "{}");
  var nuovi = {};
  Object.keys(prep || {}).forEach(function (cid) {
    var quando = String(prep[cid] || "");
    if (!quando || (fatti[cid] && fatti[cid] >= quando)) return;
    try {
      // «quando|idFile»: il tecnico ha scelto lui il file dall'elenco
      preparaFoglio_(token, cid, quando.split("|")[1] || "");
    } catch (e) {
      Logger.log("Prepara %s: %s", cid, e);
      scriviTutto_(token, [aggiornaDoc_("field_prep/" + chiaveSicura_(cid), { errore: String((e && e.message) || e).slice(0, 300), at: new Date().toISOString() })]);
    }
    nuovi[cid] = quando;
  });
  if (Object.keys(nuovi).length) {
    Object.keys(nuovi).forEach(function (k) {
      fatti[k] = nuovi[k];
    });
    PropertiesService.getScriptProperties().setProperty("prepFatti", JSON.stringify(fatti));
  }
  scriviNote_(token);
}

// leggo un documento dal database (REST)
function leggiDoc_(token, percorso) {
  var r = UrlFetchApp.fetch("https://firestore.googleapis.com/v1/" + radice_() + "/" + CONFIG.dati + "/" + percorso, {
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() !== 200) return null;
  var f = JSON.parse(r.getContentText()).fields || {};
  var o = {};
  Object.keys(f).forEach(function (k) {
    o[k] = valore_(f[k]);
  });
  return o;
}

// il foglio di verifica più recente del cliente (cartella scelta, altrimenti quelle abbinate) → field_checks
function preparaFoglio_(token, cid, voluto) {
  var cliente = leggiDoc_(token, "customers/" + cid) || {};
  var cartelle = [];
  if (cliente.driveFolderId) cartelle.push(cliente.driveFolderId);
  var elenco = [];
  try {
    elenco = JSON.parse((leggiDoc_(token, "settings/drive_folders") || {}).list || "[]");
  } catch (e) {
    elenco = [];
  }
  elenco.forEach(function (v) {
    if (v.c === cid && cartelle.indexOf(v.id) < 0) cartelle.push(v.id);
  });
  if (!cartelle.length) throw new Error("Nessuna cartella del Drive per questo cliente");
  // scelgo dal NOME (periodo della verifica, es. «T10.26» = ottobre 2026), MAI dalla data di modifica:
  // aprire o correggere la verifica vecchia per guardarla non deve farla diventare quella da compilare
  var cand = [];
  var nomi = {};
  cartelle.forEach(function (id) {
    var v = elenco.filter(function (x) {
      return x.id === id;
    })[0];
    candidatiVerifica_(DriveApp.getFolderById(id)).forEach(function (c) {
      nomi[c.f.getId()] = v ? v.n : "";
      cand.push(c);
    });
  });
  // il Word/Excel già trasformato in copia «(Google)»: in elenco tengo solo la copia
  var copie = {};
  cand.forEach(function (c) {
    if (c.google) copie[c.f.getName().replace(/ \(Google\)$/, "")] = true;
  });
  cand = cand.filter(function (c) {
    return c.google || !copie[c.f.getName().replace(/\.(docx|xlsx)$/i, "")];
  });
  cand.sort(ordineVerifiche_);
  var file = null;
  if (voluto) {
    try {
      file = DriveApp.getFileById(voluto);
    } catch (e) {
      throw new Error("Il file scelto non c'è più nel Drive");
    }
  } else if (cand.length) file = cand[0].f;
  var nomeCartella = file ? nomi[file.getId()] || "" : "";
  var originale = file ? file.getId() : "";
  var altri = cand.slice(0, 8).map(function (c) {
    return { id: c.f.getId(), n: c.f.getName(), p: c.periodo, d: c.f.getDateCreated().toISOString() };
  });
  if (!file) throw new Error("Nessun foglio di verifica nella cartella");
  // file Word o Excel: ne faccio una copia come Documento/Foglio Google nella stessa cartella
  // (l'originale resta com'è) e l'app compila quella: nei Word e negli Excel il programma non può scrivere
  if (file.getMimeType() === DOCX) file = comeDocumentoGoogle_(file, MimeType.GOOGLE_DOCS);
  else if (file.getMimeType() === XLSX) file = comeDocumentoGoogle_(file, MimeType.GOOGLE_SHEETS);
  var mime = file.getMimeType();
  var foglio = leggiFoglio_(file);
  var righe = estraiGru(foglio.tabelle).map(function (g, i) {
    return { k: CHIAVE_RIGA(g, i), fab: g.fab, interno: g.interno, tipo: g.tipo, portata: g.portata, zona: g.zona, prima: g.stato };
  });
  var scrivibile = mime === MimeType.GOOGLE_DOCS || mime === MimeType.GOOGLE_SHEETS;
  scriviTutto_(token, [
    aggiornaDoc_("field_checks/" + file.getId(), {
      customerId: cid,
      customerName: cliente.name || "",
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: file.getUrl(),
      originale: originale,
      scelto: voluto ? "tecnico" : "nome",
      altri: JSON.stringify(altri),
      cartella: nomeCartella,
      tipoFile: mime === MimeType.GOOGLE_SHEETS ? "foglio" : mime === MimeType.GOOGLE_DOCS ? "documento" : "word",
      scrivibile: scrivibile,
      righe: JSON.stringify(righe),
      aggiornato: file.getLastUpdated().toISOString(),
      preparedAt: new Date().toISOString(),
      open: true,
    }),
    aggiornaDoc_("field_prep/" + chiaveSicura_(cid), { fileId: file.getId(), errore: "", altri: JSON.stringify(altri), at: new Date().toISOString() }),
  ]);
}

// periodo scritto nel nome: «T10.26», «A 04/26», «T3-27» → 202610, 202604, 202703 (0 se non c'è)
function periodoVerifica_(nome) {
  var m = String(nome || "").match(/(?:^|[^A-Z0-9])[TA] ?(\d{1,2}) ?[.\/\\-] ?(\d{2})(?:[^0-9]|$)/i);
  if (!m) return 0;
  var mese = Number(m[1]);
  if (mese < 1 || mese > 12) return 0;
  return (2000 + Number(m[2])) * 100 + mese;
}

// tutti i fogli che possono essere una verifica, in una cartella
function candidatiVerifica_(cart) {
  var out = [];
  var files = cart.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    var m = f.getMimeType();
    var doc = m === MimeType.GOOGLE_DOCS || m === DOCX;
    var calc = (m === MimeType.GOOGLE_SHEETS || m === XLSX) && NOME_VERIFICA.test(f.getName());
    if ((!doc && !calc) || SALTA.test(f.getName())) continue;
    out.push({ f: f, periodo: periodoVerifica_(f.getName()), google: /\(Google\)$/.test(f.getName()) });
  }
  return out;
}

// prima il periodo più recente scritto nel nome; a parità la copia «(Google)», poi il caricato per ultimo
// (data di caricamento, non di modifica). Senza periodo nel nome vanno in fondo.
function ordineVerifiche_(a, b) {
  if (a.periodo !== b.periodo) return b.periodo - a.periodo;
  if (a.google !== b.google) return a.google ? -1 : 1;
  return b.f.getDateCreated() - a.f.getDateCreated();
}

// copia di un Word (o Excel) come Documento (o Foglio) Google, conversione automatica del Drive, nella stessa cartella
function comeDocumentoGoogle_(file, tipo) {
  tipo = tipo || MimeType.GOOGLE_DOCS;
  var nome = file.getName().replace(/\.(docx|xlsx)$/i, "") + " (Google)";
  var cartelle = file.getParents();
  var cartella = cartelle.hasNext() ? cartelle.next() : null;
  // già convertito dopo l'ultima modifica del Word? uso quello
  if (cartella) {
    var it = cartella.getFilesByName(nome);
    while (it.hasNext()) {
      var g = it.next();
      if (g.getMimeType() === tipo && g.getDateCreated() >= file.getLastUpdated()) return g;
    }
  }
  var r = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + file.getId() + "/copy?supportsAllDrives=true", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ name: nome, mimeType: tipo, parents: cartella ? [cartella.getId()] : undefined }),
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() !== 200) throw new Error("Non riesco a trasformare il file in formato Google (" + r.getResponseCode() + ")");
  return DriveApp.getFileById(JSON.parse(r.getContentText()).id);
}

// le note scritte nell'app e non ancora nel Drive
function scriviNote_(token) {
  var rows = JSON.parse(
    UrlFetchApp.fetch("https://firestore.googleapis.com/v1/" + radice_() + "/" + CONFIG.dati + ":runQuery", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + token },
      payload: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "field_entries" }],
          where: { fieldFilter: { field: { fieldPath: "written" }, op: "EQUAL", value: { booleanValue: false } } },
          limit: 300,
        },
      }),
    }).getContentText()
  );
  var perFile = {};
  (rows || []).forEach(function (x) {
    if (!x.document) return;
    var f = x.document.fields || {};
    var e = { id: x.document.name.split("/").pop() };
    Object.keys(f).forEach(function (k) {
      e[k] = valore_(f[k]);
    });
    (perFile[e.fileId] = perFile[e.fileId] || []).push(e);
  });
  var scritture = [];
  Object.keys(perFile).forEach(function (fileId) {
    var lista = perFile[fileId];
    var esito = {};
    try {
      esito = scriviNelFile_(fileId, lista);
    } catch (e) {
      lista.forEach(function (x) {
        esito[x.id] = "Errore: " + String((e && e.message) || e).slice(0, 200);
      });
    }
    lista.forEach(function (x) {
      var err = esito[x.id] || "";
      scritture.push(aggiornaDoc_("field_entries/" + x.id, { written: !err, writtenAt: err ? "" : new Date().toISOString(), errore: err, writtenText: err ? "" : x.testo }));
    });
  });
  scriviTutto_(token, scritture);
}

// scrive le note nel documento o nel foglio Google; restituisce { idNota: "errore" } per quelle non scritte
function scriviNelFile_(fileId, lista) {
  var file = DriveApp.getFileById(fileId);
  var mime = file.getMimeType();
  var errori = {};
  var trova = function (gru, k) {
    for (var i = 0; i < gru.length; i++) if (CHIAVE_RIGA(gru[i], i) === k) return gru[i];
    return null;
  };
  if (mime === MimeType.GOOGLE_DOCS) {
    var doc = DocumentApp.openById(fileId);
    var tabs = doc.getBody().getTables();
    var testoTab = tabs.map(function (tb) {
      var righe = [];
      for (var r = 0; r < tb.getNumRows(); r++) {
        var row = tb.getRow(r);
        var celle = [];
        for (var c = 0; c < row.getNumCells(); c++) celle.push(row.getCell(c).getText().replace(/\s+/g, " ").trim());
        righe.push(celle);
      }
      return righe;
    });
    var gru = estraiGru(testoTab);
    var colNote = {}; // tabella → colonna delle note (aggiunta se manca)
    lista.forEach(function (x) {
      var g = trova(gru, x.k);
      if (!g) {
        errori[x.id] = "Riga non trovata nel documento (il foglio è cambiato?)";
        return;
      }
      var tb = tabs[g._t];
      if (!(g._t in colNote)) {
        if (g._note >= 0) colNote[g._t] = g._note;
        else {
          // manca la colonna «Note»: la aggiungo in fondo a tutte le righe della tabella
          var n = 0;
          for (var r = 0; r < tb.getNumRows(); r++) n = Math.max(n, tb.getRow(r).getNumCells());
          for (var r2 = 0; r2 < tb.getNumRows(); r2++) {
            var row2 = tb.getRow(r2);
            while (row2.getNumCells() < n) row2.appendTableCell("");
            row2.appendTableCell(r2 === g._h ? "Note" : "");
          }
          colNote[g._t] = n;
        }
      }
      var row = tb.getRow(g._r);
      while (row.getNumCells() <= colNote[g._t]) row.appendTableCell("");
      row.getCell(colNote[g._t]).setText(String(x.testo || ""));
    });
    doc.saveAndClose();
    return errori;
  }
  if (mime === MimeType.GOOGLE_SHEETS) {
    var ss = SpreadsheetApp.openById(fileId);
    var fogli = ss.getSheets();
    var tabS = fogli.map(function (sh) {
      return sh.getDataRange().getDisplayValues().map(function (r) {
        return r.map(function (v) {
          return String(v).replace(/\s+/g, " ").trim();
        });
      });
    });
    var gruS = estraiGru(tabS);
    var colS = {};
    lista.forEach(function (x) {
      var g = trova(gruS, x.k);
      if (!g) {
        errori[x.id] = "Riga non trovata nel foglio (il foglio è cambiato?)";
        return;
      }
      var sh = fogli[g._t];
      if (!(g._t in colS)) {
        if (g._note >= 0) colS[g._t] = g._note;
        else {
          var c0 = sh.getLastColumn(); // prima colonna libera
          sh.getRange(g._h + 1, c0 + 1).setValue("Note");
          colS[g._t] = c0;
        }
      }
      sh.getRange(g._r + 1, colS[g._t] + 1).setValue(String(x.testo || ""));
    });
    SpreadsheetApp.flush();
    return errori;
  }
  lista.forEach(function (x) {
    errori[x.id] = "File Word: va caricato come Documento Google per poterci scrivere";
  });
  return errori;
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
  // un giro alla volta (il giro del mattino e il tasto nell'app non si sovrappongono)
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(2000)) return;
  try {
    giro_();
  } catch (e) {
    try {
      scriviTutto_(accedi_(), [aggiornaDoc_("settings/drive_places", { lastError: String((e && e.message) || e).slice(0, 300), lastErrorAt: new Date().toISOString() })]);
    } catch (e2) {
      Logger.log("Non riesco nemmeno a scrivere l'errore: %s", e2);
    }
    throw e;
  } finally {
    lock.releaseLock();
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
  unita = unita.filter(function (u) {
    return !SALTA.test(u.nome);
  });
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
var XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
// il foglio di verifica più recente della cartella: documenti (Google Docs o Word) e anche fogli di calcolo
// (Google Fogli o Excel), ma questi solo se il nome sembra una verifica (es. «T10/26», «A04.26», «verifica»):
// così un «Foglio senza titolo» qualsiasi non prende il posto della verifica vera.
// cartelle e fogli da non aprire: lì non ci sono gru (es. i sottoganci: ganci, brache, catene di imbracatura)
var SALTA = /SOTTOGAN|IMBRACAT|BRACHE/i;
var NOME_VERIFICA = /(^|[^A-Z0-9])[TA] ?\d{1,2} ?[.\/\\-] ?\d{2}([^0-9]|$)|VERIFIC/i;
function ultimoFoglio_(cart) {
  var files = cart.getFiles();
  var best = null;
  while (files.hasNext()) {
    var f = files.next();
    var m = f.getMimeType();
    var doc = m === MimeType.GOOGLE_DOCS || m === DOCX;
    var calc = (m === MimeType.GOOGLE_SHEETS || m === XLSX) && NOME_VERIFICA.test(f.getName());
    if ((!doc && !calc) || SALTA.test(f.getName())) continue;
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
  var mime = file.getMimeType();
  if (mime === MimeType.GOOGLE_SHEETS) {
    // Google Foglio: lo scarico come Excel con il permesso del Drive che il programma ha già
    // (così non serve dare a Google un permesso in più per i Fogli)
    var r = UrlFetchApp.fetch("https://docs.google.com/spreadsheets/d/" + file.getId() + "/export?format=xlsx", {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
    });
    if (r.getResponseCode() !== 200) throw new Error("Non riesco a scaricare il foglio (" + r.getResponseCode() + ")");
    var tg = tabelleXlsx_(r.getBlob());
    return { testo: testoDaTabelle_(tg), tabelle: tg };
  }
  if (mime === XLSX) {
    var tx = tabelleXlsx_(file.getBlob());
    return { testo: testoDaTabelle_(tx), tabelle: tx };
  }
  if (mime === MimeType.GOOGLE_DOCS) {
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

// le prime righe dei fogli come testo (per cercare cliente e paese come nell'intestazione dei documenti)
function testoDaTabelle_(tab) {
  var righe = [];
  (tab || []).forEach(function (t) {
    t.slice(0, 12).forEach(function (r) {
      var x = r.filter(String).join(" ");
      if (x) righe.push(x);
    });
  });
  return righe.join("\n").slice(0, 3000);
}

// file Excel (.xlsx): è uno zip con i testi in sharedStrings.xml e un file per foglio
function tabelleXlsx_(blob) {
  var parti = Utilities.unzip(blob.setContentType("application/zip"));
  var file = {};
  parti.forEach(function (p) {
    file[p.getName()] = p;
  });
  var condivisi = [];
  if (file["xl/sharedStrings.xml"]) {
    (file["xl/sharedStrings.xml"].getDataAsString("UTF-8").match(/<si>[\s\S]*?<\/si>/g) || []).forEach(function (si) {
      condivisi.push(xmlTesto_((si.match(/<t[^>]*>[\s\S]*?<\/t>/g) || []).join("")));
    });
  }
  var nomi = Object.keys(file)
    .filter(function (n) {
      return /^xl\/worksheets\/sheet\d+\.xml$/.test(n);
    })
    .sort(function (a, b) {
      return parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10);
    });
  return nomi.map(function (n) {
    return righeXlsx(file[n].getDataAsString("UTF-8"), condivisi);
  });
}
function righeXlsx(xml, condivisi) {
  var col = function (ref) {
    var l = String(ref || "").replace(/[0-9]/g, "");
    var k = 0;
    for (var i = 0; i < l.length; i++) k = k * 26 + (l.charCodeAt(i) - 64);
    return k - 1;
  };
  return (String(xml).match(/<row\b[^>]*>[\s\S]*?<\/row>/g) || []).map(function (row) {
    var out = [];
    var prossima = 0;
    (row.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []).forEach(function (c) {
      var ref = (c.match(/\br="([A-Z]+\d+)"/) || [])[1];
      var i = ref ? col(ref) : prossima;
      prossima = i + 1;
      var tipo = (c.match(/\bt="(\w+)"/) || [])[1];
      var v = (c.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      var val = "";
      if (tipo === "s") val = condivisi[Number(v)] || "";
      else if (tipo === "inlineStr") val = xmlTesto_((c.match(/<t[^>]*>[\s\S]*?<\/t>/g) || []).join(""));
      else if (v != null) val = xmlTesto_(v);
      out[i] = String(val).replace(/\s+/g, " ").trim();
    });
    for (var j = 0; j < out.length; j++) if (out[j] == null) out[j] = "";
    return out;
  });
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
  (tabelle || []).forEach(function (righe, ti) {
    var h = -1;
    for (var r = 0; r < righe.length && r < 4; r++) {
      var joined = righe[r].join(" | ").toUpperCase();
      if (/PORTATA/.test(joined) && /(FABBRICA|TIPO|MATRICOLA|DESCRIZIONE|(^|\| )N\.? ?F\.?( |\||$)|(^|\| )N[.°] )/.test(joined)) {
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
    // «N. FABBRICA», «N.F. MORA»…
    var iFab = idx(/FABBRICA|^N\.? ?F\.?( |$)|^N° ?F\b/);
    var iMatr = idx(/ENPI|ISPESL|INAIL/);
    if (iFab < 0) iFab = idx(/^MATRICOLA$|^N\.? ?MATRICOLA$/); // es. «DEN. INTERNA | DESCRIZIONE | MATRICOLA | PORTATA»
    var iInt = idx(/INTERN|RIF/);
    // numero del cliente (es. «N. NOMECLIENTE»): una colonna «N. …» che non è il numero di fabbrica né la matricola
    if (iInt < 0) iInt = idx(/^(N\.|N°|NUM(ERO)?\.?) ?[A-Z]/, /FABBRICA|MATRICOLA|ENPI|ISPESL|INAIL|^N\.? ?F\.?( |$)/);
    var iTipo = idx(/TIPO|DESCRIZIONE/, /PARANCO/);
    // fogli di calcolo con la prima colonna senza titolo («Colonna 1»): è il tipo di gru
    if (iTipo < 0 && /^(COLONNA ?1|)$/.test(head[0] || "") && iFab !== 0 && iInt !== 0) iTipo = 0;
    var iNote = idx(/^NOTE|STATO|ESITO|OSSERVAZ/);
    var iPort = idx(/PORTATA/);
    var iPar = idx(/PARANCO/);
    var iAnno = idx(/ANNO/);
    var iZona = idx(/ZONA|REPARTO|UBICAZ|POSIZIONE/);
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
      // com'è la fune o la catena: la colonna «Note» / «Stato» se c'è, altrimenti la cella più lunga che ne parla
      var stato = get(iNote);
      if (!stato)
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
        zona: get(iZona).slice(0, 80),
        // dove si trova nel foglio (serve per scriverci dentro dall'app: «Compila verifica»)
        _t: ti,
        _r: k,
        _h: h,
        _note: iNote,
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
  if ("mapValue" in v) {
    var o = {};
    var mf = v.mapValue.fields || {};
    Object.keys(mf).forEach(function (k) {
      o[k] = valore_(mf[k]);
    });
    return o;
  }
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
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
    var v = o[k];
    f[k] =
      typeof v === "number"
        ? Number.isInteger(v)
          ? { integerValue: String(v) }
          : { doubleValue: v }
        : typeof v === "boolean"
        ? { booleanValue: v }
        : { stringValue: String(v == null ? "" : v) };
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
if (typeof module !== "undefined") module.exports = { CHIAVE_RIGA: CHIAVE_RIGA, righeXlsx: righeXlsx, NOME_VERIFICA: NOME_VERIFICA, estrai: estrai, normName: normName, abbinaUno: abbinaUno_, estraiGru: estraiGru, tabelleDocx: tabelleDocx, fabKey: fabKey, etichettaFoglio: etichettaFoglio_ };
