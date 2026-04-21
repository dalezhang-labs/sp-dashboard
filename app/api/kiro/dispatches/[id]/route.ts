import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kiroDispatches } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { validateKiroAuth } from "@/lib/kiro-auth";

// GET /api/kiro/dispatches/[id] — get single dispatch with full report
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateKiroAuth(req);
  if (authError) return authError;

  const { id } = await params;

  const dispatch = await db.query.kiroDispatches.findFirst({
    where: (d, { eq }) => eq(d.id, id),
  });

  if (!dispatch) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ dispatch });
}

// PATCH /api/kiro/dispatches/[id] — update dispatch status/report
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateKiroAuth(req);
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json();

  // Only allow updating specific fields
  const allowedFields = [
    "status",
    "reportStatus",
    "currentAction",
    "reportSummary",
    "reportCompleted",
    "reportBlockers",
    "reportWarnings",
    "reportNextSteps",
    "prUrl",
    "completedAt",
    "creditsUsed",
    "durationSeconds",
  ];

  const updates: Record<string, unknown> = { lastSyncAt: new Date() };
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  // Auto-set completedAt when status changes to completed/failed/blocked
  if (
    body.status &&
    ["completed", "failed", "blocked"].includes(body.status) &&
    !body.completedAt
  ) {
    updates.completedAt = new Date();
  }

  const [dispatch] = await db
    .update(kiroDispatches)
    .set(updates)
    .where(eq(kiroDispatches.id, id))
    .returning();

  if (!dispatch) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ dispatch });
}
