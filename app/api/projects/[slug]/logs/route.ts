import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectLogs } from "@/lib/schema";
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

  const logs = await db
    .select()
    .from(projectLogs)
    .where(eq(projectLogs.projectId, project.id))
    .orderBy(desc(projectLogs.createdAt));

  return NextResponse.json({ logs });
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
  const { note, log_type = "note" } = body;

  if (!note) {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }

  const [log] = await db
    .insert(projectLogs)
    .values({ projectId: project.id, note, logType: log_type })
    .returning();

  return NextResponse.json({ log }, { status: 201 });
}
