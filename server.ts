import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));
  app.use(express.text({ limit: "15mb", type: "*/*" }));

  // API Endpoint: AI Coin Title & Description Generation
  app.post("/api/generate-coin-info", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "GEMINI_API_KEY ist nicht in den Umgebungsvariablen / Secrets konfiguriert."
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const {
        country,
        year,
        faceValue,
        currency,
        itemType,
        material,
        mintMark,
        condition,
        notes,
        imageUrl,
      } = req.body;

      const promptParts: any[] = [];

      let contextText = `Du bist ein hochqualifizierter Numismatiker, Historiker und Experte für Münzen und Banknoten.
Aufgabe: Erstelle anhand der gegebenen Merkmale einen präzisen, professionellen Auktions-/Sammlertitel (Name) und eine strukturierte, ausführliche und fesselnde Beschreibung für eine Sammlungs-App.

Merkmale des Sammlungsstücks:
- Objekt-Typ: ${itemType === "banknote" ? "Banknote / Papiergeld" : "Münze"}
- Herkunftsland / Gebiet: ${country || "Unbekannt"}
- Prägejahr / Ausgabejahr: ${year || "Unbekannt"}
- Nennwert: ${faceValue || ""} ${currency || "CHF"}
- Material / Metall: ${material || "Nicht angegeben"}
- Prägezeichen / Münzzeichen: ${mintMark || "Nicht angegeben"}
- Erhaltungsgrad: ${condition || "Nicht angegeben"}
- Stichworte / Bisherige Notizen: ${notes || "Keine"}

Erstelle eine Antwort im folgenden JSON-Format:
{
  "title": "Kompakter, eleganter Titel für das Sammlungsstück (z.B. '5 Franken Schweiz 1935 B (Vreneli Goldmünze)' oder '100 Euro Deutschland 2002 UNESCO')",
  "description": "Strukturierte, informative Beschreibung mit historischem Hintergrund, Designmerkmalen (Avers & Revers), Prägestätte, Seltenheit und Besonderheiten auf Deutsch."
}`;

      if (imageUrl && typeof imageUrl === "string" && imageUrl.startsWith("data:image/")) {
        const matches = imageUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          promptParts.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          });
          contextText += "\n\nEin Bild der Münze/Banknote ist ebenfalls beigefügt. Beziehe sichtbare Inschriften, Motive oder Erhaltungsmerkmale vom Bild in den Titel und die Beschreibung ein.";
        }
      }

      promptParts.push({ text: contextText });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts: promptParts },
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text;
      if (!responseText) {
        return res.status(500).json({ error: "Keine Antwort von Gemini AI erhalten." });
      }

      try {
        const parsed = JSON.parse(responseText);
        return res.json({
          title: parsed.title || "",
          description: parsed.description || "",
        });
      } catch (e) {
        return res.json({
          title: `${faceValue || ""} ${currency || "CHF"} ${country || ""} ${year || ""}`.trim(),
          description: responseText,
        });
      }
    } catch (err: any) {
      console.error("Error generating coin info:", err);
      return res.status(500).json({
        error: err?.message || "Fehler bei der KI-Generierung.",
      });
    }
  });

// Persistent store for Webhook items received via Make.com
const WEBHOOK_FILE = path.join(process.cwd(), "pending_webhooks.json");

function loadPendingWebhooks(): any[] {
  try {
    if (fs.existsSync(WEBHOOK_FILE)) {
      const data = fs.readFileSync(WEBHOOK_FILE, "utf-8");
      return JSON.parse(data) || [];
    }
  } catch (e) {
    console.error("Error loading pending webhooks:", e);
  }
  return [];
}

