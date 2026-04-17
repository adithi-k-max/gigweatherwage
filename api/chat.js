const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function buildSystemPrompt(language = "en", workerContext = null) {
  const workerSummary = workerContext
    ? `Worker context: ${JSON.stringify(workerContext)}`
    : "Worker context is not available.";

  return [
    "You are GigaSaathi, the in-app support assistant for GigWeatherWage.",
    "Answer in the same language as the user message when possible.",
    "Give concise, practical steps users can do inside this app.",
    "Focus on: login, password reset, claims, weather alerts, premium changes, billing credit, city/zone updates, profile/account actions, and support tickets.",
    "Do not make up policy/legal promises. If uncertain, recommend raising a support ticket.",
    workerSummary,
    `Preferred UI language code: ${language}.`
  ].join("\n");
}

async function callOpenAI({ message, language, workerContext, history }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  if (!String(apiKey).trim().startsWith("sk-")) {
    throw new Error("OPENAI_API_KEY appears invalid. Use an OpenAI secret key starting with sk-.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const messages = [{ role: "system", content: buildSystemPrompt(language, workerContext) }];
  for (const item of history || []) {
    if (!item?.text || !item?.role) continue;
    messages.push({
      role: item.role === "assistant" ? "assistant" : "user",
      content: String(item.text)
    });
  }
  messages.push({ role: "user", content: String(message || "") });

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 350
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || `OpenAI request failed (${response.status})`;
    throw new Error(message);
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error("Empty model response");
  }
  return reply;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    let body = req.body || {};
    if (typeof body === "string") {
      try {
        body = JSON.parse(body || "{}");
      } catch (err) {
        body = {};
      }
    } else if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString("utf8") || "{}");
      } catch (err) {
        body = {};
      }
    }

    const message = String(body.message || "").trim();
    if (!message) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const language = String(body.language || "en");
    const workerContext = body.workerContext || null;
    const history = Array.isArray(body.history) ? body.history : [];

    const reply = await callOpenAI({ message, language, workerContext, history });
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({
      error: "AI service unavailable",
      detail: err?.message || "Unknown server error"
    });
  }
};
