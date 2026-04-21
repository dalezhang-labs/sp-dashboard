import Link from "next/link";
import { db } from "@/lib/db";
import { projects } from "@/lib/schema";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchTrigger } from "@/components/search-trigger";
import type { Project } from "@/lib/schema";

const STATUS_LABELS: Record<string, string> = {
  idea: "Idea",
  building: "Building",
  live: "Live",
  archived: "Archived",
};

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  building: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  live: "bg-green-500/20 text-green-400 border-green-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

function countdown(deadline: Date | null): string | null {
  if (!deadline) return null;
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return "Overdue";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days}d left`;
}

function ProjectCard({ project }: { project: Project }) {
  const cd = countdown(project.deadline4w);
  return (
    <Link href={`/projects/${project.slug}`}>
      <Card className="bg-card border-border hover:border-muted-foreground/40 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold leading-tight">
              {project.name}
            </CardTitle>
            <Badge
              variant="outline"
              className={`shrink-0 text-xs ${STATUS_COLORS[project.status] ?? ""}`}
            >
              {STATUS_LABELS[project.status] ?? project.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}
          {project.techStack && project.techStack.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.techStack.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {cd && (
            <p
              className={`text-xs font-medium ${cd === "Overdue" ? "text-red-400" : "text-orange-400"}`}
            >
              ⏱ {cd}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function ProjectGrid({ items }: { items: Project[] }) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No projects here yet.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((p) => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </div>
  );
}

export default async function HomePage() {
  const all = await db.select().from(projects).orderBy(projects.createdAt);

  const byStatus = (status: string) => all.filter((p) => p.status === status);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">SP Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {all.length} project{all.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SearchTrigger />
          <Link
            href="/kiro"
            className={buttonVariants({ variant: "outline" })}
          >
            ⚡ Kiro Tasks
          </Link>
          <Link href="/projects/new" className={buttonVariants()}>
            + 新想法
          </Link>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All ({all.length})</TabsTrigger>
          <TabsTrigger value="idea">
            Idea ({byStatus("idea").length})
          </TabsTrigger>
          <TabsTrigger value="building">
            Building ({byStatus("building").length})
          </TabsTrigger>
          <TabsTrigger value="live">Live ({byStatus("live").length})</TabsTrigger>
          <TabsTrigger value="archived">
            Archived ({byStatus("archived").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ProjectGrid items={all} />
        </TabsContent>
        <TabsContent value="idea">
          <ProjectGrid items={byStatus("idea")} />
        </TabsContent>
        <TabsContent value="building">
          <ProjectGrid items={byStatus("building")} />
        </TabsContent>
        <TabsContent value="live">
          <ProjectGrid items={byStatus("live")} />
        </TabsContent>
        <TabsContent value="archived">
          <ProjectGrid items={byStatus("archived")} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
