#!/usr/bin/env node
// PreToolUse hook: blocks `git commit` while checked out on a protected branch (main/master).

import { execFileSync } from "node:child_process";

const PROTECTED_BRANCHES = new Set(["main", "master"]);
const COMMIT_COMMAND_RE = /(^|[;&|\n])\s*git\s+commit\b/;

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let command;
  try {
    ({
      tool_input: { command },
    } = JSON.parse(input));
  } catch {
    process.exit(0);
  }

  if (!command || !COMMIT_COMMAND_RE.test(command)) process.exit(0);

  let branch;
  try {
    branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    process.exit(0); // not a git repo (or no commits yet) — let Git's own errors handle it
  }

  if (PROTECTED_BRANCHES.has(branch)) {
    process.stderr.write(
      `Blocked: refusing to run "git commit" directly on protected branch "${branch}". Create or switch to a feature branch first (e.g. "git checkout -b <branch-name>"), then commit there.\n`,
    );
    process.exit(2);
  }
});
