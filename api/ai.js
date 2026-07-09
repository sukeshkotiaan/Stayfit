export const config = { maxDuration: 30 };

const GEMINI_KEYS = (process.env.GEMINI_KEYS || "").split(",").map(k => k.trim()).filter(Boolean);
const GROQ_KEYS   = (process.env.GROQ_KEYS   || "").split(",").map(k => k.trim()).filter(Boolean);
const OR_KEYS     = (process.env.OPENROUTER_KEYS || "").split(",").map(k => k.trim()).filter(Boolean);

async function callGemini(prompt, maxTokens, imageBase64) {
  for (const key of GEMINI_KEYS) {
    const parts = imageBase64
      ? [{ inlineData: { mimeType: "image/jpeg", data: imageBase64 } }, { text: prompt }]
      : [{ text: prompt }];
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens } }) }
    );
    if (res.status === 429) continue;
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) throw new Error("Empty Gemini response");
    return text;
  }
  throw new Error("RATE_LIMITED");
}

async function callGroq(prompt, maxTokens) {
  for (const key of GROQ_KEYS) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], max_tokens: Math.min(maxTokens, 32768), temperature: 0.4 }),
    });
    if (res.status === 429) continue;
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    if (!text) throw new Error("Empty Groq response");
    return text;
  }
  throw new Error("RATE_LIMITED");
}

async function callOpenRouter(prompt, maxTokens) {
  for (const key of OR_KEYS) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "HTTP-Referer": "https://stayfit.app", "X-Title": "StayFit" },
      body: JSON.stringify({ model: "meta-llama/llama-3.3-70b-instruct:free", messages: [{ role: "user", content: prompt }], max_tokens: Math.min(maxTokens, 8192), temperature: 0.4 }),
    });
    if (res.status === 429) continue;
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    if (!text) throw new Error("Empty OpenRouter response");
    return text;
  }
  throw new Error("RATE_LIMITED");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt, maxTokens = 8000, imageBase64 = null } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  const providers = [
    { name: "Gemini", fn: () => callGemini(prompt, maxTokens, imageBase64) },
    { name: "Groq",   fn: () => callGroq(prompt, maxTokens) },
    { name: "OpenRouter", fn: () => callOpenRouter(prompt, maxTokens) },
  ];

  for (const { name, fn } of providers) {
    try {
      const raw = await fn();
      const text = raw.replace(/^```json\s*/m, "").replace(/^```\s*/m, "").replace(/```\s*$/m, "").trim();
      return res.status(200).json({ text, provider: name });
    } catch (e) {
      if (e.message === "RATE_LIMITED") continue;
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(429).json({ error: "ALL_RATE_LIMITED" });
}
