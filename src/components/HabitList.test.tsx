import { render, screen } from "@testing-library/react";
import { HabitList } from "./HabitList";
import { Habit } from "@/lib/types";

describe("HabitList component", () => {
  test("should show 'No habits added' when no habits added", () => {
    render(<HabitList habits={[]} />);

    const placeholder = screen.getByText("No habits added");

    expect(placeholder).toBeInTheDocument();

    const items = screen.queryByRole("list");
    expect(items).not.toBeInTheDocument();
  });

  test("should show one list item per habit when habits are added", () => {
    const habits: Habit[] = [
      { id: "1", name: "Meditate", created_at: "2026-08-17T11:06:09.855Z" },
      { id: "2", name: "Read", created_at: "2026-08-17T11:07:09.855Z" },
    ];

    render(<HabitList habits={habits} />);

    const items = screen.getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(screen.getByText("Meditate")).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();

    const placeholder = screen.queryByText("No habits added");
    expect(placeholder).not.toBeInTheDocument();
  });
});
