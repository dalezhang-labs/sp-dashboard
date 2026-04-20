"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { upsertContext, deleteContext } from "./actions";
import type { ProjectContext } from "@/lib/schema";

const CATEGORY_COLORS: Record<string, string> = {
  tech: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  decision: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  convention: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  reference: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  general: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

function ContextItem({
  item,
  slug,
}: {
  item: ProjectContext;
  slug: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <form
        action={(fd) => {
          startTransition(async () => {
            await upsertContext(fd);
            setEditing(false);
          });
        }}
        className="p-4 rounded-lg border border-border bg-card space-y-3"
      >
        <input type="hidden" name="project_id" value={item.projectId ?? ""} />
        <input type="hidden" name="slug" value={slug} />
        <div className="flex gap-2">
          <Input name="key" defaultValue={item.key} required className="flex-1" />
          <select
            name="category"
            defaultValue={item.category}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="general">General</option>
            <option value="tech">Tech</option>
            <option value="decision">Decision</option>
            <option value="convention">Convention</option>
            <option value="reference">Reference</option>
          </select>
        </div>
        <Textarea
          name="value"
          defaultValue={item.value}
          required
          rows={6}
          className="font-mono text-xs resize-y"
          placeholder="Markdown supported…"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="h-7 px-3 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="h-7 px-3 rounded border border-border text-xs hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-border bg-card space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium font-mono">{item.key}</span>
          <Badge
            variant="outline"
            className={`text-xs ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.general}`}
          >
            {item.category}
          </Badge>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded hover:bg-muted"
          >
            Edit
          </button>
          <button
            onClick={() =>
              startTransition(() => deleteContext(item.id, slug))
            }
            disabled={pending}
            className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-0.5 rounded hover:bg-red-500/10 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="prose prose-sm prose-invert max-w-none text-sm text-muted-foreground">
        <ReactMarkdown>{item.value}</ReactMarkdown>
      </div>
    </div>
  );
}

export function ContextEditor({
  projectId,
  slug,
  contextRows,
}: {
  projectId: string;
  slug: string;
  contextRows: ProjectContext[];
}) {
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Technical context, decisions, and conventions for this project.
        </p>
        <button
          onClick={() => setAdding(true)}
          className="h-7 px-3 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/80 transition-colors"
        >
          + Add
        </button>
      </div>

      {adding && (
        <form
          action={(fd) => {
            startTransition(async () => {
              await upsertContext(fd);
              setAdding(false);
            });
          }}
          className="p-4 rounded-lg border border-border bg-card space-y-3"
        >
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="slug" value={slug} />
          <div className="flex gap-2">
            <Input
              name="key"
              required
              placeholder="e.g. db_schema, env_vars, conventions"
              className="flex-1"
            />
            <select
              name="category"
              defaultValue="general"
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="general">General</option>
              <option value="tech">Tech</option>
              <option value="decision">Decision</option>
              <option value="convention">Convention</option>
              <option value="reference">Reference</option>
            </select>
          </div>
          <Textarea
            name="value"
            required
            rows={6}
            className="font-mono text-xs resize-y"
            placeholder="Markdown supported…"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="h-7 px-3 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="h-7 px-3 rounded border border-border text-xs hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {contextRows.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-lg">
          No context entries yet. Add db_schema, env_vars, conventions, etc.
        </p>
      ) : (
        contextRows.map((item) => (
          <ContextItem key={item.id} item={item} slug={slug} />
        ))
      )}
    </div>
  );
}
