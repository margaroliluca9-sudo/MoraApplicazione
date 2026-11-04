const path=require("path");const [G,OUT,SHDIR]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let f=0;const check=(l,a,e)=>{const ok=JSON.stringify(a)===JSON.stringify(e);if(!ok)f++;console.log((ok?"PASS ":"FAIL ")+l+(ok?"":`\n   atteso ${JSON.stringify(e)}\n   ottenuto ${JSON.stringify(a)}`));};
const C="BIANCHI LAMIERE";
const DB={technicians:[{id:"t1",name:"Luca"}],machine_types:[],maintenance_logs:[],
customers:[{id:"c1",name:C},{id:"c2",name:"ROMANO METALLI"},{id:"c3",name:"GALLI COSTRUZIONI",driveNone:true},{id:"c4",name:"COLOMBO ACCIAI"}],
machines:[{id:"m1",matricola:"4100",customerName:C,type:"Monotrave",capacity:"2000"},{id:"m2",matricola:"2103",customerName:C,type:"Bandiera",capacity:"500"},{id:"m3",matricola:"4739",customerName:C,type:"Monotrave",capacity:"1000"},{id:"m4",matricola:"M9",customerName:C,type:"Gru bitrave",capacity:"5000"}],
drive_cranes:[
{id:"c1_4100",customerId:"c1",customerName:C,fab:"4100",fabKey:"4100",tipo:"MONOTRAVE",portata:"2.000",stato:"Catena idonea"},
{id:"c1_2103",customerId:"c1",customerName:C,fab:"",fabKey:"",interno:"2103",internoKey:"2103",tipo:"MONOTRAVE",portata:"3.200",stato:"Fune idonea"},
{id:"c1_4738",customerId:"c1",customerName:C,fab:"4738",fabKey:"4738",tipo:"MONOTRAVE",portata:"1.000",stato:"Fune idonea"},
{id:"c1_8888",customerId:"c1",customerName:C,fab:"8888",fabKey:"8888",tipo:"BITRAVE",portata:"5.000",stato:"Fune idonea"}],
settings:[{id:"drive_places",lastRun:new Date(Date.now()-2*3600e3).toISOString(),finito:"sì",errori:0},{id:"drive_folders",list:JSON.stringify([{id:"F1",n:"BIANCHI LAMIERE SRL",c:"c1"},{id:"F2",n:"ROMANO MET. E FIGLI",c:"c2"},{id:"F3",n:"COLOMBO",c:""}])}]};
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript((db)=>{window.__fakeDB=db;window.__liveDB=true;window.__liveUpdate=true;window.alert=(m)=>console.log("ALERT",m);localStorage.setItem("mora_tech_last_name","Luca");localStorage.setItem("mora_notify_asked_v1","1");localStorage.setItem("mora_notify_install_tip","1");},DB);
await p.goto("file://"+path.join(OUT,"index.html"));await p.evaluate(()=>window.mountApp());await p.waitForTimeout(3500);const w=(ms)=>p.waitForTimeout(ms);
await p.evaluate(()=>document.querySelector('[data-home-tile="admin"]').click());await w(900);
await p.evaluate(()=>[...document.querySelectorAll("button")].find(x=>/^drive$/i.test(x.textContent.trim())).click());await w(1200);
const ck=()=>p.evaluate(()=>[...document.querySelectorAll("[data-check]")].map(x=>x.dataset.check+":"+(x.dataset.checkRow||x.dataset.checkCustomer)));
// gru col numero di fabbrica uguale ma tipo diverso: niente domanda
check("dubbi e suggerimenti",await ck(),["folder:ROMANO METALLI","doubt:c1_2103","suggestion:c1_4738","suggestion:c1_8888"]);
if(SHDIR)await p.screenshot({path:SHDIR+"/bulk.png"});
await p.evaluate(()=>{window.__writes.length=0;document.querySelector('[data-action="bulk-doubts"]').click();});await w(200);
check("primo tocco chiede conferma",await p.evaluate(()=>document.querySelector('[data-action="bulk-doubts"]').textContent),"Sicuro? Tocca ancora per confermarne 1");
await p.evaluate(()=>document.querySelector('[data-action="bulk-doubts"]').click());await w(500);
check("conferma: okFor scritto",/"okFor":"m2"/.test(await p.evaluate(()=>window.__writes.join("\n"))),true);
await p.evaluate(()=>{window.__writes.length=0;document.querySelector('[data-action="bulk-suggestions"]').click();});await w(200);await p.evaluate(()=>document.querySelector('[data-action="bulk-suggestions"]').click());await w(500);
const ww=await p.evaluate(()=>window.__writes.join("\n"));
check("suggerimenti accettati",[/"linkTo":"4739"/.test(ww),/"linkTo":"M9"/.test(ww)],[true,true]);
check("restano solo le cartelle",await ck(),["folder:ROMANO METALLI"]);
check("nessun errore",errs,[]);console.log(f?f+" PROBLEMI":"TUTTO OK");await b.close();})();
