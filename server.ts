import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // AI Generation Endpoint
  app.post("/api/ai/generate", async (req, res) => {
    try {
      const { model, contents, config } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Clé API Gemini non configurée sur le serveur." });
      }

      const genAI = new GoogleGenAI({ apiKey });

      // Handle the contents format from the client
      const promptContents = normalizeContents(contents);

      const response = await genAI.models.generateContent({
        model: model || "gemini-1.5-flash",
        contents: promptContents,
        config: config
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("AI Server Error:", error);
      res.status(500).json({ error: error.message || "Erreur AI interne" });
    }
  });

  // Helper to normalize contents for Gemini
  function normalizeContents(contents: any) {
    if (Array.isArray(contents)) return contents;
    if (contents.contents) {
      return Array.isArray(contents.contents) ? contents.contents : [contents.contents];
    }
    if (contents.parts) {
      return [{ parts: contents.parts }];
    }
    return [contents];
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
