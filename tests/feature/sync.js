const path=require("path");const [G,OUT]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let f=0;const check=(l,a,e)=>{const ok=JSON.stringify(a)===JSON.stringify(e);if(!ok)f++;console.log((ok?"PASS ":"FAIL ")+l+(ok?"":`\n   atteso ${JSON.stringify(e)}\n   ottenuto ${JSON.stringify(a)}`));};
const now=Date.now();const ts=(ms)=>({seconds:Math.floor(ms/1000)});
const logs=[];for(let i=0;i<30;i++)logs.push({id:"l"+i,dateString:"1/10/2026",technician:"Luca",additionalTechnicians:[],customer:"MARIO ROSSI SRL",machineId:"M"+i,description:"lavoro "+i,createdAt:ts(now-(i+1)*864e5*3)});
const DB={technicians:[{id:"t1",name:"Luca"}],machine_types:[],customers:[{id:"c1",name:"MARIO ROSSI SRL"},{id:"c2",name:"BIANCHI LAMIERE"}],machines:logs.map((l,i)=>({id:"m"+i,matricola:"M"+i,customerName:"MARIO ROSSI SRL"})),maintenance_logs:logs,changes:[]};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});const errs=[];
let SYNC=null;const open=async(first)=>{const p=await ctx.newPage();p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript(([db,sy])=>{window.__fakeDB=db;window.__liveDB=true;if(sy)localStorage.setItem("mora_sync_v1",sy);localStorage.setItem("mora_tech_last_name","Luca");localStorage.setItem("mora_notify_asked_v1","1");localStorage.setItem("mora_notify_install_tip","1");},[DB,SYNC]);
await p.goto("file://"+path.join(OUT,"index.html"));await p.evaluate(()=>window.mountApp());await p.waitForTimeout(2500);return p;};
let p=await open();
let r=await p.evaluate(()=>(window.__reads||[]).filter(x=>x.startsWith("Q:")).map(x=>x.split("/").pop()).filter(x=>x!=="personal_hours").sort());
SYNC=await p.evaluate(()=>localStorage.getItem("mora_sync_v1"));
check("prima apertura: rilettura completa delle 3 raccolte",r,["customers","machines","maintenance_logs"]);

await p.close();
p=await open();
console.log("   sync2:",await p.evaluate(()=>localStorage.getItem("mora_sync_v1")));
r=await p.evaluate(()=>(window.__reads||[]).filter(x=>x.startsWith("Q:")&&!/personal_hours/.test(x)));
check("seconda apertura: niente riletture complete",r,[]);
// scrittura: nuovo cliente con writeBatch tracciato → biglietto in changes
await p.evaluate(()=>{window.__writes.length=0;});
const w=await p.evaluate(async()=>{const ids=Object.keys(window.__defs).filter(k=>/tracked/.test(k));const T=window.__require(ids[0]);const F=window.__require("firebase/firestore");const b=T.writeBatch({});b.update(F.doc({},"artifacts","mora-maintenance-v1","public","data","customers","c2"),{city:"Novara"});b.set(F.doc({},"artifacts","mora-maintenance-v1","public","data","settings","x"),{a:1});await b.commit();return window.__writes;});
const ch=w.map(x=>JSON.parse(x)).filter(x=>x[1]&&/\/changes\//.test(x[1]));
check("un biglietto solo per customers",[ch.length,ch[0]&&ch[0][2].c,ch[0]&&ch[0][2].ids],[1,"customers",["c2"]]);
// arriva un biglietto da un altro telefono: rilegge solo quel documento
await p.evaluate(()=>{window.__reads=[];});
await p.evaluate((now)=>{const db=window.__fakeDB;db.machines.find(m=>m.id==="m3").type="Bandiera";const subs=window.__subs||[];db.changes.push({id:"k1",c:"machines",ids:["m3"],dels:[],at:{seconds:Math.floor(now/1000),toMillis:()=>now},dev:"altro"});},Date.now());
// simulo il nuovo snapshot del listener di changes
const fired=await p.evaluate(()=>{const s=(window.__subs||[]).find(x=>/\/changes$/.test(x.ref.path));if(!s)return false;const snap={docs:[],metadata:{fromCache:false},docChanges:()=>[{type:"added",doc:{id:"k1",metadata:{hasPendingWrites:false},data:()=>window.__fakeDB.changes.find(c=>c.id==="k1")}}]};s.cb(snap);return true;});
await p.waitForTimeout(500);
r=await p.evaluate(()=>window.__reads);
check("biglietto da altro telefono: 1 lettura del documento cambiato",[fired,r],[true,["artifacts/mora-maintenance-v1/public/data/machines/m3"]]);
check("nessun errore",errs,[]);console.log(f?f+" PROBLEMI":"TUTTO OK");await b.close();})();
