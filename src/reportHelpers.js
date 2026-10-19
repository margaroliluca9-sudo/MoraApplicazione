// AIUTI PER SCRIVERE IL RAPPORTO
//  - bozza salvata da sola sul telefono (se l'app si chiude il rapporto non si perde)
const DRAFT_KEY = "mora_report_draft";

export const loadDraft = () => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    return d && d.data && (d.data.customer || d.data.description) ? d : null;
  } catch (e) {
    return null;
  }
};
export const saveDraft = (data) => {
  const draft = { data, savedAt: Date.now() };
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (e) {
    // telefono pieno: salvo senza foto
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, data: { ...data, photos: [] }, noPhotos: true }));
    } catch (err) {
      // niente
    }
  }
};
export const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    // niente
  }
};
// "oggi 14:20" / "ieri 9:05" / "16/10 18:30"
export const draftWhen = (ms) => {
  const d = new Date(ms || 0);
  const t = new Date();
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (d.toDateString() === t.toDateString()) return "oggi " + hm;
  const y = new Date(t);
  y.setDate(t.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "ieri " + hm;
  return `${d.getDate()}/${d.getMonth() + 1} ${hm}`;
};
