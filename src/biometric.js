// ACCESSO ADMIN CON IMPRONTA / FACE ID (sul telefono dove lo attivi).
// Si attiva una volta, dopo aver scritto la password admin; poi su quel telefono basta l'impronta.
// La password resta sempre valida. Se l'admin cambia la password, l'impronta va riattivata.
// Usa il sistema di sblocco del telefono (WebAuthn): né l'impronta né il volto escono mai dal telefono.
import { currentAdminHash } from "./passwords";

const KEY = "mora_admin_bio";
const NO = "mora_admin_bio_no"; // «No grazie»: non lo chiedo più su questo telefono

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const rnd = (n) => {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
};
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch (e) {
    return null;
  }
};

// il telefono ha impronta / Face ID / PIN di sblocco utilizzabili?
export const bioAvailable = async () => {
  try {
    if (!window.isSecureContext || !window.PublicKeyCredential || !navigator.credentials) return false;
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (e) {
    return false;
  }
};
// attivo su questo telefono (e la password admin non è cambiata da allora)
export const bioEnabled = () => {
  const x = read();
  return !!(x && x.id && x.hash === currentAdminHash());
};
export const bioDeclined = () => {
  try {
    return localStorage.getItem(NO) === "1";
  } catch (e) {
    return false;
  }
};
export const declineBio = () => {
  try {
    localStorage.setItem(NO, "1");
  } catch (e) {
    // niente
  }
};

// da chiamare SOLO dopo che la password admin è stata scritta giusta
export const enableBio = async () => {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: rnd(32),
      rp: { name: "Assistenza Mora", id: window.location.hostname },
      user: { id: rnd(16), name: "admin", displayName: "Admin Assistenza Mora" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60000,
      attestation: "none",
    },
  });
  if (!cred) throw new Error("annullato");
  localStorage.setItem(KEY, JSON.stringify({ id: b64(cred.rawId), hash: currentAdminHash(), at: Date.now() }));
  try {
    localStorage.removeItem(NO);
  } catch (e) {
    // niente
  }
  return true;
};

export const disableBio = () => {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    // niente
  }
};

// chiede impronta / Face ID; true se è andata bene
export const checkBio = async () => {
  const x = read();
  if (!x || !x.id || x.hash !== currentAdminHash()) return false;
  try {
    const got = await navigator.credentials.get({
      publicKey: {
        challenge: rnd(32),
        allowCredentials: [{ type: "public-key", id: unb64(x.id) }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return !!got && b64(got.rawId) === x.id;
  } catch (e) {
    return false;
  }
};
