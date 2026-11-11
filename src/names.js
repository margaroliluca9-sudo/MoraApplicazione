// NOME «PULITO» DEI CLIENTI per abbinare le cartelle del Drive ai clienti dell'app:
// maiuscolo, senza accenti, punteggiatura e forme societarie (SRL, SPA, F.LLI...).
const FORMS = /\b(S\s?R\s?L|S\s?P\s?A|S\s?N\s?C|S\s?A\s?S|S\s?S|SPA|SRL|SNC|SAS|SOCIETA|SOCIET[AÀ]|UNIPERSONALE|A SOCIO UNICO|SOCIO UNICO|BENEFIT|ITALIA|ITALIANA|F\s?LLI|FRATELLI|OFF|OFFICINA|MECC|DI|E|C)\b/g;
export const normName = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’]/g, "")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(FORMS, " ")
    .replace(/\s+/g, " ")
    .trim();
