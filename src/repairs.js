// RIPARAZIONI E VERIFICHE: usato dai grafici di Ufficio, dallo schermo TV e dal riepilogo del mese.
// riparazione = c'è stato da sistemare qualcosa; verifica = controllo periodico senza riparazioni
const FIX = /(sostitu|ripar|guast|rott|cambiat|non funzion|blocc|smontat|rifatt|aggiust|bruciat|spezzat|sistemat|montat)/i;
export const isRepair = (l) => FIX.test(String((l && l.description) || ""));

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

