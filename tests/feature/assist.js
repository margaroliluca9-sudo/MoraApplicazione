const path = require("path");
const [G, OUT, SHOTS] = process.argv.slice(2);
const { chromium } = require(path.join(G, "playwright"));
let f = 0;
const check = (l, a, e) => { const ok = JSON.stringify(a) === JSON.stringify(e); if (!ok) f++; console.log((ok ? "PASS " : "FAIL ") + l + (ok ? "" : `\n   atteso ${JSON.stringify(e)}\n   ottenuto ${JSON.stringify(a)}`)); };
const ago = (d) => { const x = new Date(Date.now() - d * 86400000); return `${x.getDate()}/${x.getMonth() + 1}/${x.getFullYear()}`; };
const base = { additionalTechnicians: [], customer: "ROSSI SRL", machineId: "M-100", machineType: "Gru a ponte", capacity: "2000 kg" };
const DB = {
  technicians: [{ id: "t1", name: "Luca" }, { id: "t2", name: "Marco" }], machine_types: [{ id: "g", name: "Gru a ponte" }],
  customers: [{ id: "c1", name: "ROSSI SRL" }, { id: "c2", name: "BIANCHI SPA" }],
  machines: [
    { id: "R_M100", matricola: "M-100", customerName: "ROSSI SRL", type: "Gru a ponte", capacity: "2000 kg" },
    { id: "B_X5", matricola: "X-5", customerName: "BIANCHI SPA", type: "Gru a bandiera", capacity: "500 kg" },
  ],
  maintenance_logs: [
    { ...base, id: "l4", dateString: ago(10), technician: "Marco", description: "Freno ancora rumoroso, regolato. Finecorsa salita da ricontrollare." },
    { ...base, id: "l3", dateString: ago(40), technician: "Luca", description: "Freno usurato, sostituiti ferodi. Pulsantiera da sostituire, in attesa ricambi." },
    { ...base, id: "l2", dateString: ago(300), technician: "Luca", description: "Fune da sostituire. Si consiglia revisione a terra del riduttore." },
    { ...base, id: "l1", dateString: ago(200), technician: "Marco", description: "Sostituita fune.", fune: { certificato: "C-9", diametro: 10, lunghezza: 30 } },
    { ...base, id: "l0", dateString: "4/3/2022", technician: "Luca", description: "Controllo generale ok." },
    { ...base, id: "b1", customer: "BIANCHI SPA", machineId: "X-5", dateString: ago(5), technician: "Luca", description: "Gancio da sostituire." },
  ],
};
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const open = async (w = 390) => { const p = await b.newPage({ viewport: { width: w, height: 1100 }, deviceScaleFactor: 2 }); p.on("pageerror", (e) => errs.push(e.message)); await p.addInitScript((db) => { window.__fakeDB = db; window.__alerts = []; window.alert = (m) => window.__alerts.push(String(m)); try { localStorage.setItem("mora_tech_last_name", "Luca"); } catch (e) {} }, DB); await p.goto("file://" + path.join(OUT, "index.html")); return p; };
  const setText = (p, sel, v) => p.evaluate(([s, v]) => { const el = document.querySelector(s); const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, [sel, v]);
  const byLabel = (p, start) => p.evaluate((start) => { const l = [...document.querySelectorAll("label")].find((x) => x.textContent.trim().toLowerCase().startsWith(start.toLowerCase())); const el = l.parentElement.querySelector("input,textarea,select"); el.setAttribute("data-t", start); return `[data-t="${start}"]`; }, start);
  const txt = (p, sel) => p.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.textContent.replace(/\s+/g, " ").trim()), sel);
  const mountForm = (p) => p.evaluate((db) => window.mountComponent("NewEntryForm", { user: { uid: "u" }, customers: db.customers, technicians: db.technicians, machineTypes: db.machine_types, machines: db.machines, onSuccess() {}, isMobile: true, onTechUpdate() {}, layoutConfig: { themeColor: "blue", formSettings: { showMachineId: true, showMachineType: true, showCapacity: true }, formOrder: ["technician", "date", "ticketNumber", "customer", "machine", "capacity", "description", "photos", "custom"] }, allLogs: db.maintenance_logs }), DB);

  console.log("== Nuovo rapporto ==");
  let p = await open();
  await mountForm(p); await p.waitForTimeout(100);
  check("modulo vuoto: nessun avviso", await p.evaluate(() => !document.querySelector('[data-section="assistant"]')), true);
  await setText(p, await byLabel(p, "Cliente"), "ROSSI SRL"); await p.waitForTimeout(50);
  await p.evaluate(() => { const b = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("M-100")); b && b.click(); }); await p.waitForTimeout(100);
  check("niente più riga 'N interventi dal…'", await p.evaluate(() => !document.querySelector('[data-assistant="summary"]') && !/interventi dal/.test(document.body.textContent)), true);
  check("guasto ripetuto: freno 2 volte in 2 mesi", (await txt(p, '[data-assistant="repeated"]')).map((t) => /freno in 2 interventi/.test(t)), [true]);
  const items = await txt(p, "[data-pending-item]");
  check("L'ultima volta: finecorsa, pulsantiera, riduttore (la fune è già stata fatta)", [items.length, /Finecorsa salita da ricontrollare/.test(items[0]), /Pulsantiera da sostituire/.test(items[1]), /riduttore/.test(items[2]), items.some((t) => /Fune da sostituire/.test(t))], [3, true, true, true, false]);
  check("data e tecnico nella riga", /\(Marco\):/.test(items[0]), true);
  check("il pannello sta subito sotto la gru (prima della descrizione)", await p.evaluate(() => { const a = document.querySelector('[data-section="assistant"]'); const d = [...document.querySelectorAll("label")].find((x) => /^descrizione/i.test(x.textContent.trim())); return !!(a.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING); }), true);
  await p.screenshot({ path: path.join(SHOTS, "assist_form.png"), fullPage: false, clip: await p.evaluate(() => { const a = document.querySelector('[data-section="assistant"]').getBoundingClientRect(); return { x: 0, y: Math.max(0, a.top + scrollY - 260), width: 390, height: a.height + 300 }; }) });

  console.log("\n== Matricola scritta diversa ==");
  const mat = await p.evaluate(() => { const l = [...document.querySelectorAll("label")].find((x) => /matricola/i.test(x.textContent)); const el = l.parentElement.querySelector("input"); el.setAttribute("data-t", "mat"); return '[data-t="mat"]'; });
  await setText(p, mat, "m 100"); await p.waitForTimeout(100);
  check("anche l'elenco a tendina trova M-100 scrivendo 'm 100'", await p.evaluate(() => [...document.querySelectorAll("li")].some((li) => li.textContent.includes("M-100"))), true);
  await p.evaluate((s) => document.querySelector(s).blur(), mat); await p.waitForTimeout(350);
  check("'m 100' per ROSSI: propone M-100", (await txt(p, '[data-section="same-matricola"]')).map((t) => /Usa M-100/.test(t)), [true]);
  check("con matricola diversa il pannello sparisce (gru 'nuova')", await p.evaluate(() => !document.querySelector('[data-section="assistant"]')), true);
  await p.screenshot({ path: path.join(SHOTS, "assist_mat.png"), clip: await p.evaluate(() => { const a = document.querySelector('[data-section="same-matricola"]').getBoundingClientRect(); return { x: 0, y: Math.max(0, a.top + scrollY - 160), width: 390, height: a.height + 200 }; }) });
  await p.evaluate(() => [...document.querySelectorAll('[data-section="same-matricola"] button')][0].click()); await p.waitForTimeout(100);
  check("'Usa M-100': matricola corretta, banner sparito, avvisi tornati", [await p.evaluate((s) => document.querySelector(s).value, mat), await p.evaluate(() => !document.querySelector('[data-section="same-matricola"]')), await p.evaluate(() => !!document.querySelector('[data-section="assistant"]'))], ["M-100", true, true]);
  await setText(p, mat, "x5"); await p.waitForTimeout(100);
  check("'x5' per ROSSI: nessuna proposta (X-5 è di un altro cliente)", await p.evaluate(() => !document.querySelector('[data-section="same-matricola"]')), true);
  await p.close();

  console.log("\n== Storico gru ==");
  p = await open(800);
  await p.evaluate((db) => window.mountComponent("MachineHistoryModal", { machine: db.machines[0], allLogs: db.maintenance_logs.filter((l) => l.customer === "ROSSI SRL"), onClose() {}, onOpenCustomer() {}, onOpenPhotos() {}, themeColor: "blue" }), DB);
  await p.waitForTimeout(150);
  check("nello storico: niente riassunto, guasto ripetuto, 3 cose in sospeso", [(await txt(p, '[data-assistant="summary"]')).length, (await txt(p, '[data-assistant="repeated"]')).length, (await txt(p, "[data-pending-item]")).length], [0, 1, 3]);
  await p.screenshot({ path: path.join(SHOTS, "assist_history.png") });
  await p.close();

  p = await open(800);
  await p.evaluate((db) => window.mountComponent("MachineHistoryModal", { machine: db.machines[1], allLogs: db.maintenance_logs, onClose() {}, onOpenCustomer() {}, onOpenPhotos() {}, themeColor: "blue" }), DB);
  await p.waitForTimeout(150);
  check("gru di un altro cliente: vede solo i suoi (gancio)", [(await txt(p, "[data-pending-item]")).length, /Gancio/.test((await txt(p, "[data-pending-item]"))[0]), (await txt(p, '[data-assistant="repeated"]')).length], [1, true, 0]);
  await p.close();

  check("nessun errore JS", errs, []);
  await b.close();
  console.log(f ? f + " FALLITI" : "TUTTO OK"); process.exit(f ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(3); });
