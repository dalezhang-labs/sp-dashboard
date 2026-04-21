import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kiroDispatches, projects } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { validateKiroAuth } from "@/lib/kiro-auth";

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

  const body = await req.json();
  const { project, agent, summary, taskDescription, pid, logFile } = body;

  if (!project || !agent || !summary) {
    return NextResponse.json(
      { error: "project, agent, and summary are required" },
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
      taskDescription: taskDescription || null,
      pid: pid || null,
      logFile: logFile || null,
      projectId,
      status: "running",
      startedAt: new Date(),
    })
    .returning();

  return NextResponse.json({ dispatch }, { status: 201 });
}
