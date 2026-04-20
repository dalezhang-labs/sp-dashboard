# SP Dashboard Project Memory

## Purpose
This file stores stable, project-specific operating knowledge for sp-dashboard.
It is the source of truth for recurring development and management details.

## Architecture
- Backend uses Neon + Drizzle.
- Project data is stored in core.projects, core.project_logs, core.project_tasks, and core.project_context.
- Local API endpoints exist for machine-readable access.

## API surface
- GET /api/projects
- GET /api/projects/[slug]
- GET /api/projects/[slug]/tasks
  - GET, POST, PATCH
- GET /api/projects/[slug]/context
  - GET, POST, PUT
- GET /api/context?q=

## Working convention
- Use the API for project updates instead of editing dashboard data manually.
- Store project status, next action, blockers, milestones, and context in the dashboard/project repo, not in persistent assistant memory.
- Keep memory for stable preferences only; keep implementation facts here.

## Current project pattern
- imagelingo updates should be written through /api/projects/imagelingo/context and /api/projects/imagelingo/tasks when needed.
- Project summary fields that are useful to keep current: next_action, blockers, milestones, progress.
