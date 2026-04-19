import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { projects, projectTasks, projectLogs } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { TaskColumn } from "./task-column";
import { addTask } from "./actions";

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  building: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  live: "bg-green-500/20 text-green-400 border-green-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
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

  const [tasks, recentLogs] = await Promise.all([
    db
      .select()
      .from(projectTasks)
      .where(eq(projectTasks.projectId, project.id))
      .orderBy(projectTasks.sortOrder),
    db
      .select()
      .from(projectLogs)
      .where(eq(projectLogs.projectId, project.id))
      .orderBy(desc(projectLogs.createdAt))
      .limit(5),
  ]);

  const todo = tasks.filter((t) => t.status === "todo");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const done = tasks.filter((t) => t.status === "done");

  const daysLeft = project.deadline4w
    ? Math.ceil((project.deadline4w.getTime() - Date.now()) / 86400000)
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
                  <li key={log.id} className="text-sm text-muted-foreground">
                    <span className="text-xs mr-2 opacity-60">
                      {log.createdAt?.toLocaleDateString()}
                    </span>
                    {log.note}
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
      </Tabs>
    </main>
  );
}
