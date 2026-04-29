import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Check if the secure cookie exists
  const authCookie = request.cookies.get("vault_auth");

  if (!authCookie || authCookie.value !== "authenticated") {
    // If someone tries to hit the API without the cookie, block them with a 401 Unauthorized
    return NextResponse.json(
      { error: "Unauthorized Access. Incident Logged." },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

// Only run this middleware on our sensitive data routes
export const config = {
  matcher: [
    "/api/cards/:path*", 
    "/api/process-card/:path*"
  ],
};