function savePendingWebhooks(items: any[]) {
  try {
    fs.writeFileSync(WEBHOOK_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving pending webhooks:", e);
  }
}

let pendingWebhookCoins: any[] = loadPendingWebhooks();

function formatGoogleDriveUrl(url: string): string {
  if (!url) return "";
  const str = String(url).trim();
  if (/^[a-zA-Z0-9_-]{25,}$/.test(str)) {
    return `https://lh3.googleusercontent.com/d/${str}`;
  }
  const match = str.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                str.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                str.match(/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return str;
}

  // API Endpoint: Make.com Webhook Receiver (supports POST, GET, PUT and all formats)
  app.all("/api/webhook/make", (req, res) => {
    try {
      let rawData = req.body;
      if (typeof rawData === "string" && rawData.trim().startsWith("{")) {
        try { rawData = JSON.parse(rawData); } catch {}
      } else if (typeof rawData === "string" && rawData.trim().startsWith("[")) {
        try { rawData = JSON.parse(rawData); } catch {}
      }

      if (!rawData || (typeof rawData === "object" && Object.keys(rawData).length === 0)) {
        rawData = req.query;
      }

      let payload = rawData;
      if (payload && typeof payload === "object") {
        if (payload.body) payload = payload.body;
        else if (payload.data) payload = payload.data;
        else if (payload.payload) payload = payload.payload;
        else if (payload.items) payload = payload.items;
        else if (payload.files) payload = payload.files;
      }

      const items = Array.isArray(payload) ? payload : [payload];
      console.log(`[Webhook Make] Empfange ${items.length} Payload-Element(e):`, JSON.stringify(rawData, null, 2));

      const processed: any[] = [];

      for (const item of items) {
        if (!item) continue;

        let nameVal = '';
        let rawUrl = '';

        if (typeof item === "string") {
          // Attempt to extract URL and filename from plain string payload
          const urlMatch = item.match(/(https?:\/\/[^\s"]+)/i) || item.match(/([a-zA-Z0-9_-]{25,})/);
          if (urlMatch) {
            rawUrl = urlMatch[0];
          }
          // Remove URL from string to get name
          const cleanText = item.replace(/(https?:\/\/[^\s"]+)/gi, '').trim();
          nameVal = cleanText || 'Unbenannte Münze';
        } else {
          // Helper to get property case-insensitively
          const getItemProp = (...keys: string[]) => {
            if (typeof item !== 'object' || !item) return '';
            const lowerKeys = keys.map(k => k.toLowerCase());
            for (const [k, v] of Object.entries(item)) {
              if (lowerKeys.includes(k.toLowerCase()) && v) {
                return String(v).trim();
              }
            }
            return '';
          };

          nameVal = getItemProp('name', 'title', 'bezeichnung', 'filename', 'fileName', 'originalFileName', 'file_name', 'file', 'Name', 'Title') || 'Unbenannte Münze';
          rawUrl = getItemProp('imageUrl', 'image', 'bild', 'image1_url', 'webContentLink', 'web_content_link', 'webViewLink', 'web_view_link', 'downloadUrl', 'download_url', 'fileUrl', 'file_url', 'url', 'Url', 'thumbnailLink', 'thumbnail_link', 'directLink', 'link', 'WebContentLink', 'WebViewLink', 'WebContentUrl', 'id', 'fileId', 'file_id', 'File ID') || '';
        }

        const rawName = String(nameVal).replace(/\.(jpg|jpeg|png|webp|gif|svg|heic)$/i, '');
        rawUrl = formatGoogleDriveUrl(rawUrl);

        // Detect _f (Vorderseite) or _h / _r (Rückseite)
        const isReverse = /(_h|_r|_back|_rueckseite|_hinten)$/i.test(rawName);
        const isFront = /(_f|_v|_front|_vorderseite)$/i.test(rawName);

        // Strip suffix to get base coin name (e.g. MZ_2545)
        const baseName = rawName.replace(/(_f|_v|_h|_r|_front|_vorderseite|_back|_rueckseite|_hinten)$/i, '');

        let existingCoin = processed.find(c => c.name === baseName) || pendingWebhookCoins.find(c => c.name === baseName);

        if (existingCoin) {
          if (isReverse) {
            existingCoin.reverseImageUrl = rawUrl;
          } else if (isFront) {
            existingCoin.imageUrl = rawUrl;
          } else {
            if (!existingCoin.imageUrl) existingCoin.imageUrl = rawUrl;
            else if (!existingCoin.reverseImageUrl) existingCoin.reverseImageUrl = rawUrl;
          }
        } else {
          const newCoin = {
            id: item.id || `make-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: baseName,
            country: item.country || item.land || 'Schweiz',
            year: Number(item.year || item.jahr) || new Date().getFullYear(),
            faceValue: item.faceValue || item.nennwert || '1',
            currency: item.currency || item.waehrung || 'CHF',
            itemType: item.itemType || item.typ || 'coin',
            material: item.material || 'Silber',
            mintMark: item.mintMark || item.praegezeichen || '',
            condition: item.condition || item.erhaltung || 'Sehr gut',
            rarity: item.rarity || item.seltenheit || 'Sehr häufig (Common)',
            purchasePrice: Number(item.purchasePrice || item.kaufpreis) || 0,
            currentValue: Number(item.currentValue || item.marktwert || item.wert) || 0,
            notes: item.notes || item.bemerkungen || item.beschreibung || '',
            imageUrl: isReverse ? (item.imageUrl || item.image || rawUrl) : rawUrl,
            reverseImageUrl: isReverse ? rawUrl : (item.reverseImageUrl || item.rueckseite || item.image2_url || ''),
            folder: item.folder || item.kategorie || 'Google Drive Import',
            createdAt: new Date().toISOString()
          };
          processed.push(newCoin);
        }
      }

      if (processed.length > 0) {
        pendingWebhookCoins.push(...processed);
        savePendingWebhooks(pendingWebhookCoins);
      }

      console.log(`[Webhook Make] Akkumulierte pendente Münzen (${pendingWebhookCoins.length}):`, pendingWebhookCoins);

      return res.status(200).json({
        success: true,
        message: `${items.length} Element(e) verarbeitet. ${processed.length} Münze(n) im Import-Puffer.`,
        processedCount: processed.length,
        totalPending: pendingWebhookCoins.length
      });
    } catch (err: any) {
      console.error("Error processing Make webhook:", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Fehler beim Verarbeiten des Webhooks."
      });
    }
  });

  // GET Endpoint to fetch and drain pending webhook coins into the client app
  app.get("/api/webhook/make/pending", (req, res) => {
    const items = [...pendingWebhookCoins];
    pendingWebhookCoins = []; // Drain queue
    savePendingWebhooks([]);
    return res.json({
      count: items.length,
      items
    });
  });

  // Test Endpoint (GET / POST): Inject a test coin into webhook queue
  app.all("/api/webhook/make/test", (req, res) => {
    const testCoin = {
      id: `test-${Date.now()}`,
      name: "10 CHF Google Drive Testmünze",
      country: "Schweiz",
      year: 2024,
      faceValue: "10",
      currency: "CHF",
      itemType: "coin",
      material: "Silber",
      mintMark: "B",
      condition: "Vorzüglich (UNC)",
      rarity: "Sehr häufig",
      purchasePrice: 10,
      currentValue: 25,
      notes: "Erfolgreicher Test-Import des Google Drive / Make.com Webhooks.",
      imageUrl: "https://lh3.googleusercontent.com/d/1_test_image_id",
      reverseImageUrl: "",
      folder: "Google Drive Import",
      createdAt: new Date().toISOString()
    };
    pendingWebhookCoins.push(testCoin);
    savePendingWebhooks(pendingWebhookCoins);
    return res.json({ success: true, message: "Testmünze im Import-Puffer gespeichert.", totalPending: pendingWebhookCoins.length });
  });

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
