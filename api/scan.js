// LETTURA DEI FOGLI (funzione Vercel, indirizzo /api/scan).
// Le Note di La mia area mandano la foto di un foglio scritto a mano (misure, appunti):
// l'intelligenza artificiale (Claude, di Anthropic) lo trascrive in testo da mettere nella nota.
// La chiave NON è nel codice (repository pubblico): va messa su Vercel → Settings →
// Environment Variables → ANTHROPIC_API_KEY. Senza chiave risponde 503 e l'app salva solo la foto.
// Facoltativo: ANTHROPIC_MODEL per cambiare modello.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const MAX_CHARS = 2800000; // ~2 MB di foto

const PROMPT = `Questa è la foto di un foglio di un tecnico che fa manutenzione di gru e carroponti (appunti, misure, schizzi).
Trascrivi in italiano, fedelmente, tutto quello che è scritto, riga per riga, nello stesso ordine del foglio.
- Misure e numeri esattamente come scritti, con le unità (mm, m, kg, t, A, V…).
- Se ci sono tabelle o elenchi, una riga per voce nella forma «voce: valore».
- Se c'è uno schizzo con quote, scrivi «Schizzo:» e poi le quote che si leggono.
- Le parole che non riesci a leggere scrivile come [?]. Non inventare niente e non aggiungere commenti.
Rispondi solo con il testo trascritto.`;

const send = (res, code, data) => res.status(code).json(data);

const handler = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Usa POST" });
  // solo dall'app (le richieste del browser portano l'indirizzo da cui arrivano)
  const origin = String(req.headers.origin || "");
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
  if (origin && host && origin.replace(/^https?:\/\//, "") !== host) return send(res, 403, { error: "Non permesso" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return send(res, 503, { error: "non-configurato" });
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  const image = String((body && body.image) || "");
  const m = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return send(res, 400, { error: "Foto non valida" });
  if (image.length > MAX_CHARS) return send(res, 413, { error: "Foto troppo grande" });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return send(res, 502, { error: (data && data.error && data.error.message) || "Errore del servizio " + r.status });
    const text = (data.content || [])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n")
      .trim();
    return send(res, 200, { text });
  } catch (e) {
    return send(res, 502, { error: "Servizio non raggiungibile" });
  }
};

module.exports = handler;
module.exports.PROMPT = PROMPT;
