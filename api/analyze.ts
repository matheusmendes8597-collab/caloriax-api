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

    // Prompt reforçado para texto e imagem, incluindo contexto brasileiro
    content.push({
      type: "input_text",
      text: `Você é um nutricionista virtual, especialista em alimentação brasileira.

Analise a refeição enviada pelo usuário. Pode ser:
- Texto descrevendo alimentos e quantidades (ex: "500g arroz, 2 ovos cozidos, feijão")
- Imagem de alimentos
- Ambos

Regras:

1. Sempre estime quantidades reais e macronutrientes:
   - Calorias
   - Proteínas
   - Carboidratos
   - Gorduras
2. Se a entrada for apenas texto, interprete os alimentos e quantidades.
3. Se a entrada tiver imagem, use a imagem para identificar alimentos e estimar valores.
4. Se não for possível identificar a refeição ou for inválida (como água, objetos não alimentares), responda:
   "Não é possível analisar. Envie apenas alimentos."
5. Responda **EXATAMENTE** neste formato:
   
Calorias: X kcal
Proteínas: X g
Carboidratos: X g
Gorduras: X g

<uma frase curta, natural e humana, de 10-15 palavras, sobre a qualidade da refeição.
Inclua 1 ou 2 emojis apropriados.
Se saudável, elogie. Se mediana, sugira melhoria leve. Se pouco saudável, faça alerta leve sem julgar.>

Sem explicações extras.`
    });

    // Adiciona imagem se houver e se for válida
    if (image && (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("data:image/"))) {
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
      console.error("OpenAI API error:", data);
      return res.status(500).json({
        error: "Erro OpenAI",
        details: data
      });
    }

    // Extrai resultado de forma consistente
    const result =
      data.output_text ||
      data.output?.map((o: any) =>
        o.content?.map((c: any) => c.text).join("")
      ).join("") ||
      "Não é possível analisar. Envie apenas alimentos.";

    return res.status(200).json({ result });

  } catch (error: any) {
    console.error("Erro geral:", error);
    return res.status(500).json({
      error: "Erro geral",
      details: error.message
    });
  }
}
