import type { ParsedRow } from "@/lib/excel";

// Build the placeholder data map ({{student_name}}, {{registration_number}}, custom fields, etc.)
// for a single dataset row, given a column mapping: targetField -> sourceHeader.
export function buildRowData(row: ParsedRow, mapping: Record<string, string>): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [target, source] of Object.entries(mapping)) {
    if (source && row[source] !== undefined) {
      data[target] = row[source];
    }
  }
  // Always provide a date if not explicitly mapped
  if (!data.date) {
    data.date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }
  return data;
}
