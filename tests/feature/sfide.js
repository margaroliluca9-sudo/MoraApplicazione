const path=require("path");const [G,OUT,DIR]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let bad=0;const check=(n,got,exp)=>{const ok=JSON.stringify(got)===JSON.stringify(exp);if(!ok)bad++;console.log((ok?"PASS ":"FAIL ")+n+(ok?"":"  → "+JSON.stringify(got)+" atteso "+JSON.stringify(exp)));};
const dk=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const GS=[{id:"marco",name:"Marco",owner:"marco",season:2,best:300,stage:4,day:dk(),dayBest:220,medals:"s2:velluto,carroponte"},{id:"ivano",name:"Ivano",owner:"ivano",season:2,best:500,stage:6,day:"2020-01-01",dayBest:999}];
const DB={technicians:[{id:"t1",name:"Luca"}],machine_types:[],machines:[],customers:[],maintenance_logs:[],settings:[{id:"layout",themeColor:"blue"}],chat_messages:[],chat_reads:[],game_scores:GS};
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript((db)=>{window.__fakeDB=db;window.__moraTest=1;},DB);await p.goto("file://"+path.join(OUT,"index.html"));
console.log("== Motore");
const r=await p.evaluate(()=>{const M=window.__require("@/game/engine");const run=(e,s)=>{for(let i=0;i<s*60;i++)e.update(1/60);};const out={};
 // stessi camion per tutti
 const seq=()=>{const e=new M.CraneEngine({vh:720});e.startDaily(20261103);const l=[];for(let k=0;k<6;k++){e.truck=null;e.newTruck();l.push(e.truck.slots.map(s=>s.kind).join("+")+"|"+e.truck.color);}return l.join(",");};
 out.uguali=seq()===seq();
 const e2=new M.CraneEngine({vh:720});e2.startDaily(20261104);const l2=[];for(let k=0;k<6;k++){e2.truck=null;e2.newTruck();l2.push(e2.truck.slots.map(s=>s.kind).join("+"));}
 // tempo
 const e=new M.CraneEngine({vh:720});const ev=[];e.onEvent=(x)=>ev.push(x.type==="medal"?"medal:"+x.id:x.type);e.startDaily();e.nextTruck=1e9;run(e,181);
 out.finita=[e.over,ev.includes("over"),ev.includes("medal:sfida")];
 // camion speciali
 let urg=0,vet=0;const e3=new M.CraneEngine({vh:720});e3.startAt(7);for(let k=0;k<300;k++){e3.truck=null;e3.newTruck();if(e3.truck.special==="urgente")urg++;if(e3.truck.special==="vetri"){vet++;out.tuttoVetro=e3.truck.slots.every(s=>s.kind==="vetro");}}
 out.speciali=[urg>10,vet>10];
 const e4=new M.CraneEngine({vh:720});e4.startAt(1);let sp=0;for(let k=0;k<200;k++){e4.truck=null;e4.newTruck();if(e4.truck.special)sp++;}out.livello1Normali=sp===0;
 // muletto
 const e5=new M.CraneEngine({vh:720});e5.nextTruck=1e9;e5.items=[];const ok=e5.deliver({id:999,kind:"cassa",w:42,h:34,x:0,y:0},1);
 out.mulettoParte=[ok,e5.forks.length,e5.items[0].carried,e5.surface(72,20).top===null];
 run(e5,4);out.mulettoArriva=[e5.items[0].carried,e5.surface(72,20).top===e5.items[0]];run(e5,4);out.mulettoVia=e5.forks.length;
 // medaglie di livello
 const e6=new M.CraneEngine({vh:720});const md=[];e6.onEvent=(x)=>x.type==="medal"&&md.push(x.id);e6.startAt(3);e6.nextStage();e6.stage=7;e6.nextStage();out.medaglie=md;
 // meteo
 out.meteo=[1,8,9].map(st=>{const x=new M.CraneEngine({vh:720});x.startAt(st);return x.weather;});
 return out;});
