"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { projectTasks } from "@/lib/schema";
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
