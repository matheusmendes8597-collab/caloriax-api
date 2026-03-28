declare const process: any;

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    // 👇 CORREÇÃO IMPORTANTE AQUI
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
