const path=require("path");const [G,OUT,SHDIR]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let f=0;const check=(l,a,e)=>{const ok=JSON.stringify(a)===JSON.stringify(e);if(!ok)f++;console.log((ok?"PASS ":"FAIL ")+l+(ok?"":`\n   atteso ${JSON.stringify(e)}\n   ottenuto ${JSON.stringify(a)}`));};
const now=Date.now(),H=3600e3,ts=(ms)=>({seconds:Math.floor(ms/1000),nanoseconds:0});
const c1=now-50*H;
const DB={technicians:[{id:"t1",name:"Luca"},{id:"t2",name:"Marco"}],machine_types:[],customers:[{id:"c1",name:"MARIO ROSSI SRL"}],machines:[],
maintenance_logs:[
{id:"l1",dateString:"22/10/2026",technician:"Marco",additionalTechnicians:[],customer:"MARIO ROSSI SRL",machineId:"4100",description:"Cambio pulsantiera",createdAt:ts(c1),ticketNumber:"512",
 edits:[{at:c1+2*60e3,who:"Marco",changes:[{f:"Descrizione",a:"Cambio pulsante",b:"Cambio pulsantiera"}]},{at:c1+26*H,who:"Luca",changes:[{f:"Gru",a:"4110",b:"4100"}]}]},
{id:"l2",dateString:"23/10/2026",technician:"Luca",additionalTechnicians:[],customer:"MARIO ROSSI SRL",machineId:"2103",description:"x",createdAt:ts(now-5*H)}],
deleted_logs:[{id:"l9",dateString:"20/10/2026",technician:"Marco",customer:"BIANCHI LAMIERE",machineId:"7",description:"doppione",createdAt:ts(now-3*H),deletedAtMs:now-3*H+60e3,deletedAt:ts(now-3*H+60e3),deletedBy:"Marco"}]};
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript((db)=>{window.__fakeDB=db;window.__liveDB=true;localStorage.setItem("mora_tech_last_name","Luca");localStorage.setItem("mora_notify_asked_v1","1");localStorage.setItem("mora_notify_install_tip","1");},DB);
await p.goto("file://"+path.join(OUT,"index.html"));await p.evaluate(()=>window.mountApp());await p.waitForTimeout(3000);
await p.evaluate(()=>document.querySelector('[data-home-tile="admin"]').click());await p.waitForTimeout(900);
await p.evaluate(()=>document.querySelector('[data-admin-group="people"]').click());await p.waitForTimeout(400);
await p.evaluate(()=>[...document.querySelectorAll('[data-section="admin-tabs"] button')].find(b=>/Modifiche/.test(b.textContent)).click());await p.waitForTimeout(800);
const rows=()=>p.evaluate(()=>[...document.querySelectorAll("[data-register-row]")].map(x=>x.innerText.replace(/\s+/g," ").trim()));
let r=await rows();console.log("   ",r);
check("3 voci, dalla più recente",[r.length,/Marco ha eliminato/.test(r[0]),/Luca ha modificato/.test(r[1]),/Marco ha modificato/.test(r[2])],[3,true,true,true]);
check("tempi e cosa",[/dopo 1 min dal salvataggio \(nei primi 3 minuti\)/.test(r[0]),/dopo 26 ore dal salvataggio \(con la password admin\)/.test(r[1]),/Gru: 4110 4100/.test(r[1]),/fatto da Marco/.test(r[1]),/dopo 2 min/.test(r[2])],[true,true,true,true,true]);
if(SHDIR)await p.screenshot({path:SHDIR+"/registro.png"});
await p.evaluate(()=>document.querySelector('[data-register-time="late"]').click());await p.waitForTimeout(200);
check("dopo 3 minuti: solo quella di Luca",(await rows()).length,1);
await p.evaluate(()=>{document.querySelector('[data-register-time="all"]').click();const s=document.querySelector("[data-register-who]");Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(s,"Marco");s.dispatchEvent(new Event("change",{bubbles:true}));});await p.waitForTimeout(200);
check("solo Marco",(await rows()).length,2);
await p.evaluate(()=>document.querySelector('[data-register-kind="delete"]').click());await p.waitForTimeout(200);
check("solo eliminazioni di Marco",(await rows()).length,1);
await p.evaluate(()=>document.querySelector('[data-action="register-trash"]').click());await p.waitForTimeout(600);
check("Recupera → Cestino",await p.evaluate(()=>[...document.querySelectorAll('[data-section="admin-tabs"] button')].find(b=>b.getAttribute("aria-pressed")==="true").textContent.trim()),"Cestino");
check("nessun errore",errs,[]);console.log(f?f+" PROBLEMI":"TUTTO OK");await b.close();})();
