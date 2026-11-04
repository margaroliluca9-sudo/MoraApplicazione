const path = require("path");
const [G, OUT] = process.argv.slice(2);
const { chromium } = require(path.join(G, "playwright"));
let f = 0;
const check = (l, a, e) => { const ok = JSON.stringify(a) === JSON.stringify(e); if (!ok) f++; console.log((ok ? "PASS " : "FAIL ") + l + (ok ? "" : `\n   atteso ${JSON.stringify(e)}\n   ottenuto ${JSON.stringify(a)}`)); };
const DB = {
  technicians: [{ id: "t1", name: "Luca" }], machine_types: [{ id: "g", name: "Gru a ponte" }],
  customers: [{ id: "c1", name: "ROSSI SRL" }],
  machines: [{ id: "R_M1", matricola: "M1", customerName: "ROSSI SRL", type: "Gru a ponte", capacity: "2000 kg" }],
  maintenance_logs: [
    { id: "old", dateString: "1/3/2024", technician: "Luca", additionalTechnicians: [], customer: "ROSSI SRL", machineId: "M1", machineType: "Gru a ponte", capacity: "2000 kg", description: "Sostituita fune (vecchio rapporto senza dati)" },
    { id: "f1", dateString: "5/6/2025", technician: "Luca", additionalTechnicians: [], customer: "ROSSI SRL", machineId: "M1", machineType: "Gru a ponte", capacity: "2000 kg", description: "Sostituita fune", fune: { nonDisponibile: false, motivo: "", certificato: "CERT-77", diametro: 10, lunghezza: 32 } },
    { id: "c1", dateString: "7/7/2025", technician: "Luca", additionalTechnicians: [], customer: "ROSSI SRL", machineId: "M1", machineType: "Gru a ponte", capacity: "2000 kg", description: "Cambiata catena", catena: { nonDisponibile: true, motivo: "certificato in arrivo", certificato: "", diametro: null, lunghezza: null } },
  ],
};
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const open = async () => { const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on("pageerror", (e) => errs.push(e.message)); await p.addInitScript((db) => { window.__fakeDB = db; window.__alerts = []; window.alert = (m) => window.__alerts.push(String(m)); window.__printed = []; window.open = () => ({ document: { _h: "", write(h) { this._h += h; }, close() { window.__printed.push(this._h); } } }); try { localStorage.setItem("mora_tech_last_name", "Luca"); } catch (e) {} }, DB); await p.goto("file://" + path.join(OUT, "index.html")); return p; };
  const setText = (p, sel, v) => p.evaluate(([s, v]) => { const el = document.querySelector(s); const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, [sel, v]);
  const byLabel = (p, start) => p.evaluate((start) => { const l = [...document.querySelectorAll("label")].find((x) => x.textContent.trim().toLowerCase().startsWith(start.toLowerCase())); const el = l.parentElement.querySelector("input,textarea,select"); el.setAttribute("data-t", start); return `[data-t="${start}"]`; }, start);
  const writes = (p) => p.evaluate(() => window.__writes.map((w) => JSON.parse(w)));

  const DIR = process.argv[4];
  const mount = async () => { const p = await open(); await p.evaluate((db) => window.mountComponent("NewEntryForm", { user: { uid: "u" }, customers: db.customers, technicians: db.technicians, machineTypes: db.machine_types, machines: db.machines, onSuccess: () => {}, isMobile: true, onTechUpdate() {}, layoutConfig: { themeColor: "blue", formSettings: { showMachineId: true, showMachineType: true, showCapacity: true }, formOrder: ["technician", "date", "ticketNumber", "customer", "machine", "capacity", "description", "photos", "custom"] }, allLogs: db.maintenance_logs }), DB); await p.waitForTimeout(100);
    await setText(p, await byLabel(p, "Cliente"), "ROSSI SRL"); await p.waitForTimeout(50);
    await p.evaluate(() => { const b = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("M1")); b && b.click(); }); await p.waitForTimeout(50);
    await setText(p, await byLabel(p, "Descrizione"), "Sostituita fune"); await p.waitForTimeout(80);
    await setText(p, '[aria-label="Certificato fune"]', "c1"); await setText(p, '[aria-label="Lunghezza fune in metri"]', "20"); return p; };
  const save = async (p) => { await p.evaluate(() => document.querySelector("form").requestSubmit()); await p.waitForTimeout(400); const w = (await writes(p)).find((w) => ((w[0] === "add" && w[1].endsWith("maintenance_logs")) || (w[0] === "b.set" && /maintenance_logs\/[^/]+$/.test(w[1])))); return w && w[2].fune; };
  let p = await mount();
  await setText(p, await byLabel(p, "Descrizione"), "Sostituita fune e catena"); await p.waitForTimeout(80);
  check("niente elenco a tendina, niente grado e passo della catena", await p.evaluate(() => [!!document.querySelector('[data-rope-field="tipo"]'), !!document.querySelector('[data-rope-field="grado"]'), !!document.querySelector('[data-rope-field="passo"]'), document.querySelector('[aria-label="Tipo fune"]').placeholder]), [false, false, false, "Tipo fune (es. FZ636A12, Teci S10 ZN, o 6x36)"]);
  await setText(p, '[aria-label="Tipo fune"]', "FZ636A12"); await p.waitForTimeout(80);
  check("codice FAS: compare già compilato (fune, diametro, carico di rottura)", await p.evaluate(() => [document.querySelector("[data-rope-fas]").textContent, document.querySelector('[aria-label="Diametro fune in millimetri"]').value]), ["FAS FZ636AC · 6x36WS+IWRC · carico di rottura 100,8 kN (dal catalogo)", "12"]);
  await p.screenshot({ path: DIR + "/tipo_fune.png" });
  await p.close();
  p = await mount(); await setText(p, '[aria-label="Diametro fune in millimetri"]', "10"); await setText(p, '[aria-label="Tipo fune"]', "6x36"); await p.waitForTimeout(80);
  check("altra marca 6x36: costruzione riconosciuta", await p.evaluate(() => document.querySelector("[data-rope-cons]").textContent.trim()), "Costruzione 6×36 WS (altra marca)");
  let fu = await save(p); check("salvata con la costruzione", fu && [fu.costruzione, fu.fas || ""], ["6x36", ""]); await p.close();
  p = await mount(); await setText(p, '[aria-label="Diametro fune in millimetri"]', "10"); await setText(p, '[aria-label="Tipo fune"]', "Teci 4x39 speciale"); await p.waitForTimeout(80);
  fu = await save(p); check("tipo scritto a mano: si salva così", fu && fu.costruzione, "TECI 4X39 SPECIALE"); await p.close();
  check("nessun errore", errs, []);
  console.log(f ? f + " FALLITI" : "TUTTO OK"); await b.close();
})();
