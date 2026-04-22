-- Add project_research table for demand validation workflow
CREATE TABLE IF NOT EXISTS "core"."project_research" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"problem_statement" text,
	"target_audience" text,
	"existing_solutions" text,
	"competitors" jsonb,
	"interview_count" integer DEFAULT 0,
	"interview_notes" text,
	"waitlist_count" integer DEFAULT 0,
	"reddit_threads" text,
	"other_signals" text,
	"market_size" text,
	"monetization" text,
	"verdict" text,
	"verdict_reason" text,
	"verdict_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "project_research_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
ALTER TABLE "core"."project_research" ADD CONSTRAINT "project_research_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "core"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Migrate existing 'idea' status to 'research'
UPDATE "core"."projects" SET "status" = 'research' WHERE "status" = 'idea';
