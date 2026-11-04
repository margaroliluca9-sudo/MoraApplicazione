// "Tecnici online": chi è collegato + messaggi veloci (stesso sistema della chat)
const path = require("path");
const [G, OUT, SHOTS] = process.argv.slice(2);
const { chromium } = require(path.join(G, "playwright"));
let f = 0;
const check = (l, a, e) => { const ok = JSON.stringify(a) === JSON.stringify(e); if (!ok) f++; console.log((ok ? "PASS " : "FAIL ") + l + (ok ? "" : `\n   atteso ${JSON.stringify(e)}\n   ottenuto ${JSON.stringify(a)}`)); };
const NOWS = Math.floor(Date.now() / 1000);
const base = (layout = {}) => ({
  technicians: [{ id: "t1", name: "Luca" }, { id: "t2", name: "Marco" }, { id: "t3", name: "Ivano" }, { id: "t4", name: "Paolo" }],
  machine_types: [], customers: [], machines: [], maintenance_logs: [],
  settings: [{ id: "layout", ...layout }], access_logs: [], ignored_conflicts: [], push_subscriptions: [], chat_reads: [],
  active_users: [
    { id: "s1", technician: "Luca", device: "Mobile", lastActive: { seconds: NOWS - 10 } },
    { id: "s2", technician: "Marco", device: "Mobile", lastActive: { seconds: NOWS - 60 } },
    { id: "s3", technician: "Ivano", device: "PC", lastActive: { seconds: NOWS - 3600 } }, // non più online
  ],
  chat_messages: [
    { id: "m1", conv: "dm:luca|marco", text: "Sei ancora da AMUT?", author: "Marco", authorKey: "marco", at: Date.now() - 120000 },
    { id: "m2", conv: "dm:luca|paolo", text: "Domani ti porto il paranco", author: "Luca", authorKey: "luca", at: Date.now() - 86400000 },
    { id: "m3", conv: "group", text: "messaggio di gruppo", author: "Marco", authorKey: "marco", at: Date.now() - 1000 },
  ],
});
(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (db, me = "Luca", qs = "") => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on("pageerror", (e) => errs.push(e.message));
    await p.addInitScript(({ db, me }) => { window.__fakeDB = db; window.__liveDB = true; window.alert = () => {}; localStorage.setItem("mora_tech_last_name", me); window.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) }); }, { db, me });
    await p.goto("file://" + path.join(OUT, "index.html") + qs); await p.evaluate(() => window.mountApp()); await p.waitForTimeout(3300);
    return p;
  };
  const q = (p, fn) => p.evaluate(fn);
  const shot = (p, n) => SHOTS && p.screenshot({ path: path.join(SHOTS, n + ".png") });

  console.log("== Luca: chi è online + messaggi (chat in La mia area spenta) ==");
  let p = await open(base({ chatEnabled: false }));
  check("pillola: 2 tecnici online (Ivano è uscito da un'ora) + 1 messaggio da leggere", await q(p, () => [document.querySelector('[data-action="online-toggle"]').textContent.replace(/\s+/g, " ").trim()]), ["2 online1"]);
  await q(p, () => document.querySelector('[data-action="online-toggle"]').click()); await p.waitForTimeout(300);
  check("menu: Marco online con 'Scrivi' e 1 da leggere; Paolo nei messaggi recenti", await q(p, () => [...document.querySelectorAll("[data-online-user]")].map((x) => x.getAttribute("data-online-user") + ":" + (x.querySelector('[data-action="online-write"]') ? x.querySelector('[data-action="online-write"]').textContent.trim() : "-"))), ["marco:Scrivi1", "paolo:Scrivi"]);
  await shot(p, "o1_menu");
  await q(p, () => document.querySelector('[data-online-user="marco"] [data-action="online-write"]').click()); await p.waitForTimeout(400);
  check("conversazione con Marco: il suo messaggio (solo privati, non il gruppo)", await q(p, () => [...document.querySelectorAll("[data-online-msg]")].map((x) => x.firstChild.textContent)), ["Sei ancora da AMUT?"]);
  check("segnata come letta (pallino sparito)", await q(p, () => [!!window.__writes.find((w) => w.includes("chat_reads/dm:luca|marco__luca")), !document.querySelector("[data-online-badge]")]), [true, true]);
  await p.fill('[data-field="online-text"]', "Sì, finisco tra mezz'ora"); await q(p, () => document.querySelector('[data-action="online-send"]').click()); await p.waitForTimeout(500);
  const add = await q(p, () => window.__writes.map((w) => JSON.parse(w)).filter((w) => w[0] === "add" && w[1].endsWith("chat_messages")).map((w) => [w[2].conv, w[2].text, w[2].author, w[2].via]));
  check("messaggio salvato come privato Luca→Marco (stesso sistema della chat)", add, [["dm:luca|marco", "Sì, finisco tra mezz'ora", "Luca", "online"]]);
  check("compare nella conversazione", await q(p, () => [...document.querySelectorAll("[data-online-msg]")].map((x) => x.firstChild.textContent)), ["Sei ancora da AMUT?", "Sì, finisco tra mezz'ora"]);
  await shot(p, "o2_thread");
  await p.close();

  console.log("\n== Marco (non admin) vede chi è online ==");
  p = await open(base({ chatEnabled: false }), "Marco");
  await q(p, () => document.querySelector('[data-action="online-toggle"]').click()); await p.waitForTimeout(300);
  check("menu aperto anche per chi non è admin: vede Luca", await q(p, () => [...document.querySelectorAll("[data-online-user]")].map((x) => x.getAttribute("data-online-user"))), ["luca"]);
  await p.close();

  console.log("\n== Admin spegne i messaggi ==");
  p = await open(base({ onlineMessages: false }));
  check("niente pallino", await q(p, () => !document.querySelector("[data-online-badge]")), true);
  await q(p, () => document.querySelector('[data-action="online-toggle"]').click()); await p.waitForTimeout(300);
  check("si vede chi è online ma senza 'Scrivi'", await q(p, () => [document.querySelectorAll("[data-online-user]").length, document.querySelectorAll('[data-action="online-write"]').length, /spenti dall'admin/.test(document.querySelector('[data-section="online-menu"]').textContent)]), [1, 0, true]);
  await p.close();

  console.log("\n== Dalla notifica (?online=) si apre la conversazione ==");
  p = await open(base({}), "Luca", "?online=" + encodeURIComponent("dm:luca|marco"));
  check("aperta direttamente la conversazione con Marco", await q(p, () => [!!document.querySelector('[data-section="online-thread"]'), document.querySelector('[data-section="online-menu"]').textContent.includes("Marco")]), [true, true]);
  await p.close();

  console.log("\nErrori di pagina:", errs.length ? errs : "nessuno"); if (errs.length) f++;
  console.log(f ? `\n${f} PROBLEMI` : "\nTUTTO OK"); await b.close();
})();
