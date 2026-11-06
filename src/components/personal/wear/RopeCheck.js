// FUNE E CATENA → scheda Fune (ISO 4309:2017, cataloghi FAS e Teci).
import React, { useMemo, useState } from "react";
import { INPUT } from "../PersonalUi";
import { ROPES, ROPE_FLAGS, checkRope } from "../../../wearRules";
import { FAS_ROPES, FAS_GROUPS, fasCode } from "../../../fasRopes";
import { ropeVerdict, ropeRegister, ropeReport } from "../../../wearRegister";
import { printWear } from "../../WearPrintHost";
import { consOf } from "../../../ropeSection";
import { TECI_ROPES, TECI_GROUPS, teciFamily } from "../../../teciRopes";
import { readAs, nOf, fmt, Num, Choice, Flags, Bar, Verdict, ropeBig, useCopy, Pick } from "./ui";
import { RopeSectionArt, Section, Lay } from "./art";

// ---------------------------------------------------------------- FUNE
// quanto sono lunghi i tratti da guardare: 6d e 30d (d = diametro nominale)
export const Lengths = ({ len6, len30 }) => (
  <div className="grid grid-cols-2 gap-2" data-wear-lengths>
    {[
      ["6d", len6],
      ["30d", len30],
    ].map(([k, v]) => (
      <div key={k} className="rounded-2xl bg-blue-50 border border-blue-200 px-3 py-2">
        <p className="text-[11px] font-black text-blue-700 uppercase tracking-wider">Tratto {k}</p>
        <p className="font-black text-slate-900 tabular-nums leading-tight" style={{ fontSize: 26 }} data-wear-len={k}>
          {fmt(v / 10, 1)} cm
        </p>
        <p className="text-[11px] font-bold text-slate-500">{v} mm</p>
      </div>
    ))}
  </div>
);

