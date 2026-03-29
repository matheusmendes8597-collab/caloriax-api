// api/analyze.ts
export const config = {
  api: {
    bodyParser: true,
  },
};

declare const process: any;

export default async function handler(req: any, res: any) {
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

    let { text, image } = req.body || {};

    if (!text && !image) {
      return res.status(400).json({ error: "Envie texto ou imagem" });
    }

    // Se texto vazio, usar fallback
    if (!text) text = "Analise essa refeição";

    // Construindo conteúdo para a API
    const content: any[] = [];

    content.push({
      type: "input_text",
      text: `Analise a refeição baseada em texto detalhado e imagem (se houver).
      
Se não houver informação suficiente, responda: "Não é possível analisar. Envie apenas alimentos."

Se houver dados suficientes, forneça EXATAMENTE no formato:
Calorias: X kcal
Proteínas: X g
Carboidratos: X g
Gorduras: X g

Inclua uma única frase curta, natural, sobre a refeição, considerando saúde e quantidade. Máx 15 palavras. Inclua 1-2 emojis apropriados.

Não invente valores se não houver dados claros.`
    });

    // Só enviar imagem se for URL http/https ou base64 válido
    if (image && (typeof image === "string") && (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("data:image/"))) {
      content.push({
        type: "input_image",
        image_url: image,
      });
    }

    // Requisição para OpenAI
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "user",
            content,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "Erro OpenAI",
        details: data,
      });
    }

    // Pegar resultado final
    const result =
      data.output_text ||
      data.output?.map((o: any) =>
        o.content?.map((c: any) => c.text).join("")
      ).join("") ||
      "Não é possível analisar. Envie apenas alimentos.";

    return res.status(200).json({ result });
  } catch (error: any) {
    return res.status(500).json({
      error: "Erro geral",
      details: error.message,
    });
  }
}
