// La mia area → ⚙ Impostazioni: le scelte personali (valgono per questo telefono)
import React, { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, MessageCircle, CalendarClock, Sparkles, Users, Send, Timer } from "lucide-react";
import { PanelHeader } from "./PersonalUi";
import { getPushState, enablePush, disablePush } from "../../chat";
import { getSettings, setSetting, syncNotifyKinds, testNotification, markAsked } from "../../settings";
import { describeError } from "../../utils";

// interruttore grande, facile da toccare
export const Switch = ({ on, onChange, disabled, label, id }) => (
  <button
    type="button"
    role="switch"
    aria-checked={!!on}
    aria-label={label}
    data-switch={id}
    disabled={disabled}
    onClick={() => onChange(!on)}
    className={`relative w-14 h-8 rounded-full shrink-0 transition-colors disabled:opacity-40 ${on ? "bg-emerald-500" : "bg-slate-300"}`}
  >
    <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`} />
  </button>
);

const Row = ({ icon: Icon, title, sub, children, dim }) => (
  <div className={`flex items-center gap-3 py-3 ${dim ? "opacity-50" : ""}`}>
    <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5" />
    </span>
    <span className="flex-1 min-w-0">
      <span className="block font-bold text-slate-800 leading-tight">{title}</span>
      {sub && <span className="block text-xs text-slate-500 leading-snug mt-0.5">{sub}</span>}
    </span>
    {children}
  </div>
);

const PUSH_HELP = {
  denied: "Le notifiche sono bloccate dal telefono. Per riattivarle: impostazioni del telefono → Notifiche (o del browser) → Assistenza Mora → Consenti. Poi torna qui.",
  install: "Sull'iPhone le notifiche funzionano solo con l'app installata: in Safari tocca Condividi → «Aggiungi alla schermata Home», poi apri l'app da lì e torna qui.",
  unsupported: "Questo telefono o browser non supporta le notifiche.",
};

export const SettingsPanel = ({ me, color = "blue", onBack, onClose }) => {
  const [push, setPush] = useState("checking");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [st, setSt] = useState(getSettings);
  useEffect(() => {
    let alive = true;
    getPushState().then((s) => alive && setPush(s));
    return () => {
      alive = false;
    };
  }, []);
  const change = (k, v) => {
    const next = setSetting(k, v);
    setSt(next);
    if ((k === "chat" || k === "reminders") && push === "on") syncNotifyKinds(next).catch(() => {});
  };
  const togglePush = async (want) => {
    setBusy(true);
    setErr("");
    setOk("");
    markAsked();
    try {
      if (want) {
        await enablePush(me); // dentro il tocco: l'iPhone lo pretende
        await syncNotifyKinds(getSettings()).catch(() => {});
      } else await disablePush();
    } catch (e) {
      setErr(describeError(e));
    }
    setPush(await getPushState());
    setBusy(false);
  };
  const test = async () => {
    setErr("");
    try {
      await testNotification();
      setOk("Notifica di prova inviata: guarda in alto sul telefono.");
    } catch (e) {
      setErr(describeError(e));
    }
  };
  const pushOn = push === "on";
  const canToggle = push === "on" || push === "off";

  return (
    <div className="flex flex-col h-full" data-section="area-settings">
      <PanelHeader title="Impostazioni" sub="Valgono per questo telefono" onBack={onBack} onClose={onClose} color={color} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        <section className="bg-white rounded-3xl border border-slate-200 px-4 py-1 divide-y divide-slate-100" data-section="settings-notify">
          <Row icon={pushOn ? Bell : BellOff} title="Notifiche" sub={pushOn ? "Attive su questo telefono" : push === "checking" ? "…" : "Spente su questo telefono"}>
            {busy ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : <Switch id="push" label="Notifiche" on={pushOn} disabled={!canToggle} onChange={togglePush} />}
          </Row>
          {PUSH_HELP[push] && <p className="py-3 text-sm font-semibold text-amber-800" data-push-help={push}>{PUSH_HELP[push]}</p>}
          <Row icon={MessageCircle} title="Messaggi dei colleghi" sub="Quando un collega ti scrive" dim={!pushOn}>
            <Switch id="chat" label="Messaggi dei colleghi" on={st.chat !== false} disabled={!pushOn} onChange={(v) => change("chat", v)} />
          </Row>
          <Row icon={CalendarClock} title="Promemoria e impegni" sub="All'ora che hai scelto" dim={!pushOn}>
            <Switch id="reminders" label="Promemoria e impegni" on={st.reminders !== false} disabled={!pushOn} onChange={(v) => change("reminders", v)} />
          </Row>
          {pushOn && (
            <div className="py-3">
              <button type="button" data-action="push-test" onClick={test} className={`h-10 px-4 rounded-full border-2 border-${color}-600 text-${color}-700 font-black text-sm flex items-center gap-2`}>
                <Send className="w-4 h-4" /> Prova una notifica
              </button>
            </div>
          )}
          {(err || ok) && <p className={`py-3 text-sm font-bold ${err ? "text-red-600" : "text-emerald-700"}`}>{err || ok}</p>}
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 px-4 py-1 divide-y divide-slate-100">
          <Row icon={Sparkles} title="Animazione all'avvio" sub="La gru che si muove quando apri l'app (e quella delle feste)">
            <Switch id="splash" label="Animazione all'avvio" on={st.splash !== false} onChange={(v) => change("splash", v)} />
          </Row>
          <Row icon={Users} title="Farmi vedere tra i «Tecnici online»" sub="Se lo spegni i colleghi non ti vedono collegato (l'admin sì)">
            <Switch id="showOnline" label="Farmi vedere online" on={st.showOnline !== false} onChange={(v) => change("showOnline", v)} />
          </Row>
        </section>

        <section className="space-y-2" data-section="settings-extra">
          <h4 className="px-2 text-xs font-black text-slate-500 uppercase tracking-wide">Funzioni in più</h4>
          <div className="bg-white rounded-3xl border border-slate-200 px-4 py-1 divide-y divide-slate-100">
            <Row icon={Timer} title="Le mie ore" sub="Calendario degli orari in La mia area: ore fatte, straordinari, ore in meno, ferie, permessi, malattia">
              <Switch id="hours" label="Le mie ore" on={st.hours === true} onChange={(v) => change("hours", v)} />
            </Row>
          </div>
        </section>
        <p className="text-xs text-slate-400 text-center px-4">L'aspetto dell'app (colori, lettere, Home) si cambia da «Modifica aspetto» in fondo alla Home.</p>
      </div>
    </div>
  );
};
