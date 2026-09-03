// Maps spreadsheet rows onto product fields. Kept free of server-only
// imports so it can be exercised directly in a script.

export type ImportSpec = { label: string; value: string };

// Only the keys whose columns were actually present get set. That is what
// lets an update leave every unlisted field on the existing product alone.
export type ImportRowFields = {
  name?: string;
  slug?: string;
  sku?: string;
  brand?: string;
  scale?: string;
  shortDescription?: string;
  descriptionHtml?: string;
  features?: string[];
  specs?: ImportSpec[];
  images?: string[];
  videoUrl?: string | null;
  popupVideoUrl?: string | null;
  priceCents?: number;
  compareAtPriceCents?: number | null;
  categoryKey?: string;
  stockQty?: number;
  featured?: boolean;
  isNew?: boolean;
  inStock?: boolean;
};

export type ParsedImportRow = {
  /** 1-based row number in the file, header excluded — for error messages. */
  lineNumber: number;
  fields: ImportRowFields;
  errors: string[];
};

// features and specs come from repeating columns, not from a fixed header.
type AliasKey = Exclude<keyof ImportRowFields, "features" | "specs">;

const COLUMN_ALIASES: Record<AliasKey, string[]> = {
  name: ["product title", "product name", "name", "title"],
  slug: ["url slug", "slug"],
  sku: ["sku identifier", "sku"],
  brand: ["brand"],
  scale: ["scale"],
  shortDescription: ["short description", "short desc", "card summary"],
  descriptionHtml: ["full description", "description", "long description"],
  videoUrl: ["product video", "gallery video", "video", "video url"],
  popupVideoUrl: ["popup video", "popup video url"],
  priceCents: ["price", "regular price", "price (taka)", "regular price (taka)"],
  compareAtPriceCents: ["compare at price", "compare price", "old price", "was price"],
  categoryKey: ["category"],
  images: ["images", "image urls", "photos"],
  stockQty: ["stock qty", "stock", "quantity", "inventory"],
  featured: ["featured", "featured on homepage"],
  isNew: ["new arrival", "is new", "new"],
  inStock: ["in stock", "available", "available in stock"],
};

const BULLET = /^\s*[•·▪◦*–—-]\s+/;

