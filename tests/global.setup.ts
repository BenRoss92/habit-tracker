import { test as setup } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { promisify } from "util";
import { exec } from "child_process";

setup("reset database", async ({}) => {
  // Load .env.test into the process's environment
  const projectDir = process.cwd();
  loadEnvConfig(projectDir);

  const execPromise = promisify(exec);

  // Start Supabase if it hasn't been started already
  const { stdout: startStdout, stderr: startStderr } = await execPromise("npx supabase start");

  if (startStdout) {
    console.log(startStdout);
  }

  if (startStderr) {
    console.error(startStderr);
  }

  console.log("Supabase database started successfully");

  // Run npx supabase db reset (via Node's child_process) — this is the Supabase CLI's real command
  // for "wipe the local stack and reapply migrations from scratch"
  const { stdout, stderr } = await execPromise("npx supabase db reset");

  if (stdout) {
    console.log(stdout);
  }

  if (stderr) {
    console.error(stderr);
  }

  console.log("Supabase database reset successfully");
});
