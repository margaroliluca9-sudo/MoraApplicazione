// DATI DI PROVA per il controllo automatico (clienti inventati). Niente dati veri.
// Viene eseguito dentro la pagina di prova: DB() restituisce le raccolte finte.
const pad = (n) => String(n).padStart(2, "0");
const ago = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return x; };
const dmy = (x) => `${x.getDate()}/${x.getMonth() + 1}/${x.getFullYear()}`;
const iso = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
const NOWS = Math.floor(Date.now() / 1000);
const custs = ["MARIO ROSSI SRL", "BIANCHI LAMIERE", "OFFICINE ESPOSITO", "COLOMBO ACCIAI", "GALLI COSTRUZIONI", "ROMANO METALLI"];
const descs = [
  "Verifica trimestrale. Regolato freno sollevamento. Prove funzionali ok.",
  "Ricerca guasto. Sostituito contattore salita. Prove funzionali ok.",
  "Sostituita fune sollevamento d.10 mm. Controllato finecorsa.",
  "Verifica trimestrale. Fune con lievi distorsioni, da sostituire alla prossima verifica.",
];
const techs = ["Luca", "Marco", "Ivano", "Paolo"];
const machines = [];
custs.forEach((c, i) => [1, 2, 3].forEach((k) => machines.push({ id: `m${i}_${k}`, matricola: String(k), customerName: c, type: k === 2 ? "Paranco a catena" : "Gru a ponte bitrave", capacity: k === 2 ? "1000" : "5000" })));
const AGO = [0, 1, 1, 3, 5, 8, 9, 12, 15, 20];
const logs = Array.from({ length: 36 }, (_, i) => {
  const m = machines[(i * 7) % machines.length];
  const d = ago(i < AGO.length ? AGO[i] : i * 3);
  return { id: "l" + i, dateString: dmy(d), technician: techs[i % 4], additionalTechnicians: i % 3 ? [] : [techs[(i + 1) % 4]], customer: m.customerName, machineId: m.matricola, machineType: m.type, capacity: m.capacity, ticketNumber: String(24100 + i), description: descs[i % 4], createdAt: { seconds: Math.floor(d.getTime() / 1000) - 3600 } };
});
// gru 1 di Mario Rossi: l'ultima volta "fune da sostituire" (per l'assistente)
logs.push({ id: "lx", dateString: dmy(ago(40)), technician: "Marco", additionalTechnicians: [], customer: "MARIO ROSSI SRL", machineId: "1", machineType: "Gru a ponte bitrave", capacity: "5000", description: descs[3], createdAt: { seconds: NOWS - 40 * 86400 } });
// interventi di Luca con pezzi cambiati (per «Cosa ho cambiato»)
const CHG = [
  "Sostituita fune di sollevamento Ø10 mm mt 30. Sostituiti 2 guidafuni.",
  "Ricerca guasto: sostituito contattore discesa LC1D18 24V. Prove ok.",
  "Sostituita fune Ø12 mm lunghezza 45 m. Controllato freno, regolato.",
  "Sostituiti 3 fusibili 10A e un relè termico. Sostituito sensore di sovraccarico.",
  "Montato nuovo finecorsa salita. Prove funzionali ok.",
  "Sostituita pulsantiera 6 tasti con cavo nuovo 8x1,5 mt 6.",
  "Sostituito guidafune Ø10. Ingrassata fune.",
  "Sostituita sicura del gancio. Sostituita lampada di segnalazione.",
  "Sostituite 2 ruote carrello e cuscinetti 6205.",
  "Sostituita fune traslazione Ø8 mm mt 22. Sostituito guidafune.",
  "Sostituito ferodo freno sollevamento. Sostituito motore traslazione carrello 0,75 kW.",
  "Sostituito teleruttore generale. Sostituiti 2 fusibili 4A. Pulsantiera da sostituire alla prossima.",
];
for (let k = 0; k < 44; k++) {
  const m = machines[(k * 5 + 2) % machines.length];
  const d = ago(4 + k * 6);
  logs.push({ id: "lc" + k, dateString: dmy(d), technician: k % 5 === 4 ? "Marco" : "Luca", additionalTechnicians: k % 5 === 4 ? ["Luca"] : [], customer: m.customerName, machineId: m.matricola, machineType: m.type, capacity: m.capacity, ticketNumber: String(25100 + k), description: CHG[k % CHG.length], createdAt: { seconds: Math.floor(d.getTime() / 1000) } });
}
const T0 = iso(new Date());
const DB = () => ({
  technicians: techs.map((n, i) => ({ id: "t" + i, name: n })),
  machine_types: [{ id: "a", name: "Gru a ponte bitrave" }, { id: "b", name: "Paranco a catena" }, { id: "c", name: "Gru a bandiera" }],
  customers: custs.map((n, i) => ({ id: "c" + i, name: n })),
  machines,
  maintenance_logs: JSON.parse(JSON.stringify(logs)),
  settings: [{ id: "layout" }],
  active_users: [
    { id: "s1", technician: "Luca", device: "Mobile", lastActive: { seconds: NOWS - 10 } },
    { id: "s2", technician: "Marco", device: "Mobile", lastActive: { seconds: NOWS - 60 } },
    { id: "s3", technician: "Ivano", device: "Mobile", lastActive: { seconds: NOWS - 200 } },
  ],
  access_logs: [], ignored_conflicts: [], chat_messages: [], chat_reads: [], push_subscriptions: [], home_prefs: [],
  personal_events: [
    { id: "e1", owner: "luca", date: T0, time: "08:30", title: "Rossi – verifica gru 1 e 3", place: "Novara" },
    { id: "e2", owner: "luca", date: iso(ago(-2)), time: "14:00", title: "Esposito – sostituzione fune", place: "Milano" },
  ],
  personal_notes: [
    { id: "n1", owner: "luca", title: "Codici errori inverter", text: "F07 = sovratemperatura\nF12 = sovraccarico", pinned: false, items: [], updatedAt: 1 },
    { id: "n2", owner: "luca", title: "Da tenere nel furgone", text: "", pinned: true, items: [{ t: "Fune 10 mm", done: true }, { t: "Contattori 24V", done: false }], updatedAt: 0 },
  ],
  personal_reminders: [{ id: "r1", owner: "luca", title: "Richiamare sig. Rossi (Mario Rossi Srl)", date: T0, time: "14:00", notify: true, done: false }],
  personal_contacts: [{ id: "k1", owner: "luca", name: "Mario Rossi", role: "Mario Rossi Srl – manutenzione", phone: "+39 333 123 4567" }],
  vans: [{ id: "v1", name: "Furgone di Luca", plate: "EK482TL", users: ["luca", "marco"] }],
  van_items: [
    { id: "i1", vanId: "v1", name: "Contattore LC1D18 24V", words: "contattore, teleruttore", cat: "Elettrico", unit: "pz", qty: 1, min: 2 },
    { id: "i2", vanId: "v1", name: "Fusibili 10A", cat: "Consumo", unit: "pz", qty: 12, min: 5 },
    { id: "i3", vanId: "v1", name: "Finecorsa a leva", words: "finecorsa", cat: "Elettrico", unit: "pz", qty: 0, min: 1 },
    { id: "i4", vanId: "v1", name: "Pulsantiera 6 tasti", cat: "Elettrico", unit: "pz", qty: 2, min: 1 },
  ],
  van_moves: [],
  personal_hours: [2, 3, 4, 5, 6, 8, 9].map((n, i) => ({ id: "luca_" + iso(ago(n)), owner: "luca", date: iso(ago(n)), kind: "lavoro", minutes: [480, 540, 480, 450, 480, 510, 480][i], note: "" })),
});


module.exports = { DB };
