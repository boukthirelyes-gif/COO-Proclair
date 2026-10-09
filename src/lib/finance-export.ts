type ExportRow = Record<string, unknown>;
export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  // Protect spreadsheet users against formulas supplied in customer names/references.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function csvRows(columns: string[], rows: ExportRow[]): string {
  return '\uFEFF' + [columns.map(csvCell).join(','), ...rows.map(row => columns.map(column => csvCell(row[column])).join(','))].join('\r\n') + '\r\n';
}
export function sumCents(values: number[]): number {
  const total = values.reduce((sum, value) => {
    if (!Number.isSafeInteger(value)) throw new Error('Invalid monetary value');
    return sum + BigInt(value);
  }, 0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER) || total < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error('Report amount exceeds supported range');
  return Number(total);
}
