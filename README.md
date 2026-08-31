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

### Vertical Slice Delivery

A software delivery practice where each feature is built as a thin slice, cutting through all layers of the stack - e.g. from UI through to the business logic and to the database - so that the feature is immediately usable by an end user. This is distinct from Vertical Slice Architecture, which is about how code is organised.

Benefits include reduced project risk, shorter feedback loops, faster delivery of value to end users and no unnecessary code (eliminating waste).
