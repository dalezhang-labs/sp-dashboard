import { db } from "@/lib/db";
import { kiroDispatches } from "@/lib/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
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

      <KiroDispatchList dispatches={dispatches} statusConfig={STATUS_CONFIG} />
    </main>
  );
}
