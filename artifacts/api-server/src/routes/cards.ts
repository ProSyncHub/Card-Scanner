import { Router } from "express";
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

router.get("/cards", async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    await connectToDatabase();
    const cards = await Card.find({}).sort({ createdAt: -1 });
    res.json(cards);
  } catch {
    res.status(500).json({ error: "Failed to fetch cards" });
  }
});

router.delete("/cards/:id", async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    await connectToDatabase();
    const deleted = await Card.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Record not found in database." });
      return;
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to terminate record." });
  }
});

export default router;
