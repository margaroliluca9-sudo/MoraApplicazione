/**
 * PAESI E INDIRIZZI DEI CLIENTI DAL DRIVE → APP ASSISTENZA MORA (una volta a settimana, da solo)
 *
 * Gira dentro il Google Drive di chi lo installa (Google Apps Script): non servono password né chiavi.
 * Ogni lunedì mattina guarda la cartella «Clienti / Verifiche»: per ogni cliente apre il foglio verifica
 * più recente, legge paese e indirizzo dall'intestazione (es. «Località: OLEGGIO (NO) Via Verbano, 56/A»)
 * e li scrive nell'app sui clienti che corrispondono.
 *
 * Non tocca mai quello che avete scritto a mano o importato da file: aggiorna solo i clienti
 * senza paese oppure quelli che aveva già aggiornato lui (campo placeSource = "drive").
 *
 * INSTALLAZIONE (una volta sola, 2 minuti):
 *   1. Apri https://script.google.com con l'account che vede la cartella Clienti → «Nuovo progetto».
 *   2. Cancella tutto e incolla questo file. Salva (icona del dischetto).
 *   3. In alto scegli la funzione «installa» e premi «Esegui». Google chiede i permessi: «Consenti».
 *   Fatto: aggiorna subito e poi ogni lunedì alle 6. L'esito si vede nell'app in Admin → Clienti.
 */

var CONFIG = {
  cartelle: ["Clienti", "Verifiche"], // percorso nel Drive
  apiKey: "AIzaSyCQ3VhCtvxIP2cxtdSgMzYXaTg4E1zPlZE", // chiave web pubblica dell'app (è già dentro l'app)
  progetto: "mora-app-36607",
  dati: "artifacts/mora-maintenance-v1/public/data",
};

/** Da eseguire una volta: crea l'appuntamento del lunedì e aggiorna subito. */
function installa() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "aggiornaPaesi") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("aggiornaPaesi").timeBased().everyWeeks(1).onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(6).create();
  aggiornaPaesi();
}

/** Il lavoro della settimana. */
function aggiornaPaesi() {
  var cartella = trovaCartella_(CONFIG.cartelle);
  var trovati = leggiDrive_(cartella); // [{ names: [...], city, address }]
  var token = accedi_();
  var clienti = leggiClienti_(token);
  var risultato = abbina_(trovati, clienti);
  var scritti = 0;
  risultato.forEach(function (r) {
    var c = r.cliente;
    var libero = !String(c.city || "").trim() && !String(c.address || "").trim();
    var nostro = c.placeSource === "drive";
    if (!libero && !nostro) return; // scritto a mano o da file: non si tocca
    if (c.city === r.city && (c.address || "") === r.address) return; // già uguale
    scriviCliente_(token, c.id, { city: r.city, address: r.address, placeSource: "drive" });
    scritti++;
  });
  scriviEsito_(token, { lastRun: new Date().toISOString(), letti: trovati.length, abbinati: risultato.length, aggiornati: scritti });
  Logger.log("Clienti nel Drive: %s · abbinati: %s · aggiornati: %s", trovati.length, risultato.length, scritti);
}

// ---------- Drive ----------
function trovaCartella_(percorso) {
  var it = DriveApp.getFoldersByName(percorso[0]);
  while (it.hasNext()) {
    var f = it.next();
    var ok = true;
    var cur = f;
    for (var i = 1; i < percorso.length; i++) {
      var sub = cur.getFoldersByName(percorso[i]);
      if (!sub.hasNext()) {
        ok = false;
        break;
      }
      cur = sub.next();
    }
    if (ok) return cur;
  }
  throw new Error("Non trovo la cartella " + percorso.join(" / ") + " nel Drive.");
}

function leggiDrive_(radice) {
  var out = [];
  var cartelle = radice.getFolders();
  while (cartelle.hasNext()) {
    var cart = cartelle.next();
    try {
      var testo = testoUltimoFoglio_(cart);
      if (!testo) continue;
      var info = estrai(testo);
      if (!info.city && !info.address) continue;
      out.push({ names: [cart.getName(), info.cliente].filter(String), city: info.city, address: info.address });
    } catch (e) {
      Logger.log("Salto %s: %s", cart.getName(), e);
    }
  }
  return out;
}

