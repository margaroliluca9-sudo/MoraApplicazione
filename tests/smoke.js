// CONTROLLO AUTOMATICO PRIMA DI PUBBLICARE (GitHub Actions, vedi .github/workflows/check.yml).
// Apre l'app con un database FINTO (clienti inventati) e passa le schermate principali:
// se qualcosa si rompe (errore JavaScript, schermata «Qualcosa è andato storto», pagina che non si apre)
// il controllo fallisce e la nuova versione NON viene pubblicata (vedi scripts/vercel-wait-check.js).
// uso: node tests/smoke.js <node_modules con playwright> <cartella della pagina di prova>
const path = require("path");
const { DB } = require("./fakedb");
const [G, OUT] = process.argv.slice(2);
const { chromium } = require(path.join(G, "playwright"));

let fails = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "OK  " : "NO  "} ${label}${ok ? "" : `\n      atteso ${JSON.stringify(want)}\n      trovato ${JSON.stringify(got)}`}`);
};

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const open = async ({ width = 390, height = 844, query = "", dark = false, name = "Luca" } = {}) => {
    const p = await browser.newPage({ viewport: { width, height } });
    p.on("pageerror", (e) => errors.push(`${width}px: ${e.message}`));
    await p.addInitScript(
      ([db, dark, name]) => {
        window.__fakeDB = db;
        window.__liveDB = true;
        localStorage.setItem("mora_tech_last_name", name);
        localStorage.setItem("mora_notify_asked_v1", "1");
        localStorage.setItem("mora_notify_install_tip", "1");
        localStorage.setItem("mora_hero_hint", "9");
        if (dark) localStorage.setItem("mora_theme", "dark");
        window.alert = () => {};
        window.confirm = () => true;
      },
      [DB(), dark, name]
    );
    await p.goto("file://" + path.join(OUT, "index.html") + query);
    await p.evaluate(() => window.mountApp());
    await p.waitForTimeout(3500);
    return p;
  };
  const wait = (p, ms = 700) => p.waitForTimeout(ms);
  const has = (p, sel) => p.evaluate((s) => !!document.querySelector(s), sel);
  const clickSel = (p, sel) => p.evaluate((s) => document.querySelector(s).click(), sel);
  const clickText = (p, re) => p.evaluate((src) => { const r = new RegExp(src, "i"); const b = [...document.querySelectorAll("button, a")].find((x) => r.test((x.textContent || "").trim())); if (!b) throw new Error("manca il pulsante " + src); b.click(); }, re.source);
  const noCrash = (p) => p.evaluate(() => !document.querySelector("[data-error-screen]") && document.body.innerText.length > 50);
  const home = (p) => p.evaluate(() => window.dispatchEvent(new CustomEvent("mora-go-home")));

  // --- telefono, tema chiaro: tutte le pagine principali ---
  let p = await open();
  check("Home si apre", await has(p, '[data-home-tile="new"]'), true);
  for (const [tile, sel] of [["new", '[data-section="report-progress"], textarea'], ["history", '[data-section="history-cards"]'], ["explore", '[data-section="explore-switch"]']]) {
    await clickSel(p, `[data-home-tile="${tile}"]`);
    await wait(p, 900);
    check(`pagina «${tile}» si apre senza errori`, [await has(p, sel), await noCrash(p)], [true, true]);
    await home(p);
    await wait(p, 500);
  }
  // ricerca che perdona gli errori
  await p.evaluate(() => { const el = document.querySelector('[data-section="home-search"] input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "biachi"); el.dispatchEvent(new Event("input", { bubbles: true })); });
  await wait(p);
  check("ricerca «biachi» trova Bianchi Lamiere", await p.evaluate(() => /BIANCHI LAMIERE/i.test(document.body.innerText)), true);
  await p.evaluate(() => { const el = document.querySelector('[data-section="home-search"] input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ""); el.dispatchEvent(new Event("input", { bubbles: true })); });
  // La mia area e i suoi riquadri
  await clickSel(p, '[data-home-tile="area"]');
  await wait(p);
  const tiles = await p.evaluate(() => [...document.querySelectorAll("[data-area-tile]")].map((t) => t.getAttribute("data-area-tile")));
  check("La mia area: riquadri presenti", tiles.length > 3, true);
  for (const t of tiles) {
    await clickSel(p, `[data-area-tile="${t}"]`);
    await wait(p, 600);
    check(`La mia area › ${t}`, await noCrash(p), true);
    await p.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /indietro|torna/i.test(x.getAttribute("aria-label") || "")); if (b) b.click(); });
    await wait(p, 400);
  }
  await p.evaluate(() => { const b = document.querySelector('[aria-label="Chiudi"]'); if (b) b.click(); });
  await wait(p, 400);
  // Guida
  await clickSel(p, '[data-action="open-guide"]');
  await wait(p, 1500);
  check("Guida si apre", await has(p, '[data-section="guide"]'), true);
  await p.close();

  // --- Ufficio e Area admin (computer) ---
  p = await open({ width: 1100, height: 900 });
  await clickText(p, /^ufficio/);
  await wait(p, 1500);
  check("Ufficio: grafici", await has(p, '[data-section="office-charts"]'), true);
  await home(p);
  await wait(p, 500);
  await clickText(p, /^(impostazioni|admin)/);
  await wait(p, 1500);
  const tabs = await p.evaluate(() => [...document.querySelectorAll('[data-section="admin-tabs"] button')].map((b) => b.textContent.trim()));
  check("Area admin: schede", tabs.length >= 9, true);
  for (const t of tabs) {
    await p.evaluate((t) => [...document.querySelectorAll('[data-section="admin-tabs"] button')].find((b) => b.textContent.trim() === t).click(), t);
    await wait(p, 800);
    check(`Admin › ${t}`, await noCrash(p), true);
  }
  await p.close();

  // --- schermo TV ---
  p = await open({ width: 1920, height: 1080, query: "?tv=1" });
  check("Schermo TV (?tv=1)", await has(p, '[data-section="tv-screen"]'), true);
  await p.close();

  // --- tema scuro + gioco ---
  p = await open({ dark: true });
  const hero = await p.evaluate(() => { const r = document.querySelector('[data-section="home-hero"]').getBoundingClientRect(); return { x: r.x + r.width * 0.8, y: r.y + r.height * 0.3 }; });
  for (let i = 0; i < 5; i++) {
    await p.mouse.click(hero.x, hero.y);
    await wait(p, 110);
  }
  await wait(p, 1500);
  check("gioco: si apre", await has(p, "[data-game-intro]"), true);
  await clickSel(p, '[data-action="game-start"]');
  await wait(p, 1500);
  check("gioco: parte dal livello 1", await p.evaluate(() => !!document.querySelector("[data-game-banner]") && /Livello 1/.test(document.querySelector("[data-game-banner]").textContent)), true);
  await p.close();

  check("nessun errore JavaScript", errors, []);
  await browser.close();
  console.log(fails ? `\n${fails} CONTROLLI NON PASSATI: la versione non va pubblicata.` : "\nTUTTO OK: si può pubblicare.");
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error("Il controllo si è fermato:", e && e.message);
  process.exit(1);
});
