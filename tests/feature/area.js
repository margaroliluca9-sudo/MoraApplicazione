// La mia area + magazzino furgone + scarico automatico + admin furgoni.
const path = require("path");
const [G, OUT, SHOTS] = process.argv.slice(2);
const { chromium } = require(path.join(G, "playwright"));
const fs = require("fs");
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let f = 0;
const check = (l, a, e) => { const ok = JSON.stringify(a) === JSON.stringify(e); if (!ok) f++; console.log((ok ? "PASS " : "FAIL ") + l + (ok ? "" : `\n   atteso ${JSON.stringify(e)}\n   ottenuto ${JSON.stringify(a)}`)); };
const pad = (n) => String(n).padStart(2, "0");
const d0 = new Date();
const TODAY = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}`;
const TODAY_LOG = `${d0.getDate()}/${d0.getMonth() + 1}/${d0.getFullYear()}`;
const DB = {
  technicians: [{ id: "t1", name: "Luca" }, { id: "t2", name: "Marco" }, { id: "t3", name: "Ivano" }],
  machine_types: [{ id: "g", name: "Gru a ponte" }],
  customers: [{ id: "c1", name: "AMUT" }],
  machines: [{ id: "m1", matricola: "6", customerName: "AMUT", type: "Gru a ponte", capacity: "10000 kg" }],
  maintenance_logs: [
    { id: "l1", dateString: TODAY_LOG, technician: "Luca", additionalTechnicians: ["Marco"], customer: "AMUT", machineId: "6", description: "Ricerca guasto" },
    { id: "l2", dateString: TODAY_LOG, technician: "Ivano", additionalTechnicians: [], customer: "CALEFFI", machineId: "2", description: "Verifica" },
  ],
  settings: [{ id: "layout", chatEnabled: true }], active_users: [], access_logs: [], ignored_conflicts: [], chat_messages: [], chat_reads: [], push_subscriptions: [],
  personal_events: [
    { id: "e1", owner: "luca", date: TODAY, time: "08:30", title: "AMUT – sostituzione fune", place: "Novara", notifyBefore: 60 },
    { id: "e2", owner: "marco", date: TODAY, time: "09:00", title: "SEGRETO DI MARCO" },
  ],
  personal_notes: [
    { id: "n1", owner: "luca", title: "Codici utili", text: "F07 = sovratemperatura", pinned: false, items: [], updatedAt: 1 },
    { id: "n2", owner: "luca", title: "Da tenere nel furgone", text: "", pinned: true, items: [{ t: "Fune 10 mm", done: true }, { t: "Contattori", done: false }], updatedAt: 0 },
    { id: "n3", owner: "marco", title: "NOTA PRIVATA DI MARCO", text: "x", items: [] },
  ],
  personal_reminders: [
    { id: "r1", owner: "luca", title: "Richiamare sig. Drappo", date: TODAY, time: "14:00", notify: true, done: false },
    { id: "r2", owner: "luca", title: "Vecchio fatto", date: "2026-01-01", done: true, doneAt: 5 },
  ],
  personal_contacts: [{ id: "k1", owner: "luca", name: "Drappo", role: "AMUT manutenzione", phone: "+39 333 123 4567" }],
  vans: [{ id: "v1", name: "Furgone di Luca", plate: "EK482TL", users: ["luca", "marco"] }],
  van_items: [
    { id: "i1", vanId: "v1", name: "Contattore LC1D18 24V", words: "contattore, teleruttore", cat: "Elettrico", unit: "pz", qty: 1, min: 2 },
    { id: "i2", vanId: "v1", name: "Fusibili 10A", cat: "Consumo", unit: "pz", qty: 12, min: 5 },
    { id: "i3", vanId: "v1", name: "Fune 10 mm", cat: "Altro", unit: "m", qty: 40, min: 20 },
    { id: "i4", vanId: "v1", name: "Finecorsa a leva", words: "finecorsa", cat: "Elettrico", unit: "pz", qty: 0, min: 1 },
  ],
  van_moves: [{ id: "mv1", vanId: "v1", itemId: "i1", itemName: "Contattore LC1D18 24V", delta: -1, kind: "rapporto", author: "Marco", note: "CALEFFI · 2", at: Date.now() - 86400000 }],
};
const LAYOUT = { themeColor: "blue", formSettings: { showMachineId: true, showMachineType: true, showCapacity: true }, formOrder: ["technician", "date", "ticketNumber", "customer", "machine", "capacity", "description", "photos", "custom"] };

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const open = async (me = "Luca") => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on("pageerror", (e) => errs.push(e.message));
    await p.addInitScript(({ db, me }) => {
      window.__fakeDB = db; window.alert = () => {}; window.confirm = () => true;
      window.__vanEvents = []; window.addEventListener("mora-van-used", (e) => window.__vanEvents.push(e.detail));
      try { localStorage.setItem("mora_tech_last_name", me); } catch (e) {}
    }, { db: DB, me });
    await p.goto("file://" + path.join(OUT, "index.html"));
    return p;
  };
  const writes = (p) => p.evaluate(() => window.__writes.map((w) => JSON.parse(w)));
  const setVal = (p, sel, v) => p.evaluate(([s, v]) => { const el = document.querySelector(s); const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true })); }, [sel, v]);
  const click = (p, sel) => p.evaluate((s) => { const el = document.querySelector(s); if (!el) throw new Error("manca " + s); el.click(); }, sel);
  const clickText = (p, txt, scope = "button") => p.evaluate(([t, sc]) => { const el = [...document.querySelectorAll(sc)].find((b) => b.textContent.trim().startsWith(t)); if (!el) throw new Error("manca " + t); el.click(); }, [txt, scope]);
  const text = (p, sel = "body") => p.evaluate((s) => (document.querySelector(s) || {}).textContent || "", sel);
  const shot = async (p, n) => SHOTS && p.screenshot({ path: path.join(SHOTS, n + ".png") });
  const wait = (p, ms = 150) => p.waitForTimeout(ms);

  console.log("== Home: riquadro La mia area ==");
  let p = await open();
  await p.evaluate(() => window.mountApp()); await wait(p, 3200);
  const tiles = await p.evaluate(() => [...document.querySelectorAll("[data-tile]")].map((t) => t.getAttribute("data-tile")));
  check("Home: 'Misura' e 'La mia area' subito dopo 'Nuovo Rapporto'; niente 'I miei interventi' né 'Chat'", [tiles.filter((t) => t !== "new" && t !== "misura")[0], tiles.includes("mine"), tiles.includes("chat")], ["area", false, false]);
  check("sul riquadro: cose da fare oggi (impegno + promemoria)", await p.evaluate(() => { const t = document.querySelector('[data-tile="area"]'); return [t.querySelector("[data-badge]").textContent, /2 cose da fare oggi/.test(t.textContent)]; }), ["2", true]);
  await click(p, '[data-tile="area"]'); await wait(p, 300);
  const home = await text(p, '[data-section="personal-area"]');
  check("La mia area si apre: titolo, oggi, riquadri", [/La mia area/.test(home), /AMUT – sostituzione fune/.test(home), /Richiamare sig\. Drappo/.test(home)], [true, true, true]);
  check("privacy: non si vedono impegni/note di Marco", [/SEGRETO DI MARCO/.test(home), /NOTA PRIVATA/.test(home)], [false, false]);
  check("riquadri: calendario, note, chat, promemoria, magazzino (Luca ha il furgone)", await p.evaluate(() => [...document.querySelectorAll("[data-area-tile]")].map((t) => t.getAttribute("data-area-tile"))), ["mine", "print", "calendar", "notes", "chat", "reminders", "van", "profile", "parts"]);
  check("magazzino: 2 da riordinare (contattore 1<2, finecorsa 0<1)", /2 da riordinare/.test(await text(p, '[data-area-tile="van"]')), true);
  check("numeri del mese: 1 intervento, 1 cliente (Luca)", await p.evaluate(() => [...document.querySelectorAll('[data-section="area-numbers"] .text-3xl')].map((e) => e.textContent)), ["1", "1"]);
  await shot(p, "01_area");
  check("riquadro 'I miei interventi': 1 questo mese", /1 questo mese/.test(await text(p, '[data-area-tile="mine"]')), true);
  await click(p, '[data-area-tile="mine"]'); await wait(p, 300);
  check("apre 'I miei interventi' sopra la mia area", await p.evaluate(() => /I miei interventi/i.test(document.body.textContent) && !!document.querySelector('[data-section="personal-area"]')), true);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button[aria-label="Chiudi"], button')].reverse().find((x) => x.getAttribute("aria-label") === "Chiudi" || /chiudi/i.test(x.textContent)); }); 
  await click(p, '[data-area-tile="chat"]'); await wait(p, 300);
  check("Chat dalla mia area apre la chat", await p.evaluate(() => !!document.querySelector('[data-section="chat"]')), true);
  await p.close();

  console.log("\n== Tecnico SENZA furgone (Ivano) ==");
  p = await open("Ivano");
  await p.evaluate(() => window.mountApp()); await wait(p, 3200);
  await click(p, '[data-tile="area"]'); await wait(p, 300);
  check("nessun riquadro Magazzino", await p.evaluate(() => [...document.querySelectorAll("[data-area-tile]")].map((t) => t.getAttribute("data-area-tile"))), ["mine", "print", "calendar", "notes", "chat", "reminders", "profile", "parts"]);
  check("niente cose di Luca", /Drappo|AMUT – sostituzione/.test(await text(p, '[data-section="personal-area"]')), false);
  await p.close();

  console.log("\n== Chat spenta dall'admin ==");
  {
    const saved = DB.settings; DB.settings = [{ id: "layout", chatEnabled: false }];
    DB.chat_messages = [{ id: "g1", conv: "group", author: "Marco", authorKey: "marco", text: "ciao", createdAt: { seconds: Math.floor(Date.now() / 1000) } }];
    p = await open();
    await p.evaluate(() => window.mountApp()); await wait(p, 3200);
    check("Home: nessun messaggio contato sul riquadro (2 = solo le cose di oggi)", await p.evaluate(() => [document.querySelector('[data-tile="area"] [data-badge]').textContent, /messagg/.test(document.querySelector('[data-tile="area"]').textContent)]), ["2", false]);
    await click(p, '[data-tile="area"]'); await wait(p, 300);
    check("La mia area senza Chat (6 riquadri, nessuno largo)", await p.evaluate(() => [[...document.querySelectorAll("[data-area-tile]")].map((t) => t.getAttribute("data-area-tile")), document.querySelector('[data-area-tile="van"]').className.includes("col-span-2")]), [["mine", "print", "calendar", "notes", "reminders", "van", "profile", "parts"], false]);
    await p.close();
    p = await open();
    await p.goto("file://" + path.join(OUT, "index.html") + "?chat=group");
    await p.evaluate(() => window.mountApp()); await wait(p, 3200);
    check("notifica vecchia della chat: la chat non si apre", await p.evaluate(() => !document.querySelector('[data-section="chat"]')), true);
    await p.close();
    DB.settings = saved; DB.chat_messages = [];
  }

  console.log("\n== Calendario ==");
  p = await open();
  await p.evaluate((db) => window.mountComponent("PersonalAreaModal", { me: "Luca", logs: db.maintenance_logs, events: db.personal_events.filter((e) => e.owner === "luca"), notes: db.personal_notes.filter((e) => e.owner === "luca"), reminders: db.personal_reminders.filter((e) => e.owner === "luca"), contacts: db.personal_contacts, vans: db.vans, vanItems: db.van_items, onClose() {}, initialPanel: "calendar" }), DB);
  await wait(p);
  const cal = await text(p, '[data-section="day-list"]');
  check("oggi: impegno + intervento fatto (dallo storico)", [/AMUT – sostituzione fune/.test(cal), /Intervento fatto/.test(cal)], [true, true]);
  check("pallini: intervento e impegno oggi", await p.evaluate((t) => document.querySelector(`[data-day="${t}"]`).querySelectorAll(".rounded-full.w-1\\.5").length, TODAY), 2);
  await shot(p, "02_calendario");
  await click(p, '[data-action="add"]'); await wait(p);
  await click(p, '[data-section="event-form"] button.flex-1'); await wait(p);
  check("senza titolo non salva", /Scrivi cosa devi fare/.test(await text(p, '[data-section="event-form"]')), true);
  await setVal(p, '[aria-label="Cosa"]', "CALEFFI – ricontrollo finecorsa");
  await setVal(p, '[aria-label="Giorno"]', "2099-05-04");
  await setVal(p, '[aria-label="Ora"]', "14:00");
  await setVal(p, '[aria-label="Avviso"]', "60");
  await click(p, '[data-section="event-form"] button.flex-1'); await wait(p, 300);
  let w = (await writes(p)).find((x) => x[0] === "add" && x[1].endsWith("personal_events"));
  const expAt = new Date(2099, 4, 4, 13, 0, 0, 0).getTime();
  check("impegno salvato col proprietario e l'avviso 1 ora prima", w && [w[2].owner, w[2].title, w[2].date, w[2].time, w[2].notifyBefore, w[2].notifyAt === expAt, w[2].pending], ["luca", "CALEFFI – ricontrollo finecorsa", "2099-05-04", "14:00", 60, true, true]);
  await p.close();

  console.log("\n== Note e promemoria ==");
  p = await open();
  await p.evaluate((db) => window.mountComponent("PersonalAreaModal", { me: "Luca", logs: [], events: [], notes: db.personal_notes.filter((e) => e.owner === "luca"), reminders: db.personal_reminders.filter((e) => e.owner === "luca"), contacts: db.personal_contacts, vans: [], vanItems: [], onClose() {}, initialPanel: "notes" }), DB);
  await wait(p);
  check("nota fissata in cima", await p.evaluate(() => [...document.querySelectorAll("[data-note]")].map((n) => n.getAttribute("data-note"))), ["n2", "n1"]);
  await p.evaluate(() => document.querySelectorAll('[data-note="n2"] input[type=checkbox]')[1].click()); await wait(p);
  w = (await writes(p)).find((x) => x[0] === "set" && x[1].endsWith("personal_notes/n2"));
  check("spunta di una voce salvata", w && w[2][0].items, [{ t: "Fune 10 mm", done: true }, { t: "Contattori", done: true }]);
  await click(p, '[data-action="add"]'); await wait(p);
  await setVal(p, '[aria-label="Titolo"]', "Misure CALEFFI");
  await setVal(p, '[aria-label="Testo"]', "Scartamento 12,40 m");
  await click(p, '[data-action="add-item"]'); await wait(p, 80);
  await setVal(p, '[aria-label="Voce 1"]', "Binario nord");
  await clickText(p, "Salva"); await wait(p, 300);
  w = (await writes(p)).find((x) => x[0] === "add" && x[1].endsWith("personal_notes"));
  check("nota nuova", w && [w[2].owner, w[2].title, w[2].text, w[2].items], ["luca", "Misure CALEFFI", "Scartamento 12,40 m", [{ t: "Binario nord", done: false }]]);
  await p.close();

  p = await open();
  await p.evaluate((db) => window.mountComponent("PersonalAreaModal", { me: "Luca", logs: [], events: [], notes: [], reminders: db.personal_reminders.filter((e) => e.owner === "luca"), contacts: db.personal_contacts, vans: [], vanItems: [], onClose() {}, initialPanel: "reminders" }), DB);
  await wait(p, 300);
  const rem = await text(p, '[data-section="area-reminders"]');
  check("promemoria aperto + 'Fatti: 1' + contatto con tasto chiama", [/Richiamare sig\. Drappo/.test(rem), /Fatti: 1/.test(rem), await p.evaluate(() => (document.querySelector('a[aria-label="Chiama Drappo"]') || {}).getAttribute && document.querySelector('a[aria-label="Chiama Drappo"]').getAttribute("href"))], [true, true, "tel:+393331234567"]);
  check("pulsante 'Attiva notifiche' (o stato) presente", /notifiche/i.test(rem), true);
  await shot(p, "03_promemoria");
  await p.evaluate(() => document.querySelector('[data-reminder="r1"] input').click()); await wait(p);
  w = (await writes(p)).find((x) => x[0] === "set" && x[1].endsWith("personal_reminders/r1"));
  check("segnato fatto: niente più avviso", w && [w[2][0].done, w[2][0].pending, w[2][0].notifyAt], [true, false, null]);
  await click(p, '[data-action="add"]'); await wait(p);
  await setVal(p, '[aria-label="Cosa ricordare"]', "Tagliando furgone");
  await setVal(p, '[aria-label="Giorno"]', "2099-10-26");
  await clickText(p, "Salva"); await wait(p, 300);
  w = (await writes(p)).find((x) => x[0] === "add" && x[1].endsWith("personal_reminders"));
  check("promemoria senza ora: avviso alle 8:00", w && [w[2].title, w[2].notify, w[2].notifyAt === new Date(2099, 9, 26, 8, 0).getTime(), w[2].pending], ["Tagliando furgone", true, true, true]);
  await p.close();

  console.log("\n== Magazzino del furgone ==");
  p = await open();
  await p.evaluate((db) => window.mountComponent("PersonalAreaModal", { me: "Luca", logs: [], events: [], notes: [], reminders: [], contacts: [], vans: db.vans, vanItems: db.van_items, onClose() {}, initialPanel: "van" }), DB);
  await wait(p);
  const van = await text(p, '[data-section="van"]');
  check("furgone condiviso: 'lo usi con Marco', 4 articoli, 2 sotto scorta", [/lo usi con Marco/.test(van), /4 articoli/.test(van), /2 articoli sotto la scorta minima/.test(van)], [true, true, true]);
  await shot(p, "04_furgone");
  await click(p, '[data-low]'); await wait(p);
  check("filtro 'Da riordinare'", await p.evaluate(() => [...document.querySelectorAll("[data-item]")].map((e) => e.getAttribute("data-item"))), ["i1", "i4"]);
  await click(p, '[data-item="i1"]'); await wait(p, 300);
  check("scheda articolo: quantità, movimento di Marco", [await text(p, "[data-qty]"), /Montato \(Marco\): CALEFFI · 2/.test(await text(p, '[data-section="moves"]'))], ["1", true]);
  await shot(p, "05_articolo");
  await click(p, '[aria-label="Uno in meno"]'); await wait(p);
  let ws = await writes(p);
  check("−1 a mano: quantità e movimento", [ws.some((x) => x[0] === "update" && x[1].endsWith("van_items/i1") && x[2].qty.__increment === -1), ws.some((x) => x[0] === "add" && x[1].endsWith("van_moves") && x[2].delta === -1 && x[2].kind === "manuale" && x[2].author === "Luca")], [true, true]);
  await click(p, '[data-action="refill"]'); await wait(p);
  await setVal(p, '[aria-label="Quantità"]', "5");
  await clickText(p, "Aggiungi"); await wait(p, 300);
  ws = await writes(p);
  check("Rifornito +5", ws.some((x) => x[0] === "update" && x[1].endsWith("van_items/i1") && x[2].qty.__increment === 5), true);
  await click(p, '[data-action="count"]'); await wait(p);
  await setVal(p, '[aria-label="Quantità"]', "3");
  await clickText(p, "Salva conteggio"); await wait(p, 300);
  ws = await writes(p);
  check("Conta: quantità esatta 3 + movimento inventario", [ws.some((x) => x[0] === "update" && x[1].endsWith("van_items/i1") && x[2].qty === 3), ws.some((x) => x[0] === "add" && x[1].endsWith("van_moves") && x[2].kind === "inventario" && x[2].counted === 3 && x[2].delta === 2)], [true, true]);
  await click(p, '[data-action="edit-item"]'); await wait(p);
  await setVal(p, '[aria-label="Scorta minima"]', "4");
  await click(p, '[data-section="item-form"] button.flex-1'); await wait(p, 300);
  ws = await writes(p);
  check("il tecnico cambia la scorta minima", ws.some((x) => x[0] === "update" && x[1].endsWith("van_items/i1") && x[2].min === 4 && x[2].name === "Contattore LC1D18 24V"), true);
  await click(p, '[aria-label="Indietro"]'); await wait(p);
  await click(p, '[data-action="new-item"]'); await wait(p);
  await setVal(p, '[aria-label="Nome del pezzo"]', "fusibili 10a");
  await click(p, '[data-section="item-form"] button.flex-1'); await wait(p);
  check("nome doppio: non salva", /C'è già un articolo/.test(await text(p, '[data-section="item-form"]')), true);
  await setVal(p, '[aria-label="Nome del pezzo"]', "Fungo emergenza TER");
  await setVal(p, '[aria-label="Categoria"]', "Pulsantiere");
  await setVal(p, '[aria-label="Quantità a bordo"]', "3");
  await setVal(p, '[aria-label="Scorta minima"]', "1");
  await setVal(p, '[aria-label="Altri nomi"]', "fungo ter");
  await click(p, '[data-section="item-form"] button.flex-1'); await wait(p, 300);
  ws = await writes(p);
  const ni = ws.find((x) => x[0] === "add" && x[1].endsWith("van_items"));
  check("articolo nuovo creato dal tecnico", ni && [ni[2].vanId, ni[2].name, ni[2].cat, ni[2].qty, ni[2].min, ni[2].words], ["v1", "Fungo emergenza TER", "Pulsantiere", 3, 1, "fungo ter"]);
  check("+ movimento di carico iniziale", ws.some((x) => x[0] === "add" && x[1].endsWith("van_moves") && x[2].kind === "carico" && x[2].delta === 3), true);
  await p.close();

  console.log("\n== Rapporto: tecnico CON furgone ==");
  const fillReport = async (p, tech, description) => {
    await p.evaluate(([db, tech]) => {
      try { localStorage.setItem("mora_tech_last_name", tech); } catch (e) {}
      window.mountComponent("NewEntryForm", { user: { uid: "u" }, customers: db.customers, technicians: db.technicians, machineTypes: db.machine_types, machines: db.machines, onSuccess: () => (window.__ok = true), isMobile: true, onTechUpdate() {}, layoutConfig: { themeColor: "blue", formSettings: { showMachineId: true, showMachineType: true, showCapacity: true }, formOrder: ["technician", "date", "ticketNumber", "customer", "machine", "capacity", "description", "photos", "custom"] }, allLogs: db.maintenance_logs, vans: db.vans, vanItems: db.van_items });
    }, [DB, tech]);
    await wait(p, 200);
    await p.evaluate((tech) => { const s = document.querySelector("select"); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, tech); s.dispatchEvent(new Event("change", { bubbles: true })); }, tech);
    const byLabel = (start) => p.evaluate((start) => { const l = [...document.querySelectorAll("label")].find((x) => x.textContent.trim().toLowerCase().startsWith(start.toLowerCase())); const el = l.parentElement.querySelector("input,textarea,select"); el.setAttribute("data-t", start); return `[data-t="${start}"]`; }, start);
    await setVal(p, await byLabel("Cliente"), "AMUT"); await wait(p, 60);
    await p.evaluate(() => { const b = [...document.querySelectorAll("button")].find((b) => b.textContent.trim().startsWith("6")); b && b.click(); }); await wait(p, 60);
    await setVal(p, await byLabel("Descrizione"), description); await wait(p, 80);
    // fune sostituita: dati non disponibili (per poter salvare)
    await p.evaluate(() => { const b = document.querySelector('[aria-label="Dati fune non disponibili ora"]'); if (b) b.click(); }); await wait(p, 60);
    if (await p.evaluate(() => !!document.querySelector('[aria-label="Motivo dati fune non disponibili"]'))) await setVal(p, '[aria-label="Motivo dati fune non disponibili"]', "in ufficio");
    await p.evaluate(() => document.querySelector("form").requestSubmit()); await wait(p, 700);
  };
  p = await open("Marco");
  await fillReport(p, "Marco", "Ricerca guasto: salita non funziona. Sostituito contattore salita e 2 fusibili 10A. Sostituita fune sollevamento 10 mm, 32 mt. Controllato finecorsa ok.");
  ws = await writes(p);
  check("rapporto salvato", !!ws.find((x) => (x[0] === "add" || x[0] === "set" || x[0] === "b.set") && /maintenance_logs/.test(x[1])) && (await p.evaluate(() => !!document.querySelector('[data-section="report-saved"]') || !!window.__ok)), true);
  const incs = ws.filter((x) => x[0] === "update" && x[1].includes("van_items/")).map((x) => [x[1].split("/").pop(), x[2].qty.__increment]);
  check("Marco usa il furgone di Luca: −1 contattore, −2 fusibili, fune NO, finecorsa NO", incs, [["i1", -1], ["i2", -2]]);
  const mv = ws.filter((x) => x[0] === "add" && x[1].endsWith("van_moves")).map((x) => [x[2].itemName, x[2].delta, x[2].kind, x[2].author, x[2].logId, x[2].note]);
  check("movimenti col riferimento al rapporto", mv, [["Contattore LC1D18 24V", -1, "rapporto", "Marco", "auto1", "AMUT · 6"], ["Fusibili 10A", -2, "rapporto", "Marco", "auto1", "AMUT · 6"]]);
  const ev = await p.evaluate(() => window.__vanEvents.map((e) => [e.van.id, e.used.map((u) => [u.item.id, u.qty]), e.ditta]));
  check("riquadro 'tolti in automatico' richiesto, con nota fune presa in ditta", ev, [["v1", [["i1", 1], ["i2", 2]], "Fune"]]);
  await p.close();

  console.log("\n== Rapporto: tecnico SENZA furgone (Ivano) ==");
  p = await open("Ivano");
  await fillReport(p, "Ivano", "Sostituito contattore salita e 2 fusibili 10A.");
  ws = await writes(p);
  check("rapporto salvato normalmente", !!ws.find((x) => (x[0] === "add" || x[0] === "set" || x[0] === "b.set") && /maintenance_logs/.test(x[1])), true);
  check("NESSUNA scrittura sul magazzino e nessun riquadro", [ws.filter((x) => /van_/.test(x[1])).length, await p.evaluate(() => window.__vanEvents.length)], [0, 0]);
  check("nessuna domanda sui pezzi nel modulo", /furgone|pezzi presi/i.test(await text(p)), false);
  await p.close();

  console.log("\n== Riquadro dopo il salvataggio ==");
  p = await open();
  await p.evaluate((db) => window.mountComponent("VanHost", { vanItems: db.van_items.map((i) => (i.id === "i1" ? { ...i, qty: 0 } : i.id === "i2" ? { ...i, qty: 10 } : i)) }), DB);
  await wait(p);
  await p.evaluate((db) => window.dispatchEvent(new CustomEvent("mora-van-used", { detail: { van: db.vans[0], used: [{ item: db.van_items[0], qty: 1 }, { item: db.van_items[1], qty: 2 }, { item: { id: "cv", vanId: "v1", name: "Cavo 8G1,5", unit: "m" }, qty: 0, unknown: true }], logId: "L9", author: "Luca", note: "AMUT · 6", ditta: "Fune" } })), DB);
  await wait(p);
  const sheet = await text(p, '[data-section="van-used"]');
  check("mostra pezzi, rimasti, da riordinare, metri non scritti, fune in ditta, chiusura automatica", [/Tolti in automatico dal Furgone di Luca/.test(sheet), /Rimasti 0 pz · da riordinare/.test(sheet), /Rimasti 10 pz/.test(sheet), /metri\? Non scritto/.test(sheet), /Fune: presa in ditta/.test(sheet), /Si chiude da solo tra 6 secondi/.test(sheet)], [true, true, true, true, true, true]);
  await shot(p, "06_scarico");
  await click(p, '[data-action="fix"]'); await wait(p);
  await click(p, '[aria-label="Uno in meno: Fusibili 10A"]');
  await setVal(p, '[aria-label="Usati: Cavo 8G1,5"]', "6");
  await setVal(p, '[aria-label="Aggiungi un altro pezzo"]', "i4");
  await clickText(p, "Aggiungi"); await wait(p);
  await shot(p, "07_correggi");
  await click(p, '[data-action="save-fix"]'); await wait(p, 300);
  ws = await writes(p);
  check("correzione: fusibili +1 (rimessi), cavo −6, finecorsa −1", ws.filter((x) => x[0] === "update").map((x) => [x[1].split("/").pop(), x[2].qty.__increment]), [["i2", 1], ["cv", -6], ["i4", -1]]);
  check("riquadro chiuso dopo la correzione", await p.evaluate(() => !document.querySelector('[data-section="van-used"]')), true);
  await p.evaluate((db) => window.dispatchEvent(new CustomEvent("mora-van-used", { detail: { van: db.vans[0], used: [{ item: db.van_items[1], qty: 1 }], logId: "L10", author: "Luca", note: "x" } })), DB);
  await wait(p, 6800);
  check("senza toccare si chiude da solo dopo 6 secondi", await p.evaluate(() => !document.querySelector('[data-section="van-used"]')), true);
  await p.close();

  console.log("\n== Admin: furgoni e permessi ==");
  p = await open();
  await p.evaluate((db) => window.mountComponent("VanAdmin", { vans: db.vans, vanItems: db.van_items, technicians: db.technicians, me: "Luca" }), DB);
  await wait(p);
  check("tecnici: Ivano Nessuno, Luca e Marco sul Furgone di Luca", await p.evaluate(() => [...document.querySelectorAll("[data-tech] select")].map((s) => [s.getAttribute("aria-label"), s.options[s.selectedIndex].text])), [["Furgone di Ivano", "Nessuno"], ["Furgone di Luca", "Furgone di Luca"], ["Furgone di Marco", "Furgone di Luca"]]);
  check("da riordinare: contattore e finecorsa", /Contattore LC1D18 24V[\s\S]*Finecorsa a leva/.test(await text(p, '[data-section="van-order"]')), true);
  await shot(p, "08_admin");
  await setVal(p, '[aria-label="Furgone di Marco"]', ""); await wait(p, 300);
  ws = await writes(p);
  check("Marco messo a 'Nessuno'", ws.filter((x) => x[0] === "update" && x[1].endsWith("vans/v1")).map((x) => x[2].users), [["luca"]]);
  await click(p, '[data-action="new-van"]'); await wait(p);
  await setVal(p, '[aria-label="Nome del furgone"]', "Ducato FX");
  await setVal(p, '[aria-label="Targa"]', "fx123ab");
  await click(p, '[data-section="van-form"] button.flex-1'); await wait(p, 300);
  ws = await writes(p);
  const nv = ws.find((x) => x[0] === "add" && x[1].endsWith("/vans"));
  check("nuovo furgone", nv && [nv[2].name, nv[2].plate, nv[2].users], ["Ducato FX", "FX123AB", []]);
  await click(p, '[data-van="v1"] button'); await wait(p, 200);
  check("l'admin apre il magazzino di ogni furgone", /Usato da Luca, Marco/.test(await text(p, '[data-section="van"]')), true);
  await p.close();

  console.log("\n== Admin: scheda Furgoni nella pagina Impostazioni ==");
  p = await open();
  await p.evaluate((db) => window.mountComponent("AdminPanel", { customers: db.customers, technicians: db.technicians, machines: db.machines, machineTypes: db.machine_types, isMobile: true, layoutConfig: { themeColor: "blue", formSettings: {}, dashboardOrder: [] }, onUpdateLayout() {}, onLogout() {}, allLogs: db.maintenance_logs, vans: db.vans, vanItems: db.van_items, currentTechName: "Luca" }), DB);
  await wait(p, 300);
  await click(p, '[data-admin-group="company"]'); await wait(p, 200);
  await clickText(p, "Furgoni"); await wait(p, 200);
  check("scheda Furgoni apre furgoni e permessi", !!(await p.evaluate(() => document.querySelector('[data-section="van-admin"]'))), true);
  await p.close();

  console.log("\nErrori di pagina:", errs.length ? errs : "nessuno");
  if (errs.length) f++;
  console.log(f ? `\n${f} PROBLEMI` : "\nTUTTO OK");
  await b.close();
})();
