import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, projectTasks, projectContext } from "@/lib/schema";
import { ilike, or } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "q parameter is required" }, { status: 400 });
  }

  const pattern = `%${q}%`;

  const [matchedProjects, matchedTasks, matchedContext] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(
        or(
          ilike(projects.name, pattern),
          ilike(projects.description, pattern)
        )
      )
      .limit(10),

    db
      .select({
        id: projectTasks.id,
        projectId: projectTasks.projectId,
        title: projectTasks.title,
        description: projectTasks.description,
        status: projectTasks.status,
        priority: projectTasks.priority,
      })
      .from(projectTasks)
      .where(
        or(
          ilike(projectTasks.title, pattern),
          ilike(projectTasks.description, pattern)
        )
      )
      .limit(20),

    db
      .select({
        id: projectContext.id,
        projectId: projectContext.projectId,
        key: projectContext.key,
        value: projectContext.value,
        category: projectContext.category,
      })
      .from(projectContext)
      .where(
        or(
          ilike(projectContext.key, pattern),
          ilike(projectContext.value, pattern)
        )
      )
      .limit(20),
  ]);

  return NextResponse.json({
    query: q,
    results: {
      projects: matchedProjects,
      tasks: matchedTasks,
      context: matchedContext,
    },
  });
}
