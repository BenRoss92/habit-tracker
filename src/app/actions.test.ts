jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockInsert = jest.fn();
const mockEq = jest.fn();
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockDeleteEq = jest.fn();
const mockDelete = jest.fn(() => ({ eq: mockDeleteEq }));

// toggleCompletion's un-mark path chains two .eq() calls (.delete().eq("habit_id", ...).eq(
// "completed_on", ...)), unlike deleteHabit's single .eq() - so the completions table needs its
// own isolated mocks with their own chain shape, rather than reusing mockDelete/mockDeleteEq and
// risking a shape mismatch that would also affect deleteHabit's passing tests.
const mockCompletionInsert = jest.fn();
const mockCompletionDeleteEq2 = jest.fn();
const mockCompletionDeleteEq1 = jest.fn(() => ({ eq: mockCompletionDeleteEq2 }));
const mockCompletionDelete = jest.fn(() => ({ eq: mockCompletionDeleteEq1 }));

jest.mock("@/lib/supabase/server", () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === "completions") {
        return { insert: mockCompletionInsert, delete: mockCompletionDelete };
      }
      return { insert: mockInsert, update: mockUpdate, delete: mockDelete };
    }),
  })),
}));

import { createHabit, updateHabit, deleteHabit, toggleCompletion } from "@/app/actions";
import { revalidatePath } from "next/cache";

const validId = "bc19277c-46a3-4d8d-b824-bc9c0e74abbd";
const validDate = "2026-08-27";

