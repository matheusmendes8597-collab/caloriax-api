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
      return res.status(400).json({ error: "Envie texto ou imagem" });
    }

    const content: any[] = [];

    // Prompt reforçado para análise precisa
    content.push({
      type: "input_text",
      text: `
Analise a refeição baseada na imagem e/ou no texto fornecido. 
Se for apenas texto, use as quantidades mencionadas. 
Se for imagem, identifique alimentos e estimativa de quantidades.

Responda EXATAMENTE neste formato:

Calorias: X kcal
Proteínas: X g
Carboidratos: X g
Gorduras: X g

<uma única frase curta (máx. 10-15 palavras) sobre a refeição:
- se saudável → elogiar
- se mediana → sugerir melhoria leve
- se pouco saudável → alerta leve
- se não for possível analisar → dizer "Não é possível analisar. Envie apenas alimentos."
Inclua 1 ou 2 emojis que combinem com o contexto.>

Se não for alimento ou não for possível determinar calorias, proteínas, carboidratos e gorduras:
- coloque todos como 0
- use frase: "Não é possível analisar. Envie apenas alimentos."

Não forneça explicações extras.
      `
    });

    if (image) {
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
