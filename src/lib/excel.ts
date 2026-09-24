import * as XLSX from "xlsx";

export type ParsedRow = Record<string, string>;

export interface ParsedSheet {
  headers: string[];
  rows: ParsedRow[];
}

export function parseSpreadsheet(buffer: Buffer, filename: string): ParsedSheet {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const json: (string | number)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });
  if (json.length === 0) return { headers: [], rows: [] };
  const headers = json[0].map((h) => String(h).trim());
  const rows: ParsedRow[] = json.slice(1).map((r) => {
    const obj: ParsedRow = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] !== undefined ? String(r[i]).trim() : "";
    });
    return obj;
  });
  return { headers, rows };
}

// Common header variants for fuzzy auto-detection
const NAME_VARIANTS = [
  "name",
  "student name",
  "studentname",
  "full name",
  "fullname",
  "participant name",
  "participant",
  "candidate name",
];

const REGNUM_VARIANTS = [
  "registration number",
  "registration no",
  "reg no",
  "reg number",
  "regnum",
  "reg_num",
  "roll number",
  "roll no",
  "enrollment number",
  "enrollment no",
  "id",
  "student id",
  "registration_number",
  "regno",
];

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function bestMatch(headers: string[], variants: string[]): string | null {
  const normHeaders = headers.map((h) => ({ raw: h, norm: normalize(h) }));
  // exact match first
  for (const v of variants) {
    const hit = normHeaders.find((h) => h.norm === v);
    if (hit) return hit.raw;
  }
  // contains match
  for (const v of variants) {
    const hit = normHeaders.find((h) => h.norm.includes(v) || v.includes(h.norm));
    if (hit) return hit.raw;
  }
  return null;
}

export function autoDetectColumns(headers: string[]) {
  return {
    student_name: bestMatch(headers, NAME_VARIANTS),
    registration_number: bestMatch(headers, REGNUM_VARIANTS),
  };
}

export interface ValidationError {
  rowIndex: number;
  reason: string;
}

export function validateRows(
  rows: ParsedRow[],
  mapping: Record<string, string> // targetField -> sourceHeader
): { errors: ValidationError[]; duplicateCount: number; missingCount: number } {
  const errors: ValidationError[] = [];
  const seenReg = new Map<string, number>();
  let duplicateCount = 0;
  let missingCount = 0;

  const nameCol = mapping["student_name"];
  const regCol = mapping["registration_number"];

  rows.forEach((row, idx) => {
    const name = nameCol ? row[nameCol] : "";
    const reg = regCol ? row[regCol] : "";
    if (!name || !name.trim()) {
      errors.push({ rowIndex: idx, reason: "Missing student name" });
      missingCount++;
    }
    if (!reg || !reg.trim()) {
      errors.push({ rowIndex: idx, reason: "Missing registration number" });
      missingCount++;
    } else {
      const key = reg.trim().toLowerCase();
      if (seenReg.has(key)) {
        errors.push({ rowIndex: idx, reason: `Duplicate registration number (also row ${seenReg.get(key)! + 1})` });
        duplicateCount++;
      } else {
        seenReg.set(key, idx);
      }
    }
  });

  return { errors, duplicateCount, missingCount };
}
