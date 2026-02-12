/**
 * Formatting utilities for dates and display values.
 */

/** Build a full name string from a student record. */
export function fullName(student: { data: { firstName: string; lastName: string } }): string {
  return `${student.data.firstName} ${student.data.lastName}`;
}

/** Format a single date string (YYYY-MM-DD) to a readable format. */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Format a date range. If endDate is absent, returns a single formatted date. */
export function formatDateRange(startStr: string, endStr?: string): string {
  if (!endStr) return formatDate(startStr);

  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");

  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    const month = start.toLocaleDateString("en-US", { month: "long" });
    return `${month} ${start.getDate()}\u2013${end.getDate()}, ${start.getFullYear()}`;
  }

  const opts: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  return `${start.toLocaleDateString("en-US", opts)} \u2013 ${end.toLocaleDateString("en-US", opts)}`;
}
