const path=require("path");const [G,OUT,DIR]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let bad=0;const check=(n,got,exp)=>{const ok=JSON.stringify(got)===JSON.stringify(exp);if(!ok)bad++;console.log((ok?"PASS ":"FAIL ")+n+(ok?"":"  → "+JSON.stringify(got)+" atteso "+JSON.stringify(exp)));};
const DB={technicians:[{id:"t1",name:"Marco"}],machine_types:[],machines:[],customers:[],maintenance_logs:[],settings:[{id:"layout",themeColor:"blue"}],chat_messages:[],chat_reads:[]};
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript((db)=>{window.__fakeDB=db;localStorage.setItem("mora_tech_last_name","Marco");localStorage.setItem("mora_theme","light");localStorage.setItem("mora_notify_asked_v1","1");localStorage.setItem("mora_hero_hint","9");},DB);
await p.goto("file://"+path.join(OUT,"index.html"));
await p.evaluate(()=>window.mountApp());await p.waitForTimeout(3000);
await p.evaluate(()=>document.querySelector('[data-home-tile="wear"]').click());await p.waitForTimeout(500);await p.evaluate(()=>{const b=document.querySelector('[data-wear-pick="rope"]');if(b)b.click();});await p.waitForTimeout(200);
for(const k of ["valle","terminale","locale","deforma"]){
  await p.click(`[data-wear-i="f_${k}"]`);await p.waitForTimeout(150);
  const ok=await p.evaluate((k)=>!!document.querySelector(`[data-wear-info="f_${k}"] svg`),k);
  check("disegno "+k,ok,true);await p.screenshot({path:`${DIR}/dif_${k}.png`});
  await p.click(`[data-wear-info="f_${k}"] [aria-label="Chiudi"]`);await p.waitForTimeout(100);
}
check("la «i» non spunta la casella",await p.evaluate(()=>[...document.querySelectorAll("[data-wear-flag]")].some(e=>e.checked)),false);
await p.fill('[data-wear-input="d"]',"12");await p.fill('[data-wear-input="b6"]',"4");await p.waitForTimeout(150);
const reg=await p.evaluate(()=>{const e=document.querySelector("[data-wear-register]");return e?e.textContent:"";});
console.log("registro fune:",reg);
check("registro con esito",/Esito: /.test(reg),true);
await p.evaluate(()=>document.querySelector("[data-wear-register]").scrollIntoView({block:"center"}));await p.screenshot({path:`${DIR}/registro_fune.png`});
await p.click('[data-wear-tab="chain"]');await p.waitForTimeout(200);
for(const k of ["cricche","piegata","calore","gancio"]){await p.click(`[data-wear-i="f_${k}"]`);await p.waitForTimeout(150);check("disegno "+k,await p.evaluate((k)=>!!document.querySelector(`[data-wear-info="f_${k}"] svg`),k),true);await p.screenshot({path:`${DIR}/dif_${k}.png`});await p.click(`[data-wear-info="f_${k}"] [aria-label="Chiudi"]`);await p.waitForTimeout(100);}
await p.fill('[data-wear-input="d"]',"10");await p.fill('[data-wear-input="d1"]',"92");await p.waitForTimeout(150);
const rc=await p.evaluate(()=>document.querySelector("[data-wear-register]").textContent);console.log("registro catena:",rc);
check("catena 10, 9,2: idonea, nessun criterio raggiunto",/Esito: IDONEANessun criterio di scarto raggiunto/.test(rc),true);
await p.evaluate(()=>window.dispatchEvent(new CustomEvent("mora-quick-wear",{detail:"catena"})));await p.waitForTimeout(200);
await p.click('[data-quick-input="d"]');for(const c of "10")await p.click(`[data-key="${c}"]`);await p.click('[data-key="next"]');for(const c of "88")await p.click(`[data-key="${c}"]`);await p.waitForTimeout(150);
check("misura rapida: esito sul registro",await p.evaluate(()=>document.querySelector("[data-quick-register]").textContent.includes("DA SCARTARE")),true);
await p.screenshot({path:`${DIR}/registro_rapida.png`});
check("nessun errore",errs,[]);console.log(bad?`${bad} FALLITI`:"TUTTO OK");await b.close();})();
