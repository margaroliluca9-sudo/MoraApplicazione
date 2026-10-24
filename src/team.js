// INTERVENTO IN DUE: quando nel rapporto metti i colleghi («Hanno lavorato con te?»)
// a ognuno arriva una notifica sul telefono: «Mario ti ha messo nel rapporto · Bianchi Lamiere · gru 01».
// Il rapporto compare già nello Storico di tutti («I miei») e nel PDF con tutti i nomi.
// Le notifiche le spedisce il postino /api/notify (lo stesso della chat).
import { deleteDoc } from "firebase/firestore";
import { getDocs } from "./metered";
import { chatRef, chatDoc, key, subId } from "./chat";

const clean = (names) => [...new Set((names || []).map(key).filter(Boolean))];

// i colleghi da avvisare (mai chi scrive il rapporto)
export const colleaguesOf = (log) => clean(log.additionalTechnicians).filter((k) => k !== key(log.technician));

// i telefoni dei colleghi (chi ha spento i promemoria non lo disturbo)
export const colleagueSubs = (log, subs) => {
  const who = colleaguesOf(log);
  return (subs || []).filter((s) => s && s.endpoint && who.includes(key(s.technician)) && s.reminders !== false);
};

export const colleagueNotice = (log) => ({
  title: `${log.technician || "Un collega"} ti ha messo nel rapporto`,
  text: [log.customer, log.machineId && "gru " + log.machineId, log.dateString].filter(Boolean).join(" · "),
  tag: "team-" + key(log.customer) + "-" + key(log.machineId),
  url: "/",
});

export const notifyColleagues = async (log) => {
  if (!colleaguesOf(log).length) return { sent: 0 };
  const snap = await getDocs(chatRef("push_subscriptions"));
  const subs = colleagueSubs(log, snap.docs.map((d) => d.data()));
  if (!subs.length) return { sent: 0 };
  const r = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...colleagueNotice(log),
      subscriptions: subs.map((s) => ({ endpoint: s.endpoint, keys: s.keys })),
    }),
  });
  const res = await r.json().catch(() => ({}));
  (res.gone || []).forEach((e) => deleteDoc(chatDoc("push_subscriptions", subId(e))).catch(() => {}));
  return res;
};
