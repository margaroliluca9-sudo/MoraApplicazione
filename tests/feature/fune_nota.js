const path=require("path");const [G,OUT,DIR]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let bad=0;const check=(n,got,exp)=>{const ok=JSON.stringify(got)===JSON.stringify(exp);if(!ok)bad++;console.log((ok?"PASS ":"FAIL ")+n+(ok?"":"  → "+JSON.stringify(got)+" atteso "+JSON.stringify(exp)));};
const N=Math.floor(Date.now()/1000);
const L=(id,cust,mat,ds,extra)=>({id,customer:cust,machineId:mat,technician:"Ale",description:"",dateString:ds,createdAt:{seconds:N-1000},...extra});
const logs=[
 L("a","BIANCHI LAMIERE","4100","12/03/2026",{description:"Sostituita fune FZ636A12",fune:{certificato:"123",diametro:12,lunghezza:40}}),
 L("b","MARIO ROSSI SRL","77","01/02/2026",{description:"Cambiata fune 8x19 diametro 10",fune:{certificato:"55",diametro:10,lunghezza:22}}),
 L("c","COLOMBO ACCIAI","9","05/05/2026",{description:"Sostituita fune",fune:{certificato:"X1",diametro:8,lunghezza:15}}),
 L("d","GALLI COSTRUZIONI","55","06/06/2026",{description:"Sostituita fune",fune:{certificato:"Z",diametro:14,lunghezza:30,fas:"FZNR35PK"}}),
 L("e","ROMANO METALLI","3","07/07/2026",{description:"Cambiata catena",catena:{nonDisponibile:true,motivo:"certificato in arrivo",certificato:"",diametro:null,lunghezza:null}}),
 L("f","COLOMBO ACCIAI","10","08/07/2026",{description:"Sostituita fune",fune:{nonDisponibile:true,motivo:"manca certificato",certificato:"",diametro:null,lunghezza:null}}),
];
const DB={technicians:[{id:"t1",name:"Marco"}],machine_types:[],machines:[["m1","4100","BIANCHI LAMIERE"],["m2","77","MARIO ROSSI SRL"],["m3","9","COLOMBO ACCIAI"],["m4","55","GALLI COSTRUZIONI"],["m5","3","ROMANO METALLI"],["m6","10","COLOMBO ACCIAI"]].map(([id,matricola,customerName])=>({id,matricola,customerName,type:"Monotrave"})),customers:[],maintenance_logs:logs,settings:[{id:"layout",themeColor:"blue"}],chat_messages:[],chat_reads:[]};
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript((db)=>{window.__fakeDB=db;localStorage.setItem("mora_tech_last_name","Marco");localStorage.setItem("mora_theme","light");localStorage.setItem("mora_notify_asked_v1","1");localStorage.setItem("mora_hero_hint","9");},DB);
await p.goto("file://"+path.join(OUT,"index.html"));
const k=await p.evaluate((logs)=>{const R=window.__require("@/ropes");const m=R.knownRopes(logs);return Object.fromEntries(Object.entries(m).map(([k,v])=>[k,[v.type.fas||v.type.costruzione,v.type.from]]));},logs);
check("dai rapporti di prima: codice FAS e costruzione nel testo; senza tipo esclusa",k,{"BIANCHI LAMIERE|4100":["FZ636AC","testo"],"MARIO ROSSI SRL|77":["8x19","testo"],"GALLI COSTRUZIONI|55":["FZNR35PK","rapporto"]});
await p.evaluate(()=>window.mountApp());await p.waitForTimeout(3000);
await p.evaluate(()=>document.querySelector('[data-home-tile="wear"]').click());await p.waitForTimeout(500);await p.evaluate(()=>{const b=document.querySelector('[data-wear-pick="rope"]');if(b)b.click();});await p.waitForTimeout(200);
check("fune: elenca solo le gru con la fune nota",await p.evaluate(()=>[...document.querySelectorAll("[data-wear-crane-option]")].map(e=>e.getAttribute("data-wear-crane-option"))),["4100","55","77"]);
await p.evaluate(()=>{const o=document.querySelector('[data-wear-crane-option="4100"]');const sel=o.closest("select");sel.value=o.value;sel.dispatchEvent(new Event("change",{bubbles:true}));});await p.waitForTimeout(300);
check("tipo trovato nel rapporto, controllo impostato su FAS FZ636AC Ø12",await p.evaluate(()=>[!!document.querySelector("[data-wear-inferred]"),document.querySelector('[data-wear-input="rope"]').value,document.querySelector('[data-wear-input="d"]').value]),[true,"fas:FZ636AC","12"]);
await p.screenshot({path:`${DIR}/fune_nota.png`});
await p.click('[data-action="wear-crane-change"]');await p.click('[data-wear-tab="chain"]');await p.waitForTimeout(200);
check("catena: solo gru con la catena con il diametro",await p.evaluate(()=>[...document.querySelectorAll("[data-wear-crane-option]")].length),0);
console.log("== Storico: completa i dati");
await p.evaluate(()=>document.querySelector('[data-nav="history"]').click());await p.waitForTimeout(700);
check("«Completa i dati» sulle funi/catene incomplete",await p.evaluate(()=>[...document.querySelectorAll("[data-action^='complete-']")].length),5);
await p.evaluate(()=>{const c=[...document.querySelectorAll("[data-log-card]")].find(x=>x.textContent.includes("COLOMBO ACCIAI")&&x.textContent.includes("manca certificato"));c.querySelector('[data-action="complete-fune"]').click();});await p.waitForTimeout(400);
const setT=(sel,v)=>p.evaluate(([s,v])=>{const el=document.querySelector(s);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,v);el.dispatchEvent(new Event("input",{bubbles:true}));},[sel,v]);
await p.click('[data-action="complete-rope-save"]');await p.waitForTimeout(200);
check("senza dati non salva",await p.evaluate(()=>document.querySelector('[data-section="complete-rope"]').textContent.includes("tipo di fune")),true);
await setT('[data-section="complete-rope"] [aria-label="Certificato fune"]',"c-77");await setT('[data-section="complete-rope"] [aria-label="Lunghezza fune in metri"]',"18");await setT('[data-section="complete-rope"] [aria-label="Tipo fune"]',"FZ719 10");
await setT('[data-section="complete-rope"] [aria-label="Tipo fune"]',"FZ71910");await p.waitForTimeout(200);
await p.screenshot({path:`${DIR}/completa.png`});
await p.evaluate(()=>window.__writes.length=0);
await p.click('[data-action="complete-rope-save"]');await p.waitForTimeout(500);
console.log("modale:",await p.evaluate(()=>{const m=document.querySelector('[data-section="complete-rope"]');return m?m.innerText.slice(0,900):"chiusa";}));
console.log("scritture:",await p.evaluate(()=>JSON.stringify(window.__writes).slice(0,800)));
const w=await p.evaluate(()=>window.__writes.map(x=>JSON.parse(x)).filter(x=>/maintenance_logs\/f$/.test(x[1])));
check("salvato senza password admin: solo la fune",w.length&&Object.keys(w[0][2]),["fune"]);
check("dati della fune",w.length&&(({certificato,diametro,lunghezza,fas,codice,rottura})=>({certificato,diametro,lunghezza,fas,codice,rottura}))(w[0][2].fune),{certificato:"C-77",diametro:10,lunghezza:18,fas:"FZ719",codice:"FZ71910",rottura:66});
check("nessun errore",errs,[]);console.log(bad?`${bad} FALLITI`:"TUTTO OK");await b.close();})();
