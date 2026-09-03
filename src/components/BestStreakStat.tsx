import { BestStreakStatType } from "@/lib/habit-completions";

export function BestStreakStat({ bestStreakStat }: { bestStreakStat: BestStreakStatType }) {
  if (bestStreakStat.state === "none") {
    return (
      <div className="border-line border-[1.5px] bg-white px-4 py-[13.6px] rounded-xl w-full">
        <h3 className="text-[11px] uppercase text-action-icon font-bold tracking-[0.06em] mb-1 min-h-8.5 sm:min-h-0">
          Best streak
        </h3>
        <p className="text-[22px] font-bold leading-[1.2] text-heading">🔥</p>
        <p className="text-xs text-muted mt-0.75 leading-[1.4] font-medium line-clamp-2">
          Complete a habit to start a streak
        </p>
      </div>
    );
  }

  if (bestStreakStat.state === "tied") {
    return (
      <div className="border-line border-[1.5px] bg-white px-4 py-[13.6px] rounded-xl w-full">
        <h3 className="text-[11px] uppercase text-action-icon font-bold tracking-[0.06em] mb-1 min-h-8.5 sm:min-h-0">
          Best streak
        </h3>
        <p className="text-[22px] font-bold leading-[1.2] text-heading">
          {bestStreakStat.bestStreakCount >= 3 && <span>🔥 </span>}
          {bestStreakStat.bestStreakCount}
        </p>
        <p className="text-xs text-muted mt-0.75 leading-[1.4] font-medium line-clamp-2">
          {bestStreakStat.tiedHabitCount} habits
        </p>
      </div>
    );
  }

  return (
    <div className="border-line border-[1.5px] bg-white px-4 py-[13.6px] rounded-xl w-full">
      <h3 className="text-[11px] uppercase text-action-icon font-bold tracking-[0.06em] mb-1 min-h-8.5 sm:min-h-0">
        Best streak
      </h3>
      <p className="text-[22px] font-bold leading-[1.2] text-heading">
        {bestStreakStat.bestStreakCount >= 3 && <span>🔥 </span>}
        {bestStreakStat.bestStreakCount}
      </p>
      <p className="text-xs text-muted mt-0.75 leading-[1.4] font-medium line-clamp-2">
        {bestStreakStat.habitName}
      </p>
    </div>
  );
}
