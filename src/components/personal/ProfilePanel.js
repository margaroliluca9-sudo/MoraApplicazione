// LA MIA AREA → IL MIO PROFILO: foto, nome e cognome, email della ditta, password personale.
import React, { useRef, useState } from "react";
import { Camera, Trash2, Loader2, Check, Lock, Eye, EyeOff } from "lucide-react";
import { PanelHeader, INPUT } from "./PersonalUi";
import { Avatar } from "../Avatar";
import { techOf, saveProfile, validEmail, squarePhoto, savePhoto, removePhoto, currentOk, passwordProblem, setPersonalPassword } from "../../profile";
import { describeError } from "../../utils";

const Field = ({ label, children, hint }) => (
  <label className="block space-y-1">
    <span className="text-xs font-black text-slate-500">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
  </label>
);

const Msg = ({ m }) => (m ? <p className={`text-sm font-bold ${m.ok ? "text-emerald-700" : "text-red-700"}`}>{m.text}</p> : null);

export const ProfilePanel = ({ me, technicians = [], color = "blue", onBack, onClose }) => {
  const tech = techOf(technicians, me);
  const [surname, setSurname] = useState((tech && tech.surname) || "");
  const [email, setEmail] = useState((tech && tech.email) || "");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  const [pMsg, setPMsg] = useState(null);
  const [photoMsg, setPhotoMsg] = useState(null);
  const [cur, setCur] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [show, setShow] = useState(false);
  const fileRef = useRef(null);

  if (!tech)
    return (
      <div className="flex flex-col h-full" data-section="profile">
        <PanelHeader title="Il mio profilo" onBack={onBack} onClose={onClose} color={color} />
        <p className="p-4 text-sm text-slate-500">Il tuo nome non è nell'elenco dei tecnici (Admin → Staff): il profilo è solo per i tecnici.</p>
      </div>
    );

  const changed = (tech.surname || "") !== surname.trim() || (tech.email || "") !== email.trim().toLowerCase();
  const save = async () => {
    if (!validEmail(email)) return setMsg({ ok: false, text: "L'email non sembra giusta." });
    setBusy("profile");
    setMsg(null);
    try {
      await saveProfile(tech, { surname, email });
      setMsg({ ok: true, text: "Salvato." });
    } catch (e) {
      setMsg({ ok: false, text: "Non salvato: " + describeError(e) });
    }
    setBusy("");
  };

  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setBusy("photo");
    setPhotoMsg(null);
    try {
      await savePhoto(tech, await squarePhoto(f));
      setPhotoMsg({ ok: true, text: "Foto salvata: la vedono anche i colleghi in chat." });
    } catch (err) {
      setPhotoMsg({ ok: false, text: "Foto non salvata: " + describeError(err) });
    }
    setBusy("");
  };
  const dropPhoto = async () => {
    if (!window.confirm("Togliere la tua foto?")) return;
    setBusy("photo");
    try {
      await removePhoto(tech);
      setPhotoMsg(null);
    } catch (err) {
      setPhotoMsg({ ok: false, text: "Non tolta: " + describeError(err) });
    }
    setBusy("");
  };

  const savePass = async () => {
    setPMsg(null);
    if (!currentOk(tech, cur)) return setPMsg({ ok: false, text: "La password attuale non è giusta." });
    const bad = passwordProblem(p1);
    if (bad) return setPMsg({ ok: false, text: bad });
    if (p1 !== p2) return setPMsg({ ok: false, text: "Le due password nuove non sono uguali." });
    setBusy("pass");
    try {
      await setPersonalPassword(tech, p1);
      setCur("");
      setP1("");
      setP2("");
      setPMsg({ ok: true, text: "Password cambiata: dalla prossima volta entri con questa." });
    } catch (e) {
      setPMsg({ ok: false, text: "Non cambiata: " + describeError(e) });
    }
    setBusy("");
  };

  const card = "bg-white rounded-3xl border border-slate-200 p-4 space-y-3";
  const btn = `h-11 px-4 rounded-xl bg-${color}-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40`;
  const pass = (v, set, label, id) => (
    <Field label={label}>
      <input type={show ? "text" : "password"} autoComplete={id === "cur" ? "current-password" : "new-password"} className={INPUT} value={v} onChange={(e) => set(e.target.value)} data-pass={id} />
    </Field>
  );
  return (
    <div className="flex flex-col h-full" data-section="profile">
      <PanelHeader title="Il mio profilo" sub={[tech.name, tech.surname].filter(Boolean).join(" ")} onBack={onBack} onClose={onClose} color={color} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        <section className={`${card} flex flex-col items-center text-center`} data-section="profile-photo">
          <div className="relative">
            <Avatar tech={tech} className="w-28 h-28" textClass="text-4xl" color={color} />
            {busy === "photo" && (
              <span className="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
              </span>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} data-profile-file />
          <div className="flex gap-2">
            <button type="button" disabled={!!busy} onClick={() => fileRef.current && fileRef.current.click()} data-action="profile-photo" className={btn}>
              <Camera className="w-4 h-4" /> {tech.photoAt ? "Cambia foto" : "Metti la tua foto"}
            </button>
            {tech.photoAt && (
              <button type="button" disabled={!!busy} onClick={dropPhoto} aria-label="Togli la foto" data-action="profile-photo-remove" className="h-11 w-11 rounded-xl border border-slate-200 text-red-600 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">Facoltativa. La vedono i colleghi in chat, nello Storico e in alto nell'app.</p>
          <Msg m={photoMsg} />
        </section>

        <section className={card} data-section="profile-data">
          <h4 className="font-black text-slate-800 text-sm">I miei dati</h4>
          <Field label="Nome" hint="Il nome per entrare nell'app: lo cambia l'admin (Admin → Staff).">
            <input className={`${INPUT} bg-slate-100 text-slate-500`} value={tech.name} readOnly data-profile-name />
          </Field>
          <Field label="Cognome">
            <input className={INPUT} value={surname} onChange={(e) => setSurname(e.target.value)} autoComplete="family-name" data-profile-surname />
          </Field>
          <Field label="Email della ditta">
            <input className={INPUT} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@ditta.it" autoComplete="email" data-profile-email />
          </Field>
          <Msg m={msg} />
          <button type="button" disabled={!changed || !!busy} onClick={save} data-action="profile-save" className={`${btn} w-full`}>
            {busy === "profile" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salva
          </button>
        </section>

        <section className={card} data-section="profile-password">
          <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
            <Lock className="w-4 h-4" /> La mia password
          </h4>
          <p className="text-xs text-slate-500">
            {tech.passHash
              ? "Entri con la tua password personale. Se la dimentichi, l'admin te la toglie e torni alla password aziendale."
              : "Adesso entri con la password aziendale dei tecnici. Se vuoi, metti una password solo tua: da quel momento entri con quella."}
          </p>
          {pass(cur, setCur, tech.passHash ? "Password attuale" : "Password attuale (quella aziendale)", "cur")}
          {pass(p1, setP1, "Password nuova (almeno 6 caratteri)", "new")}
          {pass(p2, setP2, "Ripeti la password nuova", "new2")}
          <button type="button" onClick={() => setShow(!show)} className="text-xs font-bold text-slate-500 flex items-center gap-1">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {show ? "Nascondi" : "Mostra"} le password
          </button>
          <Msg m={pMsg} />
          <button type="button" disabled={!cur || !p1 || !p2 || !!busy} onClick={savePass} data-action="profile-pass" className={`${btn} w-full`}>
            {busy === "pass" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Cambia password
          </button>
        </section>
      </div>
    </div>
  );
};
