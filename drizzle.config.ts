import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "/Users/dizhang/Projects/side-projects/toolmatrix/sp-dashboard/lib/schema.ts",
  out: "/Users/dizhang/Projects/side-projects/toolmatrix/sp-dashboard/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
