# SP Dashboard — 实现计划

## 目标
用 Next.js 15 + Tailwind 构建一个 side-project 管理面板，部署到 Vercel。
直连 Neon 数据库（不走独立 backend），快速上线验证。

## 技术栈
- **框架**: Next.js 15 (App Router)
- **样式**: Tailwind CSS + shadcn/ui
- **数据库**: Neon PostgreSQL（直连，用 `@neondatabase/serverless`）
- **ORM**: Drizzle ORM
- **部署**: Vercel

## 数据库 Schema（Neon `core` schema）

```sql
-- schema: core
CREATE TABLE core.projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'idea',  -- idea | building | live | archived
  tech_stack  TEXT[],
  started_at  TIMESTAMPTZ,
  launched_at TIMESTAMPTZ,
  deadline_4w TIMESTAMPTZ,  -- 4周窗口截止
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE core.project_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES core.projects(id) ON DELETE CASCADE,
  note       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 页面结构

```
/                    → 项目列表（所有卡片 + 快速添加）
/projects/new        → 新建项目表单
/projects/[slug]     → 项目详情（描述、进度日志、4周倒计时）
```

## 功能需求

### 项目列表页（/）
- 按状态分组展示项目卡片（idea / building / live / archived）
- 每张卡片显示：名称、状态 badge、描述摘要、4周窗口倒计时（如有）
- 右上角「+ 新想法」按钮 → 跳转 /projects/new
- 状态筛选 tab

### 新建项目（/projects/new）
- 字段：名称、描述、技术栈（多选 tag）、状态
- 提交后自动生成 slug，跳回列表页

### 项目详情（/projects/[slug]）
- 顶部：名称、状态（可切换）、4周倒计时 badge
- 中间：描述（可编辑）、技术栈 tags
- 底部：进度日志列表 + 新增日志输入框（时间线样式）

## 样式风格
- 深色系（dark mode 为主）
- 简洁卡片式布局
- 状态颜色：idea=蓝、building=黄、live=绿、archived=灰

## 初始化步骤（请按顺序执行）

1. 初始化 Next.js 项目：
   ```
   npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
   ```

2. 安装依赖：
   ```
   npm install @neondatabase/serverless drizzle-orm
   npm install -D drizzle-kit
   npx shadcn@latest init
   npx shadcn@latest add button card badge input textarea select tabs
   ```

3. 配置环境变量（.env.local）：
   ```
   DATABASE_URL=<从 Neon MCP 获取连接串，使用已有 project，创建 core schema>
   ```

4. 用 Neon MCP 创建表（执行上方 SQL）

5. 按页面结构实现功能

6. 提交所有代码，push 到 dalezhang-labs/sp-dashboard

## 注意事项
- .env.local 不要提交到 git（加入 .gitignore）
- 所有数据库操作用 server action 或 route handler（不要在客户端直连 DB）
- 每完成一个功能就 git commit 一次
