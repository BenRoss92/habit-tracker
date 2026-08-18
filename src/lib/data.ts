import { createServerClient } from "./supabase/server";
import { Habit } from "./types";

export async function fetchHabits(): Promise<Habit[]> {
  const supabase = createServerClient();

  try {
    // 'data' is only ever set to null if there is a database error (e.g. syntax error or network
    // interruption). As we're checking for an error, we don't care what value 'data' has if
    // there's an error - we just throw the error. If there are no rows, Supabase returns an empty
    // array.
    const { data, error } = await supabase.from("habits").select();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch habits");
  }
}
