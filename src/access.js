// ENTRATA SICURA: la password si controlla sul server (/api/login), che dà il "pass" per il database.
// Se il server non è ancora attivo (manca la chiave su Vercel) o non c'è rete, si fa come prima:
// controllo della password sul telefono. Per chi usa l'app non cambia niente.
import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { isAdminPassword } from "./passwords";

const post = async (body) => {
  const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let j = {};
  try {
    j = await r.json();
  } catch (e) {
    j = {};
  }
  return { status: r.status, ...j };
};

// null = server non attivo/non raggiungibile (si usa il controllo di prima)
// { ok: true, name, role } oppure { ok: false, error }
export const serverLogin = async (name, password, admin = false) => {
  let r;
  try {
    r = await post(admin ? { name, password, admin: true } : { name, password });
  } catch (e) {
    return null;
  }
  if (r.status === 200 && r.token) {
    try {
      await signInWithCustomToken(auth, r.token);
    } catch (e) {
      return { ok: false, error: "Accesso non riuscito, riprova." };
    }
    return { ok: true, name: r.name || name, role: r.role };
  }
  if (r.status === 503 || r.status === 404 || r.status === 405 || !r.error) return null;
  return { ok: false, error: r.error };
};

// password di amministratore (Impostazioni, eliminazioni): sul server se attivo, altrimenti come prima
const myName = () => {
  try {
    return localStorage.getItem("mora_tech_last_name") || "";
  } catch (e) {
    return "";
  }
};
export const checkAdmin = async (password, name = myName()) => {
  const r = await serverLogin(name, password, true);
  if (r === null) return isAdminPassword(password);
  return r.ok;
};

// il server è attivo? (serve per chiedere la password una volta a chi era già dentro)
export const serverEnabled = async () => {
  try {
    const r = await fetch("/api/login");
    if (!r.ok) return false;
    const j = await r.json();
    return j.enabled === true;
  } catch (e) {
    return false;
  }
};

// uscita: si chiude anche la sessione del database
export const logoutServer = () => signOut(auth).catch(() => {});