export const RopeCheck = ({ known = null, onReport = null, crane = null }) => {
  // fune montata con un rapporto dell'app (con la costruzione dal certificato): si parte già da quella
  // fune montata: dal catalogo FAS (fas) o con la costruzione scritta a mano
  const kf = known && known.fas && FAS_ROPES.some((f) => f.id === known.fas) ? "fas:" + known.fas : known && known.teci && teciFamily(known.teci) ? "teci:" + known.teci : "";
  const kc = known && ROPES.find((r) => r.id === known.costruzione);
  const kd = known && known.diametro ? String(known.diametro).replace(".", ",") : "";
  const [x, setX] = useState({ mode: kf || kc ? "so" : "auto", strands: "6", rope: kf || (kc ? kc.id : "6x36"), n: "", core: "metallica", lay: "nonso", layers: "nonso", d: kd, dRef: kd, dMis: "", dMis2: "", b6: "", b30: "", flags: {} });
  const set = (k) => (v) => setX((o) => ({ ...o, [k]: v }));
  const r = useMemo(() => checkRope(x), [x]);
  const isFas = !!r.fam;
  const isTeci = !!r.tfam;
  const isCat = isFas || isTeci;
  const rope = isCat ? { n: r.n, rr: r.rr, label: r.lim.rcn } : ROPES.find((o) => o.id === x.rope) || ROPES[0];
  const catName = r.auto ? r.guess.label : isFas ? `FAS ${r.fam.id} (${r.fam.cons.join("/")})` : isTeci ? `Teci ${r.tfam.name} (${r.teciItem ? r.teciItem.cons : r.tfam.cons.join("/")})` : rope.label;
  const consNow = r.auto ? "" : isFas ? consOf({ fam: r.fam }) : isTeci ? (r.teciItem ? r.teciItem.cons : r.tfam.cons[0]) : consOf({ rope: ROPES.find((o) => o.id === x.rope) });
  const [copied, copy] = useCopy();
  const ready = Number(r.n) > 0 && (x.b6 !== "" || x.b30 !== "" || x.dMis !== "" || x.dMis2 !== "" || r.flags.length > 0);
  const lines = [];
  if (x.b6 !== "" || x.b30 !== "") lines.push(`Fili rotti: ${r.b6} su 6d (limite ${r.lim.six}) · ${r.b30} su 30d (limite ${r.lim.thirty}) → gravità ${Math.max(r.s6, r.s30)}%`);
  if (r.limCross && (x.b6 !== "" || x.b30 !== "")) lines.push(`Contato come cordatura parallela (la più severa). Se sei sicuro che è crociata il limite sale a ${r.limCross.six} su 6d e ${r.limCross.thirty} su 30d.`);
  if (r.dec != null) lines.push(`Diametro: ${r.m1 && r.m2 ? `media ${fmt(r.dMis, 2)} mm (${fmt(r.m1, 2)} e ${fmt(r.m2, 2)} a 90°), ` : ""}calato del ${fmt(r.dec)}% (scarto al ${fmt(r.dia.limit)}%${r.dia.teci ? ", catalogo Teci" : ""}) → gravità ${r.dia.sev}%`);
  if (r.incWarn) lines.push(`Diametro aumentato del ${fmt(r.inc)}% rispetto al riferimento: ISO 4309 (6.7.6) chiede di cercarne la causa e di valutare lo scarto`);
  if ((x.b6 !== "" || x.b30 !== "") && r.dec != null) lines.push(`Insieme (fili + diametro): ${r.combined}%`);
  r.flags.forEach((k) => lines.push((ROPE_FLAGS.find((f) => f[0] === k) || [k, k])[1] + " → scarto"));
  const title = r.level === "scarto" ? "Fune da scartare" : r.level === "attenzione" ? "Fune idonea, vicina al limite di scarto" : "Fune idonea";
  const report = `Controllo fune ${r.auto ? r.guess.label.split(" (")[0] : catName}${x.d ? " Ø" + x.d + " mm" : ""} (ISO 4309${r.auto ? ", valori prudenti" : ""}): ${title.toLowerCase()}. ${lines.join(". ")}.`;
  return (
    <div className="space-y-4" data-section="wear-rope">
      {x.mode !== "so" ? (
      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3" data-wear-auto>
        <h4 className="font-black text-slate-800">La fune</h4>
        <Choice id="mode" value={x.mode} onChange={set("mode")} options={[["auto", "Non so com'è fatta"], ["so", "So la costruzione"]]} />
        <span className="block text-xs font-black text-slate-500">Quanti trefoli vedi fuori? (contali girando intorno alla fune)</span>
        <Pick
          id="strands"
          value={x.strands}
          onChange={set("strands")}
          options={[
            ["6", "6 trefoli", <Section key="a" n="6" />],
            ["8", "8 trefoli", <Section key="b" n="8" />],
            ["tanti", "Più di 10 (antigiro)", <Section key="c" n="tanti" />],
          ]}
        />
        {x.strands !== "tanti" && (
          <>
            <span className="block text-xs font-black text-slate-500">Come stanno i fili sulla superficie?</span>
            <Pick
              id="lay"
              value={x.lay}
              onChange={set("lay")}
              options={[
                ["crociata", "Quasi dritti lungo la fune (crociata)", <Lay key="a" kind="crociata" />],
                ["parallela", "Inclinati come i trefoli (parallela)", <Lay key="b" kind="parallela" />],
                ["nonso", "Non lo so", <span key="c" className="h-7 flex items-center text-xl">🤷</span>],
              ]}
            />
          </>
        )}
        <span className="block text-xs font-black text-slate-500">Sul tamburo si avvolge…</span>
        <Choice id="layers" value={x.layers} onChange={set("layers")} options={[["uno", "Uno strato"], ["piu", "Più strati"], ["nonso", "Non so"]]} />
        <p className="text-[11px] text-slate-500 leading-snug bg-slate-50 rounded-xl p-2">
          Quello che non sai lo conto nel modo più prudente: la fune più delicata di quel tipo, cordatura parallela, anima metallica. Così il verdetto è sempre dalla parte della sicurezza.
        </p>
      </section>
      ) : (
      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">La fune</h4>
        <Choice id="mode" value={x.mode} onChange={set("mode")} options={[["auto", "Non so com'è fatta"], ["so", "So la costruzione"]]} />
        <label className="block space-y-1">
          <span className="text-xs font-black text-slate-500">Costruzione</span>
          <select className={INPUT} value={x.rope} onChange={(e) => set("rope")(e.target.value)} data-wear-input="rope">
            {FAS_GROUPS.map(([g, gl]) => (
              <optgroup key={g} label={gl}>
                {FAS_ROPES.filter((f) => f.grp === g).map((f) => (
                  <option key={f.id} value={"fas:" + f.id}>
                    {f.id} · {f.cons.join(" / ")}
                  </option>
                ))}
              </optgroup>
            ))}
            {TECI_GROUPS.map(([g, gl]) => (
              <optgroup key={g} label={gl}>
                {TECI_ROPES.filter((f) => f.grp === g).map((f) => (
                  <option key={f.id} value={"teci:" + f.id}>
                    {f.name} · {f.cons.join(" / ")}
                  </option>
                ))}
              </optgroup>
            ))}
            <optgroup label="Altre marche (per costruzione)">
              {ROPES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        {isFas && (
          <p className="text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded-xl p-2 leading-snug" data-wear-fas>
            <b>Dal catalogo FAS:</b> {r.fam.cons.join(" / ")} · {r.fam.rr ? "antigiro" : `cordatura ${r.fam.lay}`} · anima {r.fam.core}
            {r.fam.comp ? " · trefoli compattati" : ""}
            {r.fasItem ? ` · articolo ${fasCode(r.fam, r.fasItem)}, carico di rottura ${fmt(r.fasItem.kN)} kN` : ""}
            {r.lim.noDiam ? " · scrivi il diametro per i limiti giusti" : ` · limiti: ${r.lim.six} fili su 6d, ${r.lim.thirty} su 30d`}
          </p>
        )}
        {isTeci && (
          <p className="text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded-xl p-2 leading-snug" data-wear-teci>
            <b>Dal catalogo Teci:</b> {r.tfam.name} · {r.teciItem ? r.teciItem.cons : r.tfam.cons.join(" / ")} · {r.tfam.rr ? "antigiro" : r.tfam.lay ? `cordatura ${r.tfam.lay} (standard del catalogo)` : "cordatura non scritta: contata come parallela"} · anima {r.tfam.core}
            {r.teciItem && r.teciItem.exact ? ` · carico di rottura minimo ${fmt(r.teciItem.kN)} kN (classe ${r.tfam.grade})` : x.d ? " · diametro non presente nel catalogo: controlla" : ""}
            {r.teciItem && r.teciItem.n ? ` · ${r.teciItem.n} fili portanti esterni` : ""}
            {` · limiti: ${r.lim.six} fili su 6d, ${r.lim.thirty} su 30d${r.lim.teci ? " (tabella Teci)" : " (ISO 4309)"}`}
          </p>
        )}
        {consNow && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
            <RopeSectionArt cons={consNow} />
          </div>
        )}
        {!isCat && !rope.n && <Num id="n" label="Fili portanti dei trefoli esterni (n)" unit="fili" value={x.n} onChange={set("n")} hint="Fili esterni portanti × numero dei trefoli esterni (quelli di riempimento non contano)." />}
        {!isCat && !rope.rr && (
          <>
            <span className="block text-xs font-black text-slate-500">Anima</span>
            <Choice id="core" value={x.core} onChange={set("core")} options={[["metallica", "Metallica"], ["tessile", "Tessile"]]} />
            <span className="block text-xs font-black text-slate-500">Cordatura</span>
            <Choice id="lay" value={x.lay} onChange={set("lay")} options={[["crociata", "Crociata"], ["parallela", "Parallela (Lang)"]]} />
          </>
        )}
        <span className="block text-xs font-black text-slate-500">Avvolgimento sul tamburo</span>
        <Choice id="layers" value={x.layers} onChange={set("layers")} options={[["uno", "Uno strato"], ["piu", "Più strati"]]} />
        <p className="text-[11px] text-slate-400">
          Categoria della fune (RCN) {r.lim.rcn} · {r.n} fili portanti esterni
        </p>
      </section>

      )}
      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">Fili rotti</h4>
        <Num id="d" info="nomfune" label="Diametro nominale" value={x.d} onChange={set("d")} hint={x.d ? "" : "Scrivilo e l'app ti dice quanto sono lunghi i tratti 6d e 30d."} />
        {r.len6 > 0 && <Lengths len6={r.len6} len30={r.len30} />}
        <div className="grid grid-cols-2 gap-3">
          <Num id="b6" info="fili" label={`Fili rotti su 6d${r.len6 ? ` (${fmt(r.len6 / 10)} cm)` : ""}`} unit="fili" value={x.b6} onChange={set("b6")} />
          <Num id="b30" info="tratto" label={`Fili rotti su 30d${r.len30 ? ` (${fmt(r.len30 / 10)} cm)` : ""}`} unit="fili" value={x.b30} onChange={set("b30")} hint={r.b6 > (Number(x.b30) || 0) ? `Contati ${r.b30}: il tratto di 30d comprende quello di 6d, quindi ci sono almeno i ${r.b6} fili del 6d. Aggiungi quelli che vedi nel resto dei 30d.` : "Comprende il tratto di 6d: conta anche quei fili."} />
        </div>
        {(x.b6 !== "" || x.b30 !== "") && (
          <div className="text-xs font-bold text-slate-500">
            Gravità dei fili rotti: {Math.max(r.s6, r.s30)}%
            <Bar sev={Math.max(r.s6, r.s30)} />
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">Diametro</h4>
        <div className="grid grid-cols-2 gap-3">
          <Num id="dRef" info="diamfune" label="Di riferimento" value={x.dRef} onChange={set("dRef")} hint={readAs(x.dRef, nOf(x.d)) || "Misurato sulla fune nuova, dopo il rodaggio, in un tratto che non passa sulle pulegge. Se non c'è vale il nominale."} />
          <span />
          <Num id="dMis" info="diamfune" label="Misura 1" value={x.dMis} onChange={set("dMis")} hint={readAs(x.dMis, r.dRef)} />
          <Num id="dMis2" info="diamfune" label="Misura 2 (a 90°)" value={x.dMis2} onChange={set("dMis2")} hint={readAs(x.dMis2, r.dRef)} />
        </div>
        <p className="text-[11px] text-slate-500 leading-snug -mt-1">
          ISO 4309, punto 3.2: il diametro misurato è la «media di due misurazioni, prese ad angolo retto una rispetto all'altra». Scrivi le due misure e l'app fa la media.
        </p>
        {r.m1 > 0 && r.m2 > 0 && (
          <p className="text-sm font-black text-slate-700" data-wear-dmean>
            Media: {fmt(r.dMis, 2)} mm
          </p>
        )}
        {r.dec != null && r.dMis <= r.dRef && (
          <div className="text-xs font-bold text-slate-500">
            Calo del {fmt(r.dec)}% sul nominale · gravità {r.dia.sev}% (scarto al {fmt(r.dia.limit)}% per fune {r.kind === "antigiro" ? "antigiro" : r.kind === "tessile" ? "con anima tessile" : "con anima metallica"}{r.dia.teci ? ", catalogo Teci" : ""})
            <Bar sev={r.dia.sev} />
          </div>
        )}
        {r.inc > 0 && (
          <div className={`rounded-2xl p-3 text-[12px] leading-snug ${r.incWarn ? "bg-amber-50 border border-amber-300 text-amber-900" : "bg-slate-50 border border-slate-200 text-slate-600"}`} data-wear-inc={r.incWarn ? "warn" : "ok"}>
            <b>Diametro più grande del riferimento: +{fmt(r.inc)}%.</b>{" "}
            {r.incWarn
              ? `ISO 4309, punto 6.7.6: se in servizio il diametro aumenta del ${r.incLimit}% o più (fune con anima ${r.kind === "tessile" ? "tessile" : "metallica"}), bisogna cercarne la causa e valutare lo scarto della fune. Se l'aumento è in un punto solo (anima distorta), spunta la voce sotto: il catalogo Teci la indica come sostituzione immediata.`
              : `Il calo del diametro (punto 6.4) non c'è. Una fune nuova è di solito un po' più grossa del nominale (tolleranza EN 12385 per funi da sollevamento da 8 mm in su: +5% / 0%). Se aumenta in servizio del ${r.incLimit}% o più, la ISO 4309 (6.7.6) chiede di cercarne la causa.`}
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">Si vede anche…</h4>
        <Flags list={ROPE_FLAGS} value={x.flags} onChange={set("flags")} />
      </section>

      {ready && (
        <Verdict
          level={r.level}
          title={title}
          lines={lines}
          onCopy={() => copy(report)}
          copied={copied}
          onReport={onReport ? () => onReport({ type: "fune", level: r.level, title, text: report, d: x.d, b6: x.b6, b30: x.b30, dMis: r.dMis || x.dMis, rope: r.auto ? "" : x.rope }) : null}
          big={ropeBig(r)}
          register={{ ...ropeVerdict(r), text: ropeRegister({ r, x, label: catName }) }}
          onPrint={() => printWear({ ...ropeReport({ r, x, label: catName, fas: !!isFas, teci: !!isTeci }), cons: consNow }, crane)}
        />
      )}
      <p className="text-[11px] text-slate-400 leading-snug">
        Norma ISO 4309:2017: fili rotti su 6d e 30d, diminuzione del diametro e valutazione combinata. Valori per meccanismi M1–M4 o di classe non nota. Fa sempre fede il
        manuale del costruttore della gru e della fune (es. FAS, Teci).
      </p>
    </div>
  );
};
