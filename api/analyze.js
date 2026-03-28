export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { imageUrl, text } = req.body;

    if (!imageUrl && !text) {
      return res.status(400).json({ error: "Envie imagem ou texto" });
    }

    const inputContent = text
      ? [{ type: "input_text", text }]
      : [
          { type: "input_text", text: "Analise essa refeição" },
          { type: "input_image", image_url: imageUrl }
        ];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "o4-mini",
        input: [
          {
            role: "user",
            content: inputContent
          }
        ]
      })
    });

    const data = await response.json();

    res.status(200).json({
      result: data.output?.[0]?.content?.[0]?.text || "Erro ao interpretar resposta"
    });

  } catch (error) {
    res.status(500).json({ error: "Erro ao analisar refeição" });
  }
}
