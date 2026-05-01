import { Router } from "express";
import { connectToDatabase } from "../lib/mongodb.js";
import Card from "../models/Card.js";
import { parse } from "cookie";
import { verifyToken } from "./auth.js";

const router = Router();

const VALID_CATEGORIES = [
  "Electronics", "Clothing, Shoes & Jewelry", "Home & Kitchen",
  "Beauty & Personal Care", "Health & Household", "Toys & Games",
  "Sports & Outdoors", "Automotive", "Baby", "Pet Supplies",
  "Grocery & Gourmet Food", "Office Products", "Industrial & Scientific",
  "Tools & Home Improvement", "Garden & Outdoor", "Arts, Crafts & Sewing",
  "Cell Phones & Accessories", "Computers & Accessories", "Video Games",
  "Musical Instruments", "Movies & TV", "Software", "Handmade",
  "Amazon Devices & Accessories", "Uncategorized",
];

function isAuthenticated(req: any): boolean {
  const cookieHeader = req.headers.cookie || "";
  const cookies = parse(cookieHeader);
  const token = cookies["vault_auth"];
  if (!token) return false;
  return verifyToken(token);
}

function validPassword(req: any): boolean {
  const pw = req.body?.password;
  return !!pw && pw === process.env["INTERNAL_ADMIN_PASSWORD"];
}

router.get("/cards", async (req, res) => {
  if (!isAuthenticated(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    await connectToDatabase();
    const cards = await Card.find({}).sort({ createdAt: -1 });
    res.json(cards);
  } catch {
    res.status(500).json({ error: "Failed to fetch cards" });
  }
});

router.put("/cards/:id", async (req, res) => {
  if (!isAuthenticated(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!validPassword(req)) { res.status(403).json({ error: "Invalid password. Edit rejected." }); return; }
  const { front, back, category } = req.body;
  const safeCategory = VALID_CATEGORIES.includes(category) ? category : "Uncategorized";
  try {
    await connectToDatabase();
    const updated = await Card.findByIdAndUpdate(
      req.params.id,
      { $set: { front, back, category: safeCategory } },
      { new: true, runValidators: true }
    );
    if (!updated) { res.status(404).json({ error: "Record not found." }); return; }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update record." });
  }
});

router.delete("/cards/bulk", async (req, res) => {
  if (!isAuthenticated(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!validPassword(req)) { res.status(403).json({ error: "Invalid password. Deletion rejected." }); return; }
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) { res.status(400).json({ error: "No record IDs provided." }); return; }
  try {
    await connectToDatabase();
    await Card.deleteMany({ _id: { $in: ids } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete records." });
  }
});

router.delete("/cards/:id", async (req, res) => {
  if (!isAuthenticated(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!validPassword(req)) { res.status(403).json({ error: "Invalid password. Deletion rejected." }); return; }
  try {
    await connectToDatabase();
    const deleted = await Card.findByIdAndDelete(req.params.id);
    if (!deleted) { res.status(404).json({ error: "Record not found." }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete record." });
  }
});

export default router;
