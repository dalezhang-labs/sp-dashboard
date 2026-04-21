import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kiroDispatches } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { validateKiroAuth } from "@/lib/kiro-auth";

/**
 * Sanitize a string field: trim, limit length, strip control characters.
 */
function sanitizeString(value: unknown, maxLength = 2000): string | null {
  if (typeof value !== "string") return null;
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLength) || null;
}

/**
 * Sanitize a string array field.
 */
function sanitizeStringArray(value: unknown, maxItems = 50, maxItemLength = 1000): string[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter((item): item is string => typeof item === "string")
    .slice(0, maxItems)
    .map((item) =>
      item.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().slice(0, maxItemLength)
    )
    .filter((item) => item.length > 0);
}

const VALID_STATUSES = ["running", "completed", "failed", "blocked", "exited"];
const VALID_REPORT_STATUSES = ["DONE", "PARTIAL", "BLOCKED"];

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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { lastSyncAt: new Date() };

  // Sanitize each field individually with appropriate constraints
  if (body.status !== undefined) {
    const status = sanitizeString(body.status, 20);
    if (status && VALID_STATUSES.includes(status)) {
      updates.status = status;
    }
  }

  if (body.reportStatus !== undefined) {
    const reportStatus = sanitizeString(body.reportStatus, 20);
    if (reportStatus && VALID_REPORT_STATUSES.includes(reportStatus)) {
      updates.reportStatus = reportStatus;
    }
  }

  if (body.currentAction !== undefined) {
    updates.currentAction = sanitizeString(body.currentAction, 500);
  }

  if (body.reportSummary !== undefined) {
    updates.reportSummary = sanitizeString(body.reportSummary, 5000);
  }

  if (body.reportCompleted !== undefined) {
    updates.reportCompleted = sanitizeStringArray(body.reportCompleted);
  }

  if (body.reportBlockers !== undefined) {
    updates.reportBlockers = sanitizeStringArray(body.reportBlockers);
  }

  if (body.reportWarnings !== undefined) {
    updates.reportWarnings = sanitizeStringArray(body.reportWarnings);
  }

  if (body.reportNextSteps !== undefined) {
    updates.reportNextSteps = sanitizeStringArray(body.reportNextSteps);
  }

  if (body.prUrl !== undefined) {
    const prUrl = sanitizeString(body.prUrl, 500);
    // Basic URL validation
    if (prUrl && (prUrl.startsWith("https://") || prUrl.startsWith("http://"))) {
      updates.prUrl = prUrl;
    }
  }

  if (body.creditsUsed !== undefined) {
    const credits = sanitizeString(String(body.creditsUsed), 20);
    if (credits && /^\d+(\.\d+)?$/.test(credits)) {
      updates.creditsUsed = credits;
    }
  }

  if (body.durationSeconds !== undefined) {
    const dur = Number(body.durationSeconds);
    if (Number.isInteger(dur) && dur >= 0 && dur <= 86400) {
      updates.durationSeconds = dur;
    }
  }

  if (body.completedAt !== undefined) {
    const d = new Date(body.completedAt as string);
    if (!isNaN(d.getTime())) {
      updates.completedAt = d;
    }
  }

  // Auto-set completedAt when status changes to completed/failed/blocked
  if (
    updates.status &&
    ["completed", "failed", "blocked"].includes(updates.status as string) &&
    !updates.completedAt
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
