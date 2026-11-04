// IN CIMA ALLA HOME, LE ALTRE PAGINE DEL CAROSELLO (dopo il carroponte e la misura veloce):
//  - «Da ricontrollare»: funi e catene controllate con l'app più di 3 mesi fa (D.Lgs. 81/2008, All. VI, 3.1.2)
//  - «Il mio mese»: i miei interventi del mese e degli ultimi 6 mesi
//  - «In squadra»: gli ultimi interventi dei colleghi
//  - «La regola del giorno»: una regola delle norme e dei cataloghi già nell'app, parola per parola
import React, { useMemo } from "react";
import { ShieldCheck, BarChart3, Users, BookOpenCheck, ChevronRight } from "lucide-react";
import { MONTHS, isoFromLogDate, isMine } from "../personal";
import { SLING_TEXT, SLING_SOURCE } from "../slingRules";
import { CHAIN_TEXT, CHAIN_SOURCE } from "../chainSlings";

const DAY = 86400000;
const norm = (v) => String(v || "").trim().toUpperCase();
const dateOfLog = (l) => {
  if (l && l.ropeCheck && l.ropeCheck.at) return l.ropeCheck.at;
  const iso = isoFromLogDate(l && l.dateString);
  return iso ? new Date(iso + "T12:00:00").getTime() : 0;
};
const fmtDay = (t) => {
  const d = new Date(t);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const Shell = ({ id, bg, icon: Icon, title, sub, children }) => (
  <div className="h-full min-h-[184px] md:min-h-[220px] lg:min-h-[240px] rounded-3xl p-4 text-white flex flex-col gap-2 shadow-sm relative overflow-hidden" style={{ background: bg }} data-home-widget={id}>
    <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
    <div className="absolute right-10 -bottom-10 w-24 h-24 rounded-full bg-white/10" />
    <div className="flex items-center gap-2 relative">
      <span className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="font-black leading-tight">{title}</p>
        {sub && <p className="text-[11px] font-bold opacity-80 leading-tight truncate">{sub}</p>}
      </div>
    </div>
    <div className="relative flex-1 min-h-0 flex flex-col">{children}</div>
  </div>
);

// ---------------------------------------------------------------- DA RICONTROLLARE
export const dueChecks = (logs = [], now = Date.now()) => {
  const last = {};
  (logs || []).forEach((l) => {
    if (!l || !l.ropeCheck || !l.machineId) return;
    const k = `${norm(l.customer)}|${norm(l.machineId)}`;
    const t = dateOfLog(l);
    if (!last[k] || t > last[k].t) last[k] = { t, customer: l.customer, machineId: l.machineId, type: l.ropeCheck.type === "catena" ? "catena" : "fune" };
  });
  return Object.values(last)
    .map((x) => ({ ...x, due: x.t + 91 * DAY }))
    .filter((x) => x.due - now < 14 * DAY)
    .sort((a, b) => a.due - b.due);
};

export const DueWidget = ({ logs, onOpenMachine, now = Date.now() }) => {
  const list = useMemo(() => dueChecks(logs, now), [logs, now]);
  const late = list.filter((x) => x.due <= now).length;
  return (
    <Shell id="due" bg="linear-gradient(135deg,#0f766e,#0e7490)" icon={ShieldCheck} title="Funi e catene da ricontrollare" sub="Controllo trimestrale · D.Lgs. 81/2008, All. VI, 3.1.2">
      {list.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center" data-due-none>
          <p className="text-2xl font-black">Tutto in regola</p>
          <p className="text-sm font-semibold opacity-90 leading-snug">Nessun controllo fatto con l'app più di 3 mesi fa. Qui compaiono le gru da ricontrollare (e quelle che scadono nelle prossime 2 settimane).</p>
        </div>
      ) : (
        <>
          <p className="text-sm font-bold opacity-95" data-due-count={list.length}>
            {late ? `${late} ${late === 1 ? "scaduta" : "scadute"}` : ""}
            {late && list.length > late ? " · " : ""}
            {list.length > late ? `${list.length - late} in scadenza` : ""}
          </p>
          <ul className="space-y-1.5 mt-1">
            {list.slice(0, 2).map((x) => (
              <li key={`${x.customer}|${x.machineId}`}>
                <button type="button" onClick={() => onOpenMachine && onOpenMachine(x.machineId, x.customer)} className="w-full text-left rounded-2xl bg-white/15 px-3 py-1.5 flex items-center gap-2" data-due-item={x.machineId}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black truncate">
                      {x.customer} · {x.machineId}
                    </span>
                    <span className="block text-[11px] font-bold opacity-90">
                      {x.type === "catena" ? "Catena" : "Fune"} controllata il {fmtDay(x.t)} · {x.due <= now ? `scaduta da ${Math.max(1, Math.round((now - x.due) / DAY))} gg` : `scade tra ${Math.max(1, Math.round((x.due - now) / DAY))} gg`}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-80" />
                </button>
              </li>
            ))}
          </ul>
          {list.length > 2 && <p className="text-[11px] font-bold opacity-80 mt-1">e altre {list.length - 2}</p>}
        </>
      )}
    </Shell>
  );
};

