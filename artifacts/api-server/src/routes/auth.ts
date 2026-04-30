import { Router } from "express";
import { serialize } from "cookie";
import { createHmac, timingSafeEqual } from "crypto";

const router = Router();

function getSecret(): string {
  const secret = process.env["INTERNAL_ADMIN_PASSWORD"];
  if (!secret) throw new Error("INTERNAL_ADMIN_PASSWORD not set");
  return secret;
}

export function signToken(payload: string): string {
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): boolean {
  try {
    const lastDot = token.lastIndexOf(".");
    if (lastDot === -1) return false;
    const payload = token.slice(0, lastDot);
    const expected = signToken(payload);
    const a = Buffer.from(expected);
    const b = Buffer.from(token);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

router.post("/auth/login", async (req, res) => {
  try {
    const { password } = req.body;
    const correctPassword = process.env["INTERNAL_ADMIN_PASSWORD"];

    if (!correctPassword) {
      res.status(500).json({ error: "Server misconfiguration." });
      return;
    }

    if (password === correctPassword) {
      const payload = `authenticated.${Date.now()}`;
      const signedValue = signToken(payload);
      const cookie = serialize("vault_auth", signedValue, {
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
