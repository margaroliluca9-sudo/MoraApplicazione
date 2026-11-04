// FUNE E CATENA → scheda Catena (paranco o sottoganci).
import React, { useMemo, useState } from "react";
import { CHAIN_FLAGS, checkChain } from "../../../wearRules";
import { chainVerdict, chainRegister, chainReport } from "../../../wearRegister";
import { printWear } from "../../WearPrintHost";
import { readAs, nOf, fmt, Num, Choice, Flags, Bar, Verdict, chainBig, useCopy, Txt } from "./ui";
import { InfoBtn } from "./info";

// ---------------------------------------------------------------- CATENA
export const ChainCheck = ({ known = null, onReport = null, crane = null }) => {
  const kd = known && known.diametro ? String(known.diametro).replace(".", ",") : "";
  const kp = known && known.passo ? String(known.passo).replace(".", ",") : "";
  const [x, setX] = useState({ kind: (known && known.kind) || "paranco", d: kd, d1: "", d2: "", t: kp, t1: "", t11: "", flags: {} });
  const set = (k) => (v) => setX((o) => ({ ...o, [k]: v }));
  const r = useMemo(() => checkChain(x), [x]);
  const [copied, copy] = useCopy();
  const lines = r.checks.map((c) => `${c.label}: ${fmt(c.value)}% (scarto oltre il ${c.limit}%)${c.bad ? " → scarto" : ""}`);
  if (r.wear != null) lines.unshift(`Misura più bassa ${fmt(r.dm, 2)} mm su ${fmt(r.d, 2)} mm nominale (minimo ammesso ${fmt(r.minDm, 2)} mm)`);
  r.flags.forEach((k) => lines.push((CHAIN_FLAGS.find((f) => f[0] === k) || [k, k])[1] + " → scarto"));
  const title = r.level === "scarto" ? "Catena da scartare" : r.level === "attenzione" ? "Catena idonea, vicina al limite di scarto" : "Catena idonea";
  const report = `Controllo catena ${x.kind === "imbracatura" ? "dei sottoganci" : "del paranco"}${x.d ? " Ø" + x.d + " mm" : ""}: ${title.toLowerCase()}. ${lines.join(". ")}.`;
  const ready = r.checks.length > 0 || r.flags.length > 0;
  return (
    <div className="space-y-4" data-section="wear-chain">
      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">La catena</h4>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Choice id="kind" value={x.kind} onChange={set("kind")} options={[["paranco", "Del paranco"], ["imbracatura", "Dei sottoganci"]]} />
          </div>
          <InfoBtn id="imbracatura" label="paranco o sottoganci" />
        </div>
        {x.kind === "imbracatura" && <Txt id="mora" label="Numero Mora (targhetta)" value={x.mora || ""} onChange={set("mora")} hint="Il numero progressivo della targhetta Mora sul sottogancio." />}
        <Num id="d" info="catnominale" label="Diametro nominale (d)" value={x.d} onChange={set("d")} />
        <div className="grid grid-cols-2 gap-3">
          <Num id="d1" info="catmisura" label="Misura d1" value={x.d1} onChange={set("d1")} hint={readAs(x.d1, nOf(x.d))} />
          <Num id="d2" label="Misura d2 (a 90°)" value={x.d2} onChange={set("d2")} hint={readAs(x.d2, nOf(x.d))} />
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">Misura nel punto dove le maglie si toccano (dove si consuma), con la catena allentata: due misure a 90° tra loro. Conta la misura più bassa: basta una sotto il 90% del nominale per lo scarto.</p>
        {r.wear != null && (
          <div className="text-xs font-bold text-slate-500">
            Usura {fmt(r.wear)}% (scarto oltre il 10%)
            <Bar sev={(r.wear / 10) * 100} />
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">Allungamento (se lo misuri)</h4>
        <Num id="t" info="passo" label="Passo nominale (t)" value={x.t} onChange={set("t")} hint="Lunghezza interna di una maglia, dalla scheda della catena." />
        <div className="grid grid-cols-2 gap-3">
          <Num id="t1" label="Una maglia misurata" value={x.t1} onChange={set("t1")} hint={readAs(x.t1, nOf(x.t))} />
          {x.kind !== "imbracatura" && <Num id="t11" info="passo" label="11 maglie misurate" value={x.t11} onChange={set("t11")} hint={[readAs(x.t11, nOf(x.t) * 11), nOf(x.t) ? `Nuova: ${fmt(nOf(x.t) * 11)} mm` : ""].filter(Boolean).join(" · ")} />}
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">Si vede anche…</h4>
        <Flags list={CHAIN_FLAGS} value={x.flags} onChange={set("flags")} />
      </section>

      {ready && (
        <Verdict
          level={r.level}
          title={title}
          lines={lines}
          onCopy={() => copy(report)}
          copied={copied}
          onReport={onReport ? () => onReport({ type: "catena", level: r.level, title, text: report, d: x.d, d1: x.d1, d2: x.d2 }) : null}
          big={chainBig(r)}
          register={{ ...chainVerdict(r), text: chainRegister({ r, x }) }}
          onPrint={() => printWear(chainReport({ r, x }), crane)}
        />
      )}
      <p className="text-[11px] text-slate-400 leading-snug">
        Usura: nessuna misura sotto 0,9·d (regola Mora: basta una misura sotto il 90% del nominale; limite del 10% della EN 818-6, usato anche per la catena del paranco). Allungamento: una maglia +5%;
        catena da paranco su 11 maglie +2%. Fa sempre fede il manuale del costruttore del paranco.
      </p>
    </div>
  );
};
