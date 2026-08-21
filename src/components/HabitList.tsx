import { Habit } from "@/lib/types";

export function HabitList({ habits }: { habits: Habit[] }) {
  return (
    <section>
      {
        // Habits array will be an empty array if there are no rows in the database table, so need
        // to check the length to see if it's empty or populated
        habits.length === 0 ? (
          <p className="text-center text-muted my-8">No habits added</p>
        ) : (
          <ul className="space-y-2.5">
            {habits.map((habit) => (
              <li
                className="px-5 py-4 bg-white border-line rounded-[14px] border-[1.5px] font-semibold text-[17px] text-heading"
                key={habit.id}
              >
                {habit.name}
              </li>
            ))}
          </ul>
        )
      }
    </section>
  );
}
