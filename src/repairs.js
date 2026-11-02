// RIPARAZIONI E VERIFICHE: usato dai grafici di Ufficio, dallo schermo TV e dal riepilogo del mese.
// riparazione = c'è stato da sistemare qualcosa; verifica = controllo periodico senza riparazioni
const FIX = /(sostitu|ripar|guast|rott|cambiat|non funzion|blocc|smontat|rifatt|aggiust|bruciat|spezzat|sistemat|montat)/i;
export const isRepair = (l) => FIX.test(String((l && l.description) || ""));

// tipo di lavoro per l'etichetta colorata dello Storico (dalla descrizione)
const INSTALL = /(installa|nuova gru|nuovo impianto|messa in servizio|collaud)/i;
const CHECK = /(verific|trimestral|annual|controll|ispezion|manutenzione periodica)/i;
export const workKind = (l) => {
  const d = String((l && l.description) || "");
  if (INSTALL.test(d)) return { id: "install", label: "Installazione", tone: "bg-sky-50 text-sky-700 border-sky-200" };
  if (isRepair(l)) return { id: "repair", label: "Riparazione", tone: "bg-orange-50 text-orange-700 border-orange-200" };
  if (CHECK.test(d)) return { id: "check", label: "Verifica", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  return { id: "other", label: "Intervento", tone: "bg-slate-50 text-slate-600 border-slate-200" };
};

export const officeCharts = (logs, top = 8) => {
  const cranes = new Map();
  const clients = new Map();
  logs.forEach((l) => {
    const fix = isRepair(l);
    const c = String(l.customer || "").trim();
    if (!c) return;
    const k = `${c}|${l.machineId || ""}`;
    if (fix) {
      const x = cranes.get(k) || { customer: c, machineId: l.machineId || "", type: l.machineType || "", n: 0, logs: [] };
      x.n += 1;
      x.logs.push(l);
      cranes.set(k, x);
    }
    const y = clients.get(c) || { customer: c, check: 0, fix: 0, logs: [] };
    if (fix) y.fix += 1;
    else y.check += 1;
    y.logs.push(l);
    clients.set(c, y);
  });
  return {
    cranes: [...cranes.values()].sort((a, b) => b.n - a.n || a.customer.localeCompare(b.customer)).slice(0, top),
    clients: [...clients.values()].sort((a, b) => b.check + b.fix - (a.check + a.fix) || a.customer.localeCompare(b.customer)).slice(0, top),
  };
};

