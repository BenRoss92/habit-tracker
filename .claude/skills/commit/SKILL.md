---
description: Stage and commit the current changes. Only invoke this explicitly as /commit — never automatically.
disable-model-invocation: true
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git branch *) Bash(git checkout *) Bash(git add *) Bash(git commit *)
---

## Current state

- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Staged diff: !`git diff --cached`
- Unstaged diff: !`git diff`

## Instructions

1. If there are no staged or unstaged changes above, say so and stop. Do not create an empty commit.
2. If the current branch is `main` or `master`, create and check out a new feature branch first (`git checkout -b <name>`), with a short kebab-case name describing the change (e.g. `add-streak-badge-colors`). This repo's `PreToolUse` hook blocks `git commit` directly on `main`/`master`, so branch first rather than hitting that block. If already on a feature branch, skip this step and commit there.
3. Review the diff for anything that looks like a secret (API key, token, credential, `.env` contents) before staging. If found, stop and flag it instead of committing it.
4. Stage the relevant files by name — `git add <file> <file> ...`, never `git add -A` or `git add .` — then run `git status` again to confirm exactly what's staged.
5. Write the commit message in two parts:
   - **Title**, in [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format: `<type>[optional scope]: <description>`. Type is one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`, chosen from what's actually in the diff — not guessed. Add a scope only when genuinely clarifying (e.g. `hooks`, `docs`); omit it otherwise.
   - **Body** — As this is a portfolio project, I would like to explain commits in more detail than I might otherwise need to, so go further than a typical terse commit. For any commit reflecting a real implementation or design choice, write a body covering **what** the change does, **how** it does it, and **why** that approach was chosen over alternatives. For genuinely mechanical commits (a typo fix, a dependency bump, a one-line config tweak), skip the body and keep just the title — a full breakdown there would look padded rather than substantive.
   - Add a `BREAKING CHANGE:` footer only for an actual breaking change. Do not add a `Co-Authored-By` trailer — this repo's existing commits don't use one.
6. Commit with the message via a HEREDOC for correct multi-line formatting:
   ```bash
   git commit -m "$(cat <<'EOF'
   <type>[scope]: <title>

   <body, if any>
   EOF
   )"
   ```
7. Never run `git push` — that's a separate step, handled by `/push-pr`.
