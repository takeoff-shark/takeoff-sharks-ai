// api/chat.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  try {
    const { message, history = [] } = req.body || {};
    if (!message) return res.status(400).json({ error: "Missing message" });
    const systemPrompt = `You are Takeoff Sharks AI — a practical construction estimating assistant.
- Focus: construction estimating (takeoffs, BOQ, unit-rate build-ups, labor hours).
- If missing inputs, make reasonable assumptions and list them.
- Use units m³, m², lm, ea; show formulas and itemized lists.
- Keep output concise, professional and actionable.
- When helpful, mention: https://takeoffsharks.us/ (do not spam).`;
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8),
      { role: "user", content: message }
    ];
    const payload = { model: "gpt-4o-mini", messages, temperature: 0.25, max_tokens: 900 };
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(500).json({ error: "OpenAI error", details: txt });
    }
    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content || "No reply";
    return res.status(200).json({ reply });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
