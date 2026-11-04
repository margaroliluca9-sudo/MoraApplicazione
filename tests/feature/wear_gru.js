const path=require("path");const [G,OUT,DIR]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let bad=0;const check=(n,got,exp)=>{const ok=JSON.stringify(got)===JSON.stringify(exp);if(!ok)bad++;console.log((ok?"PASS ":"FAIL ")+n+(ok?"":"  → "+JSON.stringify(got)+" atteso "+JSON.stringify(exp)));};
const N=Math.floor(Date.now()/1000);
const DB={technicians:[{id:"t1",name:"Marco"}],machine_types:[],machines:[{id:"m1",matricola:"4100",customerName:"BIANCHI LAMIERE",type:"Monotrave"},{id:"m2",matricola:"77",customerName:"MARIO ROSSI SRL",type:"Bitrave"}],customers:[{id:"c1",name:"BIANCHI LAMIERE"},{id:"c2",name:"MARIO ROSSI SRL"}],
maintenance_logs:[
 {id:"l1",customer:"BIANCHI LAMIERE",machineId:"4100",technician:"Ale",description:"Sostituita fune",dateString:"12/03/2026",createdAt:{seconds:N-9e6},fune:{nonDisponibile:false,certificato:"FAS123",diametro:12,lunghezza:40,costruzione:"8x36",marca:"FAS",rottura:118}},
 {id:"l2",customer:"BIANCHI LAMIERE",machineId:"4100",technician:"Marco",description:"Controllo fune",dateString:"10/09/2026",createdAt:{seconds:N-4e6},ropeCheck:{type:"fune",level:"attenzione",title:"Fune ancora idonea, da tenere d'occhio",text:"Controllo fune 8×36 WS Ø12 mm (ISO 4309): fune ancora idonea. Fili rotti: 8 su 6d (limite 13)."}}],
settings:[{id:"layout",themeColor:"blue"}],chat_messages:[],chat_reads:[]};
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript((db)=>{window.__fakeDB=db;localStorage.setItem("mora_tech_last_name","Marco");localStorage.setItem("mora_theme","light");localStorage.setItem("mora_notify_asked_v1","1");localStorage.setItem("mora_hero_hint","9");},DB);
await p.goto("file://"+path.join(OUT,"index.html"));await p.evaluate(()=>window.mountApp());await p.waitForTimeout(3000);
await p.evaluate(()=>document.querySelector('[data-home-tile="wear"]').click());await p.waitForTimeout(500);await p.evaluate(()=>{const b=document.querySelector('[data-wear-pick="rope"]');if(b)b.click();});await p.waitForTimeout(200);
const type=async(id,v)=>p.evaluate(([id,v])=>{const el=document.querySelector(`[data-wear-input="${id}"]`);const set=Object.getOwnPropertyDescriptor(el.tagName==="SELECT"?HTMLSelectElement.prototype:HTMLInputElement.prototype,"value").set;set.call(el,v);el.dispatchEvent(new Event(el.tagName==="SELECT"?"change":"input",{bubbles:true}));},[id,v]);
await type("crane","bianchi");await p.waitForTimeout(200);
await p.evaluate(()=>{const o=document.querySelector('[data-wear-crane-option="4100"]');const sel=o.closest("select");sel.value=o.value;sel.dispatchEvent(new Event("change",{bubbles:true}));});await p.waitForTimeout(400);
check("fune montata dal rapporto",await p.evaluate(()=>document.querySelector("[data-wear-mounted]").textContent.includes("Costruzione 8×36 WS")&&document.querySelector("[data-wear-mounted]").textContent.includes("Carico di rottura 118 kN")),true);
check("controllo precedente",await p.evaluate(()=>document.querySelector("[data-wear-prev]").textContent.includes("10/09/2026")),true);
check("parte già dalla fune giusta (So la costruzione, 8×36, Ø12)",await p.evaluate(()=>[document.querySelector('[data-wear-input="rope"]').value,document.querySelector('[data-wear-input="d"]').value]),["8x36","12"]);
await type("b6","4");await type("b30","9");await p.waitForTimeout(300);
await p.screenshot({path:`${DIR}/gru_fune.png`,fullPage:true});
await p.click('[data-action="wear-report"]');await p.waitForTimeout(800);
check("nuovo rapporto già compilato col controllo",await p.evaluate(()=>[!!document.querySelector('[data-section="report-head"]'),!!document.querySelector('[data-section="rope-check"]'),document.body.innerText.includes("BIANCHI LAMIERE")]),[true,true,true]);
await p.screenshot({path:`${DIR}/rapporto_controllo.png`});
check("nessun errore",errs,[]);console.log(bad?`${bad} FALLITI`:"TUTTO OK");await b.close();})();