function normaliseHeader(header: string): string {
  return header.replace(/^﻿/, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function compact(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Escapes first, then re-introduces the one inline form a spreadsheet author
// is likely to type. Everything still goes through sanitizeDescriptionHtml
// before it reaches the database.
function inline(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function isShoutedHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;
  const letters = trimmed.replace(/[^A-Za-z]/g, "");
  if (letters.length < 2) return false;
  return letters === letters.toUpperCase();
}

/**
 * Turns the plain-text description a spreadsheet holds into the HTML the
 * product page renders: blank-line-separated blocks become paragraphs,
 * SHOUTED single lines become headings, and bulleted runs become lists.
 */
export function descriptionTextToHtml(raw: string, productName?: string): string {
  const text = raw.replace(/\r\n?/g, "\n").trim();
  if (!text) return "";

  // Already markup (e.g. round-tripped out of this admin) — hand it to the
  // sanitizer as-is instead of escaping it into visible tag soup.
  if (/<(p|h[1-6]|ul|ol|li|strong|em|br)\b/i.test(text)) return text;

  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const out: string[] = [];

  blocks.forEach((block, index) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    // A leading line that just repeats the product title would render as a
    // second copy of the <h1> already above it. Matched as a prefix, since
    // the title column is often the longer "name, subtitle" form.
    if (index === 0 && lines.length === 1 && productName) {
      const line = compact(lines[0]);
      const name = compact(productName);
      if (line.length >= 8 && (name === line || name.startsWith(line))) return;
    }

    if (lines.every((line) => BULLET.test(line))) {
      const items = lines
        .map((line) => `<li>${inline(line.replace(BULLET, ""))}</li>`)
        .join("");
      out.push(`<ul>${items}</ul>`);
      return;
    }

    if (lines.length === 1) {
      const md = lines[0].match(/^(#{1,3})\s+(.*)$/);
      if (md) {
        const level = md[1].length >= 3 ? 3 : 2;
        out.push(`<h${level}>${inline(md[2])}</h${level}>`);
        return;
      }
      if (isShoutedHeading(lines[0])) {
        out.push(`<h2>${inline(lines[0])}</h2>`);
        return;
      }
    }

    out.push(`<p>${lines.map(inline).join("<br>")}</p>`);
  });

  return out.join("");
}

function parseMoneyToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const amount = Number.parseFloat(cleaned);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

function parseBoolean(raw: string): boolean {
  return ["true", "yes", "y", "1", "x"].includes(raw.trim().toLowerCase());
}

function parseList(raw: string): string[] {
  return raw
    .split(/[|\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Reads the header row and turns every remaining row into field values.
 * Rows are only rejected here for problems visible without the database —
 * SKU matching and category resolution happen server-side.
 */
export function mapCsvRows(rows: string[][]): {
  rows: ParsedImportRow[];
  unknownColumns: string[];
} {
  if (rows.length === 0) return { rows: [], unknownColumns: [] };

  const headers = rows[0].map(normaliseHeader);
  const columnFor = new Map<AliasKey, number>();
  const featureColumns: number[] = [];
  const specColumns: { index: number; label: string }[] = [];
  const unknownColumns: string[] = [];

  headers.forEach((header, index) => {
    if (!header) return;

    const specMatch = header.match(/^spec\s*[-–—]\s*(.+)$/);
    if (specMatch) {
      // Keep the label as typed in the file, minus the "Spec - " prefix.
      const original = rows[0][index].replace(/^﻿/, "").trim();
      const label = original.replace(/^spec\s*[-–—]\s*/i, "").trim();
      specColumns.push({ index, label });
      return;
    }

    if (/^(key )?feature\s*\d*$/.test(header)) {
      featureColumns.push(index);
      return;
    }

    const match = (Object.keys(COLUMN_ALIASES) as AliasKey[]).find(
      (key) => COLUMN_ALIASES[key].includes(header)
    );
    if (match) {
      if (!columnFor.has(match)) columnFor.set(match, index);
      return;
    }

    unknownColumns.push(rows[0][index].replace(/^﻿/, "").trim());
  });

  const cellAt = (row: string[], key: AliasKey): string | null => {
    const index = columnFor.get(key);
    if (index === undefined) return null;
    return (row[index] ?? "").trim();
  };

  const parsed: ParsedImportRow[] = rows.slice(1).map((row, offset) => {
    const fields: ImportRowFields = {};
    const errors: string[] = [];

    const name = cellAt(row, "name");
    if (name) fields.name = name;

    const sku = cellAt(row, "sku");
    if (sku) fields.sku = sku;

    const slug = cellAt(row, "slug");
    if (slug) fields.slug = slugify(slug);

    for (const key of ["brand", "scale", "shortDescription"] as const) {
      const value = cellAt(row, key);
      if (value) fields[key] = value;
    }

    const description = cellAt(row, "descriptionHtml");
    if (description) {
      fields.descriptionHtml = descriptionTextToHtml(description, fields.name);
    }

    const features = featureColumns
      .map((index) => (row[index] ?? "").trim())
      .filter(Boolean);
    if (featureColumns.length > 0 && features.length > 0) fields.features = features;

    const specs = specColumns
      .map(({ index, label }) => ({ label, value: (row[index] ?? "").trim() }))
      .filter((spec) => spec.label && spec.value);
    if (specColumns.length > 0 && specs.length > 0) fields.specs = specs;

    const images = cellAt(row, "images");
    if (images) fields.images = parseList(images);

    // An empty cell means "nothing to say about this field", never "delete
    // what is already there" — a blank trailing column in an export must not
    // wipe a video off a live product.
    for (const key of ["videoUrl", "popupVideoUrl"] as const) {
      const value = cellAt(row, key);
      if (value) fields[key] = value;
    }

    const price = cellAt(row, "priceCents");
    if (price) {
      const cents = parseMoneyToCents(price);
      if (cents === null) errors.push(`Price "${price}" is not a number`);
      else fields.priceCents = cents;
    }

    const compareAt = cellAt(row, "compareAtPriceCents");
    if (compareAt) {
      const cents = parseMoneyToCents(compareAt);
      if (cents === null) errors.push(`Compare at price "${compareAt}" is not a number`);
      else fields.compareAtPriceCents = cents;
    }

    const category = cellAt(row, "categoryKey");
    if (category) fields.categoryKey = category;

    const stockQty = cellAt(row, "stockQty");
    if (stockQty) {
      const quantity = Number.parseInt(stockQty.replace(/[^0-9-]/g, ""), 10);
      if (!Number.isFinite(quantity) || quantity < 0) {
        errors.push(`Stock "${stockQty}" is not a whole number`);
      } else {
        fields.stockQty = quantity;
      }
    }

    for (const key of ["featured", "isNew", "inStock"] as const) {
      const value = cellAt(row, key);
      if (value !== null && value !== "") fields[key] = parseBoolean(value);
    }

    if (!fields.sku) errors.push("SKU is required");
    if (!fields.name && !fields.sku) errors.push("Product title is required");

    return { lineNumber: offset + 1, fields, errors };
  });

  return { rows: parsed, unknownColumns };
}
