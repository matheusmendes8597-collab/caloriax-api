declare const process: any;

export default async function handler(req: any, res: any) {
  // 🔥 LIBERAR CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 🔥 RESPONDER PRE-FLIGHT (OBRIGATÓRIO)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { imageUrl, text } = body || {};

    if (!imageUrl && !text) {
      return res.status(400).json({ error: "Envie imagem ou texto" });
    }

    return res.status(200).json({
      result: `Recebido: ${text || "imagem enviada"}`
    });

  } catch (error) {
    return res.status(500).json({ error: "Erro ao analisar refeição" });
  }
}
