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
        <h1 className="text-xl font-bold">New Project</h1>
      </div>

      <form action={createProject} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Name <span className="text-destructive">*</span>
          </label>
          <Input id="name" name="name" required placeholder="My awesome project" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            placeholder="What is this project about?"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue="idea"
            className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="idea">Idea</option>
            <option value="building">Building</option>
            <option value="live">Live</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="tech_stack" className="text-sm font-medium">
            Tech Stack
          </label>
          <Input
            id="tech_stack"
            name="tech_stack"
            placeholder="Next.js, Postgres, Tailwind (comma-separated)"
          />
          <p className="text-xs text-muted-foreground">Separate with commas</p>
        </div>

        <button
          type="submit"
          className="w-full h-8 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
        >
          Create Project
        </button>
      </form>
    </main>
  );
}
