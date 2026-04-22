import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "./actions";

export default function NewProjectPage() {
  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          ← Back
        </Link>
        <h1 className="text-xl font-bold">New Side Project</h1>
      </div>

      <div className="p-3 rounded-lg border border-violet-500/30 bg-violet-500/5 mb-6">
        <p className="text-xs text-violet-400">
          💡 New projects start in <strong>Research</strong> phase. Define the problem first, validate demand, then decide whether to build.
        </p>
      </div>

      <form action={createProject} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Project Name <span className="text-destructive">*</span>
          </label>
          <Input id="name" name="name" required placeholder="e.g. ReviewPilot" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm font-medium">
            One-liner
          </label>
          <Input
            id="description"
            name="description"
            placeholder="What does it do in one sentence?"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="problem" className="text-sm font-medium">
            Problem Statement
          </label>
          <Textarea
            id="problem"
            name="problem_statement"
            rows={3}
            placeholder="Who has what pain? e.g. 'Amazon sellers spend 2hrs/day manually responding to reviews because...'"
          />
          <p className="text-xs text-muted-foreground">
            This kicks off your research. Be specific about who and what.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="tech_stack" className="text-sm font-medium">
            Tech Stack (optional)
          </label>
          <Input
            id="tech_stack"
            name="tech_stack"
            placeholder="Next.js, Postgres, Tailwind (comma-separated)"
          />
        </div>

        <button
          type="submit"
          className="w-full h-8 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
        >
          Create & Start Research
        </button>
      </form>
    </main>
  );
}
