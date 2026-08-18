import { Habit } from "@/lib/types";

export function HabitList({ habits }: { habits: Habit[] }) {
  // Habits array will be an empty array if there are no rows in the database table, so need to
  // check the length to see if it's empty or populated
  if (habits.length === 0) {
    return <p>No habits added</p>;
  }

  return (
    <ul>
      {habits.map((habit) => (
        <li key={habit.id}>{habit.name}</li>
      ))}
    </ul>
  );
}
