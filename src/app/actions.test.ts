jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockInsert = jest.fn();
const mockEq = jest.fn();
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockDeleteEq = jest.fn();
const mockDelete = jest.fn(() => ({ eq: mockDeleteEq }));

jest.mock("@/lib/supabase/server", () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  })),
}));

import { createHabit, updateHabit, deleteHabit } from "@/app/actions";
import { revalidatePath } from "next/cache";

const validId = "bc19277c-46a3-4d8d-b824-bc9c0e74abbd";

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
});
