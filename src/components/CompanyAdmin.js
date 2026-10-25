// AREA ADMIN → «Azienda»: cose che negli anni cambiano, senza dover riprogrammare l'app.
//  - intestazione dei fogli stampati
//  - password di admin e tecnici
//  - avvisi nella scritta della Home (con data di inizio e fine)
//  - chiusure aziendali (Le mie ore e promemoria delle ore)
// Tutto in settings/azienda (vedi company.js).
import React, { useEffect, useState } from "react";
import { doc } from "firebase/firestore";
import { setDoc } from "../tracked";
import { Building2, KeyRound, Megaphone, CalendarOff, Trash2, Plus, Check } from "lucide-react";
import { db, appId } from "../firebase";
import { COMPANY_DEFAULT, COMPANY_FIELDS, companySettings, onCompanyChange, activeNotices, closureOf } from "../company";
import { isAdminPassword, passwordHash } from "../passwords";
import { describeError } from "../utils";

const INPUT =
  "w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-slate-400";
const save = (patch) => setDoc(doc(db, "artifacts", appId, "public", "data", "settings", "azienda"), patch, { merge: true });
const pad = (n) => String(n).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const itDate = (iso) => (iso ? `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}${iso.slice(0, 4) ? "/" + iso.slice(0, 4) : ""}` : "");
const dayMonth = (iso) => (iso ? `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}` : "");
const newId = () => Math.random().toString(36).slice(2, 10);

const Section = ({ icon: Icon, title, text, color, children, id }) => (
  <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4" data-company={id}>
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-2xl bg-${color}-100 text-${color}-700 flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <h3 className="font-black text-slate-800 text-base leading-tight">{title}</h3>
        <p className="text-sm text-slate-500 leading-snug">{text}</p>
      </div>
    </div>
    {children}
  </section>
);
const Btn = ({ children, color, ...p }) => (
  <button
    type="button"
    {...p}
    className={`h-11 px-5 rounded-full bg-${color}-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${p.className || ""}`}
  >
    {children}
  </button>
);
const Msg = ({ m }) => (m ? <p className={`text-sm font-semibold ${m.ok ? "text-emerald-700" : "text-red-600"}`} data-company-msg>{m.text}</p> : null);

