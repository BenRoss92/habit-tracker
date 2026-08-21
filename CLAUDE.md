# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A habit tracking web app for building and maintaining daily habits, tracking streaks and completion stats. Tech stack per README.md: Next.js, React, TypeScript, Tailwind CSS, Supabase (PostgreSQL), Jest, React Testing Library, GitHub Actions, Vercel.

Development approach (from README.md): built using TDD (tests written before implementation) and BDD-style component tests (describing behavior from the user's perspective, not implementation details), delivered as vertical slices — each feature cut through the full stack (UI → business logic → database) so it's immediately usable, rather than built layer-by-layer.

**Current state:** Supabase and Jest/RTL are set up. `src/app/page.tsx` fetches habits and renders `HabitsSection` (the stateful orchestrating component - `AddHabitButton`, `AddHabitForm`, `HabitList`), with `error.tsx`/`loading.tsx` boundaries. Habit creation exists and is styled to match the design (`AddHabitForm` via `tailwind-variants`). Habit editing/deletion and streaks don't exist yet.

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

## Design

Visual design reference: `docs/design/`, generated externally and kept in sync over time as the design evolves. Consult these before/when building or styling UI-facing features:

- `design.md` — a structured written spec (colour palette, typography, layout measurements, and per-state property tables) covering the whole app. Usually the fastest place to look up a specific value.
- `habit-tracker-main.html` — a static HTML/CSS mockup of the main dashboard: header, day strip, habit cards, stats row. A full standalone `<!DOCTYPE html>` document, safe to open directly in a browser.
- `add-habit-form-states.html` — a static HTML/CSS mockup of the add-habit form's three states: idle, validation error, submission pending. Also a full standalone document.

None of these are code to reuse directly — they're visual targets only, and the two HTML mockups predate this project's actual Tailwind v4 setup (`src/app/globals.css`'s CSS-based `@theme` config), so translate their colors/spacing/layout intent into this project's own Tailwind classes rather than copying inline CSS wholesale. Both mockups load Nunito and the Tabler Icons webfont from a CDN so they render correctly when opened standalone (see `docs/decisions.md`) — the app itself doesn't link to either CDN, so don't carry that pattern into real code: self-host Nunito via `next/font/google` (below), and use `@tabler/icons-react` components (e.g. `IconPlus`, `IconLoader2`) for icons, not the webfont link or hand-copied inline SVG.

The app's typeface is Nunito (Google Fonts, weights 400/500/600/700), matching the design — wire it up via `next/font/google` when building UI, not the mockups' CDN `<link>` (see `docs/decisions.md`).

## MCP servers

The Context7 MCP server is configured at the user scope (`~/.claude/`) and not committed to this repo as it's a documentation lookup tool that can and should be used across any projects, not just for this project. Use it for current Next.js/React/Supabase/Tailwind API details instead of relying on training data (see the global rule at `~/.claude/rules/context7.md` for exactly when).

## Continuous integration

`.github/workflows/ci.yml` runs lint + format check, `tsc --noEmit`, `jest`, and a full `pnpm build` on every pull request into `main`. It can be run locally, before pushing, with the `act` CLI (installed via Homebrew) — `act pull_request --var-file .env.local` to simulate the trigger that opens a PR, with the build step's `vars.NEXT_PUBLIC_SUPABASE_URL`/`vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` populated from the same `.env.local` already used for `pnpm dev` (act reads `--var-file` in plain dotenv format, so no separate file is needed). See `docs/decisions.md`'s "Continuous integration" section for why the workflow and the Node-version pinning around it are set up the way they are.
