"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type State = {
  message?: string;
};

const MAX_CHARACTERS = 75;

const habitNameSchema = z
  .string()
  .trim()
  .min(1, "Habit name cannot be empty")
  .max(MAX_CHARACTERS, `Habit name must be ${MAX_CHARACTERS} characters or less`);

const habitIdSchema = z.uuid("Invalid ID format");

const createHabitSchema = habitNameSchema;

const updateHabitSchema = z.object({
  id: habitIdSchema,
  name: habitNameSchema,
});

const deleteHabitSchema = habitIdSchema;

// Shared by every mutation below: run the Supabase query, log and report a DB error the same
// way regardless of which operation failed, and only revalidate on real success. Extracted once
// create/update/delete all ended up with identical try/catch/error-message shapes, differing
// only in the query itself and the verb in the error message.
async function runHabitMutation(
  // TypeScript compiler complains if we use 'Promise' type, need to use PromiseLike type instead
  // which is less strict. The return type from Supabase doesn't match 'Promise', only
  // 'PromiseLike', as it's missing certain properties in the returned promise that the TypeScript
  // compiler would expect from a native Promise type. Supabase doesn't return a native Promise
  // type, only something that can be used like a Promise.
  operation: () => PromiseLike<{ error: unknown }>,
  actionVerb: string,
): Promise<State> {
  try {
    const { error } = await operation();

    if (error) {
      console.error(`Database error: Failed to ${actionVerb} habit`, error);
      return {
        message: `Database error: Failed to ${actionVerb} habit`,
      };
    }
  } catch (error) {
    console.error("Database error: An unexpected error occurred", error);
    return {
      message: "Database error: An unexpected error occurred",
    };
  }

  revalidatePath("/");

  return {};
}

// Always explicitly return a value. If successful, return an empty object. If unsuccessful, return
// an error message inside of the object. This differentiates when the function is giving back
// something it shouldn't (e.g. undefined) vs us returning somethine expected (a success or an error
// we know about). It also means we can just have one validation check - is 'message' inside of the
// object? - rather than also having to check whether an object is returned back at all and then
// checking whether a message is defined inside of it.
export async function createHabit(habitName: string): Promise<State> {
  // Create a Supabase server instance
  const supabase = createServerClient();

  // Validate whether the string is defined and not empty
  const validated = createHabitSchema.safeParse(habitName);

  // If habit name is not provided
  if (!validated.success) {
    // Return a human readable error message to the user
    return {
      message: validated.error.issues[0]?.message,
    };
  }

  // Get the sanitised habit name
  const validatedHabitName = validated.data;

  return runHabitMutation(
    () => supabase.from("habits").insert({ name: validatedHabitName }),
    "save",
  );
}

export async function updateHabit(habitId: string, habitName: string): Promise<State> {
  const supabase = createServerClient();

  const validated = updateHabitSchema.safeParse({ id: habitId, name: habitName });

  if (!validated.success) {
    return {
      // Even though we're validating both the habit ID and habit name, the user can only enter a
      // habit name through the UI, not the habit ID. So likely the only error message that will
      // get seen, and the only one that a user would care about, is if the habit name was invalid.
      message: validated.error.issues[0]?.message,
    };
  }

  const { name, id } = validated.data;

  return runHabitMutation(
    () => supabase.from("habits").update({ name: name }).eq("id", id),
    "update",
  );
}

export async function deleteHabit(habitId: string): Promise<State> {
  const supabase = createServerClient();

  const validated = deleteHabitSchema.safeParse(habitId);

  if (!validated.success) {
    return {
      message: validated.error.issues[0]?.message,
    };
  }

  const validatedId = validated.data;

  return runHabitMutation(() => supabase.from("habits").delete().eq("id", validatedId), "delete");
}