// --- intestazione ---
const Header = ({ color, cur }) => {
  const [v, setV] = useState(() => ({ ...COMPANY_DEFAULT, ...(cur.company || {}) }));
  const [m, setM] = useState(null);
  const go = async (val) => {
    try {
      await save({ company: val });
      setV({ ...COMPANY_DEFAULT, ...val });
      setM({ ok: true, text: "Salvato: i prossimi fogli stampati avranno questi dati." });
    } catch (e) {
      setM({ ok: false, text: "Non salvato: " + describeError(e) });
    }
  };
  return (
    <Section id="header" icon={Building2} color={color} title="Intestazione dei fogli stampati" text="In alto su ogni rapporto e elenco stampato, accanto al logo.">
      <div className="space-y-3">
        {COMPANY_FIELDS.map(([k, label]) => (
          <label key={k} className="block">
            <span className="text-xs font-bold text-slate-500 ml-1">{label}</span>
            <input className={INPUT} value={v[k] || ""} maxLength={90} onChange={(e) => setV({ ...v, [k]: e.target.value })} data-company-field={k} />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Btn color={color} onClick={() => go(v)} data-action="save-header">
          <Check className="w-4 h-4" /> Salva
        </Btn>
        <button type="button" className="h-11 px-4 rounded-full bg-slate-100 text-slate-700 font-bold text-sm" onClick={() => go({ ...COMPANY_DEFAULT })}>
          Rimetti quelli originali
        </button>
      </div>
      <Msg m={m} />
    </Section>
  );
};

// --- password ---
const Passwords = ({ color }) => {
  const [who, setWho] = useState("staff");
  const [cur, setCur] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [m, setM] = useState(null);
  const go = async () => {
    if (!isAdminPassword(cur)) return setM({ ok: false, text: "La password admin attuale non è giusta." });
    if (a.trim().length < 4) return setM({ ok: false, text: "La nuova password deve avere almeno 4 caratteri." });
    if (a !== b) return setM({ ok: false, text: "Le due nuove password non sono uguali." });
    try {
      await save(who === "admin" ? { adminHash: passwordHash(a) } : { staffHash: passwordHash(a) });
      setCur("");
      setA("");
      setB("");
      setM({ ok: true, text: who === "admin" ? "Password admin cambiata. Vale da subito su tutti i telefoni collegati." : "Password dei tecnici cambiata. Ricordati di dirla ai colleghi: chi è già dentro non deve rifare l'accesso." });
    } catch (e) {
      setM({ ok: false, text: "Non cambiata: " + describeError(e) });
    }
  };
  return (
    <Section id="passwords" icon={KeyRound} color={color} title="Password" text="Cambiale quando serve (per esempio se un tecnico lascia l'azienda).">
      <div className="flex gap-2" role="group">
        {[
          ["staff", "Tecnici"],
          ["admin", "Admin"],
        ].map(([id, l]) => (
          <button
            key={id}
            type="button"
            aria-pressed={who === id}
            onClick={() => setWho(id)}
            className={`h-10 px-4 rounded-full font-bold text-sm ${who === id ? `bg-${color}-600 text-white` : "bg-slate-100 text-slate-600"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <input className={INPUT} type="password" autoComplete="current-password" placeholder="Password admin attuale" value={cur} onChange={(e) => setCur(e.target.value)} data-pw="current" />
        <input className={INPUT} type="password" autoComplete="new-password" placeholder="Nuova password" value={a} onChange={(e) => setA(e.target.value)} data-pw="new" />
        <input className={INPUT} type="password" autoComplete="new-password" placeholder="Ripeti la nuova" value={b} onChange={(e) => setB(e.target.value)} data-pw="repeat" />
      </div>
      <Btn color={color} onClick={go} data-action="save-password">
        <KeyRound className="w-4 h-4" /> Cambia password {who === "admin" ? "admin" : "dei tecnici"}
      </Btn>
      <Msg m={m} />
    </Section>
  );
};

// --- avvisi in Home ---
const Notices = ({ color, cur }) => {
  const list = Array.isArray(cur.notices) ? cur.notices : [];
  const today = isoOf(new Date());
  const week = isoOf(new Date(Date.now() + 7 * 864e5));
  const [v, setV] = useState({ text: "", from: today, to: week });
  const [m, setM] = useState(null);
  const shown = activeNotices(new Date(), list);
  const add = async () => {
    if (!v.text.trim()) return setM({ ok: false, text: "Scrivi il testo dell'avviso." });
    if (v.to < v.from) return setM({ ok: false, text: "La data di fine è prima di quella di inizio." });
    try {
      await save({ notices: [...list.filter((n) => n.to >= today), { id: newId(), text: v.text.trim().slice(0, 120), from: v.from, to: v.to }] });
      setV({ text: "", from: today, to: week });
      setM({ ok: true, text: "Avviso aggiunto." });
    } catch (e) {
      setM({ ok: false, text: "Non salvato: " + describeError(e) });
    }
  };
  const del = (id) => save({ notices: list.filter((n) => n.id !== id) }).catch(() => {});
  return (
    <Section id="notices" icon={Megaphone} color={color} title="Avvisi in Home" text="Escono nella scritta in cima alla Home, solo nei giorni che scegli. Poi spariscono da soli.">
      {list.length > 0 && (
        <ul className="space-y-2">
          {[...list].sort((x, y) => String(x.from).localeCompare(String(y.from))).map((n) => {
            const past = n.to < today;
            return (
              <li key={n.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${past ? "border-slate-100 opacity-60" : "border-slate-200"}`} data-notice={n.id}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 text-sm break-words">📢 {n.text}</p>
                  <p className="text-xs text-slate-500">
                    {itDate(n.from)} – {itDate(n.to)}
                    {shown.includes(String(n.text).trim()) ? " · si vede adesso" : past ? " · finito" : " · in arrivo"}
                  </p>
                </div>
                <button type="button" aria-label="Togli avviso" onClick={() => del(n.id)} className="w-10 h-10 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="space-y-3">
        <input className={INPUT} placeholder="Es. Venerdì riunione alle 8 in officina" maxLength={120} value={v.text} onChange={(e) => setV({ ...v, text: e.target.value })} data-notice-text />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-500 ml-1">Dal</span>
            <input type="date" className={INPUT} value={v.from} onChange={(e) => setV({ ...v, from: e.target.value })} data-notice-from />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500 ml-1">Al</span>
            <input type="date" className={INPUT} value={v.to} onChange={(e) => setV({ ...v, to: e.target.value })} data-notice-to />
          </label>
        </div>
        <Btn color={color} onClick={add} data-action="add-notice">
          <Plus className="w-4 h-4" /> Aggiungi avviso
        </Btn>
      </div>
      <Msg m={m} />
    </Section>
  );
};

// --- chiusure aziendali ---
const Closures = ({ color, cur }) => {
  const list = Array.isArray(cur.closures) ? cur.closures : [];
  const today = isoOf(new Date());
  const [v, setV] = useState({ label: "", from: today, to: today, kind: "ferie", yearly: false });
  const [m, setM] = useState(null);
  const add = async () => {
    if (v.to < v.from && !v.yearly) return setM({ ok: false, text: "La data di fine è prima di quella di inizio." });
    try {
      await save({ closures: [...list, { id: newId(), label: v.label.trim().slice(0, 60) || "Chiusura aziendale", from: v.from, to: v.to, kind: v.kind, yearly: !!v.yearly }] });
      setV({ label: "", from: today, to: today, kind: "ferie", yearly: false });
      setM({ ok: true, text: "Chiusura aggiunta." });
    } catch (e) {
      setM({ ok: false, text: "Non salvato: " + describeError(e) });
    }
  };
  const del = (id) => save({ closures: list.filter((c) => c.id !== id) }).catch(() => {});
  const now = closureOf(today, list);
  return (
    <Section
      id="closures"
      icon={CalendarOff}
      color={color}
      title="Chiusure aziendali"
      text="Ferie collettive, ponti, il santo patrono… In «Le mie ore» quei giorni si segnano da soli e il promemoria delle ore non arriva."
    >
      {now && <p className="text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">Oggi: {now.label}</p>}
      {list.length > 0 && (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200" data-closure={c.id}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 text-sm break-words">{c.label}</p>
                <p className="text-xs text-slate-500">
                  {c.yearly ? `ogni anno dal ${dayMonth(c.from)} al ${dayMonth(c.to)}` : `dal ${itDate(c.from)} al ${itDate(c.to)}`} · {c.kind === "festa" ? "festa" : "ferie"}
                </p>
              </div>
              <button type="button" aria-label="Togli chiusura" onClick={() => del(c.id)} className="w-10 h-10 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-3">
        <input className={INPUT} placeholder="Es. Ferie d'agosto" maxLength={60} value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} data-closure-label />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-500 ml-1">Dal</span>
            <input type="date" className={INPUT} value={v.from} onChange={(e) => setV({ ...v, from: e.target.value, to: e.target.value > v.to ? e.target.value : v.to })} data-closure-from />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500 ml-1">Al</span>
            <input type="date" className={INPUT} value={v.to} onChange={(e) => setV({ ...v, to: e.target.value })} data-closure-to />
          </label>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {[
            ["ferie", "Conta come ferie"],
            ["festa", "Conta come festa"],
          ].map(([id, l]) => (
            <button
              key={id}
              type="button"
              aria-pressed={v.kind === id}
              onClick={() => setV({ ...v, kind: id })}
              className={`h-10 px-4 rounded-full font-bold text-sm ${v.kind === id ? `bg-${color}-600 text-white` : "bg-slate-100 text-slate-600"}`}
            >
              {l}
            </button>
          ))}
          <label className="flex items-center gap-2 h-10 px-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" className="w-5 h-5" checked={v.yearly} onChange={(e) => setV({ ...v, yearly: e.target.checked })} data-closure-yearly /> Ogni anno
          </label>
        </div>
        <Btn color={color} onClick={add} data-action="add-closure">
          <Plus className="w-4 h-4" /> Aggiungi chiusura
        </Btn>
      </div>
      <Msg m={m} />
    </Section>
  );
};

export const CompanyAdmin = ({ color = "blue" }) => {
  const [cur, setCur] = useState(companySettings());
  useEffect(() => onCompanyChange((c) => setCur(c)), []);
  return (
    <div className="space-y-4 max-w-3xl" data-section="company-admin">
      <Notices color={color} cur={cur} />
      <Closures color={color} cur={cur} />
      <Header color={color} cur={cur} />
      <Passwords color={color} />
    </div>
  );
};
