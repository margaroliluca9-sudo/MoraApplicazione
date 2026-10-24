// «SEGNALA UN PROBLEMA»: dal menu in alto a destra. Si scrive cosa non va e si può aggiungere
// una foto dello schermo (fatta col telefono). Arriva in Area admin → System → «Errori e segnalazioni».
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, MessageSquareWarning, ImagePlus, Send, Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { sendReport } from "../../errorLog";
import { compressImage } from "../../utils";

export const ReportProblemModal = ({ onClose, color = "blue" }) => {
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = null;
    if (!f || !f.type.startsWith("image/")) return;
    setBusy(true);
    try {
      setPhoto(await compressImage(f));
    } catch (x) {
      setErr("Non riesco a leggere questa foto.");
    }
    setBusy(false);
  };
  const send = async () => {
    setErr("");
    if (!text.trim() && !photo) return setErr("Scrivi cosa non va (o aggiungi una foto).");
    setBusy(true);
    try {
      await sendReport({ text, photo });
      setDone(true);
    } catch (x) {
      setErr(x && x.message === "troppe" ? "Hai già mandato 10 segnalazioni oggi: grazie! Riprova domani." : "Non sono riuscito a mandarla. Riprova.");
    }
    setBusy(false);
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 z-[400] flex items-end md:items-center justify-center md:p-4 backdrop-blur-sm" data-section="report-problem" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <MessageSquareWarning className="w-5 h-5" />
          </span>
          <h3 className="flex-1 font-black text-slate-800 text-lg">Segnala un problema</h3>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        {done ? (
          <div className="text-center space-y-3 py-3" data-report-done>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="font-black text-slate-800">Grazie, segnalazione mandata!</p>
            <p className="text-sm text-slate-500">La vede l'admin. Se manca la rete parte da sola appena torna.</p>
            <button type="button" onClick={onClose} className={`w-full h-12 rounded-full bg-${color}-600 text-white font-black`}>
              Chiudi
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500">Scrivi cosa è successo e cosa stavi facendo. Se puoi, fai una foto dello schermo e aggiungila.</p>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Es. Nello Storico la foto non si apre…"
              className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-base text-slate-800 outline-none focus:border-slate-400"
              data-report-text
            />
            {photo ? (
              <div className="relative w-28">
                <img src={photo} alt="Foto dello schermo" className="w-28 h-28 object-cover rounded-xl border border-slate-200" />
                <button type="button" onClick={() => setPhoto("")} aria-label="Togli la foto" className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="h-11 px-4 rounded-xl border border-dashed border-slate-300 text-slate-600 font-bold text-sm inline-flex items-center gap-2 cursor-pointer">
                <ImagePlus className="w-4 h-4" /> Aggiungi foto dello schermo
                <input type="file" accept="image/*" className="hidden" onChange={pick} data-report-photo />
              </label>
            )}
            {err && <p className="text-sm font-bold text-red-600">{err}</p>}
            <button type="button" onClick={send} disabled={busy} data-action="report-send" className={`w-full h-12 rounded-full bg-${color}-600 text-white font-black flex items-center justify-center gap-2 disabled:opacity-60`}>
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Manda
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
