declare const process: any;

export default async function handler(req: any, res: any) {
  return res.status(200).json({
    key: process.env.OPENAI_API_KEY ? "EXISTE" : "NÃO EXISTE"
  });
}
