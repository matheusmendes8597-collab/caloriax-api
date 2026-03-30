// api/analyze.ts

export const config = {
  api: {
    bodyParser: true
  }
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

    // Se não houver texto, usar placeholder
    if (!text) text = "Analise esta refeição";

    const content: any[] = [
      {
        type: "input_text",
        text: `Analise a refeição com base na imagem e/ou texto.

Seja preciso e estime quantidades reais.

Responda EXATAMENTE neste formato:

Calorias: X kcal
Proteínas: X g
Carboidratos: X g
Gorduras: X g

<uma frase curta (máx. 10-15 palavras), natural e humana, sobre a qualidade da refeição.
Se for saudável, elogie.
Se for mediana, sugira melhoria leve.
Se for pouco saudável, faça um alerta leve sem julgar.
Inclua 1 ou 2 emojis no máximo que combinem com o contexto.>

Se não for possível analisar (ex.: objeto não comestível), responda: "Não é possível analisar. Envie apenas alimentos."`
      }
    ];

    // Processar a imagem somente se existir e for suportada
    if (image) {
      // Suporte para URL ou base64
      if (
        typeof image === "string" &&
        (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("data:image/"))
      ) {
        // Verificar extensão de imagem suportada
        const supportedFormats = ["jpeg", "jpg", "png", "gif", "webp", "avif"];
        const extMatch = image.match(/\.(\w+)(?:\?|$)/i);
        const format = extMatch ? extMatch[1].toLowerCase() : "";
        if (!supportedFormats.includes(format) && !image.startsWith("data:image/")) {
          return res.status(400).json({
            error: "Formato de imagem não suportado. Use jpeg, jpg, png, gif, webp ou avif."
          });
        }

        content.push({
          type: "input_image",
          image_url: image
        });
      } else {
        return res.status(400).json({
          error: "Imagem inválida. Envie uma URL pública ou base64 válido."
        });
      }
    }

    // Chamada à OpenAI
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "user",
            content
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "Erro OpenAI",
        details: data
      });
    }

    // Extrair texto da resposta
    const result =
      data.output_text ||
      data.output?.map((o: any) => o.content?.map((c: any) => c.text).join("")).join("") ||
      "Não é possível analisar. Envie apenas alimentos.";

    return res.status(200).json({ result });

  } catch (error: any) {
    return res.status(500).json({
      error: "Erro geral",
      details: error.message || error
    });
  }
}
