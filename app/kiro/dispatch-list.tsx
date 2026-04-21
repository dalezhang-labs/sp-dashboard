"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { KiroDispatch } from "@/lib/schema";

interface StatusConfig {
  label: string;
  color: string;
  icon: string;
}

export function KiroDispatchList({
  dispatches: initialDispatches,
  statusConfig,
}: {
  dispatches: KiroDispatch[];
  statusConfig: Record<string, StatusConfig>;
}) {
  const [dispatches, setDispatches] = useState(initialDispatches);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());

  const hasRunning = dispatches.some((d) => d.status === "running");

  const pollRunning = useCallback(async () => {
    try {
      const res = await fetch("/api/kiro/running");
      if (!res.ok) return;
      const data = await res.json();
      const runningDispatches: KiroDispatch[] = data.dispatches;

      setDispatches((prev) => {
        const nonRunning = prev.filter((d) => d.status !== "running");
        // Merge: replace running tasks with fresh data, keep non-running as-is
        // Also update any previously-running task that is now completed
        const runningIds = new Set(runningDispatches.map((d) => d.id));
        const updatedNonRunning = nonRunning.map((d) => {
          const fresh = runningDispatches.find((r) => r.id === d.id);
          return fresh || d;
        });
        const newRunning = runningDispatches.filter(
          (d) => !updatedNonRunning.some((u) => u.id === d.id)
        );
        return [...newRunning, ...updatedNonRunning].sort(
          (a, b) =>
            new Date(b.dispatchedAt || 0).getTime() -
            new Date(a.dispatchedAt || 0).getTime()
        );
      });
      setLastUpdated(new Date());
    } catch {
      // silently ignore polling errors
    }
  }, []);

  // Poll every 5s when there are running tasks
  useEffect(() => {
    if (!hasRunning) return;
    const interval = setInterval(pollRunning, 5000);
    return () => clearInterval(interval);
  }, [hasRunning, pollRunning]);

  // Update "ago" display every second when polling is active
  useEffect(() => {
    if (!hasRunning || !lastUpdated) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasRunning, lastUpdated]);

  const filtered =
    filter === "all"
      ? dispatches
      : dispatches.filter((d) => d.status === filter);

  const updatedAgo = lastUpdated
    ? `Updated ${Math.max(0, Math.floor((now - lastUpdated.getTime()) / 1000))}s ago`
    : null;

  return (
    <div>
      {/* Filter buttons + polling indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          {["all", "running", "completed", "failed", "blocked", "exited"].map(
            (s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  filter === s
                    ? "bg-muted text-foreground border-muted-foreground/30"
                    : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground/30"
                }`}
              >
                {s === "all"
                  ? `All (${dispatches.length})`
                  : `${statusConfig[s]?.icon || ""} ${statusConfig[s]?.label || s}`}
              </button>
            )
          )}
        </div>
        {hasRunning && updatedAgo && (
          <span className="text-xs text-muted-foreground shrink-0 ml-2">
            {updatedAgo}
          </span>
        )}
      </div>

      {/* Dispatch list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-muted-foreground text-sm py-8 text-center">
            No dispatches found.
          </p>
        )}
        {filtered.map((d) => {
          const cfg = statusConfig[d.status] || {
            label: d.status,
            color: "bg-gray-500/20 text-gray-400",
            icon: "❓",
          };
          const isExpanded = expandedId === d.id;
          const duration = d.durationSeconds
            ? d.durationSeconds >= 60
              ? `${Math.floor(d.durationSeconds / 60)}m ${d.durationSeconds % 60}s`
              : `${d.durationSeconds}s`
            : null;

          return (
            <Card
              key={d.id}
              className={`bg-card border-border cursor-pointer transition-colors hover:border-muted-foreground/30 ${
                isExpanded ? "border-muted-foreground/40" : ""
              }`}
              onClick={() => setExpandedId(isExpanded ? null : d.id)}
            >
              <CardContent className="py-3 px-4">
                {/* Header row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{cfg.icon}</span>
                    <span className="font-medium truncate">{d.project}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${cfg.color}`}
                    >
                      {cfg.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {d.agent}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {duration && (
                      <span className="text-xs text-muted-foreground">
                        {duration}
                      </span>
                    )}
                    {d.creditsUsed && (
                      <span className="text-xs text-muted-foreground">
                        {d.creditsUsed} credits
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {d.dispatchedAt
                        ? new Date(d.dispatchedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {d.summary}
                </p>

                {/* Expanded report */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    {d.reportSummary && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                          Summary
                        </h4>
                        <p className="text-sm">{d.reportSummary}</p>
                      </div>
                    )}

                    {d.reportCompleted && d.reportCompleted.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-green-400 uppercase mb-1">
                          Completed
                        </h4>
                        <ul className="text-sm space-y-0.5">
                          {d.reportCompleted.map((item, i) => (
                            <li key={i} className="text-muted-foreground">
                              ✓ {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {d.reportBlockers && d.reportBlockers.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-red-400 uppercase mb-1">
                          Blockers
                        </h4>
                        <ul className="text-sm space-y-0.5">
                          {d.reportBlockers.map((item, i) => (
                            <li key={i} className="text-red-400/80">
                              ⚠ {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {d.reportWarnings && d.reportWarnings.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-yellow-400 uppercase mb-1">
                          Warnings
                        </h4>
                        <ul className="text-sm space-y-0.5">
                          {d.reportWarnings.map((item, i) => (
                            <li key={i} className="text-yellow-400/80">
                              △ {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {d.reportNextSteps && d.reportNextSteps.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-blue-400 uppercase mb-1">
                          Next Steps
                        </h4>
                        <ul className="text-sm space-y-0.5">
                          {d.reportNextSteps.map((item, i) => (
                            <li key={i} className="text-muted-foreground">
                              → {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {d.prUrl && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                          PR
                        </h4>
                        <a
                          href={d.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {d.prUrl}
                        </a>
                      </div>
                    )}

                    <div className="flex gap-4 text-xs text-muted-foreground pt-2">
                      {d.pid && <span>PID: {d.pid}</span>}
                      {d.logFile && (
                        <span className="font-mono">{d.logFile}</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
