import { Router } from "express";
import OpenAI from "openai";
import { connectToDatabase } from "../lib/mongodb.js";
import Card from "../models/Card.js";
import { parse } from "cookie";
import { verifyToken } from "./auth.js";

const router = Router();

function isAuthenticated(req: any): boolean {
  const cookieHeader = req.headers.cookie || "";
  const cookies = parse(cookieHeader);
  const token = cookies["vault_auth"];
  if (!token) return false;
  return verifyToken(token);
}

router.post("/process-card", async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

  try {
    const { frontImageUrl, backImageUrl, frontQr, backQr } = req.body;

    if (!frontImageUrl) {
      res.status(400).json({ error: "Front image is required" });
      return;
    }

    await connectToDatabase();

    const prompt = `You are a strict data extraction tool. Analyze the provided business card image(s).
      RULES:
      1. Extract the data exactly as it appears. Do NOT merge data between the front and back.
      2. Fix obvious OCR typos.
      3. Translate non-English data to English.
      4. If a field is missing, leave it empty ("" or []).
      
      Return ONLY a JSON object matching this schema:
      {
        "front": { "name": "", "title": "", "company": "", "phone": [], "email": [], "website": "", "address": "", "qrData": [] },
        "back": { "name": "", "title": "", "company": "", "phone": [], "email": [], "website": "", "address": "", "qrData": [] },
        "category": "", "isTranslated": false, "originalLanguage": "", "translationNote": ""
      }`;

    const fetchAsBase64 = async (url: string) => {
      const r = await fetch(url);
      const buffer = await r.arrayBuffer();
      return Buffer.from(buffer).toString("base64");
    };

    const frontBase64 = await fetchAsBase64(frontImageUrl);
    const backBase64 = backImageUrl ? await fetchAsBase64(backImageUrl) : null;

    const contentPayload: any[] = [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: `data:image/jpeg;base64,${frontBase64}` } },
    ];

    if (backBase64) {
      contentPayload.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${backBase64}` } });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: contentPayload }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const rawJsonText = response.choices[0].message.content;
    if (!rawJsonText) throw new Error("OpenAI returned an empty response.");

    const extractedData = JSON.parse(rawJsonText);

    if (frontQr) extractedData.front.qrData = [frontQr];
    if (backQr) extractedData.back.qrData = [backQr];

    const newCard = await Card.create({
      ...extractedData,
      frontImageUrl,
      backImageUrl: backImageUrl || "",
    });

    res.json(newCard);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to process card" });
  }
});

export default router;
