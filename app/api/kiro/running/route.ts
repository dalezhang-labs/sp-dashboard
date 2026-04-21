import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kiroDispatches } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

// GET /api/kiro/running — internal endpoint for frontend polling (no auth)
export async function GET() {
  const dispatches = await db
    .select()
    .from(kiroDispatches)
    .where(eq(kiroDispatches.status, "running"))
    .orderBy(desc(kiroDispatches.dispatchedAt))
    .limit(20);

  return NextResponse.json({ dispatches });
}
