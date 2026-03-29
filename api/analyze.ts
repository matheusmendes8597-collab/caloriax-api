declare const process: any;

export default async function handler(req: any, res: any) {
  // CORS
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

    // 🔥 CORREÇÃO BODY (100% FUNCIONAL)
    let body: any = req.body;

    if (!body) {
      const raw = await new Promise<string>((resolve) => {
        let data = "";
        req.on("data", (chunk: any) => {
          data += chunk;
        });
        req.on("end", () => resolve(data));
      });

      try {
        body = JSON.parse(raw || "{}");
      } catch {
        body = {};
      }
    }

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    console.log("BODY RECEBIDO:", body);

    const { text, image } = body || {};

    if (!text && !image) {
      return res.status(400).json({
        error: "Envie texto ou imagem"
      });
    }

    // 🔥 MONTA INPUT (texto + imagem)
    const content: any[] = [];

    if (text) {
      content.push({
        type: "input_text",
        text: `Analise a refeição (imagem e/ou texto): ${text || ""}.

Seja preciso e estime quantidades reais.

Responda EXATAMENTE neste formato:

Calorias: X kcal
Proteínas: X g
Carboidratos: X g
Gorduras: X g

Sem explicações.`
      });
    }

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

    // 🔥 DEBUG
    console.log("STATUS:", response.status);
    console.log("DATA:", JSON.stringify(data));

    if (!response.ok) {
      return res.status(500).json({
        error: "Erro OpenAI",
        details: data
      });
    }

    // 🔥 RESPOSTA SEGURA (funciona em todos os casos)
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
