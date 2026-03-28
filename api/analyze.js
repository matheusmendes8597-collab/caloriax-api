export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const { text } = req.body || {};

    if (!text) {
      return res.status(400).json({ error: "Envie um texto" });
    }

    return res.status(200).json({
      result: `Teste OK: ${text}`
    });

  } catch (error) {
    return res.status(500).json({ error: "Erro interno" });
  }
}
