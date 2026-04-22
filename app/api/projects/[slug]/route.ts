import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, projectTasks, projectContext, projectLogs, projectResearch } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const project = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [tasks, contextRows, recentLogs, researchRows] = await Promise.all([
    db
      .select()
      .from(projectTasks)
      .where(eq(projectTasks.projectId, project.id))
      .orderBy(projectTasks.sortOrder),
    db
      .select()
      .from(projectContext)
      .where(eq(projectContext.projectId, project.id)),
    db
      .select()
      .from(projectLogs)
      .where(eq(projectLogs.projectId, project.id))
      .orderBy(desc(projectLogs.createdAt))
      .limit(10),
    db
      .select()
      .from(projectResearch)
      .where(eq(projectResearch.projectId, project.id)),
  ]);

  const research = researchRows[0] ?? null;

  const daysLeft = project.deadline4w
    ? Math.ceil((project.deadline4w.getTime() - Date.now()) / 86400000)
    : null;

  const groupedTasks = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  };

  const contextMap = Object.fromEntries(contextRows.map((c) => [c.key, c.value]));

  return NextResponse.json({
    project: {
      name: project.name,
      slug: project.slug,
      status: project.status,
      description: project.description,
      next_action: project.nextAction,
      tech_stack: project.techStack,
      github_url: project.githubUrl,
      deploy_url: project.deployUrl,
      deadline_4w: project.deadline4w,
      days_left: daysLeft,
    },
    tasks: groupedTasks,
    context: contextMap,
    recent_logs: recentLogs,
    research: research
      ? {
          problem_statement: research.problemStatement,
          target_audience: research.targetAudience,
          existing_solutions: research.existingSolutions,
          competitors: research.competitors,
          interview_count: research.interviewCount,
          waitlist_count: research.waitlistCount,
          market_size: research.marketSize,
          monetization: research.monetization,
          verdict: research.verdict,
          verdict_reason: research.verdictReason,
          verdict_at: research.verdictAt,
        }
      : null,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const project = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const allowed: Record<string, keyof typeof projects.$inferInsert> = {
    nextAction: "nextAction",
    next_action: "nextAction",
    description: "description",
    techStack: "techStack",
    tech_stack: "techStack",
    status: "status",
    deployUrl: "deployUrl",
    deploy_url: "deployUrl",
    githubUrl: "githubUrl",
    github_url: "githubUrl",
  };

  const validStatuses = ["research", "validated", "building", "beta", "live", "growing", "archived"];
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, val] of Object.entries(body)) {
    const col = allowed[key];
    if (!col) continue;
    // Validate status values
    if (col === "status" && !validStatuses.includes(val as string)) continue;
    updates[col as string] = val;
  }

  const [updated] = await db
    .update(projects)
    .set(updates)
    .where(eq(projects.id, project.id))
    .returning();

  return NextResponse.json({ project: updated });
}
