import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectTasks, projectContext, projectLogs } from "@/lib/schema";
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

  const [tasks, contextRows, recentLogs] = await Promise.all([
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
  ]);

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
  });
}
