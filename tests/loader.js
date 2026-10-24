// Loader CommonJS + Firebase finto (registra le scritture) + icone finte.
window.__cache = {};
window.process = { env: { NODE_ENV: "development" } };
window.__writes = [];
const rec = (op, ref, data) => { window.__writes.push(JSON.stringify([op, ref && ref.path, data === undefined ? null : data])); return Promise.resolve({ id: "new-id" }); };

const FAKE = () => window.__fakeDB || {};
const snapOf = (ref) => {
  const seg = (ref && ref.path ? ref.path : "").split("/");
  const name = ref && ref.kind === "doc" ? seg[seg.length - 2] : seg[seg.length - 1];
  const rows = (FAKE()[name] || []).filter((r) => !ref.filters || ref.filters.every(([f0, op, v]) => { const r2 = f0 === "__name__" ? { ...r, __name__: r.id } : r; const f = f0; return (op === "array-contains" ? Array.isArray(r2[f]) && r2[f].includes(v) : op === ">=" ? r2[f] && v && (r2[f].seconds != null ? r2[f].seconds >= v.seconds : r2[f] >= v) : op === "<" ? r2[f] && v && (r2[f].seconds != null ? r2[f].seconds < v.seconds : r2[f] < v) : r2[f] === v); }));
  if (ref && ref.kind === "doc") {
    const id = seg[seg.length - 1];
    const row = (FAKE()[name] || []).find((r) => r.id === id);
    return { id, ref, exists: () => !!row, data: () => { if (!row) return undefined; const { id: _i, ...rest } = row; return rest; }, docs: [], forEach() {}, docChanges: () => [] };
  }
  const docs = rows.map((r) => ({ id: r.id, ref: { kind: "doc", path: ref.path + "/" + r.id }, metadata: { hasPendingWrites: !!r.__pending }, data: () => { const { id, __pending, ...rest } = r; return rest; } }));
  return {
    docs, size: docs.length, empty: docs.length === 0, metadata: { fromCache: !!window.__offline, hasPendingWrites: false },
    forEach: (cb) => docs.forEach(cb),
    docChanges: () => [],
    exists: () => false, data: () => undefined,
  };
};
// modo "vivo" (window.__liveDB): le scritture finiscono nel DB finto e gli ascoltatori vengono richiamati
const liveWrite = (name, row) => {
  const db = FAKE(); db[name] = (db[name] || []).filter((x) => x.id !== row.id).concat([row]);
  setTimeout(() => (window.__subs || []).forEach((s) => { const seg = s.ref.path.split("/"); const n = s.ref.kind === "doc" ? seg[seg.length - 2] : seg[seg.length - 1]; if (n === name) s.cb(snapOf(s.ref)); }), 0);
};
const firestore = {
  getFirestore: () => ({}),
  enableIndexedDbPersistence: () => Promise.resolve(),
  collection: (_db, ...p) => ({ kind: "coll", path: p.join("/") }),
  doc: (a, ...p) => { if (a && a.kind === "coll") { const id = p[0] || "auto" + (window.__autoN = (window.__autoN || 0) + 1); return { kind: "doc", path: a.path + "/" + id, id }; } return { kind: "doc", path: p.join("/"), id: p[p.length - 1] }; },
  query: (c, ...cons) => ({ ...c, filters: cons.filter((x) => x && x.where).map((x) => x.where) }),
  where: (f, op, v) => ({ where: [f, op, v] }),
  orderBy: () => ({}), limit: () => ({}), documentId: () => "__name__",
  serverTimestamp: () => "TS",
  Timestamp: { fromMillis: (ms) => ({ seconds: Math.floor(ms / 1000) }), now: () => ({ seconds: Math.floor(Date.now() / 1000) }) },
  increment: (n) => ({ __increment: n }),
  onSnapshot: (ref, a, b, c) => { const cb = typeof a === "function" ? a : b; const eb = typeof a === "function" ? b : c; if (window.__failAll && eb) { setTimeout(() => eb(new Error("quota")), 0); return () => {}; } setTimeout(() => cb(snapOf(ref)), 0); if (!window.__liveDB) return () => {}; const sub = { ref, cb }; (window.__subs = window.__subs || []).push(sub); return () => { window.__subs = window.__subs.filter((x) => x !== sub); }; },
  getDocs: (ref) => Promise.resolve(snapOf(ref)),
  getDoc: (ref) => Promise.resolve(snapOf(ref)),
  getDocsFromCache: (ref) => (window.__noCache ? Promise.reject(new Error("no cache")) : Promise.resolve(snapOf(ref))),
  getDocsFromServer: (ref) => { (window.__reads = window.__reads || []).push("Q:" + ref.path); return window.__offline ? Promise.reject(new Error("offline")) : Promise.resolve(snapOf(ref)); },
  getDocFromCache: (ref) => ((window.__fsCache || {})[ref.path] ? Promise.resolve(window.__fsCache[ref.path]) : Promise.reject(new Error("not cached"))),
  getDocFromServer: (ref) => { (window.__reads = window.__reads || []).push(ref.path); if (window.__offline) return Promise.reject(new Error("offline")); const sn = snapOf(ref); (window.__fsCache = window.__fsCache || {})[ref.path] = sn; return Promise.resolve(sn); },
  addDoc: (ref, d) => { const r = rec("add", ref, d); if (window.__liveDB) liveWrite(ref.path.split("/").pop(), { id: "live" + (window.__liveN = (window.__liveN || 0) + 1), ...d }); return window.__liveDB ? Promise.resolve({ id: "live" + window.__liveN }) : r; },
  setDoc: (ref, d, o) => { const r = rec("set", ref, [d, o || null]); if (window.__liveDB) { const seg = ref.path.split("/"); liveWrite(seg[seg.length - 2], { ...(o && o.merge ? ((FAKE()[seg[seg.length - 2]] || []).find((x) => x.id === seg[seg.length - 1]) || {}) : {}), ...d, id: seg[seg.length - 1] }); } return r; },
  updateDoc: (ref, d) => rec("update", ref, d),
  deleteDoc: (ref) => { const r = rec("delete", ref); if (window.__liveDB) { const seg = ref.path.split("/"); const name = seg[seg.length - 2]; const db = FAKE(); db[name] = (db[name] || []).filter((x) => x.id !== seg[seg.length - 1]); setTimeout(() => (window.__subs || []).forEach((s) => { const sg = s.ref.path.split("/"); const n = s.ref.kind === "doc" ? sg[sg.length - 2] : sg[sg.length - 1]; if (n === name) s.cb(snapOf(s.ref)); }), 0); } return r; },
  deleteField: () => "__DEL__",
  writeBatch: () => ({
    set: (r, d, o) => { rec("b.set", r, d); if (window.__liveDB) { const seg = r.path.split("/"); const n = seg[seg.length - 2]; const prev = (o && o.merge ? ((FAKE()[n] || []).find((x) => x.id === seg[seg.length - 1]) || {}) : {}); const row = { ...prev, ...d, id: seg[seg.length - 1] }; Object.keys(row).forEach((k) => row[k] === "__DEL__" && delete row[k]); liveWrite(n, row); } },
    update: (r, d) => rec("b.update", r, d),
    delete: (r) => { rec("b.delete", r); if (window.__liveDB) { const seg = r.path.split("/"); const n = seg[seg.length - 2]; const db = FAKE(); db[n] = (db[n] || []).filter((x) => x.id !== seg[seg.length - 1]); } },
    commit: () => rec("b.commit"),
  }),
};
const authMod = {
  getAuth: () => ({}),
  signInAnonymously: () => Promise.resolve({ user: { uid: "u1" } }),
  onAuthStateChanged: (_a, cb) => { setTimeout(() => cb({ uid: "u1", isAnonymous: !!window.__anonUser }), 0); return () => {}; },
  signInWithCustomToken: (_a, t) => { (window.__authLog = window.__authLog || []).push("custom:" + t); return Promise.resolve({ user: { uid: "tech" } }); },
  signOut: () => { (window.__authLog = window.__authLog || []).push("signOut"); return Promise.resolve(); },
};
window.__require = function (name) {
  if (window.__cache[name]) return window.__cache[name].exports;
  const set = (exp) => (window.__cache[name] = { exports: exp }).exports;
  if (name === "firebase/app") return set({ initializeApp: () => ({}) });
  if (name === "pdf-lib") return set(window.PDFLib);
  if (name === "firebase/auth") return set(authMod);
  if (name === "firebase/firestore") return set(firestore);
  if (name === "lucide-react") {
    const R = window.__require("react"); const memo = {};
    return set(new Proxy({}, { get: (_, k) => (k === "__esModule" ? false : (memo[k] = memo[k] || function Icon(p) { return R.createElement("svg", { "data-icon": String(k), className: p && p.className }); })) }));
  }
  if (window.__defs[name]) {
    const module = { exports: {} };
    window.__cache[name] = module;
    window.__defs[name](module, module.exports, window.__require, window.process);
    return module.exports;
  }
  throw new Error("Modulo sconosciuto: " + name);
};
window.mountApp = function () {
  const R = window.__require("react");
  const { createRoot } = window.__require("react-dom/client");
  const App = window.__require("@/App").default;
  createRoot(document.getElementById("root")).render(R.createElement(App));
};
window.mountComponent = function (name, props) {
  const R = window.__require("react");
  const { createRoot } = window.__require("react-dom/client");
  let C = null;
  for (const id of Object.keys(window.__defs)) {
    if (!id.startsWith("@/")) continue;
    const m = window.__require(id);
    if (m && m[name]) { C = m[name]; break; }
  }
  if (!C) throw new Error("Componente non trovato: " + name);
  createRoot(document.getElementById("root")).render(R.createElement(C, props));
};
window.mountOffice = function (props) { window.mountComponent("OfficeView", props); };
