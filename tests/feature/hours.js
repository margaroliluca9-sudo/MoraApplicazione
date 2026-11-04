// Le mie ore: calendario degli orari (spento di base, si accende da Impostazioni)
const path = require("path");
const [G, OUT, SHOTS] = process.argv.slice(2);
const { chromium } = require(path.join(G, "playwright"));
let f = 0;
const check = (l, a, e) => { const ok = JSON.stringify(a) === JSON.stringify(e); if (!ok) f++; console.log((ok ? "PASS " : "FAIL ") + l + (ok ? "" : `\n   atteso ${JSON.stringify(e)}\n   ottenuto ${JSON.stringify(a)}`)); };
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const now = new Date(); const y = now.getFullYear(), m = now.getMonth();
const day = (n) => iso(new Date(y, m, n));
const T = iso(now);
const DB = {
  technicians: [{ id: "t1", name: "Luca" }, { id: "t2", name: "Marco" }], machine_types: [], customers: [], machines: [], maintenance_logs: [],
  settings: [{ id: "layout" }], access_logs: [], ignored_conflicts: [], chat_messages: [], chat_reads: [], push_subscriptions: [], active_users: [],
  personal_events: [], personal_notes: [], personal_reminders: [], personal_contacts: [], vans: [], van_items: [], van_moves: [], home_prefs: [],
  personal_hours: [
    { id: "luca_" + day(1), owner: "luca", date: day(1), kind: "lavoro", minutes: 540, note: "AMUT guasto" },
    { id: "luca_" + day(2), owner: "luca", date: day(2), kind: "lavoro", minutes: 450, note: "" },
    { id: "luca_" + day(3), owner: "luca", date: day(3), kind: "ferie", minutes: 0, note: "" },
    { id: "luca_" + day(4), owner: "luca", date: day(4), kind: "permesso", minutes: 120, note: "visita" },
    { id: "luca_" + day(5), owner: "luca", date: day(5), kind: "malattia", minutes: 0, note: "" },
    { id: "marco_" + day(1), owner: "marco", date: day(1), kind: "lavoro", minutes: 900, note: "DI MARCO" },
  ].filter((h) => h.date !== T),
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript((db) => { window.__fakeDB = db; window.__liveDB = true; localStorage.setItem("mora_tech_last_name", "Luca"); localStorage.setItem("mora_notify_asked_v1", "1"); localStorage.setItem("mora_notify_install_tip", "1"); window.__shared = []; navigator.share = async (x) => { window.__shared.push(x.text); }; }, DB);
  const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("file://" + path.join(OUT, "index.html")); await p.evaluate(() => window.mountApp()); await p.waitForTimeout(3300);
  const q = (fn, a) => p.evaluate(fn, a);
  const click = (sel) => q((s) => { const e = document.querySelector(s); if (!e) throw new Error("manca " + s); e.click(); }, sel);
  const w = (ms = 400) => p.waitForTimeout(ms);
  const btn = (txt, scope = "body") => q(([t, sc]) => [...document.querySelector(sc).querySelectorAll("button")].find((x) => x.textContent.trim() === t).click(), [txt, scope]);
  const today = (n) => DB.personal_hours.length;
  await click('[data-home-tile="area"]'); await w();
  check("spento di base", await q(() => !document.querySelector('[data-area-tile="hours"]')), true);
  await click('[data-action="area-settings"]'); await w();
  await click('[data-switch="hours"]'); await w(200);
  await click('[aria-label="Indietro"]'); await w();
  const tile = await q(() => document.querySelector('[data-area-tile="hours"]').textContent.replace(/\s+/g, " ").trim());
  console.log("   riquadro:", tile);
  check("acceso: riquadro «Le mie ore»", /^Le mie ore/.test(tile), true);
  await click('[data-area-tile="hours"]'); await w();
  const ignoreToday = DB.personal_hours.length; // (se oggi è uno dei giorni 1-5 il dato è stato tolto)
  const sum = await q(() => Object.fromEntries([...document.querySelectorAll("[data-sum]")].map((x) => [x.getAttribute("data-sum"), x.textContent.trim()])));
  console.log("   riepilogo:", JSON.stringify(sum), "lavorate", await q(() => document.querySelector("[data-hours-worked]").textContent));
  const wd = now.getDay() >= 1 && now.getDay() <= 5;
  if (ignoreToday === 6 && wd) {
    check("oggi (lun–ven) conta da solo 8 h", await q(() => document.querySelector("[data-hours-today]").textContent), "8 h (normale)");
  }
  if (ignoreToday === 6) {
    const exp = wd ? "24 h 30" : "16 h 30";
    check("riepilogo: " + exp + " lavorate (oggi automatico), +1 h, -30 min, permesso 2 h, 1 ferie, 1 malattia (niente di Marco), +1 h, -30 min, permesso 2 h, 1 ferie, 1 malattia (niente di Marco)", [await q(() => document.querySelector("[data-hours-worked]").textContent), sum.extra, sum.less, sum.permesso, sum.ferie, sum.malattia], [exp, "1 h", "30 min", "2 h", "1 g", "1 g"]);
    check("caselle: 9→+1, 7½→-½, F, P 2, M", await q((d) => d.map((x) => document.querySelector(`[data-hours-day="${x}"] [data-cell-label]`).textContent), [day(1), day(2), day(3), day(4), day(5)]), ["+1", "-½", "F", "P 2", "M"]);
  }
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, "h1_calendario.png"), fullPage: false });
  // oggi: 8 h poi +30
  await click('[data-quick="std"]'); await w(500);
  check("«8 h»: oggi giornata normale", await q(() => document.querySelector("[data-hours-today]").textContent), "8 h");
  await click('[data-quick="+30"]'); await w(500);
  check("«+30 min»: oggi 8 h 30 (+30 min)", await q(() => document.querySelector("[data-hours-today]").textContent), "8 h 30 (+30 min)");
  const sv = await q(() => window.__writes.map((x) => JSON.parse(x)).filter((x) => x[0] === "set" && x[1].includes("personal_hours")).map((x) => [x[1].split("/").pop(), x[2][0].kind, x[2][0].minutes]).pop());
  check("salvato un solo documento per il giorno (luca_data)", sv, ["luca_" + T, "lavoro", 510]);
  // giorno con il modulo: ferie → permesso 3 h
  await click(`[data-hours-day="${T}"]`); await w(300);
  check("modulo del giorno: «30 min di straordinario»", await q(() => document.querySelector("[data-hours-delta]").textContent), "30 min di straordinario");
  await click('[data-kind="permesso"]'); await w(100);
  await click('[aria-label="Più 15 minuti"]'); await click('[aria-label="Più 15 minuti"]'); await click('[aria-label="Più 15 minuti"]'); await click('[aria-label="Più 15 minuti"]');
  check("permesso: 3 h", await q(() => document.querySelector('[data-hours-value="permesso"]').textContent), "3 h");
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, "h2_giorno.png") });
  await btn("Salva", '[data-section="hours-edit"]'); await w(500);
  check("oggi: permesso 3 h", await q(() => document.querySelector("[data-hours-today]").textContent), "permesso 3 h");
  await click(`[data-hours-day="${T}"]`); await w(300);
  await btn("Togli", '[data-section="hours-edit"]'); await w(500);
  check("Togli: oggi torna normale (lun–ven) o da segnare", await q(() => document.querySelector("[data-hours-today]").textContent), (now.getDay() >= 1 && now.getDay() <= 5) ? "8 h (normale)" : "da segnare");
  // orario normale 7 h 30
  await click('[aria-label="Orario normale meno 30 minuti"]'); await w(200);
  check("orario normale cambiato: 7 h 30", await q(() => document.querySelector("[data-hours-std]").textContent), "7 h 30");
  await click('[aria-label="Orario normale più 30 minuti"]'); await w(200);
  await q(() => { window.__writes.length = 0; }); await click('[data-switch="hours-reminder"]'); await w(400);
  const rw = await q(() => window.__writes.map((x) => JSON.parse(x)).filter((x) => x[1].includes("hours_reminders")).map((x) => [x[1].split("/").pop(), x[2][0].enabled, x[2][0].time, x[2][1]]));
  check("«Ricordamelo»: promemoria salvato (lun–ven alle 17:30)", rw, [["luca", true, "17:30", { merge: true }]]);
  check("si sceglie l'ora", await q(() => !!document.querySelector('[data-field="hours-reminder-time"]')), true);
  await click('[data-action="hours-share"]'); await w(300);
  check("«Manda»: si apre la scelta del periodo", await q(() => [...document.querySelectorAll("[data-period]")].map((x) => x.getAttribute("data-period"))), ["mese", "scorso", "settimana", "settscorsa", "anno", "scelta"]);
  await q(() => [...document.querySelectorAll('[data-section="hours-send"] button')].find((x) => x.textContent.trim() === "Testo").click()); await w(300);
  const txt = await q(() => window.__shared[0] || "");
  await q(() => document.querySelector('[data-section="hours-send"] [aria-label="Chiudi"]').click()); await w(200);
  console.log("   " + txt.replace(/\n/g, " | "));
  check("«Manda»: riepilogo con le ore lavorate", /^Ore dal .* – Luca\n/.test(txt) && /Ore lavorate: /.test(txt), true);
  await click('[aria-label="Mese prima"]'); await w(200);
  check("mese prima vuoto", await q(() => document.querySelector("[data-hours-worked]").textContent), "0 min");
  console.log("\nErrori di pagina:", errs.length ? errs : "nessuno"); if (errs.length) f++;
  console.log(f ? `\n${f} PROBLEMI` : "\nTUTTO OK"); await b.close();
})();