// ---------------------------------------------------------------- IL MIO MESE
export const monthBars = (logs = [], me = "", now = new Date()) => {
  const out = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-`;
    out.push({ m: MONTHS[d.getMonth()].slice(0, 3), n: (logs || []).filter((l) => isMine(l, me) && isoFromLogDate(l.dateString).startsWith(prefix)).length, now: i === 0 });
  }
  return out;
};

export const MonthWidget = ({ logs, me, now = new Date() }) => {
  const bars = useMemo(() => monthBars(logs, me, now), [logs, me, now]);
  const cur = bars[bars.length - 1].n;
  const prev = bars[bars.length - 2].n;
  const max = Math.max(1, ...bars.map((b) => b.n));
  const day = now.getDate();
  // a che punto era il mese scorso allo stesso giorno
  const prevSame = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-`;
    return (logs || []).filter((l) => {
      const iso = isoFromLogDate(l.dateString);
      return isMine(l, me) && iso.startsWith(prefix) && Number(iso.slice(8, 10)) <= day;
    }).length;
  }, [logs, me, now, day]);
  return (
    <Shell id="month" bg="linear-gradient(135deg,#4338ca,#7c3aed)" icon={BarChart3} title={`Il mio ${MONTHS[now.getMonth()].toLowerCase()}`} sub="Interventi come tecnico o in aiuto">
      <div className="flex items-end gap-3 flex-1">
        <div className="shrink-0">
          <p className="font-black tabular-nums leading-none" style={{ fontSize: 56 }} data-month-count>
            {cur}
          </p>
          <p className="text-[11px] font-bold opacity-90 leading-tight mt-1">
            {cur === 1 ? "intervento" : "interventi"}
            <br />
            {prevSame || prev ? `al ${day} del mese scorso: ${prevSame}` : "il mese scorso: 0"}
          </p>
        </div>
        <div className="flex-1 flex items-end gap-1.5 h-24" data-month-bars>
          {bars.map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[10px] font-black tabular-nums opacity-90">{b.n || ""}</span>
              <div className={`w-full rounded-t-lg ${b.now ? "bg-white" : "bg-white/35"}`} style={{ height: `${Math.max(4, (b.n / max) * 70)}%` }} />
              <span className="text-[10px] font-bold opacity-80">{b.m}</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
};

// ---------------------------------------------------------------- IN SQUADRA
const stamp = (l) => (l && l.createdAt && l.createdAt.seconds ? l.createdAt.seconds * 1000 : dateOfLog(l));
export const teamLast = (logs = [], me = "") =>
  (logs || [])
    .filter((l) => l && l.technician && !isMine(l, me) && l.customer)
    .sort((a, b) => stamp(b) - stamp(a))
    .slice(0, 2);

export const TeamWidget = ({ logs, me, onOpenMachine }) => {
  const list = useMemo(() => teamLast(logs, me), [logs, me]);
  return (
    <Shell id="team" bg="linear-gradient(135deg,#c2410c,#db2777)" icon={Users} title="In squadra" sub="Gli ultimi interventi dei colleghi">
      {list.length === 0 ? (
        <p className="text-sm font-semibold opacity-90 flex-1 flex items-center">Ancora nessun intervento dei colleghi.</p>
      ) : (
        <ul className="space-y-1.5 mt-1">
          {list.map((l) => (
            <li key={l.id || `${l.technician}${l.dateString}${l.machineId}`}>
              <button type="button" onClick={() => onOpenMachine && l.machineId && onOpenMachine(l.machineId, l.customer)} className="w-full text-left rounded-2xl bg-white/15 px-3 py-1.5 flex items-center gap-2" data-team-item>
                <span className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center text-sm font-black shrink-0">{String(l.technician).trim().charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black truncate">
                    {l.technician} · {l.customer}
                  </span>
                  <span className="block text-[11px] font-bold opacity-90 truncate">
                    {l.dateString}
                    {l.machineId ? ` · gru ${l.machineId}` : ""}
                    {l.description ? ` · ${String(l.description).split("\n")[0]}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
};

// ---------------------------------------------------------------- LA REGOLA DEL GIORNO (testi già nell'app, parola per parola)
export const RULES = [
  { t: SLING_TEXT.angolo, s: SLING_SOURCE },
  { t: SLING_TEXT.spigoli, s: SLING_SOURCE },
  { t: SLING_TEXT.nodi, s: SLING_SOURCE },
  { t: SLING_TEXT.danneggiate, s: SLING_SOURCE },
  { t: SLING_TEXT.verifiche, s: SLING_SOURCE },
  { t: SLING_TEXT.temperatura, s: SLING_SOURCE },
  { t: SLING_TEXT.chimici, s: SLING_SOURCE },
  { t: CHAIN_TEXT.perno, s: CHAIN_SOURCE },
  { t: CHAIN_TEXT.usura, s: CHAIN_SOURCE },
  { t: "Le funi e le catene debbono essere sottoposte a controlli trimestrali in mancanza di specifica indicazione da parte del fabbricante.", s: "D.Lgs. 81/2008, Allegato VI, punto 3.1.2" },
];
export const ruleOfDay = (now = new Date()) => {
  const start = new Date(now.getFullYear(), 0, 0);
  const n = Math.floor((now - start) / DAY);
  return RULES[n % RULES.length];
};

export const RuleWidget = ({ now = new Date() }) => {
  const r = ruleOfDay(now);
  return (
    <Shell id="rule" bg="linear-gradient(135deg,#1e293b,#334155)" icon={BookOpenCheck} title="La regola del giorno" sub={r.s}>
      <p className="flex-1 flex items-center text-[15px] font-bold leading-snug" data-rule-text>
        «{r.t}»
      </p>
    </Shell>
  );
};
