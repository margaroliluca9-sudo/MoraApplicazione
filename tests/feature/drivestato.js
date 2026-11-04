const path=require("path");const [G,OUT,SHDIR]=process.argv.slice(2);const {chromium}=require(path.join(G,"playwright"));
let f=0;const check=(l,a,e)=>{const ok=JSON.stringify(a)===JSON.stringify(e);if(!ok)f++;console.log((ok?"PASS ":"FAIL ")+l+(ok?"":`\n   atteso ${JSON.stringify(e)}\n   ottenuto ${JSON.stringify(a)}`));};
const ago=(h)=>new Date(Date.now()-h*3600e3).toISOString();
const base={finito:"sì",cartelleTotali:212,cartelleAbbinate:150,gruTotali:640,errori:0,erroriLista:"[]",lette:12,aggiornati:2,gru:30,durata:210};
const CASES=[
["verde",{id:"drive_places",...base,lastRun:ago(3)},"emerald",/Tutto a posto/],
["giallo-parte",{id:"drive_places",...base,lastRun:ago(3),finito:"no"},"amber",/solo una parte/],
["giallo-errori",{id:"drive_places",...base,lastRun:ago(3),errori:2,erroriLista:JSON.stringify(["ROMANO METALLI: file rovinato","GALLI: tabella vuota"])},"amber",/2 cartelle non le ha lette/],
["rosso-vecchio",{id:"drive_places",...base,lastRun:ago(80)},"red",/Non gira da 3 giorni/],
["rosso-errore",{id:"drive_places",...base,lastRun:ago(20),lastError:"Non trovo la cartella Clienti / Verifiche",lastErrorAt:ago(2)},"red",/si è fermato con un errore.*Non trovo la cartella/],
["v4-vecchia",{id:"drive_places",lastRun:ago(2),cartelle:212,lette:200,abbinati:150,aggiornati:5,gru:600,finito:"sì"},"emerald",/Tutto a posto/],
["mai",null,"slate",/non è ancora partito/],
];
(async()=>{const b=await chromium.launch();const errs=[];
for(const [name,doc,tone,re] of CASES){const p=await b.newPage({viewport:{width:390,height:700},deviceScaleFactor:2});p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript((d)=>{window.__fakeDB={settings:d?[d]:[]};},doc);await p.goto("file://"+path.join(OUT,"index.html"));
await p.evaluate(()=>window.mountComponent("DrivePlacesStatus",{}));await p.waitForTimeout(400);
const r=await p.evaluate(()=>{const e=document.querySelector("[data-drive-health]");return e?[e.dataset.driveHealth,e.innerText.replace(/\s+/g," ")]:null;});
console.log("   ",name,r&&r[1]);
check(name,[r&&r[0],!!r&&re.test(r[1])],[tone,true]);
if(SHDIR&&["verde","giallo-errori","rosso-vecchio"].includes(name)){await p.evaluate(()=>{const d=document.querySelector("details");if(d)d.open=true;document.getElementById("root").style.padding="16px";});await p.screenshot({path:SHDIR+"/stato_"+name+".png"});}
await p.close();}
check("nessun errore",errs,[]);console.log(f?f+" PROBLEMI":"TUTTO OK");await b.close();})();
