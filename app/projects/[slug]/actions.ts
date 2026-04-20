"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { projectTasks, projectContext, projectLogs } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function addTask(formData: FormData) {
  const projectId = formData.get("project_id") as string;
  const slug = formData.get("slug") as string;
  const title = (formData.get("title") as string).trim();
  const priority = (formData.get("priority") as string) || "medium";

  if (!title) return;

  await db.insert(projectTasks).values({ projectId, title, priority });
  revalidatePath(`/projects/${slug}`);
}

export async function updateTaskStatus(taskId: string, status: string, slug: string) {
  await db
    .update(projectTasks)
    .set({ status, updatedAt: new Date() })
    .where(eq(projectTasks.id, taskId));
  revalidatePath(`/projects/${slug}`);
}

export async function upsertContext(formData: FormData) {
  const projectId = formData.get("project_id") as string;
  const slug = formData.get("slug") as string;
  const key = (formData.get("key") as string).trim();
  const value = (formData.get("value") as string).trim();
  const category = (formData.get("category") as string) || "general";

  if (!key || !value) return;

  await db
    .insert(projectContext)
    .values({ projectId, key, value, category })
    .onConflictDoUpdate({
      target: [projectContext.projectId, projectContext.key],
      set: { value, category, updatedAt: new Date() },
    });

  revalidatePath(`/projects/${slug}`);
}

export async function deleteContext(contextId: string, slug: string) {
  await db.delete(projectContext).where(eq(projectContext.id, contextId));
  revalidatePath(`/projects/${slug}`);
}

export async function addLog(formData: FormData) {
  const projectId = formData.get("project_id") as string;
  const slug = formData.get("slug") as string;
  const note = (formData.get("note") as string).trim();
  const logType = (formData.get("log_type") as string) || "note";

  if (!note) return;

  await db.insert(projectLogs).values({ projectId, note, logType });
  revalidatePath(`/projects/${slug}`);
}
