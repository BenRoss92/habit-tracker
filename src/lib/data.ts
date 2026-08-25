import { createServerClient } from "./supabase/server";
import { Habit } from "./types";

export async function fetchHabits(): Promise<Habit[]> {
  const supabase = createServerClient();

  try {
    // 'data' is only ever set to null if there is a database error (e.g. syntax error or network
    // interruption). As we're checking for an error, we don't care what value 'data' has if
    // there's an error - we just throw the error. If there are no rows, Supabase returns an empty
    // array.
    // Order the habit list by when they were created, with the latest habit at the bottom. This
    // achieves two things: 1) The Principle of Least Astonishment - the order of the habits stays
    // the same, and the newest one is added to the bottom, avoiding pushing down all of the
    // existing habits and having a new habit jump to the top of the list (is less visually
    // jarring). 2) Even though the database table doesn't order rows when it stores them, if we
    // add ordering when fetching the rows, the habits list will always appear in the same order,
    // even when adding and updating habits. When updating a habit, the database is adding a new row
    // and marking the existing row for deletion (due to database MVCC - Multi-Version Concurrency
    // Control mechanism), instead of actually updating the data in the existing database row - this
    // is by default how the database does updates. So without any explicit ordering when fetching
    // the habit list, the order of an existing habit will change in the list when it is updated, as
    // an existing row halfway up the list will get pushed to the bottom of the list - when the
    // database adds a new row for the update, it will add it at the bottom. We want the original
    // order to be preserved, so we need to order the habit list when fetching it and keep using
    // this order, to maintain consistent ordering when the user is viewing the updated habit list.
    const { data, error } = await supabase
      .from("habits")
      .select()
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch habits");
  }
}
