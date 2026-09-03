---
description: Checks whether the current changes look right on mobile vs desktop before merging - loads the app at a narrow width and a wide width bracketing this diff's actual Tailwind breakpoints, screenshots and measures key elements at each, and flags anything that changed unexpectedly (text wrapping that shouldn't happen, elements squished or overlapping, unexpected height changes). Findings only, nothing is auto-fixed. Only invoke this explicitly as /mobile-check — never automatically; run it before merging, alongside /review.
disable-model-invocation: true
allowed-tools: Bash(git branch *) Bash(git diff *) Bash(git log *) Bash(curl *) Bash(lsof *) Bash(sleep *) Bash(pnpm dev*) Bash(export PATH=*) mcp__claude-in-chrome__tabs_context_mcp mcp__claude-in-chrome__tabs_create_mcp mcp__claude-in-chrome__tabs_close_mcp mcp__claude-in-chrome__navigate mcp__claude-in-chrome__resize_window mcp__claude-in-chrome__computer mcp__claude-in-chrome__javascript_tool
---

## Current state

- Branch: !`git branch --show-current`
- Commits ahead of main: !`git log main..HEAD --oneline`
- Working tree status: !`git status --short`
- Diff vs main, changed files: !`git diff main...HEAD --stat 2>/dev/null`
- Uncommitted diff, changed files: !`git diff --stat 2>/dev/null; git diff --cached --stat 2>/dev/null`
- Dev server at localhost:3000: !`curl -s -o /dev/null -w "responding (HTTP %{http_code})" http://localhost:3000 2>/dev/null || echo "not responding"`

## Instructions

This checks the _visual, responsive_ behaviour of what's about to be merged - not code correctness, docs, or tests (that's `/review`). Nothing here gets fixed automatically; report findings and let the user decide.

1. If there are no commits ahead of `main` and no staged/unstaged changes (see "Current state" above), say so and stop - there's nothing to check.

2. **Get the real diff** (`git diff main...HEAD`, plus `git diff` / `git diff --cached` for anything uncommitted) and read the changed files - don't rely on anything claimed earlier in the conversation about what changed.

3. **Make sure the dev server is actually up.** If "Current state" above shows it's not responding, start it in the background (`pnpm dev`), then poll `curl http://localhost:3000` every couple of seconds (up to ~15s) until it responds before continuing - don't just assume it started. If any command fails with a `dyld` / library-not-found error mentioning `/usr/local/Cellar/node`, that's this machine's broken Homebrew Node shadowing the correct nvm-managed one - prepend the nvm Node bin dir to `PATH` (`export PATH="$(ls -d ~/.nvm/versions/node/*/bin | sort -V | tail -1):$PATH"`) and retry. Leave the server running afterward either way - don't kill it.

4. **Decide which widths actually matter for this diff.** Grep the changed files for Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) actually in use. This project uses Tailwind's default breakpoint scale with no custom overrides (no `tailwind.config.js`, nothing under `@theme` in `globals.css` redefines them), so: `sm:`=640px, `md:`=768px, `lg:`=1024px, `xl:`=1280px, `2xl:`=1536px. For every distinct prefix found, plan to test one width just below it and one comfortably above it. **Also always test a plain 375px (mobile) vs. 1280px (desktop) pair regardless of what the grep finds** - a responsive _regression_ (something that used to adapt correctly and silently stopped) won't show up as a new breakpoint prefix in the diff, since the code that should have one just doesn't.

5. **For each width, narrowest to widest:**
   - Load the browser tools if not already loaded this session (`ToolSearch` for `mcp__claude-in-chrome__tabs_context_mcp`, `navigate`, `resize_window`, `computer`, `javascript_tool`, plus `tabs_create_mcp`/`tabs_close_mcp`), then get tab context and create a tab if needed.
   - Resize the window to the target width, **then immediately verify it actually took effect** by reading `window.innerWidth` via `javascript_tool` - this resize tool has been observed to silently leave the viewport at a stale width from a previous call. If the reported width doesn't land within ~20px of what was requested (allowing for scrollbars), retry the resize once. If it still doesn't match, don't report findings against that width as if the check succeeded - note in the final report that this specific width couldn't be reliably tested.
   - Navigate to the relevant page (or reload if already there).
   - Take a screenshot.
   - Capture `getBoundingClientRect()` (via `javascript_tool`) for the page's key structural elements - the direct children of the main content container, plus anything else obviously structural for this diff (headings, buttons, list items, the components actually touched by the diff from step 2). This gives an actual measurement to compare, not just a visual impression, which matters: screenshot compression and small-scale rendering can flatten real differences into looking identical, or make identical things look different.

6. **Compare the results across widths** (narrowest vs. widest at minimum, plus any breakpoint-specific pairs from step 4). Flag, specifically:
   - Text that wraps at one width but not another where nothing about the content itself changed - unless it's an expected, intentional consequence of the width difference (a long name wrapping onto more lines on a narrower card is fine; a short label suddenly breaking mid-word is not).
   - Any element whose height changed disproportionately more than its width did between the two widths.
   - Elements sitting close enough together to visually touch or overlap at one width but not the other.
   - Anything that reads as unexpectedly narrow or cramped relative to its own content at one width but not the other.

7. **Report findings** the same way `/review` does: state plainly which widths were actually tested (and which, if any, couldn't be reliably tested per step 5), what was found at each, and let the user decide what to change. Don't fix anything automatically.

8. If run as part of a pre-merge routine, mention `/review` as the companion check for everything this skill doesn't cover (docs, code quality, tests).
