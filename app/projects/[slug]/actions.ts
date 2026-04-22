"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { projectTasks, projectContext, projectLogs, projectResearch, projects } from "@/lib/schema";
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

export async function upsertResearch(formData: FormData) {
  const projectId = formData.get("project_id") as string;
  const slug = formData.get("slug") as string;

  const problemStatement = (formData.get("problem_statement") as string)?.trim() || null;
  const targetAudience = (formData.get("target_audience") as string)?.trim() || null;
  const existingSolutions = (formData.get("existing_solutions") as string)?.trim() || null;
  const interviewCount = parseInt(formData.get("interview_count") as string) || 0;
  const interviewNotes = (formData.get("interview_notes") as string)?.trim() || null;
  const waitlistCount = parseInt(formData.get("waitlist_count") as string) || 0;
  const marketSize = (formData.get("market_size") as string)?.trim() || null;
  const monetization = (formData.get("monetization") as string)?.trim() || null;
  const redditThreads = (formData.get("reddit_threads") as string)?.trim() || null;
  const otherSignals = (formData.get("other_signals") as string)?.trim() || null;

  // Parse competitors JSON safely
  let competitors: unknown = null;
  const competitorsRaw = (formData.get("competitors") as string)?.trim();
  if (competitorsRaw) {
    try {
      competitors = JSON.parse(competitorsRaw);
    } catch {
      // Keep null if invalid JSON
    }
  }

  const values = {
    projectId,
    problemStatement,
    targetAudience,
    existingSolutions,
    competitors,
    interviewCount,
    interviewNotes,
    waitlistCount,
    marketSize,
    monetization,
    redditThreads,
    otherSignals,
    updatedAt: new Date(),
  };

  await db
    .insert(projectResearch)
    .values(values)
    .onConflictDoUpdate({
      target: projectResearch.projectId,
      set: values,
    });

  revalidatePath(`/projects/${slug}`);
}

export async function setVerdict(formData: FormData) {
  const projectId = formData.get("project_id") as string;
  const slug = formData.get("slug") as string;
  const verdict = formData.get("verdict") as string;
  const verdictReason = (formData.get("verdict_reason") as string)?.trim() || null;

  if (!["go", "pivot", "kill"].includes(verdict)) return;

  // Update research verdict
  await db
    .update(projectResearch)
    .set({ verdict, verdictReason, verdictAt: new Date(), updatedAt: new Date() })
    .where(eq(projectResearch.projectId, projectId));

  // Auto-advance project status based on verdict
  if (verdict === "go") {
    await db
      .update(projects)
      .set({ status: "validated", updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  } else if (verdict === "kill") {
    await db
      .update(projects)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  }
  // pivot keeps status as "research"

  // Log the decision
  await db.insert(projectLogs).values({
    projectId,
    note: `Research verdict: ${verdict.toUpperCase()}${verdictReason ? ` — ${verdictReason}` : ""}`,
    logType: "decision",
  });

  revalidatePath(`/projects/${slug}`);
}
