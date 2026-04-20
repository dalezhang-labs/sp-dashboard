"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  projects: Array<{ id: string; name: string; slug: string; description: string | null; status: string }>;
  tasks: Array<{ id: string; projectId: string | null; title: string; status: string; priority: string }>;
  context: Array<{ id: string; projectId: string | null; key: string; value: string; category: string }>;
};

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Cmd+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const search = useCallback((q: string) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/context?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results);
      } catch {
        // ignore
      }
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <svg
            className="w-4 h-4 text-muted-foreground shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, tasks, context…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!results && query.trim() === "" && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Type to search across all projects…
            </p>
          )}

          {results && (
            <div className="p-2 space-y-1">
              {results.projects.length === 0 &&
                results.tasks.length === 0 &&
                results.context.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                )}

              {results.projects.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">Projects</p>
                  {results.projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        router.push(`/projects/${p.slug}`);
                        setOpen(false);
                        setQuery("");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <span className="text-sm font-medium">{p.name}</span>
                      {p.description && (
                        <span className="text-xs text-muted-foreground ml-2 line-clamp-1">
                          {p.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {results.tasks.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">Tasks</p>
                  {results.tasks.map((t) => (
                    <div
                      key={t.id}
                      className="px-3 py-2 rounded-lg"
                    >
                      <span className="text-sm">{t.title}</span>
                      <span className="text-xs text-muted-foreground ml-2">{t.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {results.context.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">Context</p>
                  {results.context.map((c) => (
                    <div key={c.id} className="px-3 py-2 rounded-lg">
                      <span className="text-sm font-mono">{c.key}</span>
                      <span className="text-xs text-muted-foreground ml-2 line-clamp-1">
                        {c.value.slice(0, 80)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
