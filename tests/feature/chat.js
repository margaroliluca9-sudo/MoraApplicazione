// Chat: riquadro col numero, gruppo + private, fumetti, letto da, fissato, foto, invio, notifiche, eliminazione.
const path = require("path");
const fs = require("fs");
const [G, OUT, SHOTS] = process.argv.slice(2);
const { chromium } = require(path.join(G, "playwright"));
let f = 0;
const check = (l, a, e) => { const ok = JSON.stringify(a) === JSON.stringify(e); if (!ok) f++; console.log((ok ? "PASS " : "FAIL ") + l + (ok ? "" : `\n   atteso ${JSON.stringify(e)}\n   ottenuto ${JSON.stringify(a)}`)); };
const N = Math.floor(Date.now() / 1000);
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==";
const DB = {
  technicians: [{ id: "t1", name: "Luca" }, { id: "t2", name: "Marco" }, { id: "t3", name: "Ivano" }, { id: "t4", name: "Ale" }],
  machine_types: [], customers: [], machines: [], maintenance_logs: [], settings: [{ id: "layout", chatEnabled: true }], active_users: [], access_logs: [], ignored_conflicts: [],
  chat_messages: [
    { id: "g1", conv: "group", author: "Marco", authorKey: "marco", text: "Buongiorno a tutti", createdAt: { seconds: N - 86400 - 3600 } },
    { id: "g2", conv: "group", author: "Luca", authorKey: "luca", text: "Domani servono due persone da CALEFFI", createdAt: { seconds: N - 1800 } },
    { id: "g3", conv: "group", author: "Ivano", authorKey: "ivano", text: "Vengo io", photoId: "p1", createdAt: { seconds: N - 600 } },
    { id: "g4", conv: "group", author: "Ale", authorKey: "ale", text: "Ferie: chiusi dal 24/12 al 6/1", pinned: true, createdAt: { seconds: N - 5 * 86400 } },
    { id: "d1", conv: "dm:luca|marco", author: "Marco", authorKey: "marco", text: "Mi passi il numero di AMUT?", createdAt: { seconds: N - 300 } },
    { id: "x1", conv: "dm:ivano|marco", author: "Marco", authorKey: "marco", text: "privato tra altri", createdAt: { seconds: N - 200 } },
  ],
  chat_photos: [{ id: "p1", conv: "group", data: PNG }],
  chat_reads: [
    { id: "group__luca", conv: "group", user: "luca", at: (N - 1800) * 1000 },
    { id: "group__marco", conv: "group", user: "marco", at: (N - 1000) * 1000 },
    { id: "group__ivano", conv: "group", user: "ivano", at: (N - 600) * 1000 },
  ],
  push_subscriptions: [
    { id: "s1", endpoint: "https://fcm.googleapis.com/fcm/send/marco", keys: { p256dh: "BXX", auth: "aa" }, technician: "Marco" },
    { id: "s2", endpoint: "https://fcm.googleapis.com/fcm/send/luca-altro", keys: { p256dh: "BYY", auth: "bb" }, technician: "Luca" },
    { id: "s3", endpoint: "https://web.push.apple.com/ivano", keys: { p256dh: "BZZ", auth: "cc" }, technician: "Ivano" },
  ],
};
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const newPage = async ({ url = "", me = "Luca" } = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(({ db, me }) => {
      window.__fakeDB = db; window.alert = () => {}; window.confirm = () => true;
      try { localStorage.setItem("mora_tech_last_name", me); } catch (e) {}
      window.__notify = [];
      window.fetch = async (u, o) => { if (String(u).includes("/api/notify")) { window.__notify.push(JSON.parse(o.body)); return { json: async () => ({ sent: 1, gone: [] }) }; } throw new Error("rete"); };
    }, { db: DB, me });
    await page.goto("file://" + path.join(OUT, "index.html") + url);
    await page.evaluate(() => window.mountApp());
    await page.waitForTimeout(3200);
    return page;
  };
  const writes = (p) => p.evaluate(() => window.__writes.map((w) => JSON.parse(w)));
  const setText = (p, v) => p.evaluate((v) => { const t = document.querySelector('textarea[aria-label="Testo del messaggio"]'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(t, v); t.dispatchEvent(new Event("input", { bubbles: true })); }, v);
  const click = (p, sel) => p.evaluate((s) => document.querySelector(s).click(), sel);

  console.log("== Home ==");
  let page = await newPage();
  const tile = await page.evaluate(() => { const t = document.querySelector('[data-tile="area"]'); return t && { badge: (t.querySelector("[data-badge]") || {}).textContent, text: t.textContent }; });
  check("riquadro La mia area con 2 nuovi (Ivano nel gruppo + Marco in privato)", tile && [tile.badge, /2 messaggi nuovi/.test(tile.text)], ["2", true]);
  check("nessun riquadro Bacheca", await page.evaluate(() => !document.querySelector('[data-tile="board"]')), true);

  console.log("\n== Elenco conversazioni ==");
  await click(page, '[data-tile="area"]'); await page.waitForTimeout(250); await click(page, '[data-area-tile="chat"]'); await page.waitForTimeout(300);
  const convs = await page.evaluate(() => [...document.querySelectorAll("[data-conv]")].map((e) => [e.getAttribute("data-conv"), (e.querySelector("[data-conv-unread]") || {}).textContent || ""]));
  check("gruppo in cima, poi Marco (scritto di recente), poi gli altri; niente privata tra altri", convs.map((c) => c[0]), ["group", "dm:luca|marco", "dm:ale|luca", "dm:ivano|luca"]);
  check("numero da leggere per conversazione", convs.map((c) => c[1]), ["1", "1", "", ""]);
  await page.screenshot({ path: path.join(SHOTS, "chat_list.png") });

  console.log("\n== Gruppo ==");
  await click(page, '[data-conv="group"]'); await page.waitForTimeout(400);
  check("titolo", await page.evaluate(() => document.querySelector("[data-chat-title]").textContent), "Gruppo tecnici");
  check("fumetti in ordine di tempo, i miei a destra", await page.evaluate(() => [...document.querySelectorAll("[data-chat-msg]")].map((e) => e.getAttribute("data-chat-msg") + e.getAttribute("data-mine"))), ["g40", "g10", "g21", "g30"]);
  check("messaggio fissato in alto", await page.evaluate(() => document.querySelector('[data-section="chat-pinned"]').textContent.includes("Ferie: chiusi dal 24/12 al 6/1")), true);
  check("'Letto da' sotto il mio messaggio", await page.evaluate(() => document.querySelector('[data-chat-msg="g2"] [data-read]').textContent), "✓✓ Letto da Marco, Ivano");
  await page.waitForTimeout(400);
  check("foto caricata nel fumetto", await page.evaluate(() => !!document.querySelector('[data-chat-msg="g3"] img[alt="Foto"]')), true);
  const rd = (await writes(page)).find((w) => w[0] === "set" && w[1].endsWith("chat_reads/group__luca"));
  check("aprendo il gruppo segno 'letto' fino all'ultimo messaggio", rd && [rd[2][0].conv, rd[2][0].user, rd[2][0].at >= (N - 600) * 1000], ["group", "luca", true]);
  await page.screenshot({ path: path.join(SHOTS, "chat_group.png") });

  console.log("\n== Invio nel gruppo ==");
  await setText(page, "Arrivo alle 8");
  await click(page, '[aria-label="Invia"]'); await page.waitForTimeout(400);
  let add = (await writes(page)).filter((w) => w[0] === "add" && w[1].endsWith("chat_messages")).pop();
  check("messaggio salvato", add && [add[2].conv, add[2].text, add[2].author, add[2].authorKey, add[2].photoId, add[2].createdAt], ["group", "Arrivo alle 8", "Luca", "luca", null, "TS"]);
  let n = await page.evaluate(() => window.__notify.pop());
  check("notifica a Marco e Ivano (non a me, non al mio altro telefono)", n && n.subscriptions.map((s) => s.endpoint), ["https://fcm.googleapis.com/fcm/send/marco", "https://web.push.apple.com/ivano"]);
  check("titolo e apertura della notifica", n && [n.title, n.text, n.url], ["Gruppo tecnici · Luca", "Arrivo alle 8", "/?chat=group"]);
  check("casella svuotata", await page.evaluate(() => document.querySelector('textarea[aria-label="Testo del messaggio"]').value), "");
  fs.writeFileSync(require("path").join(require("os").tmpdir(),"px.png"), Buffer.from(PNG.split(",")[1], "base64"));
  await page.setInputFiles('input[aria-label="Scegli foto"]', require("path").join(require("os").tmpdir(),"px.png")); await page.waitForTimeout(400);
  await click(page, '[aria-label="Invia"]'); await page.waitForTimeout(400);
  const w = await writes(page);
  const ph = w.find((x) => x[0] === "add" && x[1].endsWith("chat_photos"));
  add = w.filter((x) => x[0] === "add" && x[1].endsWith("chat_messages")).pop();
  check("foto salvata a parte e collegata al messaggio", [!!ph && /^data:image\/jpeg/.test(ph[2].data), add[2].photoId, add[2].text], [true, "new-id", ""]);
  check("notifica: 'Ha mandato una foto'", (await page.evaluate(() => window.__notify.pop())).text, "Ha mandato una foto");

  console.log("\n== Azioni sui messaggi ==");
  await click(page, '[data-chat-msg="g3"] [role="button"]'); await page.waitForTimeout(150);
  check("Luca è admin: può eliminare anche messaggi degli altri", await page.evaluate(() => [...document.querySelectorAll("[data-msg-actions] button")].map((b) => b.textContent.trim())), ["Fissa in alto", "Elimina"]);
  await page.evaluate(() => [...document.querySelectorAll("[data-msg-actions] button")].find((b) => b.textContent.includes("Fissa")).click()); await page.waitForTimeout(150);
  await click(page, '[aria-label="Togli il messaggio fissato"]'); await page.waitForTimeout(150);
  const w2 = await writes(page);
  check("fissa e togli dall'alto", [w2.some((x) => x[0] === "update" && x[1].endsWith("/g3") && x[2].pinned === true), w2.some((x) => x[0] === "update" && x[1].endsWith("/g4") && x[2].pinned === false)], [true, true]);
  await click(page, '[data-chat-msg="g3"] [role="button"]'); await page.waitForTimeout(150);
  await page.evaluate(() => [...document.querySelectorAll("[data-msg-actions] button")].find((b) => b.textContent.includes("Elimina")).click()); await page.waitForTimeout(200);
  const w3 = await writes(page);
  check("eliminato il messaggio e la sua foto", [w3.some((x) => x[0] === "delete" && x[1].endsWith("chat_messages/g3")), w3.some((x) => x[0] === "delete" && x[1].endsWith("chat_photos/p1"))], [true, true]);

  console.log("\n== Chat privata ==");
  await click(page, '[aria-label="Indietro"]'); await page.waitForTimeout(200);
  await click(page, '[data-conv="dm:luca|marco"]'); await page.waitForTimeout(300);
  check("titolo = il collega, 'Chat privata'", await page.evaluate(() => document.querySelector('[data-section="chat"]').textContent.includes("Chat privata") && document.querySelector("[data-chat-title]").textContent), "Marco");
  check("si vedono solo i messaggi tra noi due", await page.evaluate(() => [...document.querySelectorAll("[data-chat-msg]")].map((e) => e.getAttribute("data-chat-msg"))), ["d1"]);
  await setText(page, "Te lo mando subito"); await click(page, '[aria-label="Invia"]'); await page.waitForTimeout(400);
  n = await page.evaluate(() => window.__notify.pop());
  check("notifica SOLO a Marco", n && [n.subscriptions.map((s) => s.endpoint), n.title, n.url], [["https://fcm.googleapis.com/fcm/send/marco"], "Luca (privato)", "/?chat=dm%3Aluca%7Cmarco"]);
  await page.screenshot({ path: path.join(SHOTS, "chat_dm.png") });
  await page.context().close();

  console.log("\n== Tecnico non admin ==");
  page = await newPage({ me: "Ivano" });
  await click(page, '[data-tile="area"]'); await page.waitForTimeout(250); await click(page, '[data-area-tile="chat"]'); await page.waitForTimeout(200);
  check("Ivano non vede la privata Luca-Marco, vede la sua con Marco", await page.evaluate(() => [...document.querySelectorAll("[data-conv]")].map((e) => e.getAttribute("data-conv")).filter((c) => c.includes("marco"))), ["dm:ivano|marco"]);
  await click(page, '[data-conv="group"]'); await page.waitForTimeout(300);
  await click(page, '[data-chat-msg="g2"] [role="button"]'); await page.waitForTimeout(150);
  check("sul messaggio di un altro: niente 'Elimina'", await page.evaluate(() => [...document.querySelectorAll("[data-msg-actions] button")].map((b) => b.textContent.trim())), ["Fissa in alto"]);
  await click(page, '[data-chat-msg="g3"] [role="button"]'); await page.waitForTimeout(150);
  check("sul proprio messaggio: 'Elimina' c'è", await page.evaluate(() => [...document.querySelectorAll("[data-msg-actions] button")].map((b) => b.textContent.trim())), ["Fissa in alto", "Modifica", "Elimina"]);
  await page.context().close();

  console.log("\n== Dalla notifica ==");
  page = await newPage({ url: "?chat=dm%3Aluca%7Cmarco" });
  check("si apre direttamente la chat privata con Marco", await page.evaluate(() => (document.querySelector("[data-chat-title]") || {}).textContent), "Marco");
  await page.context().close();
  page = await newPage({ url: "?chat=dm%3Aivano%7Cmarco" });
  check("link a una privata non mia: apre l'elenco, non la conversazione", await page.evaluate(() => [!!document.querySelector('[data-section="chat-list"]'), (document.querySelector("[data-chat-title]") || {}).textContent]), [true, "Chat"]);
  await page.context().close();

  check("nessun errore JS", errors, []);
  await browser.close();
  console.log(f ? f + " FALLITI" : "TUTTO OK"); process.exit(f ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(3); });
