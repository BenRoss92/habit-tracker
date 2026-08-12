// Intentionally not turning these Supabase-returned strings into actual UUIDs or Dates as there is
// no need to change or handle these values using TypeScript logic.

export type Habit = {
  id: string;
  name: string;
  // supabase-js returns this timestamptz
  // PostgreSQL field as an ISO string
  created_at: string;
};

export type Completion = {
  id: string;
  habit_id: string;
  completed_on: string;
  created_at: string;
};
