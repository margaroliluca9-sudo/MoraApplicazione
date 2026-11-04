const path=require("path");const [G,OUT,SHDIR]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let f=0;const check=(l,a,e)=>{const ok=JSON.stringify(a)===JSON.stringify(e);if(!ok)f++;console.log((ok?"PASS ":"FAIL ")+l+(ok?"":`\n   atteso ${JSON.stringify(e)}\n   ottenuto ${JSON.stringify(a)}`));};
const DB={technicians:[{id:"t1",name:"Luca"}],machine_types:[],
customers:[{id:"c1",name:"BIANCHI LAMIERE"},{id:"c2",name:"ROMANO METALLI",driveFolderId:"F9",driveFolderName:"ROMANO METALLI SPA (ex Romano)"}],
machines:[{id:"m1",matricola:"4738A",customerName:"BIANCHI LAMIERE",type:"Bandiera",capacity:"500"},{id:"m2",matricola:"2103 gho",customerName:"BIANCHI LAMIERE",type:"Monotrave"},{id:"m3",matricola:"9999",customerName:"BIANCHI LAMIERE"}],
maintenance_logs:[],
drive_cranes:[
{id:"c1_4738A",customerId:"c1",customerName:"BIANCHI LAMIERE",fab:"4738 A",fabKey:"4738A",tipo:"BANDIERA GBTS",portata:"500",matricola:"",anno:"1999",stato:"Catena idonea da tenere sotto controllo",foglio:"Trimestrale 10/2026"},
{id:"c1_2103",customerId:"c1",customerName:"BIANCHI LAMIERE",fab:"2103 GHO",fabKey:"2103",tipo:"MONOTRAVE",portata:"3.200",paranco:"DEMAG",matricola:"1983/0/15022/NO",stato:"Fune non idonea, da sostituire",foglio:"Trimestrale 10/2026"},
{id:"c9_4738A",customerId:"c9",customerName:"GALLI COSTRUZIONI",fabKey:"4738A",stato:"Fune idonea"}],
settings:[{id:"drive_folders",list:JSON.stringify([{id:"F1",n:"BIANCHI LAMIERE SRL",c:"c1"},{id:"F2",n:"COLOMBO ACCIAI",c:""},{id:"F9",n:"ROMANO METALLI SPA (ex Romano)",c:"c2"}])}]};
(async()=>{const b=await chromium.launch();const errs=[];
const open=async()=>{const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));await p.addInitScript((db)=>{window.__fakeDB=db;window.__liveUpdate=true;},DB);await p.goto("file://"+path.join(OUT,"index.html"));return p;};
const card=async(m)=>{const p=await open();await p.evaluate((m)=>window.mountComponent("MachineHistoryModal",{machine:m,allLogs:[],onClose(){},onOpenCustomer(){},onOpenPhotos(){},themeColor:"blue"}),m);await p.waitForTimeout(500);return p;};
let p=await card(DB.machines[0]);
const t1=await p.evaluate(()=>{const e=document.querySelector('[data-section="drive-crane"]');return e?[e.innerText.replace(/\s+/g," ").trim(),e.className.includes("amber")]:null;});
console.log("   ",t1);
check("4738A: stato giallo e dati",[!!t1&&/Dall'ultima verifica \(Trimestrale 10\/2026\)/.test(t1[0])&&/Catena idonea da tenere sotto controllo/.test(t1[0])&&/N. fabbrica: 4738 A/.test(t1[0])&&/Anno: 1999/.test(t1[0]),t1&&t1[1]],[true,true]);
if(SHDIR)await p.screenshot({path:SHDIR+"/gru_drive_giallo.png"});await p.close();
p=await card(DB.machines[1]);
const t2=await p.evaluate(()=>{const e=document.querySelector('[data-section="drive-crane"]');return e?[e.innerText.replace(/\s+/g," ").trim(),e.className.includes("red")]:null;});
check("'2103 gho' trova 2103 GHO, rosso, con INAIL e paranco",[!!t2&&/Matricola INAIL: 1983\/0\/15022\/NO/.test(t2[0])&&/Paranco: DEMAG/.test(t2[0]),t2&&t2[1]],[true,true]);
if(SHDIR)await p.screenshot({path:SHDIR+"/gru_drive_rosso.png"});await p.close();
p=await card(DB.machines[2]);
check("gru non nel Drive: niente riquadro",await p.evaluate(()=>!document.querySelector('[data-section="drive-crane"]')),true);await p.close();
// cartella nel Drive
const edit=async(c)=>{const p=await open();await p.evaluate(([c,all])=>window.mountComponent("EditCustomerModal",{customer:c,allCustomers:all,onClose(){window.__closed=1;},color:"blue"}),[c,DB.customers]);await p.waitForTimeout(500);return p;};
p=await edit(DB.customers[0]);
check("trovata dal nome",await p.evaluate(()=>document.querySelector("[data-drive-folder-current]").innerText.replace(/\s+/g," ").trim()),"BIANCHI LAMIERE SRL trovata dal nome");
await p.evaluate(()=>document.querySelector('[data-action="drive-folder-change"]').click());await p.waitForTimeout(150);
await p.evaluate(()=>{const el=document.querySelector("[data-drive-folder-search]");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,"colombo");el.dispatchEvent(new Event("input",{bubbles:true}));});await p.waitForTimeout(150);
check("cerca: una cartella",await p.evaluate(()=>[...document.querySelectorAll("[data-drive-folder-row]")].map(x=>x.textContent)),["COLOMBO ACCIAI"]);
if(SHDIR)await p.screenshot({path:SHDIR+"/cartella_cerca.png"});
await p.evaluate(()=>document.querySelector("[data-drive-folder-row]").click());await p.waitForTimeout(150);
check("scelta da te",await p.evaluate(()=>document.querySelector("[data-drive-folder-current]").innerText.replace(/\s+/g," ").trim()),"COLOMBO ACCIAI scelta da te");
if(SHDIR)await p.screenshot({path:SHDIR+"/cartella_scelta.png"});
await p.evaluate(()=>{window.__writes.length=0;[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==="Salva").click();});await p.waitForTimeout(400);
const w=await p.evaluate(()=>window.__writes.join("\n"));
check("salva driveFolderId F2, niente placeSource",[/"driveFolderId":"F2"/.test(w),/"driveFolderName":"COLOMBO ACCIAI"/.test(w),/placeSource/.test(w)],[true,true,false]);await p.close();
p=await edit(DB.customers[1]);
check("già scelta",await p.evaluate(()=>document.querySelector("[data-drive-folder-current]").innerText.replace(/\s+/g," ").trim()),"ROMANO METALLI SPA (ex Romano) scelta da te");
await p.evaluate(()=>document.querySelector('[data-action="drive-folder-change"]').click());await p.waitForTimeout(150);
await p.evaluate(()=>[...document.querySelectorAll('[data-section="drive-folder"] button')].find(x=>/Togli la scelta/.test(x.textContent)).click());await p.waitForTimeout(150);
await p.evaluate(()=>{window.__writes.length=0;[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==="Salva").click();});await p.waitForTimeout(400);
check("togli la scelta: driveFolderId vuoto",/"driveFolderId":""/.test(await p.evaluate(()=>window.__writes.join("\n"))),true);
check("nessun errore",errs,[]);console.log(f?f+" PROBLEMI":"TUTTO OK");await b.close();})();
