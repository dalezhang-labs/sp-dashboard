import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { projectTasks, projectLogs, projectContext } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TaskColumn } from "./task-column";
import { ContextEditor } from "./context-editor";
import { addTask, addLog } from "./actions";

function formatLogTime(date: Date | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d} ${h}:${mi}`;
}

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  building: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  live: "bg-green-500/20 text-green-400 border-green-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const LOG_TYPE_COLORS: Record<string, string> = {
  note: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  milestone: "bg-green-500/20 text-green-400 border-green-500/30",
  decision: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  blocker: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const project = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
  });

  if (!project) notFound();

  const [tasks, allLogs, contextRows] = await Promise.all([
    db
      .select()
      .from(projectTasks)
      .where(eq(projectTasks.projectId, project.id))
      .orderBy(projectTasks.sortOrder),
    db
      .select()
      .from(projectLogs)
      .where(eq(projectLogs.projectId, project.id))
      .orderBy(desc(projectLogs.createdAt)),
    db
      .select()
      .from(projectContext)
      .where(eq(projectContext.projectId, project.id))
      .orderBy(projectContext.key),
  ]);

  const todo = tasks.filter((t) => t.status === "todo");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const done = tasks.filter((t) => t.status === "done");
  const recentLogs = allLogs.slice(0, 5);

  const now = new Date();
  const daysLeft = project.deadline4w
    ? Math.ceil((project.deadline4w.getTime() - now.getTime()) / 86400000)
    : null;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          ← Back
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{project.name}</h1>
          <Badge
            variant="outline"
            className={`shrink-0 text-xs ${STATUS_COLORS[project.status] ?? ""}`}
          >
            {project.status}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="context">Context ({contextRows.length})</TabsTrigger>
          <TabsTrigger value="log">Log ({allLogs.length})</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-6">
          {project.nextAction && (
            <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
              <p className="text-xs font-medium text-yellow-400 mb-1">Next Action</p>
              <p className="text-sm">{project.nextAction}</p>
            </div>
          )}

          {project.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{project.description}</p>
            </div>
          )}

          {project.techStack && project.techStack.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Tech Stack</p>
              <div className="flex flex-wrap gap-1.5">
                {project.techStack.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                GitHub →
              </a>
            )}
            {project.deployUrl && (
              <a
                href={project.deployUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:underline"
              >
                Deploy →
              </a>
            )}
          </div>

          {daysLeft !== null && (
            <p
              className={`text-sm font-medium ${daysLeft <= 0 ? "text-red-400" : "text-orange-400"}`}
            >
              ⏱ {daysLeft <= 0 ? "Overdue" : `${daysLeft} days left`}
            </p>
          )}

          {recentLogs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Recent Logs</p>
              <ul className="space-y-1.5">
                {recentLogs.map((log) => (
                  <li key={log.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-xs opacity-60 shrink-0 mt-0.5">
                      {formatLogTime(log.createdAt)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${LOG_TYPE_COLORS[log.logType ?? "note"] ?? ""}`}
                    >
                      {log.logType ?? "note"}
                    </Badge>
                    <span>{log.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        {/* ── Tasks Tab ── */}
        <TabsContent value="tasks" className="space-y-6">
          <form action={addTask} className="flex gap-2">
            <input type="hidden" name="project_id" value={project.id} />
            <input type="hidden" name="slug" value={slug} />
            <Input name="title" placeholder="New task title…" required className="flex-1" />
            <select
              name="priority"
              defaultValue="medium"
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button
              type="submit"
              className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
            >
              Add
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TaskColumn title="Todo" tasks={todo} slug={slug} />
            <TaskColumn title="In Progress" tasks={inProgress} slug={slug} />
            <TaskColumn title="Done" tasks={done} slug={slug} />
          </div>
        </TabsContent>

        {/* ── Context Tab ── */}
        <TabsContent value="context" className="space-y-6">
          <ContextEditor
            projectId={project.id}
            slug={slug}
            contextRows={contextRows}
          />
        </TabsContent>

        {/* ── Log Tab ── */}
        <TabsContent value="log" className="space-y-6">
          <form action={addLog} className="flex gap-2 items-start">
            <input type="hidden" name="project_id" value={project.id} />
            <input type="hidden" name="slug" value={slug} />
            <Textarea
              name="note"
              placeholder="Add a log entry…"
              required
              rows={2}
              className="flex-1 resize-none"
            />
            <div className="flex flex-col gap-2">
              <select
                name="log_type"
                defaultValue="note"
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="note">Note</option>
                <option value="milestone">Milestone</option>
                <option value="decision">Decision</option>
                <option value="blocker">Blocker</option>
              </select>
              <button
                type="submit"
                className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
              >
                Add
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {allLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No logs yet.</p>
            ) : (
              allLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
                >
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground opacity-60">
                      {formatLogTime(log.createdAt)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${LOG_TYPE_COLORS[log.logType ?? "note"] ?? ""}`}
                    >
                      {log.logType ?? "note"}
                    </Badge>
                  </div>
                  <p className="text-sm flex-1">{log.note}</p>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
