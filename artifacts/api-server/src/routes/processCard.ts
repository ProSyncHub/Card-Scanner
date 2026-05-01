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

// Define category mapping
const categoryMapping: { [key: string]: string } = {
  "Electronics": "Electronics",
  "Clothing": "Clothing, Shoes & Jewelry",
  "Home": "Home & Kitchen",
  "Beauty": "Beauty & Personal Care",
  "Health": "Health & Household",
  "Toys": "Toys & Games",
  "Sports": "Sports & Outdoors",
  "Automotive": "Automotive",
  "Baby": "Baby",
  "Pet Supplies": "Pet Supplies",
  "Grocery": "Grocery & Gourmet Food",
  "Office": "Office Products",
  "Industrial": "Industrial & Scientific",
  "Tools": "Tools & Home Improvement",
  "Garden": "Garden & Outdoor",
  "Arts": "Arts, Crafts & Sewing",
  "Cell Phones": "Cell Phones & Accessories",
  "Computers": "Computers & Accessories",
  "Video Games": "Video Games",
  "Musical Instruments": "Musical Instruments",
  "Movies": "Movies & TV",
  "Software": "Software",
  "Handmade": "Handmade",
  "Amazon Devices": "Amazon Devices & Accessories",
};

router.post("/process-card", async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

  try {
    const { frontImageUrl, backImageUrl, frontQrCodes, backQrCodes } = req.body;

    if (!frontImageUrl) {
      res.status(400).json({ error: "Front image is required" });
      return;
    }

    await connectToDatabase();

    const prompt = `You are a strict business card data extraction and translation tool.

EXTRACTION RULES:
1. Extract ALL data from each card side separately. Do NOT merge front and back.
2. Fix obvious OCR typos (e.g. "l" read as "1" in phone numbers).
3. Extract ALL phone numbers, emails, and QR code data you can see — put them all in the arrays.

TRANSLATION RULES (MANDATORY):
4. If ANY text on the card is in a non-English language, you MUST translate ALL fields to English.
5. When translation occurs, set "isTranslated": true and set "originalLanguage" to the detected language name in English (e.g. "Arabic", "Chinese", "Japanese", "French", "Spanish", etc.).
6. Set "translationNote" to a brief note like "Translated from Arabic" if translation occurred.
7. If the card is already in English, set "isTranslated": false and leave "originalLanguage" and "translationNote" empty.

CATEGORY RULE:
8. Assign a category based on the company/title (e.g. "Technology", "Healthcare", "Finance", "Real Estate", "Legal", "Marketing", "Logistics", etc.).
9. If no category is found, assign "Uncategorized".

Return ONLY a valid JSON object with this exact schema:
{
  "front": { "name": "", "title": "", "company": "", "phone": [], "email": [], "website": "", "address": "", "qrData": [] },
  "back": { "name": "", "title": "", "company": "", "phone": [], "email": [], "website": "", "address": "", "qrData": [] },
  "category": "",
  "isTranslated": false,
  "originalLanguage": "",
  "translationNote": ""
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

    // Merge locally-scanned QR codes with any AI-detected ones — deduplicated
    const mergeQr = (aiCodes: string[], localCodes: string[]): string[] => {
      const all = [...(aiCodes || []), ...(localCodes || [])];
      return [...new Set(all.filter(Boolean))];
    };

    const localFrontQrs: string[] = Array.isArray(frontQrCodes) ? frontQrCodes : (frontQrCodes ? [frontQrCodes] : []);
    const localBackQrs: string[] = Array.isArray(backQrCodes) ? backQrCodes : (backQrCodes ? [backQrCodes] : []);

    extractedData.front.qrData = mergeQr(extractedData.front.qrData, localFrontQrs);
    extractedData.back.qrData = mergeQr(extractedData.back.qrData, localBackQrs);

    // Category Assignment
    const companyTitle = extractedData.front.company || extractedData.front.title || "";
    const category = Object.keys(categoryMapping).find((key) =>
      companyTitle.toLowerCase().includes(key.toLowerCase())
    ) || "Uncategorized";  // Default to "Uncategorized" if no match is found

    // Add category to the extracted data
    extractedData.category = category;

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