# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A habit tracking web app for building and maintaining daily habits, tracking streaks and completion stats. Tech stack per README.md: Next.js, React, TypeScript, Tailwind CSS, Supabase (PostgreSQL), Jest, React Testing Library, GitHub Actions, Vercel.

Development approach (from README.md): built using TDD (tests written before implementation) and BDD-style component tests (describing behavior from the user's perspective, not implementation details), delivered as vertical slices — each feature cut through the full stack (UI → business logic → database) so it's immediately usable, rather than built layer-by-layer.

**Current state:** Supabase and Jest/RTL are set up. `src/app/page.tsx` fetches and displays habits from Supabase via `HabitList`, with `error.tsx`/`loading.tsx` boundaries. No habit creation/editing/deletion, streaks, or CI setup exists yet.

## Commands

Use pnpm for all package management and script execution — this project does not use npm or yarn (`packageManager` field in package.json; a `pnpm-workspace.yaml` exists but defines no workspace packages, only `allowBuilds` overrides).

- `pnpm dev` — start the dev server
- `pnpm build` — production build
- `pnpm start` — run the production build
- `pnpm lint` — run ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next`'s core-web-vitals + typescript configs)
- `pnpm tsc --noEmit` — type check without emitting output
- `pnpm test` — run the Jest test suite
- `pnpm test:watch` — run Jest in watch mode

## Architecture

- App Router, `src/` layout. Import alias `@/*` maps to `./src/*` (tsconfig.json).
- TypeScript strict mode is always on (`strict: true` in tsconfig.json) — do not weaken this or add `any` escape hatches to get around it.
- Tailwind CSS v4 is used for all styling; do not use inline `style` props or separate CSS files/modules except `src/app/globals.css` for the Tailwind import and theme tokens. Configured via the `@tailwindcss/postcss` PostCSS plugin (no `tailwind.config.js` — v4 uses CSS-based `@theme` config directly in `src/app/globals.css`).
- `AGENTS.md` in the repo root is auto-generated and rewritten by `next dev` itself (Next.js 16 behavior, not a Claude Code artifact) — it will reappear even if deleted. It notes that this Next.js version has breaking changes vs. older training data and points to `node_modules/next/dist/docs/` for the current APIs/conventions before writing framework code.

## MCP servers

The Context7 MCP server is configured at the user scope (`~/.claude/`) and not committed to this repo as it's a documentation lookup tool that can and should be used across any projects, not just for this project. Use it for current Next.js/React/Supabase/Tailwind API details instead of relying on training data (see the global rule at `~/.claude/rules/context7.md` for exactly when).
