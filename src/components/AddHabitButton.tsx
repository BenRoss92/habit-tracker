import { IconPlus } from "@tabler/icons-react";
import { Dispatch, SetStateAction } from "react";
import { ActiveAction } from "@/lib/types";

export function AddHabitButton({
  activeAction,
  setActiveAction,
}: {
  activeAction: ActiveAction;
  setActiveAction: Dispatch<SetStateAction<ActiveAction>>;
}) {
  return (
    <button
      disabled={activeAction.type !== "none"}
      onClick={() => setActiveAction({ type: "adding" })}
      className="flex items-center gap-1.5 border-2 border-brand rounded-[20px] 
      bg-white py-2.25 px-5 text-sm font-bold text-brand cursor-pointer 
      disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <IconPlus size={16} />
      <span>Add habit</span>
    </button>
  );
}
