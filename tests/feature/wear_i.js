const path=require("path");const [G,OUT,DIR]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let bad=0;const check=(n,got,exp)=>{const ok=JSON.stringify(got)===JSON.stringify(exp);if(!ok)bad++;console.log((ok?"PASS ":"FAIL ")+n+(ok?"":"  → "+JSON.stringify(got)+" atteso "+JSON.stringify(exp)));};
const DB={technicians:[{id:"t1",name:"Marco"}],machine_types:[],machines:[],customers:[],maintenance_logs:[],settings:[{id:"layout",themeColor:"blue"}],chat_messages:[],chat_reads:[]};
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript((db)=>{window.__fakeDB=db;},DB);await p.goto("file://"+path.join(OUT,"index.html"));
await p.evaluate(()=>window.mountComponent("WearPanel",{color:"blue",onBack(){}}));await p.waitForTimeout(400);
check("«i» su 6, 8, antigiro, crociata, parallela",await p.evaluate(()=>[...document.querySelectorAll("[data-wear-i]")].map(e=>e.getAttribute("data-wear-i"))),["6","8","tanti","crociata","parallela","nomfune","fili","tratto","diamfune","diamfune","f_valle","f_terminale","f_locale","f_deforma"]);
for(const id of ["6","8","tanti","parallela"]){
 await p.click(`[data-wear-i="${id}"]`);await p.waitForTimeout(300);
 const r=await p.evaluate(()=>{const s=document.querySelector("[data-wear-info]");const a=s&&s.querySelector("[data-fas-link]");return [!!s,a?a.getAttribute("href"):null];});
 console.log(id,JSON.stringify(r));await p.screenshot({path:`${DIR}/i_${id}.png`});
 await p.click('[data-wear-info] [aria-label="Chiudi"]');await p.waitForTimeout(200);}
check("toccando la «i» non cambia la scelta",await p.evaluate(()=>document.querySelector('[data-wear-choice="strands"] [data-choice="6"]').className.includes("border-blue-500")),true);
check("nessun errore",errs,[]);console.log(bad?`${bad} FALLITI`:"TUTTO OK");await b.close();})();
