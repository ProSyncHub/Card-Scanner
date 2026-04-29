import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const correctPassword = process.env.INTERNAL_ADMIN_PASSWORD;

    if (!correctPassword) {
      return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
    }

    if (password === correctPassword) {
      // Set an HttpOnly, Secure cookie that expires in 24 hours
      (await cookies()).set({
        name: "vault_auth",
        value: "authenticated",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}