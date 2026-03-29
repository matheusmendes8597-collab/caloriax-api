// api/analyze.ts

export const config = {
  api: {
    bodyParser: true
  }
};

declare const process: any;

const VALID_IMAGE_FORMATS = ["image/jpeg", "image/png", "image/webp"];

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
      return res.status(400).json({ error: "Envie texto ou imagem" });
    }

    const content: any[] = [];

    // Prompt principal para análise
    content.push({
      type: "input_text",
      text: `Você é um nutricionista digital. Analise a refeição com base na imagem ou no texto.
      
- Se for texto, sempre gere estimativas mesmo que aproximadas.
- Considere porções médias brasileiras para cada alimento.
- Responda EXATAMENTE neste formato:
  
Calorias: X kcal
Proteínas: X g
Carboidratos: X g
Gorduras: X g

<uma frase natural e humana sobre a qualidade da refeição. Máx 15 palavras. Se saudável, elogie; se mediana, sugira melhoria leve; se pouco saudável, faça alerta leve. Inclua até 2 emojis que combinem com a refeição.>

- Se a imagem não for de alimento ou estiver em formato inválido, retorne: "Não é possível analisar. Envie apenas alimentos."`
    });

    // Só envia imagem se ela estiver presente e em formato válido
    if (image) {
      // Se for URL, enviar normalmente
      if (typeof image === "string") {
        content.push({
          type: "input_image",
          image_url: image
        });
      } else {
        return res.status(400).json({
          error: "Não é possível analisar. Envie apenas alimentos."
        });
      }
    }

    // Chamada à API OpenAI
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
