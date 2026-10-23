// PROVA DELL'APP (dalla Guida): un rapporto vero e proprio con clienti e gru di esempio.
// Non viene salvato niente: alla fine l'app mostra cosa sarebbe successo.
import React, { useMemo, useState } from "react";
import { X, FlaskConical, CheckCircle2, RotateCcw } from "lucide-react";
import { NewEntryForm } from "../../views/NewEntryForm";
import { formatRopeLong } from "../../ropes";
import { fmtQty } from "../../van";

const ago = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export const PracticeModal = ({ onClose, technicians = [], machineTypes = [], layoutConfig, vans = [], vanItems = [], color = "blue" }) => {
  const [result, setResult] = useState(null);
  const [round, setRound] = useState(0);
  // dati di esempio (inventati)
  const demo = useMemo(
    () => ({
      customers: [
        { id: "p1", name: "ESEMPIO SRL" },
        { id: "p2", name: "OFFICINA PROVA SPA" },
      ],
      machines: [
        { id: "pm1", matricola: "1", customerName: "ESEMPIO SRL", type: "Gru a ponte bitrave", capacity: "5000" },
        { id: "pm2", matricola: "2", customerName: "ESEMPIO SRL", type: "Paranco a catena", capacity: "1000" },
        { id: "pm3", matricola: "A1", customerName: "OFFICINA PROVA SPA", type: "Gru a bandiera", capacity: "500" },
      ],
      logs: [
        {
          id: "pl1",
          dateString: ago(60),
          technician: "Esempio",
          additionalTechnicians: [],
          customer: "ESEMPIO SRL",
          machineId: "1",
          machineType: "Gru a ponte bitrave",
          capacity: "5000",
          description: "Verifica trimestrale. Fune con lievi distorsioni, da sostituire alla prossima verifica. Regolato freno sollevamento.",
        },
      ],
      types: machineTypes.length
        ? machineTypes
        : [{ id: "t1", name: "Gru a ponte bitrave" }, { id: "t2", name: "Paranco a catena" }, { id: "t3", name: "Gru a bandiera" }],
    }),
    [machineTypes]
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[170] flex items-stretch md:items-center justify-center md:p-4 backdrop-blur-md">
      <div className="w-full md:max-w-2xl h-full md:h-[92vh] flex flex-col md:rounded-3xl overflow-hidden bg-slate-50 shadow-2xl" data-section="practice">
        <div className="px-4 py-3 bg-amber-400 text-amber-950 flex items-center gap-3 shrink-0">
          <FlaskConical className="w-6 h-6 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-lg leading-tight">Prova un rapporto</h3>
            <p className="text-xs font-bold">Clienti e gru di esempio · niente viene salvato</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="p-2.5 rounded-full hover:bg-amber-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!result ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="text-sm text-slate-700 bg-white border border-slate-200 rounded-2xl p-3 leading-relaxed" data-section="practice-hint">
              <b>Cosa provare:</b> scegli il tuo nome, scrivi il cliente <b>ESEMPIO SRL</b> e tocca la gru <b>1</b>: sotto compare l'assistente con quello che era rimasto in sospeso. Poi scrivi per esempio
              «Sostituita fune sollevamento. Regolato freno.» e guarda cosa ti chiede. Infine tocca <b>Salva</b>.
            </div>
            <NewEntryForm
              key={round}
              practice
              onPractice={setResult}
              user={{ uid: "prova" }}
              customers={demo.customers}
              technicians={technicians}
              machineTypes={demo.types}
              machines={demo.machines}
              allLogs={demo.logs}
              layoutConfig={layoutConfig}
              isMobile
              onSuccess={() => {}}
              onTechUpdate={() => {}}
              vans={vans}
              vanItems={vanItems}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4" data-section="practice-result">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-black text-slate-800 text-xl">Prova riuscita!</h4>
                <p className="text-sm text-slate-500 font-semibold">Ecco cosa sarebbe successo con un rapporto vero (non è stato salvato niente).</p>
              </div>
            </div>
            <ul className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 text-sm text-slate-700">
              <li>
                <b>Rapporto salvato</b> per {result.customer} · gru {result.machineId || "-"}
                {result.machineType ? ` (${result.machineType})` : ""}, tecnico {result.technician}
                {result.others.length ? ` con ${result.others.join(", ")}` : ""}.
              </li>
              {result.newCustomer && <li><b>Cliente nuovo:</b> verrebbe aggiunto da solo all'elenco clienti.</li>}
              {result.fune && <li><b>Fune sostituita:</b> {formatRopeLong(result.fune)}.</li>}
              {result.catena && <li><b>Catena sostituita:</b> {formatRopeLong(result.catena)}.</li>}
              {result.photos > 0 && <li><b>Foto:</b> {result.photos}, anche nel foglio stampato.</li>}
              {result.van ? (
                result.parts.length ? (
                  <li>
                    <b>Dal {result.van} verrebbero tolti:</b>{" "}
                    {result.parts.map((p) => (p.unknown ? `${p.name} (quantità da scrivere)` : `${p.name} −${fmtQty(p.qty)} ${p.unit}`)).join(", ")}.
                  </li>
                ) : (
                  <li><b>Furgone:</b> nella descrizione non ho trovato pezzi del {result.van} montati.</li>
                )
              ) : null}
              <li>Poi lo troveresti nello <b>Storico</b>, nella scheda della gru e in <b>La mia area</b>, pronto da <b>stampare</b>.</li>
            </ul>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs font-black text-slate-500 mb-1">Descrizione scritta</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{result.description}</p>
            </div>
            <div className="flex gap-3">
              <button type="button" data-action="practice-again" onClick={() => { setResult(null); setRound((r) => r + 1); }}
                className="h-12 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Riprova
              </button>
              <button type="button" onClick={onClose} className={`flex-1 h-12 rounded-xl bg-${color}-600 text-white font-black`}>
                Fatto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
