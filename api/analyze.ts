// api/analyze.ts
export const config = {
  api: {
    bodyParser: true
  }
};

declare const process: any;

const SUPPORTED_IMAGE_FORMATS = ["jpeg", "jpg", "png", "gif", "webp", "avif"];

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

    // Validação de imagem
    if (image) {
      const ext = image.split(".").pop()?.toLowerCase();
      if (!ext || !SUPPORTED_IMAGE_FORMATS.includes(ext)) {
        return res.status(400).json({
          error: `Formato de imagem não suportado. Use ${SUPPORTED_IMAGE_FORMATS.join(
            ", "
          )}.`
        });
      }
    }

    const content: any[] = [];

    // Prompt para IA
    let promptText = `
Analise a refeição fornecida pelo usuário.
Se houver imagem, analise a comida na imagem.
Se houver apenas texto, estime calorias e macros com base no texto.
Se não for possível analisar, responda: "Não é possível analisar. Envie apenas alimentos."

Formato EXATO da resposta:
Calorias: X kcal
Proteínas: X g
Carboidratos: X g
Gorduras: X g

<uma única frase curta (máx. 10 a 15 palavras), natural e humana, sobre a qualidade da refeição.
Se for saudável, elogie.
Se for mediana, sugira melhoria leve.
Se for pouco saudável, faça um alerta leve sem julgar.
Inclua 1 ou 2 emojis no máximo que combinem com o contexto.>

Sem textos extras tipo "Reflexão:" ou qualquer outro cabeçalho.
`;

    content.push({ type: "input_text", text: promptText });

    if (image) {
      content.push({
        type: "input_image",
        image_url: image
      });
    }

    // Chamada OpenAI
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

    // Extrair texto da resposta da IA
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
