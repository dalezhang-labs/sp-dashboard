# SP Dashboard V2 — 项目知识库改进计划

## 核心目标
把 sp-dashboard 从"项目卡片列表"升级为"可检索的项目知识库"，
让 kiro-cli 能在开发前快速获取项目完整上下文，不用反复询问人类。

---

## 问题分析（当前版本的缺失）

当前版本只有：项目卡片 + 状态 + 日志文本

kiro-cli 开发时需要的，但现在拿不到：
1. **结构化任务清单** — 哪些功能做完了？哪些没做？优先级？
2. **技术上下文** — 数据库 schema、文件结构、环境变量列表、部署信息
3. **决策记录** — 为什么选这个技术？有哪些约定？
4. **机器可读 API** — kiro-cli 能直接 curl 拿到 JSON，注入到对话里

---

## 数据库 Schema 新增（Neon core schema）

### 1. project_tasks — 结构化任务（替代模糊日志）
```sql
CREATE TABLE core.project_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES core.projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo',  -- todo | in_progress | done | cancelled
  priority    TEXT NOT NULL DEFAULT 'medium', -- low | medium | high
  category    TEXT,  -- feature | bugfix | devops | design | research
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

### 2. project_context — 技术上下文键值对
```sql
CREATE TABLE core.project_context (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES core.projects(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,   -- e.g. "db_schema", "env_vars", "file_structure", "conventions"
  value       TEXT NOT NULL,   -- markdown 或纯文本
  category    TEXT NOT NULL DEFAULT 'general',  -- tech | decision | convention | reference
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, key)
);
```

### 3. project_logs 保留（改为更结构化）
现有 project_logs 保留，但新增 `log_type` 字段：
```sql
ALTER TABLE core.project_logs ADD COLUMN log_type TEXT DEFAULT 'note';
-- log_type: note | milestone | decision | blocker
```

### 4. projects 表新增字段
```sql
ALTER TABLE core.projects ADD COLUMN github_url TEXT;
ALTER TABLE core.projects ADD COLUMN deploy_url TEXT;
ALTER TABLE core.projects ADD COLUMN next_action TEXT;  -- 当前最重要的下一步（一句话）
```

---

## 新增页面/功能

### A. 项目详情页增强 /projects/[slug]

**现状：** 没有详情页
**新增：**

布局分4个 Tab：
1. **Overview** — 描述、next_action、tech_stack、链接（GitHub/Deploy）、4周倒计时
2. **Tasks** — 任务看板（按 status 分组：todo / in_progress / done），可新增/编辑/拖拽排序
3. **Context** — 技术上下文（db_schema、env_vars、file_structure、conventions 等），Markdown 渲染
4. **Log** — 时间线日志（带类型标签：note/milestone/decision/blocker）

### B. 全局搜索 /search?q=xxx

搜索范围：项目名、描述、任务标题、context 内容
支持快捷键 `Cmd+K` 打开搜索弹窗

### C. API 端点（机器可读，供 kiro-cli 使用）

```
GET /api/projects                    → 所有项目列表（JSON）
GET /api/projects/[slug]             → 单个项目完整上下文（JSON）
GET /api/projects/[slug]/tasks       → 任务列表（按状态分组）
GET /api/projects/[slug]/context     → 所有 context 键值对
GET /api/context?q=xxx               → 全文搜索（跨项目）
```

**最重要的端点：`GET /api/projects/[slug]` 的响应结构**
```json
{
  "project": {
    "name": "...",
    "status": "building",
    "description": "...",
    "next_action": "下一步要做什么",
    "tech_stack": [...],
    "github_url": "...",
    "deploy_url": "...",
    "deadline_4w": "...",
    "days_left": 12
  },
  "tasks": {
    "todo": [...],
    "in_progress": [...],
    "done": [...]
  },
  "context": {
    "db_schema": "...",
    "env_vars": "DATABASE_URL\nNEXT_PUBLIC_...",
    "file_structure": "...",
    "conventions": "...",
    ...
  },
  "recent_logs": [...]
}
```

### D. kiro-cli 快速上下文脚本

在每个项目目录创建 `.kiro/context.sh`：
```bash
#!/bin/bash
# 在开始开发前运行，输出项目上下文给 kiro-cli
curl -s http://localhost:3000/api/projects/SLUG | jq .
```

---

## 文件结构

```
app/
  page.tsx                          (已有，小改)
  layout.tsx                        (已有)
  projects/
    new/                            (已有)
    [slug]/
      page.tsx                      (新增 - Overview tab)
      tasks/
        page.tsx                    (新增 - 或集成到详情 Tab)
      context/
        page.tsx                    (新增)
  search/
    page.tsx                        (新增)
  api/
    projects/
      route.ts                      (新增 GET)
      [slug]/
        route.ts                    (新增 GET)
        tasks/
          route.ts                  (新增 GET/POST/PATCH)
        context/
          route.ts                  (新增 GET/POST/PUT)
    context/
      route.ts                      (新增 - 全文搜索)

lib/
  schema.ts                         (扩展新表)
  db.ts                             (已有)
  utils.ts                          (已有)

components/
  task-board.tsx                    (新增)
  context-editor.tsx                (新增 - markdown 编辑器)
  search-dialog.tsx                 (新增 - Cmd+K 搜索)
  log-timeline.tsx                  (新增)
```

---

## 实现优先级

### Phase 1（核心价值，先做）
1. 数据库 schema 新增（tasks + context + projects 新字段）
2. /projects/[slug] 详情页 - Overview + Tasks tabs
3. GET /api/projects/[slug] API 端点（最关键）

### Phase 2（知识库完整性）
4. Context tab（技术上下文编辑器）
5. Log timeline 改进（加 log_type）
6. GET /api/context?q= 全文搜索 API

### Phase 3（效率提升）
7. Cmd+K 全局搜索弹窗
8. 项目详情 next_action 快速编辑
9. 各项目目录自动生成 .kiro/context.sh

---

## 注意事项
- 所有新 API 端点不需要鉴权（本地工具，不对外）
- context 的 value 字段存 markdown，前端用 react-markdown 渲染
- 任务排序用 sort_order 字段 + 手动拖拽
- 搜索用 PostgreSQL ILIKE，不引入额外搜索引擎
- 所有 DB 操作继续用 server action 或 route handler，不在客户端直连
