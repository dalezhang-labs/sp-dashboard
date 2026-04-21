import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kiroDispatches, projects } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { validateKiroAuth } from "@/lib/kiro-auth";

/**
 * Sanitize a string field: trim, limit length, strip control characters.
 */
function sanitizeString(value: unknown, maxLength = 2000): string | null {
  if (typeof value !== "string") return null;
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control chars (keep \n \r \t)
    .trim()
    .slice(0, maxLength) || null;
}

/**
 * Validate that a value is a safe integer (for PID etc).
 */
function sanitizeInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 2147483647) return null;
  return n;
}

// GET /api/kiro/dispatches — list all dispatches
// Optional query params: ?status=running&project=imagelingo&limit=20
export async function GET(req: Request) {
  const authError = validateKiroAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");
  const projectFilter = searchParams.get("project");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  let query = db.select().from(kiroDispatches);

  if (statusFilter) {
    query = query.where(eq(kiroDispatches.status, statusFilter)) as typeof query;
  }
  if (projectFilter) {
    query = query.where(eq(kiroDispatches.project, projectFilter)) as typeof query;
  }

  const dispatches = await query
    .orderBy(desc(kiroDispatches.dispatchedAt))
    .limit(limit);

  return NextResponse.json({ dispatches });
}

// POST /api/kiro/dispatches — create a new dispatch record
export async function POST(req: Request) {
  const authError = validateKiroAuth(req);
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const project = sanitizeString(body.project, 100);
  const agent = sanitizeString(body.agent, 100);
  const summary = sanitizeString(body.summary, 2000);
  const taskDescription = sanitizeString(body.taskDescription, 5000);
  const pid = sanitizeInt(body.pid);
  const logFile = sanitizeString(body.logFile, 500);

  if (!project || !agent || !summary) {
    return NextResponse.json(
      { error: "project, agent, and summary are required (non-empty strings)" },
      { status: 400 }
    );
  }

  // Try to link to existing project by slug
  let projectId: string | null = null;
  const existingProject = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.slug, project),
  });
  if (existingProject) {
    projectId = existingProject.id;
  }

  const [dispatch] = await db
    .insert(kiroDispatches)
    .values({
      project,
      agent,
      summary,
      taskDescription,
      pid,
      logFile,
      projectId,
      status: "running",
      startedAt: new Date(),
    })
    .returning();

  return NextResponse.json({ dispatch }, { status: 201 });
}
