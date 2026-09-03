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
    <footer className="mt-5 flex gap-2.5 justify-between">
      <CompletedTodayStat
        completedTodayCount={completedTodayCount}
        totalHabitsCount={habits.length}
      />
      <DailyStreakStat dailyStreakCount={dailyStreakCount} />
      <BestStreakStat bestStreakStat={bestStreakStat} />
    </footer>
  );
}
