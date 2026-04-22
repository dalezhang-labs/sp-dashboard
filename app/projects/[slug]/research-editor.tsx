import { Badge } from "@/components/ui/badge";
import type { ProjectResearch } from "@/lib/schema";

// Typed competitor entry
interface Competitor {
  name?: string;
  url?: string;
  pricing?: string;
  strengths?: string;
  weaknesses?: string;
}

function getCompetitors(research: ProjectResearch | null): Competitor[] {
  if (!research?.competitors || !Array.isArray(research.competitors)) return [];
  return research.competitors as Competitor[];
}

const VERDICT_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "Pending", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: "⏳" },
  go: { label: "Go", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: "🚀" },
  pivot: { label: "Pivot", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: "🔄" },
  kill: { label: "Kill", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: "💀" },
};

const CHECKLIST: Array<{ key: string; label: string }> = [
  { key: "problemStatement", label: "Problem statement defined" },
  { key: "targetAudience", label: "Target audience identified" },
  { key: "existingSolutions", label: "Existing solutions researched" },
  { key: "competitors", label: "Competitors analyzed" },
  { key: "interviewCount", label: "User interviews (≥5)" },
  { key: "marketSize", label: "Market size estimated" },
  { key: "monetization", label: "Monetization model defined" },
];

function checkComplete(research: ProjectResearch | null): { done: number; total: number } {
  if (!research) return { done: 0, total: CHECKLIST.length };
  let done = 0;
  if (research.problemStatement) done++;
  if (research.targetAudience) done++;
  if (research.existingSolutions) done++;
  if (getCompetitors(research).length > 0) done++;
  if ((research.interviewCount ?? 0) >= 5) done++;
  if (research.marketSize) done++;
  if (research.monetization) done++;
  return { done, total: CHECKLIST.length };
}

function isChecklistFilled(research: ProjectResearch, key: string): boolean {
  if (key === "interviewCount") return (research.interviewCount ?? 0) >= 5;
  if (key === "competitors") return getCompetitors(research).length > 0;
  const val = research[key as keyof typeof research];
  return typeof val === "string" ? val.length > 0 : false;
}

export function ResearchEditor({
  research,
}: {
  projectId: string;
  slug: string;
  projectStatus: string;
  research: ProjectResearch | null;
}) {
  const verdict = research?.verdict ?? "pending";
  const vc = VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG.pending;
  const progress = checkComplete(research);

  // Empty state
  if (!research || (!research.problemStatement && !research.targetAudience && progress.done === 0)) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-muted-foreground text-sm">
          No research data yet. Tell Kiro to start researching this project.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar + verdict badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {progress.done}/{progress.total}
          </span>
        </div>
        <Badge variant="outline" className={`text-xs ${vc.color}`}>
          {vc.icon} {vc.label}
        </Badge>
      </div>

      {/* Checklist */}
      <div className="p-4 rounded-lg border border-border bg-card">
        <h3 className="text-sm font-semibold mb-3">Research Checklist</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CHECKLIST.map((item) => {
            const filled = research ? isChecklistFilled(research, item.key) : false;
            return (
              <div key={item.key} className="flex items-center gap-2 text-sm">
                <span className={filled ? "text-green-400" : "text-muted-foreground/40"}>
                  {filled ? "✓" : "○"}
                </span>
                <span className={filled ? "text-foreground" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Research content — two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {research.problemStatement && (
            <Section title="🎯 Problem Statement" content={research.problemStatement} />
          )}
          {research.targetAudience && (
            <Section title="👤 Target Audience (ICP)" content={research.targetAudience} />
          )}
          {research.existingSolutions && (
            <Section title="🔧 Existing Solutions" content={research.existingSolutions} />
          )}
        </div>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Stat label="Interviews" value={String(research.interviewCount ?? 0)} target={5} />
            <Stat label="Waitlist" value={String(research.waitlistCount ?? 0)} />
          </div>
          {research.interviewNotes && (
            <Section title="📝 Interview Notes" content={research.interviewNotes} />
          )}
          {research.marketSize && (
            <Section title="📊 Market Size" content={research.marketSize} />
          )}
          {research.monetization && (
            <Section title="💰 Monetization" content={research.monetization} />
          )}
        </div>
      </div>

      {/* Competitors table */}
      {getCompetitors(research).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">⚔️ Competitors</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-lg">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-2 font-medium">Name</th>
                  <th className="text-left p-2 font-medium">Pricing</th>
                  <th className="text-left p-2 font-medium">Strengths</th>
                  <th className="text-left p-2 font-medium">Weaknesses</th>
                </tr>
              </thead>
              <tbody>
                {getCompetitors(research).map((c, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="p-2">
                      {c.url ? (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {c.name || "—"}
                        </a>
                      ) : (
                        c.name || "—"
                      )}
                    </td>
                    <td className="p-2 text-muted-foreground">{c.pricing || "—"}</td>
                    <td className="p-2 text-muted-foreground">{c.strengths || "—"}</td>
                    <td className="p-2 text-muted-foreground">{c.weaknesses || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reddit & signals */}
      {(research.redditThreads || research.otherSignals) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {research.redditThreads && (
            <Section title="💬 Reddit / Community" content={research.redditThreads} />
          )}
          {research.otherSignals && (
            <Section title="📡 Other Signals" content={research.otherSignals} />
          )}
        </div>
      )}

      {/* Verdict display */}
      {research.verdict && research.verdict !== "pending" && (
        <div className={`p-4 rounded-lg border ${VERDICT_CONFIG[research.verdict]?.color ?? ""}`}>
          <div className="flex items-center gap-2 mb-1">
            <span>{VERDICT_CONFIG[research.verdict]?.icon}</span>
            <span className="text-sm font-semibold">
              Verdict: {VERDICT_CONFIG[research.verdict]?.label}
            </span>
            {research.verdictAt && (
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(research.verdictAt).toLocaleDateString()}
              </span>
            )}
          </div>
          {research.verdictReason && (
            <p className="text-sm text-muted-foreground">{research.verdictReason}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{title}</p>
      <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
    </div>
  );
}

function Stat({ label, value, target }: { label: string; value: string; target?: number }) {
  const num = parseInt(value);
  const met = target ? num >= target : false;
  return (
    <div className="p-3 rounded-lg border border-border bg-card text-center min-w-[80px]">
      <p className={`text-lg font-bold ${met ? "text-green-400" : ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground">
        {label}
        {target ? ` (goal: ${target})` : ""}
      </p>
    </div>
  );
}
