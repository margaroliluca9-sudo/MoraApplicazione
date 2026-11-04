const path=require("path");const [G,OUT,SHDIR]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let f=0;const check=(l,a,e)=>{const ok=JSON.stringify(a)===JSON.stringify(e);if(!ok)f++;console.log((ok?"PASS ":"FAIL ")+l+(ok?"":`\n   atteso ${JSON.stringify(e)}\n   ottenuto ${JSON.stringify(a)}`));};
const DB={technicians:[{id:"t1",name:"Luca"}],machine_types:[],maintenance_logs:[],machines:[],drive_cranes:[],customers:[{id:"c1",name:"MARIO ROSSI SRL"}],
settings:[{id:"drive_places",lastRun:new Date(Date.now()-3600e3).toISOString(),finito:"sì",errori:0,cartelleTotali:10,cartelleAbbinate:8,gruTotali:30}]};
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript((db)=>{window.__fakeDB=db;},DB);await p.goto("file://"+path.join(OUT,"index.html"));
await p.evaluate(()=>window.mountComponent("DrivePlacesStatus",{onRun(){}}));await p.waitForTimeout(400);
check("tasto presente",await p.evaluate(()=>document.querySelector('[data-action="drive-refresh"]').textContent.trim()),"Aggiorna adesso");
await p.evaluate(()=>{window.__writes.length=0;document.querySelector('[data-action="drive-refresh"]').click();});await p.waitForTimeout(400);
const w=await p.evaluate(()=>window.__writes.map(x=>JSON.parse(x)));
check("scrive la richiesta",w.some(x=>/settings\/drive_places/.test(x[1])&&x[2]&&x[2][0]&&x[2][0].request&&x[2][1]&&x[2][1].merge),true);
check("in attesa",[await p.evaluate(()=>document.querySelector('[data-action="drive-refresh"]').textContent.trim()),/parte entro 5 minuti/.test(await p.evaluate(()=>document.querySelector("[data-drive-request]").textContent))],["Aggiornamento richiesto…",true]);
if(SHDIR){await p.evaluate(()=>document.getElementById("root").style.padding="16px");await p.screenshot({path:SHDIR+"/tasto_drive.png"});}
check("nessun errore",errs,[]);console.log(f?f+" PROBLEMI":"TUTTO OK");await b.close();})();
