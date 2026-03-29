const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "o4-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: text || "Analise essa refeição"
          }
        ]
      }
    ]
  })
});

const data = await response.json();

return res.status(200).json({
  result: data.output?.[0]?.content?.[0]?.text || "Erro ao interpretar resposta"
});
