const path=require("path");const [G,OUT,SH]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let f=0;const check=(l,a,e)=>{const ok=JSON.stringify(a)===JSON.stringify(e);if(!ok)f++;console.log((ok?"PASS ":"FAIL ")+l+(ok?"":"\n   atteso "+JSON.stringify(e)+"\n   ottenuto "+JSON.stringify(a)));};
const DB={technicians:[{id:"t1",name:"Luca"}],machine_types:[],machines:[],customers:[],maintenance_logs:[],settings:[{id:"layout",appTitle:"Assistenza Mora",themeColor:"blue"}]};
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript((db)=>{window.__fakeDB=db;window.__liveDB=true;localStorage.setItem("mora_tech_last_name","Luca");localStorage.setItem("mora_notify_asked_v1","1");localStorage.setItem("mora_notify_install_tip","1");localStorage.setItem("mora_hero_hint","9");},DB);
await p.goto("file://"+path.join(OUT,"index.html"));await p.evaluate(()=>window.mountApp());await p.waitForTimeout(3300);
await p.evaluate(()=>[...document.querySelectorAll('[data-section="bottom-nav"] button')].find(b=>/Admin/.test(b.textContent)).click());await p.waitForTimeout(800);
await p.evaluate(()=>document.querySelector('[data-admin-group="company"]').click());await p.waitForTimeout(300);
await p.evaluate(()=>[...document.querySelectorAll('[data-section="admin-tabs"] button')].find(b=>/Design/.test(b.textContent)).click());await p.waitForTimeout(600);
check("Design: nome, colori, galleria",await p.evaluate(()=>[!!document.querySelector("[data-app-name]"),document.querySelectorAll("[data-theme-color]").length,document.querySelectorAll("[data-season-card]").length]),[true,10,9]);
if(SH){await p.evaluate(()=>document.querySelector('[data-section="app-name"]').scrollIntoView({block:"start"}));await p.screenshot({path:SH+"/design_1.png"});await p.evaluate(()=>document.querySelector('[data-section="season-gallery"]').scrollIntoView({block:"start"}));await p.screenshot({path:SH+"/design_2.png"});}
// nome
await p.evaluate(()=>{const el=document.querySelector("[data-app-name]");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,"Mora Gru");el.dispatchEvent(new Event("input",{bubbles:true}));window.__writes.length=0;});
await p.evaluate(()=>document.querySelector('[data-action="app-name-save"]').click());await p.waitForTimeout(400);
let w=await p.evaluate(()=>window.__writes.map(x=>JSON.parse(x)));check("nome salvato",w.some(x=>/settings\/layout/.test(x[1])&&JSON.stringify(x[2]).includes('"appTitle":"Mora Gru"')),true);
check("nome in alto",await p.evaluate(()=>/Mora Gru/.test(document.body.innerText)),true);
// colore
await p.evaluate(()=>document.querySelector('[data-theme-color="teal"]').click());await p.waitForTimeout(400);
check("colore teal applicato",await p.evaluate(()=>!!document.querySelector(".bg-teal-600")),true);
check("striscia in alto del colore dell app (tema chiaro)",await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue("--mora-status").trim()),"#0d9488");
// anteprime di tutte
const seen=[];
for(const s of ["normale","natale","sanvalentino","carnevale","pasqua","repubblica","estate","autunno","halloween"]){
 await p.evaluate((s)=>document.querySelector(`[data-season-card="${s}"] [data-action="see-splash"]`).click(),s);await p.waitForTimeout(400);
 seen.push(await p.evaluate(()=>{const e=document.querySelector(".mora-splash");return e?e.dataset.season:"";}));
 if(SH&&s==="natale"){await p.waitForTimeout(2800);await p.screenshot({path:SH+"/anteprima_natale.png"});}
 await p.evaluate(()=>document.querySelector('[data-action="preview-close"]').click());await p.waitForTimeout(150);
}
check("anteprima avvio di tutte le feste",seen,["normale","natale","sanvalentino","carnevale","pasqua","repubblica","estate","autunno","halloween"]);
await p.evaluate(()=>document.querySelector('[data-season-card="autunno"] [data-action="see-hero"]').click());await p.waitForTimeout(1500);
check("anteprima cielo della Home",await p.evaluate(()=>!!document.querySelector('[data-section="season-preview"] canvas')),true);
if(SH)await p.screenshot({path:SH+"/anteprima_cielo_autunno.png"});
await p.evaluate(()=>document.querySelector('[data-action="preview-close"]').click());await p.waitForTimeout(150);
// scelta fissa
await p.evaluate(()=>{const el=document.querySelector("[data-season-choice]");Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(el,"natale");el.dispatchEvent(new Event("change",{bubbles:true}));window.__writes.length=0;});await p.waitForTimeout(300);
check("sempre Natale: scelta mostrata",await p.evaluate(()=>/Oggi: Natale \(scelta da te\)/.test(document.querySelector('[data-section="season-gallery"]').innerText)),true);
check("nessun errore",errs,[]);console.log(f?f+" PROBLEMI":"TUTTO OK");await b.close();})();
