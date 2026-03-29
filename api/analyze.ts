declare const process: any;

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { text } = body || {};

    if (!text) {
      return res.status(400).json({ error: "Envie uma descrição" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Calcule calorias, proteínas, carboidratos e gorduras de: ${text}`
          }
        ]
      })
    });

    const data = await response.json();

    // 🔥 MOSTRAR ERRO REAL
    if (!response.ok) {
      return res.status(500).json({
        error: "Erro OpenAI",
        details: data
      });
    }

    return res.status(200).json({
      result: data.choices?.[0]?.message?.content || "Sem resposta"
    });

  } catch (error: any) {
    return res.status(500).json({
      error: "Erro geral",
      details: error.message
    });
  }
}
