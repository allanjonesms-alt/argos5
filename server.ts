import express from "express";
import cors from "cors";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // API Route for processing PDF with Gemini
  app.post("/api/parse-shift-pdf", async (req, res) => {
    try {
      const { base64Pdf } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Chave de API do Gemini não configurada no servidor (.env)." });
      }

      if (!base64Pdf) {
        return res.status(400).json({ error: "Nenhum PDF fornecido abortando." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Você é um assistente militar especialista em organizar escalas. O documento anexado é uma escala de serviço policial em PDF.
A primeira linha do documento geralmente contém a UNIDADE. Note que o 5° BPM se subdivide em diversas frentes de serviço.
Localize as guarnições sob os títulos/frentes de serviço específicos:
- RADIO PATRULHA I
- RADIO PATRULHA II
- FORÇA TÁTICA
- POLICIAMENTO DE TRÂNSITO (Use a unidade "5° BPM - GTRAN" para este caso)

Para cada uma dessas frentes que encontrar, identifique:
- O Comandante (geralmente na linha imediatamente abaixo do título da frente de serviço)
- O Motorista (na próxima linha)
- Os Patrulheiros 1 e 2 (se houverem, nas próximas linhas)

Se os assentos não estiverem explícitos, deduza pela ordem comum descrita.
Retorne OBRIGATÓRIA E ESTRITAMENTE um array JSON puro com os serviços extraídos, com esta exata estrutura:
[
  {
    "unidade": "Identificação da frente (ex: 5° BPM - RADIO PATRULHA I, 5° BPM - GTRAN, FORÇA TÁTICA)",
    "comandante": "NOME GUERRA OU COMPLETO",
    "motorista": "NOME GUERRA OU COMPLETO",
    "patrulheiro_1": "NOME",
    "patrulheiro_2": "NOME"
  }
]
Se patrulheiros não existirem, deixe vazio. Não use crases (\`\`\`) nem inclua explicações, apenas retorne o JSON puro.`;

      let response;
      let attempt = 0;
      const maxAttempts = 3;

      while (attempt < maxAttempts) {
        attempt++;
        // Switch to 'gemini-3.1-flash-lite' fallback on the final attempt
        const modelName = attempt === maxAttempts ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash';
        try {
          console.log(`[Gemini API] Chamando modelo ${modelName} (tentativa ${attempt}/${maxAttempts})...`);
          response = await ai.models.generateContent({
            model: modelName,
            contents: [
              { inlineData: { data: base64Pdf, mimeType: "application/pdf" } },
              { text: prompt }
            ],
            config: {
              responseMimeType: "application/json",
              temperature: 0.2
            }
          });
          break; // successfully generated content, break retry loop!
        } catch (err: any) {
          console.error(`Tentativa ${attempt} do proxy Gemini falhou com erro:`, err.message || err);
          if (attempt === maxAttempts) {
            throw err; // throw error if all attempts fail
          }
          // Backoff before retrying
          const delay = attempt * 1500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      if (!response) {
        throw new Error("Não foi possível obter resposta do serviço de inteligência artificial após múltiplas tentativas.");
      }

      const textResponse = response.text || '[]';
      const parsedData = JSON.parse(textResponse);
      res.json({ data: parsedData });

    } catch (error: any) {
      console.error("Erro no proxy do Gemini:", error.message);
      res.status(500).json({ error: error.message || "Erro desconhecido ao processar o PDF." });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support Express v5 syntax internally for splat route
    // The current version installed is ^5.2.1
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
