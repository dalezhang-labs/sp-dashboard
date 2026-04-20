import { pgSchema, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";

export const coreSchema = pgSchema("core");

export const projects = coreSchema.table("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  status: text("status").notNull().default("idea"),
  techStack: text("tech_stack").array(),
  githubUrl: text("github_url"),
  deployUrl: text("deploy_url"),
  nextAction: text("next_action"),
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
  logType: text("log_type").notNull().default("note"), // note | milestone | decision | blocker
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const projectTasks = coreSchema.table("project_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("medium"),
  category: text("category"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const projectContext = coreSchema.table("project_context", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  key: text("key").notNull(),
  value: text("value").notNull(),
  category: text("category").notNull().default("general"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type ProjectLog = typeof projectLogs.$inferSelect;
export type ProjectTask = typeof projectTasks.$inferSelect;
export type ProjectContext = typeof projectContext.$inferSelect;
