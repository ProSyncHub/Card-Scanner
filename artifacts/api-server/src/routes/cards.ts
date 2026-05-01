import { Router } from "express";
import { connectToDatabase } from "../lib/mongodb.js";
import Card from "../models/Card.js";
import { parse } from "cookie";
import { verifyToken } from "./auth.js";

const router = Router();

// Function to check if the user is authenticated
function isAuthenticated(req: any): boolean {
  const cookieHeader = req.headers.cookie || "";
  const cookies = parse(cookieHeader);
  const token = cookies["vault_auth"];
  if (!token) return false;
  return verifyToken(token);
}

// Category Mapping (as previously defined)
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
  "Uncategorized": "Uncategorized"
};

// Get all cards
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

// Update a specific card by ID
router.put("/cards/:id", async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { password, front, back, category } = req.body;
  if (!password || password !== process.env["INTERNAL_ADMIN_PASSWORD"]) {
    res.status(403).json({ error: "Invalid password. Edit rejected." });
    return;
  }

  // Ensure the category is valid
  const categoryName = categoryMapping[category] || "Uncategorized";

  try {
    await connectToDatabase();
    const updated = await Card.findByIdAndUpdate(
      req.params.id,
      { $set: { front, back, category: categoryName } },
      { new: true, runValidators: true }
    );
    if (!updated) {
      res.status(404).json({ error: "Record not found." });
      return;
    }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update record." });
  }
});

// Delete a specific card by ID
router.delete("/cards/:id", async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { password } = req.body;
  if (!password || password !== process.env["INTERNAL_ADMIN_PASSWORD"]) {
    res.status(403).json({ error: "Invalid password. Delete rejected." });
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

// Bulk delete route with password authentication
router.delete("/cards", async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { password, ids } = req.body;
  if (!password || password !== process.env["INTERNAL_ADMIN_PASSWORD"]) {
    res.status(403).json({ error: "Invalid password. Delete rejected." });
    return;
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "No card IDs provided." });
    return;
  }

  try {
    await connectToDatabase();
    const deleted = await Card.deleteMany({ _id: { $in: ids } });
    if (deleted.deletedCount === 0) {
      res.status(404).json({ error: "No records found to delete." });
      return;
    }
    res.json({ success: true, deletedCount: deleted.deletedCount });
  } catch {
    res.status(500).json({ error: "Failed to delete records." });
  }
});

export default router;