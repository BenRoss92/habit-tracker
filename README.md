# Habit Tracker

A habit tracking web app for building and maintaining daily habits, tracking streaks and completion stats.

## Tech stack

Next.js 16, React, TypeScript, Tailwind CSS, Supabase (PostgreSQL), Jest, React Testing Library, GitHub Actions, Vercel

## AI tooling

Built using Claude Code and the Context7 MCP server for up-to-date, version-specific library documentation during development.

## Live demo

_Coming soon_

## How to run locally

_Coming soon_

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
