"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects } from "@/lib/schema";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createProject(formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const status = (formData.get("status") as string) || "idea";
  const techRaw = (formData.get("tech_stack") as string | null)?.trim() || "";
  const techStack = techRaw
    ? techRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : null;

  if (!name) throw new Error("Name is required");

  const baseSlug = toSlug(name);
  let slug = baseSlug;
  let attempt = 0;

  // ensure unique slug
  while (true) {
    const existing = await db.query.projects.findFirst({
      where: (p, { eq }) => eq(p.slug, slug),
    });
    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  await db.insert(projects).values({ name, slug, description, status, techStack });
  redirect("/");
}
