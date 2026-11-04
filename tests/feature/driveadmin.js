const path=require("path");const [G,OUT,SHDIR]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let f=0;const check=(l,a,e)=>{const ok=JSON.stringify(a)===JSON.stringify(e);if(!ok)f++;console.log((ok?"PASS ":"FAIL ")+l+(ok?"":`\n   atteso ${JSON.stringify(e)}\n   ottenuto ${JSON.stringify(a)}`));};
const DB={technicians:[{id:"t1",name:"Luca"}],machine_types:[],maintenance_logs:[],
customers:[{id:"c1",name:"BIANCHI LAMIERE",city:"Novara (NO)",address:"Via Roma, 1",placeSource:"drive",placeFolder:"BIANCHI LAMIERE SRL",placeSheet:"T10.26.docx",placeSheetUrl:"https://drive.google.com/file/d/x/view"},{id:"c2",name:"ROMANO METALLI"},{id:"c3",name:"GALLI COSTRUZIONI",city:"Arona (NO)",placeSource:"manual"}],
machines:[{id:"m1",matricola:"4738A",customerName:"BIANCHI LAMIERE",type:"Bandiera"},{id:"m2",matricola:"M7",customerName:"BIANCHI LAMIERE",type:"Monotrave"}],
drive_cranes:[
{id:"c1_4738A",customerId:"c1",customerName:"BIANCHI LAMIERE",fab:"4738 A",fabKey:"4738A",tipo:"BANDIERA",portata:"500",stato:"Catena idonea",foglio:"Trimestrale 10/2026",cartella:"BIANCHI LAMIERE SRL",foglioUrl:"https://drive.google.com/file/d/x/view"},
{id:"c1_2103",customerId:"c1",customerName:"BIANCHI LAMIERE",fab:"2103",fabKey:"2103",tipo:"MONOTRAVE",stato:"Fune idonea",foglio:"Trimestrale 10/2026",cartella:"BIANCHI LAMIERE SRL"}],
settings:[{id:"drive_places",lastRun:new Date(Date.now()-3*3600e3).toISOString(),aggiornati:3,gru:2,finito:"sì",cartelleTotali:212,cartelleAbbinate:150,gruTotali:640,errori:0,erroriLista:"[]",lette:12,durata:200},{id:"drive_folders",list:JSON.stringify([{id:"F1",n:"BIANCHI LAMIERE SRL",c:"c1"},{id:"F2",n:"ROMANO METALLI SPA",c:""}])}]};
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript((db)=>{window.__fakeDB=db;window.__liveDB=true;window.__liveUpdate=true;window.alert=(m)=>console.log("ALERT",m);localStorage.setItem("mora_tech_last_name","Luca");localStorage.setItem("mora_notify_asked_v1","1");localStorage.setItem("mora_notify_install_tip","1");},DB);
await p.goto("file://"+path.join(OUT,"index.html"));await p.evaluate(()=>window.mountApp());await p.waitForTimeout(3500);const w=(ms)=>p.waitForTimeout(ms);
await p.evaluate(()=>document.querySelector('[data-home-tile="admin"]').click());await w(900);
await p.evaluate(()=>[...document.querySelectorAll("button")].find(x=>/^drive$/i.test(x.textContent.trim())).click());await w(900);
const rows=await p.evaluate(()=>[...document.querySelectorAll("[data-drive-customer]")].map(x=>x.innerText.replace(/\s+/g," ").trim()));
console.log("   ",rows);
check("lista: cartella e fonte",[rows.some(r=>/BIANCHI LAMIERE BIANCHI LAMIERE SRL · dal nome Novara \(NO\) · Via Roma, 1 · dal Drive/.test(r)),rows.some(r=>/ROMANO METALLI nessuna cartella/.test(r)),rows.some(r=>/scritto a mano/.test(r))],[true,true,true]);
check("esito del giro",await p.evaluate(()=>document.querySelector("[data-drive-health]").dataset.driveHealth),"emerald");
if(SHDIR)await p.screenshot({path:SHDIR+"/drive_lista.png"});
await p.evaluate(()=>document.querySelector('[data-drive-filter="nofolder"]').click());await w(200);
check("filtro senza cartella",await p.evaluate(()=>[...document.querySelectorAll("[data-drive-customer]")].map(x=>x.dataset.driveCustomer)),["GALLI COSTRUZIONI","ROMANO METALLI"]);
await p.evaluate(()=>document.querySelector('[data-drive-filter="all"]').click());await w(200);
await p.evaluate(()=>document.querySelector('[data-drive-customer="BIANCHI LAMIERE"]').click());await w(700);
check("fonte del paese",await p.evaluate(()=>document.querySelector("[data-place-source]").innerText.replace(/\s+/g," ").trim()),"Preso dal Drive: cartella BIANCHI LAMIERE SRL · foglio T10.26.docxApri il foglio");
const cr=await p.evaluate(()=>[...document.querySelectorAll("[data-drive-crane-machine]")].map(x=>x.textContent.trim()));
check("gru: 2103 senza gru nell'app, 4738A sulla scheda",cr,["Nessuna gru nell'app con questo numero: «Correggi» per abbinarla","Sulla scheda della gru 4738A"]);
if(SHDIR)await p.screenshot({path:SHDIR+"/drive_cliente.png",fullPage:true});
// correggi 2103: abbina a M7 e stato
await p.evaluate(()=>document.querySelector('[data-drive-crane="2103"] [data-action="crane-fix"]').click());await w(200);
await p.evaluate(()=>{const s=document.querySelector("[data-crane-link]");Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(s,"M7");s.dispatchEvent(new Event("change",{bubbles:true}));const i=document.querySelector('[data-crane-fix="stato"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(i,"Fune da sostituire");i.dispatchEvent(new Event("input",{bubbles:true}));});await w(150);
if(SHDIR)await p.screenshot({path:SHDIR+"/drive_correggi.png"});
await p.evaluate(()=>{window.__writes.length=0;document.querySelector('[data-action="crane-fix-save"]').click();});await w(500);
const wr=await p.evaluate(()=>window.__writes.join("\n"));console.log("   ",wr.slice(0,300));
check("scrive fix e linkTo",[/"linkTo":"M7"/.test(wr),/"stato":"Fune da sostituire"/.test(wr),/drive_cranes/.test(wr)],[true,true,true]);
const after=await p.evaluate(()=>document.querySelector('[data-drive-crane="2103"]').innerText.replace(/\s+/g," "));
check("dopo: corretta a mano, sulla gru M7, stato nuovo",[/corretta a mano/.test(after),/Sulla scheda della gru M7 \(abbinata da te\)/.test(after),/Fune da sostituire/.test(after)],[true,true,true]);
// nascondi 4738A
await p.evaluate(()=>document.querySelector('[data-drive-crane="4738 A"] [data-action="crane-hide"]').click());await w(400);
check("nascosta",/nascosta/.test(await p.evaluate(()=>document.querySelector('[data-drive-crane="4738 A"]').innerText)),true);
// paese a mano
await p.evaluate(()=>{const i=document.querySelector("[data-drive-address]");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(i,"Via Roma, 12");i.dispatchEvent(new Event("input",{bubbles:true}));window.__writes.length=0;});await w(150);
await p.evaluate(()=>document.querySelector('[data-action="drive-place-save"]').click());await w(500);
check("paese salvato a mano",/"placeSource":"manual"/.test(await p.evaluate(()=>window.__writes.join("\n"))),true);
// cartella
await p.evaluate(()=>document.querySelector('[data-action="drive-folder-change"]').click());await w(150);
await p.evaluate(()=>[...document.querySelectorAll("[data-drive-folder-row]")].find(x=>/ROMANO/.test(x.textContent)).click());await w(150);
await p.evaluate(()=>{window.__writes.length=0;document.querySelector('[data-action="drive-folder-save"]').click();});await w(500);
check("cartella salvata",[/"driveFolderId":"F2"/.test(await p.evaluate(()=>window.__writes.join("\n"))),await p.evaluate(()=>((document.querySelector("[data-drive-msg]")||{}).textContent||"").trim())],[true,"Cartella salvata: il programma la usa dal giro di domattina."]);
if(SHDIR)await p.screenshot({path:SHDIR+"/drive_salvato.png"});
check("nessun errore",errs,[]);console.log(f?f+" PROBLEMI":"TUTTO OK");await b.close();})();
