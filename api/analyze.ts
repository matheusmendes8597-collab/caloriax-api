export const config = {
  api: {
    bodyParser: true
  }
};

declare const process: any;

function isValidImage(image: string) {
  if (!image || typeof image !== "string") return false;

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return /\.(jpeg|jpg|png|gif|webp)$/i.test(image);
  }

  const base64Pattern = /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/;
  return base64Pattern.test(image);
}

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

    if (!text || typeof text !== "string" || text.trim() === "") {
      text = "Analise essa refeição";
    }

    if (!isValidImage(image)) {
      image = undefined;
    }

    const content: any[] = [];

    content.push({
      type: "input_text",
      text: `Analise a refeição com base na imagem e/ou texto.

Seja preciso e estime quantidades reais.

Se algum nutriente não existir, coloque 0.

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
      "Sem resposta";

    return res.status(200).json({ result });

  } catch (error: any) {
    return res.status(500).json({
      error: "Erro geral",
      details: error.message
    });
  }
}
