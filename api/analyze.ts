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

    const { text, image } = req.body || {};

    if (!text && !image) {
      return res.status(400).json({
        error: "Envie texto ou imagem"
      });
    }

    const content: any[] = [];

    if (text && !image) {
      // Texto enviado, criar prompt reforçado para alimentos brasileiros
      content.push({
        type: "input_text",
        text: `Você é um nutricionista brasileiro. Analise a refeição descrita abaixo e estime quantidades reais. 

Instruções:
- Estime calorias, proteínas, carboidratos e gorduras.
- Se algum valor não puder ser estimado, use 0.
- Responda EXATAMENTE neste formato:

Calorias: X kcal
Proteínas: X g
Carboidratos: X g
Gorduras: X g

<uma frase curta e natural (máx. 10-15 palavras) sobre a qualidade da refeição, incluindo 1 ou 2 emojis apropriados>

Refeição: ${text}`
      });
    } else if (image) {
      // Imagem enviada, validar formato antes
      const allowedFormats = ["jpeg", "jpg", "png", "gif", "webp", "avif"];
      const extension = image.split(".").pop()?.toLowerCase();

      if (!extension || !allowedFormats.includes(extension)) {
        return res.status(400).json({
          error: "Formato de imagem não suportado. Use jpeg, jpg, png, gif, webp ou avif."
        });
      }

      // Prompt para imagem
      content.push({
        type: "input_text",
        text: `Você é um nutricionista brasileiro. Analise a refeição na imagem enviada e estime quantidades reais.

Instruções:
- Estime calorias, proteínas, carboidratos e gorduras.
- Se algum valor não puder ser estimado, use 0.
- Responda EXATAMENTE neste formato:

Calorias: X kcal
Proteínas: X g
Carboidratos: X g
Gorduras: X g

<uma frase curta e natural (máx. 10-15 palavras) sobre a qualidade da refeição, incluindo 1 ou 2 emojis apropriados>`
      });

      content.push({
        type: "input_image",
        image_url: image
      });
    }

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

    // Extrair o texto do modelo
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
      details: error.message
    });
  }
}
