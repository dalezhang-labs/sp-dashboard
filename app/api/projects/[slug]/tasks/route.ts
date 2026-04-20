import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectTasks } from "@/lib/schema";
import { eq } from "drizzle-orm";

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

  const tasks = await db
    .select()
    .from(projectTasks)
    .where(eq(projectTasks.projectId, project.id))
    .orderBy(projectTasks.sortOrder);

  return NextResponse.json({
    tasks: {
      todo: tasks.filter((t) => t.status === "todo"),
      in_progress: tasks.filter((t) => t.status === "in_progress"),
      done: tasks.filter((t) => t.status === "done"),
      cancelled: tasks.filter((t) => t.status === "cancelled"),
    },
  });
}

export async function POST(
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
  const { title, description, priority = "medium", category } = body;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const [task] = await db
    .insert(projectTasks)
    .values({ projectId: project.id, title, description, priority, category })
    .returning();

  return NextResponse.json({ task }, { status: 201 });
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
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [task] = await db
    .update(projectTasks)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(projectTasks.id, id))
    .returning();

  return NextResponse.json({ task });
}
