import PocketBase from "pocketbase";

export const config = {
  api: {
    bodyParser: true,
  },
};

declare const process: any;

const SUPPORTED_IMAGE_FORMATS = ["jpeg", "jpg", "png", "gif", "webp", "avif"];

const pb = new PocketBase(process.env.POCKETBASE_URL);

const ALLOWED_ORIGINS = [
  "https://caloriax.app",
  "http://localhost:5173",
];

export default async function handler(req: any, res: any) {
  // CORS restrito por origem (com guard para origin undefined)
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // Validar chave interna (com fallback seguro se env não estiver definida)
  if (
    !process.env.INTERNAL_API_KEY ||
    req.headers["x-api-key"] !== process.env.INTERNAL_API_KEY
  ) {
    return res.status(401).json({ error: "Acesso negado" });
  }

  const { text, image, user } = req.body || {};

  // Bloquear sem usuário ou id inválido
  if (!user?.id || typeof user.id !== "string") {
    return res.status(401).json({ error: "Não autorizado" });
  }

  if (!text && !image) {
    return res.status(400).json({ error: "Envie texto ou imagem" });
  }

  // Verificar formato da imagem
  if (image) {
    const lowerImage = image.toLowerCase();

    const isValidFormat = SUPPORTED_IMAGE_FORMATS.some(
      (ext) =>
        lowerImage.endsWith("." + ext) ||
        lowerImage.startsWith(`data:image/${ext}`)
    );

    if (!isValidFormat) {
      return res.status(400).json({
        error:
          "Formato de imagem não suportado. Use jpeg, jpg, png, gif, webp ou avif.",
      });
    }
  }

  // Validar usuário no PocketBase
  let userRecord: any;

  try {
    userRecord = await pb.collection("users").getOne(user.id);
  } catch {
    return res.status(401).json({ error: "Usuário inválido" });
  }

  // Limitar uso diário
  if ((userRecord.analyses_count || 0) >= 30) {
    return res.status(403).json({ error: "Limite diário atingido" });
  }

  try {
    const content: any[] = [];

    // --- PROMPT PARA TEXTO ---
    if (text && !image) {
      content.push({
        type: "input_text",
        text: `Você é um nutricionista virtual brasileiro. Recebi o seguinte texto literal de alimentos: "${text}".

Se o texto **não contiver alimentos ou bebidas comestíveis**, responda **EXATAMENTE**:
"Não é possível analisar. Envie apenas alimentos."

Se o texto contiver alimentos (inclusive água, gelo, bebidas sem calorias):

- Analise **literalmente** cada alimento e estime calorias, proteínas, carboidratos e gorduras com base em valores médios.
- Se algum nutriente não estiver presente, coloque 0.

Responda **EXATAMENTE** neste formato:

Calorias: X kcal
Proteínas: X g
Carboidratos: X g
Gorduras: X g

<uma frase curta natural e humana, de acordo com a refeição. Inclua sugestão de ingredientes que combinam, elogio leve se saudável, ou alerta leve se não for saudável, até 2 emojis>

Não inclua outros textos, títulos ou palavras como "Reflexão".`,
      });
    }

    // --- PROMPT PARA IMAGEM ---
    if (image) {
      content.push({
        type: "input_text",
        text: `Você é um nutricionista virtual brasileiro. Analise a refeição enviada via imagem.

Se a imagem **não contiver comida ou bebida comestível**, responda **EXATAMENTE**:
"Não é possível analisar. Envie apenas alimentos."

Se a imagem contiver **apenas água, gelo, chá sem açúcar ou bebidas sem calorias**, responda **EXATAMENTE** com todos os nutrientes como 0:

Calorias: 0 kcal
Proteínas: 0 g
Carboidratos: 0 g
Gorduras: 0 g

Se houver comida ou bebida com valor nutricional:

- Seja preciso na estimativa de calorias, proteínas, carboidratos e gorduras.
- Se algum nutriente não estiver presente, coloque 0.

Responda **EXATAMENTE** neste formato:

Calorias: X kcal
Proteínas: X g
Carboidratos: X g
Gorduras: X g

<uma frase curta natural, humana, de acordo com a refeição e quantidade de calorias. Sugira ingredientes que combinem, elogie se saudável, alerta leve se pouco saudável, até 2 emojis>

Não inclua outros textos, títulos ou palavras como "Reflexão".`,
      });

      content.push({
        type: "input_image",
        image_url: image,
      });
    }

    // Chamada da API OpenAI
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
      return res.status(500).json({ error: "Erro OpenAI", details: data });
    }

    // Extrair resultado
    const result =
      data.output_text ||
      data.output
        ?.map((o: any) => o.content?.map((c: any) => c.text).join(""))
        .join("") ||
      "Não é possível analisar. Envie apenas alimentos.";

    // Incrementar contador de uso
    await pb.collection("users").update(user.id, {
      analyses_count: (userRecord.analyses_count || 0) + 1,
    });

    return res.status(200).json({ result });
  } catch (error: any) {
    console.error("Analyze Error:", error);
    return res
      .status(500)
      .json({ error: "Erro geral", details: error.message });
  }
}
