import { db } from "@/lib/db";
import { kiroDispatches } from "@/lib/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KiroDispatchList } from "./dispatch-list";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  running: { label: "Running", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", icon: "🔄" },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: "✅" },
  failed: { label: "Failed", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: "❌" },
  blocked: { label: "Blocked", color: "bg-red-500/20 text-orange-400 border-orange-500/30", icon: "🚫" },
  exited: { label: "Exited", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: "⏹" },
};

export const dynamic = "force-dynamic";

export default async function KiroPage() {
  const dispatches = await db
    .select()
    .from(kiroDispatches)
    .orderBy(desc(kiroDispatches.dispatchedAt))
    .limit(50);

  const running = dispatches.filter((d) => d.status === "running");
  const completed = dispatches.filter((d) => d.status !== "running");

  const stats = {
    total: dispatches.length,
    running: running.length,
    completed: dispatches.filter((d) => d.status === "completed").length,
    failed: dispatches.filter((d) => ["failed", "blocked", "exited"].includes(d.status)).length,
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">⚡ Kiro Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Hermes → Kiro CLI dispatch tracker
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-cyan-500/20">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold text-cyan-400">{stats.running}</p>
            <p className="text-xs text-muted-foreground">Running</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-green-500/20">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-red-500/20">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Running tasks */}
      {running.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
            </span>
            Running Now
          </h2>
          <div className="space-y-3">
            {running.map((d) => (
              <Card key={d.id} className="bg-card border-cyan-500/20">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-cyan-400">{d.project}</span>
                        <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                          {d.agent}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{d.summary}</p>
                      {d.currentAction && (
                        <p className="text-xs text-cyan-400/70 mt-2 font-mono">
                          → {d.currentAction}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">PID {d.pid}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.dispatchedAt ? timeAgo(d.dispatchedAt) : ""}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All dispatches */}
      <h2 className="text-lg font-semibold mb-3">History</h2>
      <KiroDispatchList dispatches={dispatches} statusConfig={STATUS_CONFIG} />
    </main>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
