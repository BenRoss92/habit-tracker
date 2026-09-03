import { Completion, Habit } from "@/lib/types";
import { BestStreakStat } from "./BestStreakStat";
import { CompletedTodayStat } from "./CompletedTodayStat";
import { DailyStreakStat } from "./DailyStreakStat";
import { getBestStreakStat, getCompletedTodayCount, getStreakCount } from "@/lib/habit-completions";

export function Stats({
  habits,
  completions,
  todaysDate,
}: {
  habits: Habit[];
  completions: Completion[];
  todaysDate: string;
}) {
  // Get the streak count, except this time pass in all completions for all habits instead of
  // completions relating to only one habit
  const dailyStreakCount = getStreakCount(completions, todaysDate);
  const bestStreakStat = getBestStreakStat(habits, completions, todaysDate);
  const completedTodayCount = getCompletedTodayCount(completions, todaysDate);

  return (
    // shrink-0: only matters once a caller places this inside a flex column with a capped height
    // (HabitsSection does, so the habit list can scroll internally while this stays pinned at the
    // bottom - see HabitsSection's own comment) - without it, a flex column's default
    // flex-shrink: 1 would let this footer get squeezed shorter than its content once space runs
    // out, instead of the scrollable list absorbing all of the deficit on its own.
    <footer className="mt-5 flex shrink-0 gap-2.5 justify-between">
      <CompletedTodayStat
        completedTodayCount={completedTodayCount}
        totalHabitsCount={habits.length}
      />
      <DailyStreakStat dailyStreakCount={dailyStreakCount} />
      <BestStreakStat bestStreakStat={bestStreakStat} />
    </footer>
  );
}
