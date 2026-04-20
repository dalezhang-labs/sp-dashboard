import Link from "next/link";
import { db } from "@/lib/db";
import { projects, projectTasks, projectContext } from "@/lib/schema";
import { ilike, or } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  building: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  live: "bg-green-500/20 text-green-400 border-green-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (!query) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            ← Back
          </Link>
          <h1 className="text-xl font-bold">Search</h1>
        </div>
        <p className="text-muted-foreground text-sm">Enter a search query in the URL: /search?q=your+query</p>
        <p className="text-muted-foreground text-sm mt-2">Or use <kbd className="border border-border rounded px-1.5 py-0.5 text-xs">⌘K</kbd> to open the search dialog.</p>
      </main>
    );
  }

  const pattern = `%${query}%`;

  const [matchedProjects, matchedTasks, matchedContext] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(or(ilike(projects.name, pattern), ilike(projects.description, pattern)))
      .limit(10),
    db
      .select()
      .from(projectTasks)
      .where(or(ilike(projectTasks.title, pattern), ilike(projectTasks.description, pattern)))
      .limit(20),
    db
      .select()
      .from(projectContext)
      .where(or(ilike(projectContext.key, pattern), ilike(projectContext.value, pattern)))
      .limit(20),
  ]);

  const total = matchedProjects.length + matchedTasks.length + matchedContext.length;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          ← Back
        </Link>
        <div>
          <h1 className="text-xl font-bold">Search: &ldquo;{query}&rdquo;</h1>
          <p className="text-sm text-muted-foreground">{total} result{total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {total === 0 && (
        <p className="text-muted-foreground text-sm py-8 text-center">No results found.</p>
      )}

      {matchedProjects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Projects ({matchedProjects.length})
          </h2>
          <div className="space-y-2">
            {matchedProjects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.slug}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-muted-foreground/40 transition-colors"
              >
                <span className="font-medium text-sm">{p.name}</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${STATUS_COLORS[p.status] ?? ""}`}
                >
                  {p.status}
                </Badge>
                {p.description && (
                  <span className="text-xs text-muted-foreground line-clamp-1 flex-1">
                    {p.description}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {matchedTasks.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Tasks ({matchedTasks.length})
          </h2>
          <div className="space-y-2">
            {matchedTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <span className="text-sm">{t.title}</span>
                <Badge variant="outline" className="text-xs">
                  {t.status}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {t.priority}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {matchedContext.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Context ({matchedContext.length})
          </h2>
          <div className="space-y-2">
            {matchedContext.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-mono font-medium">{c.key}</span>
                  <Badge variant="outline" className="text-xs">{c.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{c.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
