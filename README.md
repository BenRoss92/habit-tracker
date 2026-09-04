# Habit Tracker

A habit tracking web app for building and maintaining daily habits, tracking streaks and completion stats.

## Tech stack

Next.js 16, React, TypeScript, Tailwind CSS, Supabase (PostgreSQL), Jest, React Testing Library, GitHub Actions, Vercel

## AI tooling

Built using Claude Code and the Context7 MCP server for up-to-date, version-specific library documentation during development.

## Live demo

[habit-tracker-eta-gold.vercel.app](https://habit-tracker-eta-gold.vercel.app)

## How to run locally

Requires the following to be installed: Node 24 (see `.nvmrc`) and [pnpm](https://pnpm.io) (version pinned in `package.json`'s `packageManager` field - `corepack enable` will pick it up automatically).

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/BenRoss92/habit-tracker.git
   cd habit-tracker
   pnpm install
   ```
2. Create a [Supabase](https://supabase.com) project for the database, then copy `.env.local.example` to `.env.local` and fill in your project's URL and publishable key (Project Settings → API):
   ```bash
   cp .env.local.example .env.local
   ```
3. Apply the database schema in `supabase/migrations/` to your Supabase project's database (via the SQL editor or the Supabase CLI).
4. Start the dev server:
   ```bash
   pnpm dev
   ```
   The app runs at [localhost:3000](http://localhost:3000).

Other useful commands: `pnpm test`, `pnpm lint`, `pnpm tsc --noEmit` (checking for compilation errors), `pnpm build`.

## Development approach

Built using TDD, BDD, Vertical Slice Delivery and Claude Code.

### TDD and BDD

Tests were written before implementation (TDD). Component tests were written in a BDD style - describing behaviour from the user's perspective rather than implementation details - using explicit Given/When/Then naming in nested `describe`/`it` blocks, e.g.:

```ts
describe("given an error occurred", () => {
  describe("when the user clicks 'Try again'", () => {
    it("then tries again", async () => { ... });
  });
});
```

This applies to component/UI tests, which describe end-user-observable behaviour. Data-layer tests (e.g. `fetchHabits()`'s success/failure contract) are plain descriptive unit tests instead, since their caller is other code, not an end user.

Test coverage (as of 4th Sep 2026): 186 tests across 20 suites, 99.75% statement coverage, 98.89% branch coverage and 100% function coverage. Run `pnpm test -- --coverage` for current numbers.

### Vertical Slice Delivery

A software delivery practice where each feature is built as a thin slice, cutting through all layers of the stack - e.g. from UI through to the business logic and to the database - so that the feature is immediately usable by an end user. This is distinct from Vertical Slice Architecture, which is about how code is organised.

Benefits include reduced project risk, shorter feedback loops, faster delivery of value to end users and no unnecessary code (eliminating waste).

### AI-assisted development with Claude Code

This project was built using Claude Code, applying practices covered in Anthropic's Claude Code 101 course:

**Workflow & practices**

- An Explore → Plan → Code → Commit workflow for each feature, using Plan Mode to draft and review a plan before any code was generated
- A `CLAUDE.md` file capturing project conventions, stack decisions and recurring gotchas, so context didn't need rediscovering each session
- Custom Skills (e.g. commit and push/PR skills) built to replace a deprecated course command, scoped for a solo-repo workflow
- Git-safety and formatting hooks (blocking direct commits to `main`, auto-running Prettier) for behaviour that had to run every time, not just when prompted
- Context management via `/compact` between features and `/clear` when starting unrelated work, to keep sessions focused

**Critical review, not blind acceptance**

- Reviewed and corrected AI-generated code rather than accepting it as-is - e.g. simplified an over-engineered form-editing implementation once a simpler pattern (`useState` instead of `useActionState`) was confirmed to work just as well
- Used GitHub Copilot to independently walk through Claude-generated code line by line before staging/committing, as an extra comprehension and correctness check
- Made explicit engineering trade-off calls with Claude as a sounding board rather than default acceptance - e.g. deciding against optimistic UI updates for habit toggling in favour of a simpler non-optimistic pattern, and choosing Zod server-side validation over redundant client-side HTML validation
