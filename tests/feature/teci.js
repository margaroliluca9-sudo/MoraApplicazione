const path=require("path");const fs=require("fs");const [G,OUT,DIR]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let bad=0;const check=(n,got,exp)=>{const ok=JSON.stringify(got)===JSON.stringify(exp);if(!ok)bad++;console.log((ok?"PASS ":"FAIL ")+n+(ok?"":"  → "+JSON.stringify(got)+" atteso "+JSON.stringify(exp)));};
const N=Math.floor(Date.now()/1000);
const DB={technicians:[{id:"t1",name:"Marco"}],machine_types:[],machines:[{id:"m1",matricola:"4100",customerName:"BIANCHI LAMIERE",type:"Monotrave"},{id:"m2",matricola:"9",customerName:"COLOMBO ACCIAI",type:"Bitrave"}],customers:[],
maintenance_logs:[{id:"a",customer:"BIANCHI LAMIERE",machineId:"4100",technician:"Ale",dateString:"12/03/2026",createdAt:{seconds:N},description:"Sostituita fune",fune:{certificato:"1",diametro:16,lunghezza:30,teci:"S10ZN"}},{id:"b",customer:"COLOMBO ACCIAI",machineId:"9",technician:"Ale",dateString:"12/02/2025",createdAt:{seconds:N},description:"Sostituita fune Teci A7 ALC diam. 14"}],settings:[],chat_messages:[],chat_reads:[],wear_reports:[]};
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript((db)=>{window.__fakeDB=db;localStorage.setItem("mora_tech_last_name","Marco");localStorage.setItem("mora_notify_asked_v1","1");localStorage.setItem("mora_hero_hint","9");},DB);
await p.goto("file://"+path.join(OUT,"index.html"));
const u=await p.evaluate(()=>{const W=window.__require("@/wearRules");const T=window.__require("@/teciRopes");const R=window.__require("@/ropes");
 const a=W.checkRope({mode:"so",rope:"teci:S10ZN",d:"16",b6:"",b30:"",flags:{}});const c=W.checkRope({mode:"so",rope:"teci:A7ALC",d:"14",flags:{}});const c2=W.checkRope({mode:"so",rope:"teci:A7ALC",d:"40",flags:{}});
 return {n:T.TECI_ROPES.length,s10:[a.n,a.lim.six,a.lim.thirty,a.teciItem.kN,a.teciItem.cons],a7:[c.lim.six,c.lim.thirty,c.lim.teci],a740:[c2.lim.six,c2.lim.thirty],srch:[T.teciSearch("Teci S10 ZN")&&T.teciSearch("Teci S10 ZN").id,T.teciSearch("tk17")&&T.teciSearch("tk17").id],
 txt:R.ropeTypeOfLog({description:"Sostituita fune Teci A7 ALC diam. 14"})};});
console.log(JSON.stringify(u));
check("catalogo Teci caricato",u.n>50,true);
check("S10 ZN Ø16: 216 fili esterni, ISO crociata 9/18, carico dal catalogo",u.s10.slice(0,3),[216,9,18]);
check("A7 ALC Ø14: tabella Teci 1 e 2",u.a7,[1,2,true]);
check("A7 ALC Ø40: tabella Teci 2 e 4",u.a740,[2,4]);
check("ricerca per nome",u.srch,["S10ZN","EVOLUTIONTK17"]);
check("dal testo di un rapporto vecchio",[u.txt&&u.txt.teci,u.txt&&u.txt.diametro],["A7ALC",14]);
await p.evaluate(()=>window.mountApp());await p.waitForTimeout(3000);
await p.evaluate(()=>window.dispatchEvent(new CustomEvent("mora-open-wear",{detail:"rope"})));await p.waitForTimeout(500);
check("gru con fune Teci nell'elenco",await p.evaluate(()=>[...document.querySelectorAll("[data-wear-crane-option]")].map(e=>e.getAttribute("data-wear-crane-option"))),["4100","9"]);
await p.evaluate(()=>{const o=document.querySelector('[data-wear-crane-option="4100"]');const sel=o.closest("select");sel.value=o.value;sel.dispatchEvent(new Event("change",{bubbles:true}));});await p.waitForTimeout(300);
check("controllo impostato su Teci S10 ZN",await p.evaluate(()=>[document.querySelector('[data-wear-input="rope"]').value,!!document.querySelector("[data-wear-teci]")]),["teci:S10ZN",true]);
await p.evaluate(()=>document.querySelector("[data-wear-teci]").scrollIntoView({block:"center"}));await p.screenshot({path:DIR+"/teci.png"});
console.log(await p.evaluate(()=>document.querySelector("[data-wear-teci]").textContent));
check("nessun errore",errs,[]);console.log(bad?`${bad} FALLITI`:"TUTTO OK");await b.close();})();
