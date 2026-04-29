import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb"; // Adjust path if needed
import Card from "@/models/Card"; // Adjust path if needed

// Force Next.js to fetch fresh data every time, no aggressive static caching
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    
    // Fetch all cards, sort by newest first
    const cards = await Card.find({}).sort({ createdAt: -1 });
    
    return NextResponse.json(cards);
  } catch (error) {
    console.error("Database fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 });
  }
}