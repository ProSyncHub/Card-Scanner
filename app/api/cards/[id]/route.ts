import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Card from "@/models/Card";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    
    // Find the document by its MongoDB _id and destroy it
    const deletedCard = await Card.findByIdAndDelete(params.id);

    if (!deletedCard) {
      return NextResponse.json({ error: "Record not found in database." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to terminate record." }, { status: 500 });
  }
}