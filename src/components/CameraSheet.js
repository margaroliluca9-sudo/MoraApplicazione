// FOTOCAMERA DENTRO L'APP (Nuovo rapporto → «Scatta»).
// Perché: con la fotocamera del telefono l'app va in sottofondo e alcuni Android (Samsung) la chiudono per
// liberare memoria: tornando con la foto la pagina si ricarica e la foto si perde. Qui la fotocamera è dentro
// la pagina, che resta sempre aperta. Si possono fare più foto di fila; «Fatto» torna al rapporto.
// Se la fotocamera non si può usare (permesso negato, telefono vecchio) c'è «Usa la fotocamera del telefono».
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Loader2, Camera } from "lucide-react";

export const canInAppCamera = () =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function" && typeof window !== "undefined" && window.isSecureContext !== false;

// la foto dal video, come file JPEG (poi la riduce compressImage come le altre)
const grab = (video) =>
  new Promise((resolve, reject) => {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return reject(new Error("fotocamera non pronta"));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d").drawImage(video, 0, 0, w, h);
    c.toBlob((b) => (b ? resolve(new File([b], `foto-${Date.now()}.jpg`, { type: "image/jpeg" })) : reject(new Error("foto non riuscita"))), "image/jpeg", 0.92);
  });

export const CameraSheet = ({ left = 1, onShot, onClose, onFallback }) => {
  const video = useRef(null);
  const stream = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [taken, setTaken] = useState(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let alive = true;
    const open = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } },
        });
        if (!alive) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        const v = video.current;
        if (v) {
          v.srcObject = s;
          await v.play().catch(() => null);
        }
        setReady(true);
      } catch (e) {
        const name = (e && e.name) || "";
        setErr(
          name === "NotAllowedError" || name === "SecurityError"
            ? "La fotocamera non è permessa per l'app. Puoi permetterla dalle impostazioni del sito (il lucchetto in alto) oppure usare la fotocamera del telefono."
            : "La fotocamera non si apre. Usa la fotocamera del telefono."
        );
      }
    };
    open();
    return () => {
      alive = false;
      if (stream.current) stream.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const shoot = async () => {
    if (!ready || busy || taken >= left) return;
    setBusy(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    try {
      const f = await grab(video.current);
      await onShot(f);
      const n = taken + 1;
      setTaken(n);
      if (n >= left) onClose();
    } catch (e) {
      setErr("Foto non riuscita, riprova.");
    } finally {
      setBusy(false);
    }
  };

  // sopra a tutto (anche alla barra in basso), direttamente nella pagina
  return createPortal(
    <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 1000 }} data-section="camera" role="dialog" aria-label="Fotocamera">
      <div className="flex items-center justify-between p-3 text-white shrink-0">
        <button type="button" onClick={onClose} aria-label="Chiudi la fotocamera" className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center" data-action="camera-close">
          <X className="w-6 h-6" />
        </button>
        <span className="text-sm font-black">{taken ? `${taken} ${taken === 1 ? "foto fatta" : "foto fatte"}` : "Fotocamera"}</span>
        <button type="button" onClick={onClose} className="h-11 px-4 rounded-full bg-white text-slate-900 font-black text-sm flex items-center gap-1.5" data-action="camera-done">
          <Check className="w-4 h-4" /> Fatto
        </button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <video ref={video} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-contain" />
        {flash && <div className="absolute inset-0 bg-white/70" />}
        {!ready && !err && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}
        {err && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white">
            <p className="font-bold leading-snug">{err}</p>
            <button type="button" onClick={onFallback} className="h-12 px-5 rounded-full bg-white text-slate-900 font-black flex items-center gap-2" data-action="camera-fallback">
              <Camera className="w-5 h-5" /> Usa la fotocamera del telefono
            </button>
          </div>
        )}
      </div>
      <div className="shrink-0 p-5 flex items-center justify-center">
        <button
          type="button"
          onClick={shoot}
          disabled={!ready || busy || taken >= left}
          aria-label="Scatta la foto"
          className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center ${!ready || taken >= left ? "opacity-40" : ""}`}
          data-action="camera-shoot"
        >
          <span className="w-16 h-16 rounded-full bg-white flex items-center justify-center">{busy && <Loader2 className="w-6 h-6 text-slate-700 animate-spin" />}</span>
        </button>
      </div>
    </div>,
    document.body
  );
};