check("sfida: stessi camion per tutti quel giorno",r.uguali,true);
check("sfida: dopo 3 minuti finisce, medaglia Sfidante",r.finita,[true,true,true]);
check("camion speciali dal livello giusto",r.speciali,[true,true]);
check("camion tutto vetro",r.tuttoVetro,true);
check("livello 1: niente speciali",r.livello1Normali,true);
check("muletto: parte col pezzo (non si può prendere)",r.mulettoParte,[true,1,true,true]);
check("muletto: arriva e lo posa",r.mulettoArriva,[false,true]);
check("muletto: poi se ne va",r.mulettoVia,0);
check("medaglie carroponte, porto, senza graffi",r.medaglie,["carroponte","porto","graffi"]);
check("meteo: capannone sereno, porto 8 sereno, 9 pioggia",r.meteo,["sereno","sereno","pioggia"]);
console.log("== Gioco");
await p.evaluate(()=>window.mountComponent("CraneGame",{me:"Luca",onClose(){window.__closed=1;}}));await p.waitForTimeout(900);
await p.screenshot({path:`${DIR}/1_inizio.png`});
await p.click('[data-action="game-medals"]');await p.waitForTimeout(200);
check("medaglie: 10, tutte da vincere",await p.evaluate(()=>[document.querySelectorAll("[data-medal]").length,document.querySelectorAll('[data-medal-on="1"]').length]),[10,0]);
await p.click('[data-game-view="board"]');await p.waitForTimeout(200);await p.click('[data-board-tab="day"]');await p.waitForTimeout(200);
check("classifica sfida di oggi: solo chi l'ha fatta oggi",await p.evaluate(()=>[1,2].map(n=>{const e=document.querySelector(`[data-podium="${n}"]`);return e&&e.getAttribute("data-podium-name");})),["Marco",null]);
check("medaglie accanto al nome",await p.evaluate(()=>document.querySelector('[data-podium="1"]').textContent.includes("🏅 2")),true);
await p.screenshot({path:`${DIR}/2_oggi.png`});
await p.click('[data-game-view="play"]');await p.click('[data-action="game-daily"]');await p.waitForTimeout(700);
check("sfida: tempo in alto",await p.evaluate(()=>document.querySelector("[data-game-timer]").textContent.replace(/\s+/g,"")),"TEMPO3:00");
check("sfida in corso nel motore",await p.evaluate(()=>window.__crane.mode),"daily");
await p.evaluate(()=>{window.__crane.medal("velluto");});await p.waitForTimeout(250);
check("cartello nuova medaglia",await p.evaluate(()=>{const t=document.querySelector("[data-game-medal-toast]");return t&&t.textContent;}),"🧤NUOVA MEDAGLIAMano di velluto");
await p.screenshot({path:`${DIR}/3_sfida.png`});
check("medaglia salvata",await p.evaluate(()=>[JSON.parse(localStorage.getItem("mora_crane_medals_s2")),window.__writes.some(w=>w.includes("medals")&&w.includes("s2:velluto"))]),[["velluto"],true]);
await p.evaluate(()=>{window.__writes.length=0;const e=window.__crane;e.score=410;e.timeLeft=0.05;});await p.waitForTimeout(1500);
check("sfida finita: schermata",await p.evaluate(()=>document.querySelector("[data-game-end]").textContent.includes("SFIDA DEL GIORNO")),true);
check("sfida: salvata solo come record di oggi",await p.evaluate(()=>{const w=window.__writes.map(x=>JSON.parse(x)).filter(x=>/game_scores\/luca/.test(x[1])&&x[2][0].dayBest!==undefined).map(x=>[x[2][0].dayBest,x[2][0].best]);return w;}),[[410,0]]);
check("sfida: non tocca la partita salvata",await p.evaluate(()=>window.__writes.some(w=>w.includes('"save":""'))),false);
check("primo nella sfida di oggi",await p.evaluate(()=>{const e=document.querySelector('[data-game-end] [data-podium="1"]');return e&&e.getAttribute("data-podium-name");}),"Luca");
await p.screenshot({path:`${DIR}/4_fine_sfida.png`,fullPage:true});
check("nessun errore",errs,[]);console.log(bad?`${bad} FALLITI`:"TUTTO OK");await b.close();})();
