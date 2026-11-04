const path=require("path");const [G,OUT,SH]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let f=0;const check=(l,a,e)=>{const ok=JSON.stringify(a)===JSON.stringify(e);if(!ok)f++;console.log((ok?"PASS ":"FAIL ")+l+(ok?"":"\n   atteso "+JSON.stringify(e)+"\n   ottenuto "+JSON.stringify(a)));};
// foto finta: quadrato arancione 40x40
const N=Math.floor(Date.now()/1000);
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));
await p.goto("about:blank");const PH=await p.evaluate(()=>{const c=document.createElement("canvas");c.width=c.height=64;const x=c.getContext("2d");x.fillStyle="#f97316";x.fillRect(0,0,64,64);x.fillStyle="#fff";x.beginPath();x.arc(32,26,12,0,7);x.fill();x.fillRect(14,42,36,22);return c.toDataURL("image/jpeg");});
const DB={technicians:[{id:"t1",name:"Marco",photoAt:7},{id:"t2",name:"Ale"}],tech_photos:[{id:"t1",data:PH,at:7}],machine_types:[],machines:[],customers:[{id:"c1",name:"BIANCHI LAMIERE"}],settings:[{id:"layout"}],
maintenance_logs:[{id:"l1",customer:"BIANCHI LAMIERE",machineId:"4100",technician:"Marco",additionalTechnicians:["Ale"],description:"Verifica trimestrale.",dateString:"30/10/2026",createdAt:{seconds:N-7200}},{id:"l2",customer:"BIANCHI LAMIERE",machineId:"4101",technician:"Ale",description:"Cambio pulsantiera.",dateString:"29/10/2026",createdAt:{seconds:N-90000}}]};
await p.addInitScript((db)=>{window.__fakeDB=db;localStorage.setItem("mora_tech_last_name","Ale");localStorage.setItem("mora_notify_asked_v1","1");localStorage.setItem("mora_notify_install_tip","1");localStorage.setItem("mora_hero_hint","9");},DB);
await p.goto("file://"+path.join(OUT,"index.html"));await p.evaluate(()=>window.mountApp());await p.waitForTimeout(3300);
await p.evaluate(()=>document.querySelector('[data-home-tile="history"]').click());await p.waitForTimeout(1200);
const faces=await p.evaluate(()=>[...document.querySelectorAll("[data-tech-faces]")].map(f=>[...f.querySelectorAll("img,span.rounded-full")].map(x=>x.tagName==="IMG"?"foto":x.textContent.trim())));
check("Marco con la foto, Ale con l'iniziale",faces,[["foto","A"],["A"]]);
if(SH){await p.evaluate(()=>document.querySelector("[data-tech-faces]").scrollIntoView({block:"center"}));await p.screenshot({path:SH+"/storico_foto.png"});}
check("nessun errore",errs,[]);console.log(f?f+" PROBLEMI":"TUTTO OK");await b.close();})();
