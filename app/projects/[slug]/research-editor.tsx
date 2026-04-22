"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { upsertResearch, setVerdict } from "./actions";
import type { ProjectResearch } from "@/lib/schema";

// Typed competitor entry
interface Competitor {
  name?: string;
  url?: string;
  pricing?: string;
  strengths?: string;
  weaknesses?: string;
}

// Safely extract competitors array from jsonb
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

// Checklist items for research completeness
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

export function ResearchEditor({
  projectId,
  slug,
  projectStatus,
  research,
}: {
  projectId: string;
  slug: string;
  projectStatus: string;
  research: ProjectResearch | null;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const verdict = research?.verdict ?? "pending";
  const vc = VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG.pending;
  const progress = checkComplete(research);
  const canVerdict = progress.done >= 4; // At least 4/7 items filled

  if (editing) {
    return (
      <form
        action={(fd) => {
          startTransition(async () => {
            await upsertResearch(fd);
            setEditing(false);
          });
        }}
        className="space-y-6"
      >
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="slug" value={slug} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Problem & Audience */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Problem & Audience
            </h3>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Problem Statement</label>
              <Textarea
                name="problem_statement"
                defaultValue={research?.problemStatement ?? ""}
                placeholder="Who has what pain? Be specific: '[audience] spends [X hours/dollars] on [problem] because [reason]'"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target Audience (ICP)</label>
              <Textarea
                name="target_audience"
                defaultValue={research?.targetAudience ?? ""}
                placeholder="Role, company size, industry, budget range..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Existing Solutions</label>
              <Textarea
                name="existing_solutions"
                defaultValue={research?.existingSolutions ?? ""}
                placeholder="How do they solve this problem today? Manual process, spreadsheets, competitor tools..."
                rows={3}
              />
            </div>
          </div>

          {/* Validation & Market */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Validation & Market
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Interviews Done</label>
                <Input
                  name="interview_count"
                  type="number"
                  min={0}
                  defaultValue={research?.interviewCount ?? 0}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Waitlist Count</label>
                <Input
                  name="waitlist_count"
                  type="number"
                  min={0}
                  defaultValue={research?.waitlistCount ?? 0}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Interview Notes</label>
              <Textarea
                name="interview_notes"
                defaultValue={research?.interviewNotes ?? ""}
                placeholder="Key insights from user interviews..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Market Size</label>
              <Textarea
                name="market_size"
                defaultValue={research?.marketSize ?? ""}
                placeholder="TAM/SAM/SOM estimate with sources..."
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Monetization Model</label>
              <Textarea
                name="monetization"
                defaultValue={research?.monetization ?? ""}
                placeholder="Freemium, usage-based, flat subscription, per-seat..."
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Competitors */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Competitors (JSON)</label>
          <Textarea
            name="competitors"
            defaultValue={
              research?.competitors
                ? JSON.stringify(research.competitors, null, 2)
                : '[{"name": "", "url": "", "pricing": "", "strengths": "", "weaknesses": ""}]'
            }
            placeholder='[{"name": "Competitor", "url": "...", "pricing": "...", "strengths": "...", "weaknesses": "..."}]'
            rows={4}
            className="font-mono text-xs"
          />
        </div>

        {/* Reddit & Other Signals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reddit / Community Threads</label>
            <Textarea
              name="reddit_threads"
              defaultValue={research?.redditThreads ?? ""}
              placeholder="Links and notes from Reddit, HN, forums..."
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Other Validation Signals</label>
            <Textarea
              name="other_signals"
              defaultValue={research?.otherSignals ?? ""}
              placeholder="Google Trends, keyword volume, waitlist signups, DMs..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save Research"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="h-8 px-4 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  // View mode
  return (
    <div className="space-y-6">
      {/* Progress bar + verdict */}
      <div className="flex items-center justify-between">
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
        <button
          onClick={() => setEditing(true)}
          className="h-8 px-4 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
        >
          Edit Research
        </button>
      </div>

      {/* Checklist */}
      <div className="p-4 rounded-lg border border-border bg-card">
        <h3 className="text-sm font-semibold mb-3">Research Checklist</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CHECKLIST.map((item) => {
            let filled = false;
            if (research) {
              if (item.key === "interviewCount") filled = (research.interviewCount ?? 0) >= 5;
              else if (item.key === "competitors") filled = getCompetitors(research).length > 0;
              else {
                const val = research[item.key as keyof typeof research];
                filled = typeof val === "string" ? val.length > 0 : false;
              }
            }
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

      {/* Research content */}
      {research ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {research.problemStatement && (
              <Section title="Problem Statement" content={research.problemStatement} />
            )}
            {research.targetAudience && (
              <Section title="Target Audience" content={research.targetAudience} />
            )}
            {research.existingSolutions && (
              <Section title="Existing Solutions" content={research.existingSolutions} />
            )}
          </div>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Stat label="Interviews" value={String(research.interviewCount ?? 0)} />
              <Stat label="Waitlist" value={String(research.waitlistCount ?? 0)} />
            </div>
            {research.interviewNotes && (
              <Section title="Interview Notes" content={research.interviewNotes} />
            )}
            {research.marketSize && (
              <Section title="Market Size" content={research.marketSize} />
            )}
            {research.monetization && (
              <Section title="Monetization" content={research.monetization} />
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm mb-3">
            No research data yet. Start by defining the problem you want to solve.
          </p>
          <button
            onClick={() => setEditing(true)}
            className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
          >
            Start Research
          </button>
        </div>
      )}

      {/* Competitors table */}
      {research && getCompetitors(research).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Competitors</h3>
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
      {(research?.redditThreads || research?.otherSignals) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {research.redditThreads && (
            <Section title="Reddit / Community Threads" content={research.redditThreads} />
          )}
          {research.otherSignals && (
            <Section title="Other Signals" content={research.otherSignals} />
          )}
        </div>
      )}

      {/* Verdict section */}
      {(projectStatus === "research" && canVerdict) && (
        <div className="p-4 rounded-lg border border-dashed border-violet-500/40 bg-violet-500/5 space-y-3">
          <h3 className="text-sm font-semibold">Ready to decide?</h3>
          <p className="text-xs text-muted-foreground">
            You&apos;ve completed {progress.done}/{progress.total} research items. Make a verdict to move forward.
          </p>
          <VerdictButtons projectId={projectId} slug={slug} />
        </div>
      )}

      {/* Show verdict if already decided */}
      {research?.verdict && research.verdict !== "pending" && (
        <div className={`p-4 rounded-lg border ${VERDICT_CONFIG[research.verdict]?.color ?? ""}`}>
          <div className="flex items-center gap-2 mb-1">
            <span>{VERDICT_CONFIG[research.verdict]?.icon}</span>
            <span className="text-sm font-semibold">
              Verdict: {VERDICT_CONFIG[research.verdict]?.label}
            </span>
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
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
      <p className="text-sm whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card text-center min-w-[80px]">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function VerdictButtons({ projectId, slug }: { projectId: string; slug: string }) {
  const [showReason, setShowReason] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (showReason) {
    return (
      <form
        action={(fd) => {
          startTransition(async () => {
            await setVerdict(fd);
            setShowReason(null);
          });
        }}
        className="flex gap-2 items-end"
      >
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="verdict" value={showReason} />
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium">Reason</label>
          <Input name="verdict_reason" placeholder="Why this decision?" required />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setShowReason(null)}
          className="h-8 px-4 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setShowReason("go")}
        className="h-8 px-4 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
      >
        🚀 Go — Start Building
      </button>
      <button
        onClick={() => setShowReason("pivot")}
        className="h-8 px-4 rounded-lg bg-yellow-600 text-white text-sm font-medium hover:bg-yellow-700 transition-colors"
      >
        🔄 Pivot
      </button>
      <button
        onClick={() => setShowReason("kill")}
        className="h-8 px-4 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
      >
        💀 Kill
      </button>
    </div>
  );
}
