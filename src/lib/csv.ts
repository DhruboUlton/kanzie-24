// Minimal RFC 4180 CSV reader. Product descriptions carry newlines, commas
// and quotes inside a single field, so a naive split(",") loses them — this
// tracks quote state instead.

export function parseCsv(input: string): string[][] {
  // Strip UTF-8 BOM (Excel writes one) and normalise line endings so a
  // quoted field never carries a stray \r into the parsed value.
  let text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  text = text.replace(/\r\n?/g, "\n");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // "" inside a quoted field is a literal quote.
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // Trailing field, unless the file simply ended with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop rows that are entirely blank (trailing newlines, spacer lines).
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}
