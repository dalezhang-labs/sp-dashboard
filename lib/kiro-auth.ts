import { NextResponse } from "next/server";

/**
 * Validate Bearer token for Kiro API endpoints.
 * Returns null if valid, or a NextResponse error if invalid.
 */
export function validateKiroAuth(req: Request): NextResponse | null {
  const apiKey = process.env.KIRO_API_KEY;
  if (!apiKey) {
    // If no key configured, allow all requests (dev mode)
    return null;
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  if (token !== apiKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
  }

  return null;
}
