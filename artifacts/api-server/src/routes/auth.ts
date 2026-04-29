import { Router } from "express";
import { serialize } from "cookie";

const router = Router();

router.post("/auth/login", async (req, res) => {
  try {
    const { password } = req.body;
    const correctPassword = process.env["INTERNAL_ADMIN_PASSWORD"];

    if (!correctPassword) {
      res.status(500).json({ error: "Server misconfiguration." });
      return;
    }

    if (password === correctPassword) {
      const cookie = serialize("vault_auth", "authenticated", {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24,
        path: "/",
      });
      res.setHeader("Set-Cookie", cookie);
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/logout", (_req, res) => {
  const cookie = serialize("vault_auth", "", { maxAge: 0, path: "/" });
  res.setHeader("Set-Cookie", cookie);
  res.json({ success: true });
});

export default router;
