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

  // Helper to convert base64 data URIs or http(s) image URLs into Gemini inlineData format
  async function fetchImagePart(urlOrBase64?: string): Promise<{ mimeType: string; data: string } | null> {
    if (!urlOrBase64 || typeof urlOrBase64 !== "string") return null;
    const trimmed = urlOrBase64.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("data:image/")) {
      const matches = trimmed.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
      if (matches) {
        return { mimeType: matches[1], data: matches[2] };
      }
    }

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      try {
        const directUrl = formatGoogleDriveUrl(trimmed);
        const resp = await fetch(directUrl, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
        if (resp.ok) {
          const contentType = (resp.headers.get("content-type") || "").toLowerCase();
          // Strictly avoid HTML / JSON error pages being sent as JPEG to Gemini
          if (contentType.includes("html") || contentType.includes("json")) {
            return null;
          }
          const arrayBuffer = await resp.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          if (buffer.length < 500) return null; // Too small for valid coin image

          let mimeType = contentType.split(";")[0].trim();
          if (!mimeType.startsWith("image/")) {
            mimeType = "image/jpeg";
          }
          return {
            mimeType,
            data: buffer.toString("base64"),
          };
        }
      } catch (err) {
        console.error("Failed to fetch image URL for Gemini:", trimmed, err);
      }
    }

    return null;
  }

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
        reverseImageUrl,
      } = req.body;

      const promptParts: any[] = [];
      let imageContextNotice = "";

      // Fetch Vorderseite (Avers) image
      const frontPart = await fetchImagePart(imageUrl);
      if (frontPart) {
        promptParts.push({
          inlineData: frontPart,
        });
        imageContextNotice += "\n- Bild 1: Vorderseite (Avers) der Münze/Banknote ist beigefügt.";
      }

      // Fetch Rückseite (Revers) image
      const backPart = await fetchImagePart(reverseImageUrl);
      if (backPart) {
        promptParts.push({
          inlineData: backPart,
        });
        imageContextNotice += "\n- Bild 2: Rückseite (Revers) der Münze/Banknote ist ebenfalls beigefügt.";
      }

      let contextText = `Du bist ein hochqualifizierter Numismatiker, Historiker und Experte für Münzen und Banknoten.

STRENGSTE UND ABSOLUTE DIREKTIVE:
Stütze dich EXKLUSIV und AUSSCHLIESSLICH auf die visuellen Merkmale der beigefügten BILDER (Vorderseite / Avers UND Rückseite / Revers)!
IGNORIERE ALLE VORGEGEBENEN FORMULAR- UND TEXTFELDER VOLLSTÄNDIG!
Achte besonders darauf, den Nennwert (z.B. '5' bei 5 Franken / 5 CHF, '2' bei 2 Fr., '20', etc.) und das Prägejahr (z.B. 1968, 1932, etc.) EXAKT von den Aufschriften und Prägungen auf dem Bild abzulesen.

Visuelle Pflichtkriterien:
1. Nennwert & Währung: Lies die Ziffer und Währung direkt aus dem Münz-/Banknotenbild ab. Wenn '5 Fr.', '5 CHF' oder eine große '5' zu sehen ist, antworte mit faceValue: "5" und currency: "CHF" (oder entsprechende Währung). Übernimm NIEMALS pauschal '1'.
2. Prägejahr (year): Lies die Jahreszahl exakt von der Münze/Banknote ab.
3. Herkunftsland (country): Bestimme das Land anhand der Inschriften (z.B. 'HELVETIA', 'CONFEDERATIO HELVETICA' -> Schweiz, 'DEUTSCHES REICH' -> Deutschland, 'RZECZPOSPOLITA POLSKA' -> Polen) oder anhand des Wappens.
4. Material (material): Bestimme das Metall (Silber, Gold, Kupfer-Nickel, Bronze) visuell aus Prägung und Farbe.
5. Titel (title): Erstelle einen präzisen Titel nach dem Schema '[Nennwert] [Währung] [Land] [Jahr] [Motiv/Besonderheit]', z.B. '5 CHF Schweiz 1968 Helvetia' oder '5 Franken Schweiz 1932 Alphirt'.

Erstelle deine Antwort im folgenden JSON-Format:
{
  "title": "Titel rein basierend auf dem Bild",
  "country": "Erkanntes Herkunftsland aus Bild",
  "year": 1968,
  "faceValue": "5",
  "currency": "CHF",
  "material": "Silber",
  "description": "Präzise, strukturierte numismatische Beschreibung basierend auf den sichtbaren Avers- und Revers-Details, Inschriften, Wappen und historische Einordnung auf Deutsch."
}`;

      promptParts.push({ text: contextText });

      let responseText = "";
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: { parts: promptParts },
          config: {
            responseMimeType: "application/json",
          },
        });
        responseText = response.text || "";
      } catch (imageErr: any) {
        console.warn("Gemini build with images failed, falling back to text prompt:", imageErr?.message);
        // Fallback: If image inlineData failed (e.g. invalid image format), retry text-only prompt!
        const textOnlyResponse = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: contextText,
          config: {
            responseMimeType: "application/json",
          },
        });
        responseText = textOnlyResponse.text || "";
      }

      if (!responseText) {
        return res.status(500).json({ error: "Keine Antwort von Gemini AI erhalten." });
      }

      try {
        const parsed = JSON.parse(responseText);
        return res.json({
          title: parsed.title || "",
          country: parsed.country || "",
          year: parsed.year || null,
          faceValue: parsed.faceValue || "",
          currency: parsed.currency || "",
          material: parsed.material || "",
          description: parsed.description || "",
        });
      } catch (e) {
        return res.json({
          title: `${faceValue || ""} ${currency || "CHF"} ${country || ""} ${year || ""}`.trim() || "TITEL",
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
  if (str.startsWith('https://lh3.googleusercontent.com/d/')) return str;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(str)) {
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
      if (typeof rawData === "string") {
        const trimmedStr = rawData.trim();
        if (trimmedStr.startsWith("{") || trimmedStr.startsWith("[")) {
          try { rawData = JSON.parse(trimmedStr); } catch {}
        }
      }

      if (!rawData || (typeof rawData === "object" && !Array.isArray(rawData) && Object.keys(rawData).length === 0)) {
        rawData = req.query;
      }

      let payload = rawData;
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        // Only unwrap if payload doesn't directly contain coin/file properties
        const hasDirectCoinFields = Object.keys(payload).some(k => 
          ['name', 'title', 'bezeichnung', 'filename', 'fileName', 'webcontentlink', 'imageurl', 'url', 'image'].includes(k.toLowerCase())
        );
        if (!hasDirectCoinFields) {
          if (payload.body && (typeof payload.body === "object" || Array.isArray(payload.body))) payload = payload.body;
          else if (payload.data && (typeof payload.data === "object" || Array.isArray(payload.data))) payload = payload.data;
          else if (payload.payload && (typeof payload.payload === "object" || Array.isArray(payload.payload))) payload = payload.payload;
          else if (payload.items && Array.isArray(payload.items)) payload = payload.items;
          else if (payload.files && Array.isArray(payload.files)) payload = payload.files;
        }
      }

      const items = Array.isArray(payload) ? payload : [payload];
      console.log(`[Webhook Make] Empfange ${items.length} Payload-Element(e):`, JSON.stringify(rawData, null, 2));

      const processed: any[] = [];

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        if (!item) continue;

        let nameVal = '';
        let rawUrl = '';

        if (typeof item === "string") {
          const urlMatch = item.match(/(https?:\/\/[^\s"]+)/i) || item.match(/([a-zA-Z0-9_-]{25,})/);
          if (urlMatch) {
            rawUrl = urlMatch[0];
          }
          const cleanText = item.replace(/(https?:\/\/[^\s"]+)/gi, '').trim();
          nameVal = cleanText || `Drive Datei ${Date.now()}-${idx + 1}`;
        } else {
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

          nameVal = getItemProp('name', 'title', 'bezeichnung', 'filename', 'fileName', 'originalFileName', 'file_name', 'file', 'Name', 'Title') || `Drive Import #${idx + 1}`;
          rawUrl = getItemProp('imageUrl', 'image', 'bild', 'image1_url', 'webContentLink', 'web_content_link', 'webViewLink', 'web_view_link', 'downloadUrl', 'download_url', 'fileUrl', 'file_url', 'url', 'Url', 'thumbnailLink', 'thumbnail_link', 'directLink', 'link', 'WebContentLink', 'WebViewLink', 'WebContentUrl', 'id', 'fileId', 'file_id', 'File ID') || '';
        }

        rawUrl = formatGoogleDriveUrl(rawUrl);

        let clean = String(nameVal).trim().replace(/\.(jpg|jpeg|png|webp|gif|svg|heic)+$/gi, '').trim();
        clean = clean.replace(/[\s_-]*(\(\d+\)|\[\d+\]|copy)$/gi, '').trim();

        const isReverse = 
          /([_\.\-\s](h|r|b|2|back|revers|rueckseite|rückseite|hinten))$/i.test(clean) ||
          /\b(revers|rueckseite|rückseite|back|hinten)\b/i.test(clean);

        let baseKey = clean
          .replace(/[_\.\-\s]+(f|v|a|h|r|b|front|vorderseite|back|rueckseite|rückseite|hinten|avers|revers|1|2)$/i, '')
          .replace(/\b(avers|vorderseite|front|revers|rueckseite|rückseite|back|hinten)\b/gi, '')
          .replace(/_/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

        const lowerKey = baseKey || clean.toLowerCase();

        let existingCoin = processed.find(c => (c.rawBaseName && c.rawBaseName.toLowerCase() === lowerKey) || (c.name && c.name.toLowerCase() === lowerKey)) 
          || pendingWebhookCoins.find(c => (c.rawBaseName && c.rawBaseName.toLowerCase() === lowerKey) || (c.name && c.name.toLowerCase() === lowerKey));

        if (existingCoin) {
          if (isReverse) {
            existingCoin.reverseImageUrl = rawUrl;
            if (!existingCoin.imageUrl && !isReverse) {
              existingCoin.imageUrl = rawUrl;
            }
          } else {
            if (!existingCoin.imageUrl) {
              existingCoin.imageUrl = rawUrl;
            } else if (!existingCoin.reverseImageUrl) {
              existingCoin.reverseImageUrl = rawUrl;
            }
          }
        } else {
          let initialTitle = (item && typeof item === 'object' && (item.title || item.bezeichnung)) ? String(item.title || item.bezeichnung).trim() : '';
          if (!initialTitle || initialTitle === 'Münze (Make)' || initialTitle.toLowerCase().startsWith('drive import') || initialTitle.toLowerCase().startsWith('unbenannt')) {
            initialTitle = 'TITEL';
          }

          const newCoin = {
            id: (item && typeof item === 'object' && item.id) ? String(item.id) : `make-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            rawBaseName: baseKey,
            name: initialTitle || 'TITEL',
            country: (item && typeof item === 'object' ? item.country || item.land : '') || 'Schweiz',
            year: (item && typeof item === 'object' ? Number(item.year || item.jahr) : 0) || new Date().getFullYear(),
            faceValue: (item && typeof item === 'object' ? item.faceValue || item.nennwert : '') || '1',
            currency: (item && typeof item === 'object' ? item.currency || item.waehrung : '') || 'CHF',
            itemType: (item && typeof item === 'object' ? item.itemType || item.typ : '') || 'coin',
            material: (item && typeof item === 'object' ? item.material : '') || 'Silber',
            mintMark: (item && typeof item === 'object' ? item.mintMark || item.praegezeichen : '') || '',
            condition: (item && typeof item === 'object' ? item.condition || item.erhaltung : '') || 'Sehr gut',
            rarity: (item && typeof item === 'object' ? item.rarity || item.seltenheit : '') || 'Sehr häufig (Common)',
            purchasePrice: (item && typeof item === 'object' ? Number(item.purchasePrice || item.kaufpreis) : 0) || 0,
            currentValue: (item && typeof item === 'object' ? Number(item.currentValue || item.marktwert || item.wert) : 0) || 0,
            notes: (item && typeof item === 'object' ? item.notes || item.bemerkungen || item.beschreibung : '') || '',
            imageUrl: isReverse ? '' : rawUrl,
            reverseImageUrl: isReverse ? rawUrl : '',
            folder: (item && typeof item === 'object' ? item.folder || item.kategorie : '') || 'Google Drive Import',
            createdAt: new Date().toISOString()
          };
          processed.push(newCoin);
        }
      }

      if (processed.length > 0) {
        pendingWebhookCoins.push(...processed);
      }

      // Always persist pending webhooks to file!
      savePendingWebhooks(pendingWebhookCoins);

      console.log(`[Webhook Make] Akkumulierte pendente Münzen (${pendingWebhookCoins.length}):`, pendingWebhookCoins);

      return res.status(200).json({
        success: true,
        message: `${items.length} Element(e) verarbeitet. ${processed.length} neue Münze(n) im Import-Puffer. Gesamt: ${pendingWebhookCoins.length}`,
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

  // GET Endpoint to fetch pending webhook coins
  app.get("/api/webhook/make/pending", (req, res) => {
    const shouldClear = req.query.clear === 'true' || req.query.clear === '1';
    const items = [...pendingWebhookCoins];
    if (shouldClear) {
      pendingWebhookCoins = [];
      savePendingWebhooks([]);
    }
    return res.json({
      count: items.length,
      items
    });
  });

  // POST/ALL Endpoint to acknowledge and clear pending webhook coins after successful save
  app.all("/api/webhook/make/clear", (req, res) => {
    const count = pendingWebhookCoins.length;
    pendingWebhookCoins = [];
    savePendingWebhooks([]);
    return res.json({
      success: true,
      clearedCount: count
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
