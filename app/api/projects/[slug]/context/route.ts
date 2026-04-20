import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectContext } from "@/lib/schema";
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

  const rows = await db
    .select()
    .from(projectContext)
    .where(eq(projectContext.projectId, project.id))
    .orderBy(projectContext.key);

  const context = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return NextResponse.json({ context, entries: rows });
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
  const { key, value, category = "general" } = body;

  if (!key || !value) {
    return NextResponse.json({ error: "key and value are required" }, { status: 400 });
  }

  const [entry] = await db
    .insert(projectContext)
    .values({ projectId: project.id, key, value, category })
    .onConflictDoUpdate({
      target: [projectContext.projectId, projectContext.key],
      set: { value, category, updatedAt: new Date() },
    })
    .returning();

  return NextResponse.json({ entry }, { status: 201 });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  return POST(req, { params });
}
