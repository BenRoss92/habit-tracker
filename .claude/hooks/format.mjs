#!/usr/bin/env node
// PostToolUse hook: runs Prettier on whatever file Claude Code just edited/wrote.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const prettierBin = join(process.cwd(), "node_modules", ".bin", "prettier");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let filePath;
  try {
    ({
      tool_input: { file_path: filePath },
    } = JSON.parse(input));
  } catch {
    process.exit(0);
  }

  if (!filePath || !existsSync(filePath)) process.exit(0);
  if (!existsSync(prettierBin)) process.exit(0); // Prettier not installed — nothing to do

  try {
    execFileSync("pnpm", ["exec", "prettier", "--write", "--ignore-unknown", filePath], {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (err) {
    process.stderr.write(
      `prettier format hook failed for ${filePath}:\n${err.stderr ?? err.message}\n`,
    );
  }
});
