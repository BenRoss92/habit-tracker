export type FormState = "pending" | "error" | "idle";

export function getFormState(isPending: boolean, error?: string): FormState {
  if (isPending) {
    return "pending";
  }
  if (error) {
    return "error";
  }

  return "idle";
}
