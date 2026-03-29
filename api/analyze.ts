declare const process: any;

export default async function handler(req: any, res: any) {
  // 🔥 CORS
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

    const { imageUrl, text } = body || {};

    if (!imageUrl && !text) {
      return res.status(400).json({ error: "Envie imagem ou texto" });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "o4-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  text ||
                  "Analise essa refeição e informe calorias, proteínas, carboidratos e gorduras."
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    const resultText =
      data.output_text ||
      data.output?.map((item: any) =>
        item.content?.map((c: any) => c.text).join(" ")
      ).join(" ");

    return res.status(200).json({
      result: resultText || "Erro ao interpretar resposta"
    });

  } catch (error) {
    return res.status(500).json({
      error: "Erro ao analisar refeição"
    });
  }
}
