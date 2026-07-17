# 仓库指南 / Repository Guidelines

## 项目结构与模块组织 / Project Structure & Module Organization
- `src/` 是 Vite + React + TypeScript 应用主目录，包含 `src/components/`、`src/pages/`、`src/hooks/`、`src/context/`、`src/lib/`、`src/data/`、`src/types/` 等。
- `public/` 存放 Vite 直接服务的静态资源（根目录下）。另有 `src/public/` 用于应用内引用的资源。
- `server/` 是基于 Express + TypeScript 的后端服务（入口 `server/src/index.ts`）。
- `supabase/migrations/` 存放数据库迁移文件。
- `scripts/` 存放辅助脚本，如 `scripts/login-testinguser.mjs`。
- `src/` is the main Vite + React + TypeScript app. Key folders: `src/components/`, `src/pages/`, `src/hooks/`, `src/context/`, `src/lib/`, `src/data/`, `src/types/`.
- `public/` holds static assets served by Vite (root). There is also `src/public/` for app-referenced assets.
- `server/` contains the Express + TypeScript backend server (`server/src/index.ts`).
- `supabase/migrations/` tracks database migrations.
- `scripts/` stores helper utilities like `scripts/login-testinguser.mjs`.

## 构建、测试与本地开发命令 / Build, Test, and Development Commands
- `npm install`（或 `pnpm install`）：安装依赖。
- `npm run dev`：启动 Vite 开发服务器。
- `npm run build`：构建生产版本，输出到 `dist/`。
- `npm run preview`：本地预览生产构建。
- `npm run lint`：运行 ESLint，对代码进行静态检查。
- `npm run dev:server`：启动后端 API 服务（默认 http://localhost:4000）。
- `npm install` (or `pnpm install`): install dependencies.
- `npm run dev`: start the Vite dev server.
- `npm run build`: produce a production build in `dist/`.
- `npm run preview`: serve the production build locally.
- `npm run lint`: run ESLint for static code checks.
- `npm run dev:server`: run the backend API server (defaults to http://localhost:4000).

## 编码风格与命名约定 / Coding Style & Naming Conventions
- TypeScript + React，使用 ES 模块；组件以函数式为主，文件为 `.tsx`。
- 缩进为 2 个空格；使用分号（与现有代码一致）。
- 命名：组件用 `PascalCase`，自定义 Hook 用 `useX`，文件名与导出名一致（如 `ItemCard.tsx`）。
- 样式优先使用 Tailwind 实用类，避免不必要的内联样式。
- TypeScript + React with ES modules; prefer functional components in `.tsx`.
- Indentation: 2 spaces; use semicolons (match existing files).
- Naming: components in `PascalCase`, hooks as `useX`, and files matching export names (e.g., `ItemCard.tsx`).
- Styling is Tailwind-first; avoid inline styles unless necessary.

## 测试指南 / Testing Guidelines
- 当前未配置自动化测试框架。
- 变更后请运行 `npm run lint` 并通过 `npm run dev` 进行手动页面验证。
- 若新增测试，建议与源码同目录（如 `src/components/Foo.test.tsx`），并在 `package.json` 中记录新的测试命令。
- No automated test runner is configured yet.
- For changes, rely on `npm run lint` and manual UI verification via `npm run dev`.
- If adding tests, keep them near source (e.g., `src/components/Foo.test.tsx`) and document the new runner in `package.json`.

## 提交与 PR 要求 / Commit & Pull Request Guidelines
- 提交信息以简洁的祈使句为主（如“Add frontend pages”），暂无强制格式。
- PR 需说明变更内容，关联相关 issue（如有），并为 UI 相关改动提供截图或录屏。
- Commit messages are short, imperative summaries (e.g., "Add frontend pages"). No strict convention is enforced.
- PRs should include a clear description, linked issues (if any), and UI screenshots or recordings for visual changes.

## 配置与密钥 / Configuration & Secrets
- 本地 `.env` 需设置：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。
- 测试账号辅助功能使用：`VITE_TEST_EMAIL`、`VITE_TEST_PASSWORD`（见 `src/lib/supabase.ts` 与 `scripts/login-testinguser.mjs`）。
- Create a local `.env` with: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- For test helpers, set `VITE_TEST_EMAIL` and `VITE_TEST_PASSWORD` (see `src/lib/supabase.ts` and `scripts/login-testinguser.mjs`).

## AGENTS.md 用途 / Purpose of AGENTS.md
- 作为贡献指南，帮助新成员快速了解结构、命令、规范和配置。
- 作为 agent 与自动化工具的项目说明入口，减少重复提问。
- Serves as the contributor guide to align structure, commands, conventions, and setup.
- Acts as a project entry point for agents and automation to reduce back-and-forth.
