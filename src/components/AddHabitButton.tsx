import { IconPlus } from "@tabler/icons-react";

export function AddHabitButton({
  toggleEditing,
  isEditing,
}: {
  toggleEditing: () => void;
  isEditing: boolean;
}) {
  return (
    <button
      disabled={isEditing}
      onClick={toggleEditing}
      className="flex items-center gap-1.5 border-2 border-brand rounded-[20px] 
      bg-white py-2.25 px-5 text-sm font-bold text-brand cursor-pointer 
      disabled:opacity-40 disabled:cursor-default"
    >
      <IconPlus size={16} />
      <span>Add habit</span>
    </button>
  );
}
