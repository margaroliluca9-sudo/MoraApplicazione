const path=require("path");const [G,OUT,DIR]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let bad=0;const check=(n,got,exp)=>{const ok=JSON.stringify(got)===JSON.stringify(exp);if(!ok)bad++;console.log((ok?"PASS ":"FAIL ")+n+(ok?"":"  → "+JSON.stringify(got)+" atteso "+JSON.stringify(exp)));};
const N=Math.floor(Date.now()/1000);
const DB={technicians:[{id:"t1",name:"Luca"}],machine_types:[],machines:[{id:"m1",matricola:"4868",customerName:"PROVA SRL",type:"Sottoganci"},{id:"m2",matricola:"4100",customerName:"PROVA SRL",type:"Monotrave"}],customers:[{id:"c1",name:"PROVA SRL"}],
maintenance_logs:[{id:"l1",customer:"PROVA SRL",machineId:"4868",machineType:"Sottoganci",capacity:"150",technician:"Luca",description:"bilancino storto",dateString:"02/11/2026",createdAt:{seconds:N-3600}},{id:"l2",customer:"PROVA SRL",machineId:"83530",machineType:"Impianto sospeso",technician:"Luca",description:"tampone",dateString:"02/11/2026",createdAt:{seconds:N-7200}},{id:"l3",customer:"PROVA SRL",machineId:"4100",machineType:"Monotrave",technician:"Luca",description:"verifica",dateString:"02/11/2026",createdAt:{seconds:N-9000}}],
settings:[{id:"layout",themeColor:"blue"}],chat_messages:[],chat_reads:[]};
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript((db)=>{window.__fakeDB=db;localStorage.setItem("mora_tech_last_name","Luca");localStorage.setItem("mora_theme","light");localStorage.setItem("mora_notify_asked_v1","1");localStorage.setItem("mora_hero_hint","9");},DB);
await p.goto("file://"+path.join(OUT,"index.html"));
console.log("== Gioco: pezzo sbagliato rimesso a terra");
const r=await p.evaluate(()=>{const {CraneEngine}=window.__require("@/game/engine");const out={};
 const run=(e,s)=>{for(let i=0;i<s*60;i++)e.update(1/60);};
 const e=new CraneEngine({vh:720});e.nextTruck=1e9; // niente camion
 // prendo il pezzo della piazzola 0 (x 26)
 e.setTarget(26);run(e,2);e.press(true);run(e,3);e.press(false);run(e,2);
 out.preso=!!e.load;
 // lo porto tra due piazzole (x 50) e lo appoggio
 e.setTarget(50);run(e,2.5);e.press(true);run(e,3);e.press(false);run(e,1.5);
 out.appoggiato=!e.load;
 const xs=e.items.filter(o=>!o.onTruck).map(o=>Math.round(o.x));out.tuttiInPiazzola=xs.every(x=>[26,72,116].includes(x));
 out.pile=[26,72,116].map(x=>e.stackAt(x).length);
 // ne prendo un altro e provo ad appoggiarlo nella corsia del camion (x 250) senza camion
 e.setTarget(116);run(e,2.5);e.press(true);run(e,3);e.press(false);run(e,2);out.preso2=!!e.load;
 e.setTarget(250);run(e,3);e.press(true);run(e,3);out.inCorsiaAncoraAppeso=!!e.load;e.press(false);run(e,2);
 // lo riporto al magazzino: va nella piazzola libera
 e.setTarget(90);run(e,3);e.press(true);run(e,3);e.press(false);run(e,1.5);out.appoggiato2=!e.load;
 out.xs2=e.items.filter(o=>!o.onTruck).map(o=>Math.round(o.x)).every(x=>[26,72,116].includes(x));
 out.max2=Math.max(...[26,72,116].map(x=>e.stackAt(x).length));
 return out;});
check("prende il pezzo",r.preso,true);
check("appoggiato tra due piazzole",r.appoggiato,true);
check("finisce dritto in una piazzola",r.tuttiInPiazzola,true);
check("nella corsia senza camion il gancio non lo appoggia",[r.preso2,r.inCorsiaAncoraAppeso],[true,true]);
check("riportato al magazzino: in piazzola, massimo 2 per pila",[r.appoggiato2,r.xs2,r.max2<=2],[true,true,true]);
console.log("== Gru o Matr.");
await p.evaluate(()=>window.mountApp());await p.waitForTimeout(3000);await p.evaluate(()=>document.querySelector('[data-nav="history"]').click());await p.waitForTimeout(800);
const labels=await p.evaluate(()=>[...document.querySelectorAll('button[aria-label^="Scheda della gru"]')].map(b=>b.textContent.split("·")[0].trim()));
check("Storico: Matr. per sottoganci e impianto sospeso, Gru per il monotrave",labels,["Matr. 4868","Matr. 83530","Gru 4100"]);
await p.screenshot({path:`${DIR}/storico.png`});
check("nessun errore",errs,[]);console.log(bad?`${bad} FALLITI`:"TUTTO OK");await b.close();})();
