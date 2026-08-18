import { Habit } from "@/lib/types";

export function HabitList({ habits }: { habits: Habit[] }) {
  return (
    <div className="bg-brand-subtle w-full max-w-xl rounded-2xl p-6">
      <p className="text-heading mb-3 text-sm font-bold">Habits</p>
      {
        // Habits array will be an empty array if there are no rows in the database table, so need
        // to check the length to see if it's empty or populated
        habits.length === 0 ? (
          <p className="text-muted py-8 text-center">No habits added</p>
        ) : (
          <ul className="space-y-2.5">
            {habits.map((habit) => (
              <li key={habit.id} className="border-line rounded-2xl border bg-white px-5 py-4">
                <p className="text-heading text-[17px] font-semibold">{habit.name}</p>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  );
}
