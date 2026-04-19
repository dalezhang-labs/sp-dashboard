import { pgSchema, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const coreSchema = pgSchema("core");

export const projects = coreSchema.table("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  status: text("status").notNull().default("idea"),
  techStack: text("tech_stack").array(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  launchedAt: timestamp("launched_at", { withTimezone: true }),
  deadline4w: timestamp("deadline_4w", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const projectLogs = coreSchema.table("project_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type ProjectLog = typeof projectLogs.$inferSelect;
