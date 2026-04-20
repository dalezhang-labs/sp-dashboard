import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const all = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt));

  return NextResponse.json({ projects: all });
}