describe("Server actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createHabit", () => {
    test("should return an empty object on valid habit name and successful database insertion", async () => {
      // arrange
      const untrimmedName = " Wash clothes ";
      const trimmedName = "Wash clothes";

      // Stub the database insert query to resolve with no data and no error (we're choosing not to
      // return or use any value ('data' key) in the source code when supabase does its insert
      // query)
      mockInsert.mockResolvedValueOnce({ data: null, error: null });

      // act
      const result = await createHabit(untrimmedName);

      // assert
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockInsert).toHaveBeenCalledWith({ name: trimmedName });

      expect(revalidatePath).toHaveBeenCalledTimes(1);
      expect(revalidatePath).toHaveBeenCalledWith("/");

      expect(result).toStrictEqual({});
    });

    test("should return a validation error and not touch the database when the habit name is empty", async () => {
      const result = await createHabit("   ");

      expect(result).toStrictEqual({ message: "Habit name cannot be empty" });

      expect(mockInsert).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    test("should return a validation error and not touch the database when the habit name is too long", async () => {
      const tooLongName = "a".repeat(76);

      const result = await createHabit(tooLongName);

      expect(result).toStrictEqual({ message: "Habit name must be 75 characters or less" });

      expect(mockInsert).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    test("should succeed when the habit name is exactly the maximum allowed length", async () => {
      const maxLengthName = "a".repeat(75);

      mockInsert.mockResolvedValueOnce({ data: null, error: null });

      const result = await createHabit(maxLengthName);

      expect(mockInsert).toHaveBeenCalledWith({ name: maxLengthName });
      expect(result).toStrictEqual({});
    });

    test("should return a database error message when the insert query itself returns an error", async () => {
      const trimmedName = "Wash clothes";

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const queryError = { message: "duplicate key value" };
      mockInsert.mockResolvedValueOnce({ data: null, error: queryError });

      const result = await createHabit(trimmedName);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Database error: Failed to save habit",
        queryError,
      );

      expect(result).toStrictEqual({ message: "Database error: Failed to save habit" });

      expect(revalidatePath).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test("should return an unexpected error message on unexpected database issue", async () => {
      const trimmedName = "Wash clothes";

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const unexpectedDbError = new Error("connectivity error");
      mockInsert.mockRejectedValueOnce(unexpectedDbError);

      const result = await createHabit(trimmedName);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Database error: An unexpected error occurred",
        unexpectedDbError,
      );

      expect(result).toStrictEqual({ message: "Database error: An unexpected error occurred" });

      expect(revalidatePath).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("updateHabit", () => {
    test("should return an empty object on valid id/name and successful database update", async () => {
      const untrimmedName = " Wash clothes ";
      const trimmedName = "Wash clothes";

      mockEq.mockResolvedValueOnce({ data: null, error: null });

      const result = await updateHabit(validId, untrimmedName);

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith({ name: trimmedName });
      expect(mockEq).toHaveBeenCalledWith("id", validId);

      expect(revalidatePath).toHaveBeenCalledTimes(1);
      expect(revalidatePath).toHaveBeenCalledWith("/");

      expect(result).toStrictEqual({});
    });

    test("should return a validation error and not touch the database when the habit name is empty", async () => {
      const result = await updateHabit(validId, "   ");

      expect(result).toStrictEqual({ message: "Habit name cannot be empty" });

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    test("should return a validation error and not touch the database when the habit name is too long", async () => {
      const tooLongName = "a".repeat(76);

      const result = await updateHabit(validId, tooLongName);

      expect(result).toStrictEqual({ message: "Habit name must be 75 characters or less" });

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    test("should succeed when the habit name is exactly the maximum allowed length", async () => {
      const maxLengthName = "a".repeat(75);

      mockEq.mockResolvedValueOnce({ data: null, error: null });

      const result = await updateHabit(validId, maxLengthName);

      expect(mockUpdate).toHaveBeenCalledWith({ name: maxLengthName });
      expect(result).toStrictEqual({});
    });

    test("should return a validation error and not touch the database when the habit ID is invalid", async () => {
      const result = await updateHabit("not-a-valid-uuid", "Wash clothes");

      expect(result).toStrictEqual({ message: "Invalid ID format" });

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    test("should return a database error message when the update query itself returns an error", async () => {
      // Don't call the real console.error method - create a mocked function instead and check
      // whether the mock gets called. This stops console.error messages getting printed to the
      // command line when running tests (quieter and non-confusing output).
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const queryError = { message: "duplicate key value" };
      mockEq.mockResolvedValueOnce({ data: null, error: queryError });

      const result = await updateHabit(validId, "Wash clothes");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Database error: Failed to update habit",
        queryError,
      );

      expect(result).toStrictEqual({ message: "Database error: Failed to update habit" });

      expect(revalidatePath).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test("should return an unexpected error message on unexpected database issue", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const unexpectedDbError = new Error("connectivity error");
      mockEq.mockRejectedValueOnce(unexpectedDbError);

      const result = await updateHabit(validId, "Wash clothes");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Database error: An unexpected error occurred",
        unexpectedDbError,
      );

      expect(result).toStrictEqual({ message: "Database error: An unexpected error occurred" });

      expect(revalidatePath).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("deleteHabit", () => {
    test("should return an empty object on a valid id and successful database deletion", async () => {
      mockDeleteEq.mockResolvedValueOnce({ data: null, error: null });

      const result = await deleteHabit(validId);

      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(mockDeleteEq).toHaveBeenCalledWith("id", validId);

      expect(revalidatePath).toHaveBeenCalledTimes(1);
      expect(revalidatePath).toHaveBeenCalledWith("/");

      expect(result).toStrictEqual({});
    });

    test("should return a validation error and not touch the database when the habit ID is invalid", async () => {
      const result = await deleteHabit("not-a-valid-uuid");

      expect(result).toStrictEqual({ message: "Invalid ID format" });

      expect(mockDelete).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    test("should return a database error message when the delete query itself returns an error", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const queryError = { message: "foreign key violation" };
      mockDeleteEq.mockResolvedValueOnce({ data: null, error: queryError });

      const result = await deleteHabit(validId);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Database error: Failed to delete habit",
        queryError,
      );

      expect(result).toStrictEqual({ message: "Database error: Failed to delete habit" });

      expect(revalidatePath).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test("should return an unexpected error message on unexpected database issue", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const unexpectedDbError = new Error("connectivity error");
      mockDeleteEq.mockRejectedValueOnce(unexpectedDbError);

      const result = await deleteHabit(validId);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Database error: An unexpected error occurred",
        unexpectedDbError,
      );

      expect(result).toStrictEqual({ message: "Database error: An unexpected error occurred" });

      expect(revalidatePath).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("toggleCompletion", () => {
    test("should return an empty object and insert a completion when marking a habit done", async () => {
      mockCompletionInsert.mockResolvedValueOnce({ data: null, error: null });

      const result = await toggleCompletion(validId, validDate, true);

      expect(mockCompletionInsert).toHaveBeenCalledTimes(1);
      expect(mockCompletionInsert).toHaveBeenCalledWith({
        habit_id: validId,
        completed_on: validDate,
      });

      expect(revalidatePath).toHaveBeenCalledTimes(1);
      expect(revalidatePath).toHaveBeenCalledWith("/");

      expect(result).toStrictEqual({});
    });

    test("should return an empty object and delete the matching completion when unmarking a habit done", async () => {
      mockCompletionDeleteEq2.mockResolvedValueOnce({ data: null, error: null });

      const result = await toggleCompletion(validId, validDate, false);

      expect(mockCompletionDelete).toHaveBeenCalledTimes(1);
      expect(mockCompletionDeleteEq1).toHaveBeenCalledWith("habit_id", validId);
      expect(mockCompletionDeleteEq2).toHaveBeenCalledWith("completed_on", validDate);

      expect(revalidatePath).toHaveBeenCalledTimes(1);
      expect(revalidatePath).toHaveBeenCalledWith("/");

      expect(result).toStrictEqual({});
    });

    test("should return a validation error and not touch the database when the habit ID is invalid", async () => {
      const result = await toggleCompletion("not-a-valid-uuid", validDate, true);

      expect(result).toStrictEqual({ message: "Invalid ID format" });

      expect(mockCompletionInsert).not.toHaveBeenCalled();
      expect(mockCompletionDelete).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    test("should return a validation error and not touch the database when the date format is invalid", async () => {
      const result = await toggleCompletion(validId, "27-08-2026", true);

      expect(result).toStrictEqual({ message: "Invalid date format" });

      expect(mockCompletionInsert).not.toHaveBeenCalled();
      expect(mockCompletionDelete).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    test("should return a database error message when the insert query returns an error", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const queryError = { message: "duplicate key value" };
      mockCompletionInsert.mockResolvedValueOnce({ data: null, error: queryError });

      const result = await toggleCompletion(validId, validDate, true);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Database error: Failed to complete habit",
        queryError,
      );

      expect(result).toStrictEqual({ message: "Database error: Failed to complete habit" });

      expect(revalidatePath).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test("should return a database error message when the delete query returns an error", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const queryError = { message: "row not found" };
      mockCompletionDeleteEq2.mockResolvedValueOnce({ data: null, error: queryError });

      const result = await toggleCompletion(validId, validDate, false);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Database error: Failed to uncomplete habit",
        queryError,
      );

      expect(result).toStrictEqual({ message: "Database error: Failed to uncomplete habit" });

      expect(revalidatePath).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test("should return an unexpected error message on unexpected database issue when marking a habit done", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const unexpectedDbError = new Error("connectivity error");
      mockCompletionInsert.mockRejectedValueOnce(unexpectedDbError);

      const result = await toggleCompletion(validId, validDate, true);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Database error: An unexpected error occurred",
        unexpectedDbError,
      );

      expect(result).toStrictEqual({ message: "Database error: An unexpected error occurred" });

      expect(revalidatePath).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test("should return an unexpected error message on unexpected database issue when unmarking a habit done", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const unexpectedDbError = new Error("connectivity error");
      mockCompletionDeleteEq2.mockRejectedValueOnce(unexpectedDbError);

      const result = await toggleCompletion(validId, validDate, false);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Database error: An unexpected error occurred",
        unexpectedDbError,
      );

      expect(result).toStrictEqual({ message: "Database error: An unexpected error occurred" });

      expect(revalidatePath).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