function testoUltimoFoglio_(cart) {
  var files = cart.getFiles();
  var best = null;
  while (files.hasNext()) {
    var f = files.next();
    var m = f.getMimeType();
    if (m !== MimeType.GOOGLE_DOCS && m !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") continue;
    if (!best || f.getLastUpdated() > best.getLastUpdated()) best = f;
  }
  if (!best) return "";
  if (best.getMimeType() === MimeType.GOOGLE_DOCS) return DocumentApp.openById(best.getId()).getBody().getText().slice(0, 3000);
  var parti = Utilities.unzip(best.getBlob().setContentType("application/zip"));
  for (var i = 0; i < parti.length; i++) {
    if (parti[i].getName() === "word/document.xml") {
      var xml = parti[i].getDataAsString("UTF-8");
      return xml
        .replace(/<\/w:p>/g, "\n")
        .replace(/<w:tab\/>/g, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .slice(0, 3000);
    }
  }
  return "";
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

function abbina_(trovati, clienti) {
  var custs = clienti
    .map(function (c) {
      return { c: c, k: normName(c.name) };
    })
    .filter(function (x) {
      return x.k;
    });
  var usati = {};
  var out = [];
  trovati.forEach(function (p) {
    var keys = p.names.map(normName).filter(String);
    var hit = custs.filter(function (x) {
      return !usati[x.c.id] && keys.indexOf(x.k) >= 0;
    })[0];
    if (!hit) {
      var cands = custs.filter(function (x) {
        return (
          !usati[x.c.id] &&
          keys.some(function (k) {
            var a = k.length <= x.k.length ? k : x.k;
            var b = k.length <= x.k.length ? x.k : k;
            return a.length >= 4 && (" " + b + " ").indexOf(" " + a + " ") >= 0;
          })
        );
      });
      if (cands.length === 1) hit = cands[0];
    }
    if (!hit) return;
    usati[hit.c.id] = true;
    out.push({ cliente: hit.c, city: p.city, address: p.address });
  });
  return out;
}

// ---------- database dell'app ----------
function base_() {
  return "https://firestore.googleapis.com/v1/projects/" + CONFIG.progetto + "/databases/(default)/documents/" + CONFIG.dati;
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
    var url = base_() + "/customers?pageSize=300" + (pagina ? "&pageToken=" + encodeURIComponent(pagina) : "");
    var j = JSON.parse(UrlFetchApp.fetch(url, { headers: { Authorization: "Bearer " + token } }).getContentText());
    (j.documents || []).forEach(function (d) {
      var f = d.fields || {};
      out.push({ id: d.name.split("/").pop(), name: valore_(f.name), city: valore_(f.city), address: valore_(f.address), placeSource: valore_(f.placeSource) });
    });
    pagina = j.nextPageToken || "";
  } while (pagina);
  return out;
}

function campi_(o) {
  var f = {};
  Object.keys(o).forEach(function (k) {
    f[k] = typeof o[k] === "number" ? { integerValue: String(o[k]) } : { stringValue: String(o[k]) };
  });
  return f;
}

function scriviCliente_(token, id, dati) {
  var mask = Object.keys(dati)
    .map(function (k) {
      return "updateMask.fieldPaths=" + k;
    })
    .join("&");
  UrlFetchApp.fetch(base_() + "/customers/" + id + "?" + mask, {
    method: "patch",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify({ fields: campi_(dati) }),
  });
}

function scriviEsito_(token, dati) {
  UrlFetchApp.fetch(base_() + "/settings/drive_places", {
    method: "patch",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify({ fields: campi_(dati) }),
    muteHttpExceptions: true,
  });
}

// per le prove fuori da Google (node): esporta la lettura dell'intestazione
if (typeof module !== "undefined") module.exports = { estrai: estrai, normName: normName, abbina: abbina_ };
