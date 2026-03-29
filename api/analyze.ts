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

    const isValidUrl = (url: string) => /^https?:\/\/.+/.test(url);
    const isBase64 = (str: string) =>
      typeof str === "string" && /^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(str);

    const content: any[] = [];

    content.push({
      type: "input_text",
      text: `Analise a refeição com base na imagem e/ou texto.

Seja preciso e estime quantidades reais.

- Se algum nutriente não existir ou for zero, coloque 0.
- Nunca invente números altos para alimentos sem calorias (como água ou gelo).
- Se a imagem ou texto não representar alimento, responda: "Não é possível analisar. Envie apenas alimentos."

Responda EXATAMENTE neste formato:

Calorias: X kcal
Proteínas: X g
Carboidratos: X g
Gorduras: X g

<uma única frase curta (máx. 10 a 15 palavras), natural e humana, sobre a qualidade da refeição.
Se for saudável, elogie.
Se for mediana, sugira melhoria leve.
Se for pouco saudável, faça um alerta leve sem julgar.
Inclua 1 ou 2 emojis no máximo que combinem com o contexto.>

Sem explicações extras.`
    });

    if (image && (isValidUrl(image) || isBase64(image))) {
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
      "Sem resposta";

    return res.status(200).json({ result });

  } catch (error: any) {
    return res.status(500).json({
      error: "Erro geral",
      details: error.message
    });
  }
}
