// Using the Supabase database types as the source of truth for the TypeScript types, instead of
// creating additional types that may drift from the database types.
import { Database } from "./database.types";

export type Habit = Database["public"]["Tables"]["habits"]["Row"];
export type Completion = Database["public"]["Tables"]["completions"]["Row"];

// The single action allowed to be open at a time across the whole habits section - only one of
// adding or editing can be active, and for editing, only for one habit.
export type ActiveAction =
  | { type: "none" }
  | { type: "adding" }
  | { type: "editing"; habitId: string }
  | { type: "deleting"; habitId: string };

// Intentionally not turning these Supabase-returned strings into actual UUIDs or Dates as there is
// no need to change or handle these values using TypeScript logic.
// supabase-js returns the created_at timestamptz
// PostgreSQL field as an ISO string
