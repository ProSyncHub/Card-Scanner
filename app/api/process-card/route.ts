import { NextResponse } from "next/server";
import OpenAI from "openai";
import { connectToDatabase } from "@/lib/mongodb";
import Card from "@/models/Card";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { frontImageUrl, backImageUrl, frontQr, backQr } = await req.json();

    if (!frontImageUrl) {
      return NextResponse.json({ error: "Front image is required" }, { status: 400 });
    }

    await connectToDatabase();

    const prompt = `
      You are a strict data extraction tool. Analyze the provided business card image(s).
      
      RULES:
      1. Extract the data exactly as it appears. Do NOT merge data between the front and back.
      2. Fix obvious OCR typos (e.g., reading a "1" as an "l" in a phone number).
      3. Translate non-English data to English.
      4. If a field is missing, leave it empty ("" or []).

      You MUST return ONLY a JSON object matching this exact schema:
      {
        "front": { "name": "", "title": "", "company": "", "phone": [], "email": [], "website": "", "address": "", "qrData": [] },
        "back": { "name": "", "title": "", "company": "", "phone": [], "email": [], "website": "", "address": "", "qrData": [] },
        "category": "", "isTranslated": false, "originalLanguage": "", "translationNote": ""
      }
    `;

    // Helper to fetch and convert images to Base64
    const fetchAsBase64 = async (url: string) => {
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      return Buffer.from(buffer).toString("base64");
    };

    const frontBase64 = await fetchAsBase64(frontImageUrl);
    const backBase64 = backImageUrl ? await fetchAsBase64(backImageUrl) : null;

    // Construct the OpenAI Vision Payload
    const contentPayload: any[] = [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: `data:image/jpeg;base64,${frontBase64}` } }
    ];

    if (backBase64) {
      contentPayload.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${backBase64}` } });
    }

    // Call GPT-4o-mini (Vision Capable, Fast, Cheap)
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: contentPayload }],
      response_format: { type: "json_object" }, // Forces strict JSON output
      temperature: 0.1, // Low temperature for factual extraction
    });

    const rawJsonText = response.choices[0].message.content;
    
    if (!rawJsonText) throw new Error("OpenAI returned an empty response.");

    const extractedData = JSON.parse(rawJsonText);

    // THE DETERMINISTIC OVERRIDE: Inject our perfect local QR scans
    if (frontQr) extractedData.front.qrData = [frontQr];
    if (backQr) extractedData.back.qrData = [backQr];

    // Save to Database
    const newCard = await Card.create({
      ...extractedData,
      frontImageUrl,
      backImageUrl: backImageUrl || "",
    });

    return NextResponse.json(newCard);

  } catch (error: any) {
    console.error("OpenAI Processing Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process card" }, { status: 500 });
  }
}