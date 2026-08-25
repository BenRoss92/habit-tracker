"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const MAX_CHARACTERS = 75;

const createHabitSchema = z
  .string()
  .trim()
  .min(1, "Habit name cannot be empty")
  .max(MAX_CHARACTERS, `Habit name must be ${MAX_CHARACTERS} characters or less`);

const updateHabitSchema = z.object({
  id: z.uuid("Invalid ID format"),
  name: z
    .string()
    .trim()
    .min(1, "Habit name cannot be empty")
    .max(MAX_CHARACTERS, `Habit name must be ${MAX_CHARACTERS} characters or less`),
});

export interface State {
  message?: string;
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
      message: validated.error.issues[0].message,
    };
  }

  // Get the sanitised habit name
  const validatedHabitName = validated.data;

  // Wrap in a try/catch in case there's a network error
  try {
    const { error } = await supabase.from("habits").insert({ name: validatedHabitName });

    if (error) {
      console.error("Database error: Failed to save habit", error);
      return {
        message: "Database error: Failed to save habit",
      };
    }
  } catch (error) {
    console.error("Database error: An unexpected error occurred", error);
    return {
      message: "Database error: An unexpected error occurred",
    };
  }

  // Revalidate the cache for the homepage to have Next.js return the latest list of habits
  revalidatePath("/");

  // Explicitly return an empty object with no error message inside of it to remove the need for
  // having to check a nullable value first before checking whether an error message exists inside
  // of the object.
  return {};
}

export async function updateHabit(habitId: string, habitName: string): Promise<State> {
  const supabase = createServerClient();

  const validated = updateHabitSchema.safeParse({ id: habitId, name: habitName });

  if (!validated.success) {
    return {
      // Even though we're validating both the habit ID and habit name, the user can only enter a
      // habit name through the UI, not the habit ID. So likely the only error message that will
      // get seen, and the only one that a user would care about, is if the habit name was invalid.
      message: validated.error.issues[0].message,
    };
  }

  const { name, id } = validated.data;

  try {
    const { error } = await supabase.from("habits").update({ name: name }).eq("id", id);

    if (error) {
      console.error("Database error: Failed to update habit", error);

      return {
        message: "Database error: Failed to update habit",
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
