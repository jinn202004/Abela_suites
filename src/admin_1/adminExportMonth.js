export const EXPORT_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function currentExportMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export function exportMonthLabel(monthYyyyMm) {
  if (!monthYyyyMm) return "All time";
  const [y, m] = monthYyyyMm.split("-");
  const mi = parseInt(m, 10);
  if (!y || !mi || mi < 1 || mi > 12) return monthYyyyMm;
  return `${EXPORT_MONTH_NAMES[mi - 1]} ${y}`;
}
