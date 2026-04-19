"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { updateTaskStatus } from "./actions";
import type { ProjectTask } from "@/lib/schema";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const STATUS_NEXT: Record<string, string> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
};

function TaskItem({ task, slug }: { task: ProjectTask; slug: string }) {
  const [pending, startTransition] = useTransition();
  const next = STATUS_NEXT[task.status] ?? "todo";

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border border-border bg-card ${pending ? "opacity-50" : ""}`}
    >
      <button
        onClick={() => startTransition(() => updateTaskStatus(task.id, next, slug))}
        className="mt-0.5 w-4 h-4 rounded border border-muted-foreground/40 shrink-0 hover:border-primary transition-colors"
        title={`Move to ${STATUS_LABEL[next]}`}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
        )}
      </div>
      <Badge variant="outline" className={`text-xs shrink-0 ${PRIORITY_COLORS[task.priority] ?? ""}`}>
        {task.priority}
      </Badge>
    </div>
  );
}

export function TaskColumn({
  title,
  tasks,
  slug,
}: {
  title: string;
  tasks: ProjectTask[];
  slug: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        {title} ({tasks.length})
      </h3>
      {tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
          Empty
        </p>
      ) : (
        tasks.map((t) => <TaskItem key={t.id} task={t} slug={slug} />)
      )}
    </div>
  );
}
