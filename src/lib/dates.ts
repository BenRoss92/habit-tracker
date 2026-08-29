export function getTodaysDate(): string {
  const currentDate = new Date();
  const year = currentDate.getFullYear().toString();
  // Add a leading '0' at the beginning of any month or day numbers that are less than 2 digits
  // long. E.g. '2' as a month or day value should become '02'.
  // Add +1 to the current month number, as the first month given by this method starts at 0, not
  // 1.
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const day = currentDate.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}
