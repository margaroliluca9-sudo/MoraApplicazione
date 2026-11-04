const path=require("path");const [G,OUT,SHDIR]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let f=0;const check=(l,a,e)=>{const ok=JSON.stringify(a)===JSON.stringify(e);if(!ok)f++;console.log((ok?"PASS ":"FAIL ")+l+(ok?"":`\n   atteso ${JSON.stringify(e)}\n   ottenuto ${JSON.stringify(a)}`));};
const DB={technicians:[{id:"t1",name:"Luca"}],machine_types:[],maintenance_logs:[],machines:[],drive_cranes:[],
customers:[{id:"c2",name:"ROMANO METALLI"},{id:"c3",name:"GALLI COSTRUZIONI"}],
settings:[{id:"drive_places",lastRun:new Date(Date.now()-3600e3).toISOString(),finito:"sì",errori:0},{id:"drive_folders",list:JSON.stringify([{id:"T",n:"ROMANO METALLI",c:"c2"},{id:"A",n:"ROMANO METALLI › STABILIMENTO A",c:"c2",p:"T"},{id:"B",n:"ROMANO METALLI › STABILIMENTO B",c:"c2",p:"T"},{id:"X",n:"ALTRO",c:""}])}]};
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript((db)=>{window.__fakeDB=db;window.__liveDB=true;window.__liveUpdate=true;localStorage.setItem("mora_tech_last_name","Luca");localStorage.setItem("mora_notify_asked_v1","1");localStorage.setItem("mora_notify_install_tip","1");},DB);
await p.goto("file://"+path.join(OUT,"index.html"));await p.evaluate(()=>window.mountApp());await p.waitForTimeout(3000);
await p.evaluate(()=>document.querySelector('[data-home-tile="admin"]').click());await p.waitForTimeout(900);
await p.evaluate(()=>document.querySelector('[data-admin-group="customers"]').click());await p.waitForTimeout(300);
await p.evaluate(()=>[...document.querySelectorAll('[data-section="admin-tabs"] button')].find(b=>/Drive/.test(b.textContent)).click());await p.waitForTimeout(900);
check("lista: cartella principale + sottocartelle",await p.evaluate(()=>document.querySelector('[data-drive-customer="ROMANO METALLI"]').innerText.replace(/\s+/g," ").trim()),"ROMANO METALLI ROMANO METALLI + 2 sottocartelle · dal nome");
check("niente dubbi sulla cartella",await p.evaluate(()=>document.querySelectorAll('[data-check="folder"]').length),0);
await p.evaluate(()=>document.querySelector('[data-drive-customer="GALLI COSTRUZIONI"]').click());await p.waitForTimeout(500);
await p.evaluate(()=>document.querySelector('[data-action="drive-folder-change"]').click());await p.waitForTimeout(200);
await p.evaluate(()=>{const el=document.querySelector("[data-drive-folder-search]");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,"stabilimento");el.dispatchEvent(new Event("input",{bubbles:true}));});await p.waitForTimeout(200);
check("si vedono le sottocartelle",await p.evaluate(()=>[...document.querySelectorAll("[data-drive-folder-row]")].map(x=>x.textContent)),["ROMANO METALLI › STABILIMENTO A","ROMANO METALLI › STABILIMENTO B"]);
if(SHDIR)await p.screenshot({path:SHDIR+"/sottocartelle.png"});
check("nessun errore",errs,[]);console.log(f?f+" PROBLEMI":"TUTTO OK");await b.close();})();
