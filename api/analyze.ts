// api/analyze.ts

export const config = {
  api: {
    bodyParser: true,
  },
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
        error: "Envie texto ou imagem",
      });
    }

    // Se houver imagem, verificar se é um formato suportado
    if (image) {
      const lowerImage = image.toLowerCase();
      const isValidFormat = SUPPORTED_IMAGE_FORMATS.some((ext) =>
        lowerImage.endsWith("." + ext) || lowerImage.startsWith(`data:image/${ext}`)
      );

      if (!isValidFormat) {
        return res.status(400).json({
          error:
            "Formato de imagem não suportado. Use jpeg, jpg, png, gif, webp ou avif.",
        });
      }
    }

    // Preparar conteúdo para a IA
    const content: any[] = [];

    content.push({
      type: "input_text",
      text: `Você é um nutricionista virtual brasileiro. Analise a refeição enviada via texto e/ou imagem.
Seja preciso na estimativa de calorias, proteínas, carboidratos e gorduras. 
Se algum nutriente não estiver presente, coloque 0.
Responda **EXATAMENTE** neste formato:

Calorias: X kcal
Proteínas: X g
Carboidratos: X g
Gorduras: X g

<uma frase curta, natural, humana, de acordo com a refeição e quantidade de calorias.
Se for saudável, elogie. Se for mediana, sugira melhoria leve. Se for pouco saudável, faça alerta leve sem julgar.
Inclua até 2 emojis compatíveis.>

Não inclua nenhum outro texto, cabeçalho ou palavra como "Reflexão". Apenas o formato acima.`
    });

    if (image) {
      content.push({
        type: "input_image",
        image_url: image,
      });
    }

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
      console.error("OpenAI Error:", data);
      return res.status(500).json({
        error: "Erro OpenAI",
        details: data,
      });
    }

    const result =
      data.output_text ||
      data.output
        ?.map((o: any) =>
          o.content?.map((c: any) => c.text).join("")
        )
        .join("") ||
      "Não é possível analisar. Envie apenas alimentos.";

    // Retornar o resultado final
    return res.status(200).json({ result });
  } catch (error: any) {
    console.error("Analyze Error:", error);
    return res.status(500).json({
      error: "Erro geral",
      details: error.message,
    });
  }
}
