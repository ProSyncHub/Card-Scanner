import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Card from "@/models/Card";

// 1. Update the type definition to expect a Promise
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 2. Await the params before extracting the ID
    const resolvedParams = await params;
    const targetId = resolvedParams.id;

    await connectToDatabase();
    
    // 3. Use the extracted targetId
    const deletedCard = await Card.findByIdAndDelete(targetId);

    if (!deletedCard) {
      return NextResponse.json({ error: "Record not found in database." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to terminate record." }, { status: 500 });
  }
}