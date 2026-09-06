"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { sanitizeDescriptionHtml } from "@/lib/sanitize-html";
import { parseCsv } from "@/lib/csv";
import { mapCsvRows, slugify, type ImportRowFields, type ImportSpec } from "@/lib/product-import";

// Not exported: a "use server" module may only export async functions.
const MAX_IMPORT_ROWS = 300;
const MAX_CSV_CHARS = 2_000_000;

export type ImportOptions = {
  defaultCategoryId?: string | null;
  defaultPriceTaka?: number | null;
  /** Off by default: rewriting a live product's slug changes its public URL. */
  updateSlugs?: boolean;
};

export type ImportPlanRow = {
  lineNumber: number;
  sku: string;
  name: string;
  action: "create" | "update" | "skip";
  changedFields: string[];
  slugFrom: string | null;
  slugTo: string | null;
  /** Created hidden from the storefront because the file carried no photos. */
  draft: boolean;
  errors: string[];
  warnings: string[];
};

export type ImportPlan = {
  ok: boolean;
  error?: string;
  rows: ImportPlanRow[];
  unknownColumns: string[];
  createCount: number;
  updateCount: number;
  skipCount: number;
  /** A create row needs these and the file did not supply them. */
  needsCategory: boolean;
  needsPrice: boolean;
};

export type ImportResult = {
  ok: boolean;
  error?: string;
  created: number;
  updated: number;
  failed: { sku: string; message: string }[];
};

type ProductWriteData = {
  name: string;
  slug: string;
  brand: string;
  sku: string;
  categoryId: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  scale: string;
  shortDescription: string;
  description: string;
  features: string[];
  specs: ImportSpec[];
  images: string[];
  featured: boolean;
  isNew: boolean;
  inStock: boolean;
  stockQty: number;
  videoUrl: string | null;
  popupVideoUrl: string | null;
  archivedAt: Date | null;
};

type PreparedWrite =
  | { kind: "create"; sku: string; data: ProductWriteData }
  | { kind: "update"; sku: string; id: string; slug: string; data: Partial<ProductWriteData> };

type Prepared = { plan: ImportPlan; writes: PreparedWrite[] };

/**
 * Turns raw CSV text into both a human-readable plan and the exact writes
 * that plan implies. Preview and commit share it so what the operator
 * approves is what actually runs.
 */
async function prepare(csvText: string, options: ImportOptions): Promise<Prepared> {
  const empty: ImportPlan = {
    ok: false,
    rows: [],
    unknownColumns: [],
    createCount: 0,
    updateCount: 0,
    skipCount: 0,
    needsCategory: false,
    needsPrice: false,
  };

  if (!csvText || !csvText.trim()) {
    return { plan: { ...empty, error: "That file is empty." }, writes: [] };
  }
  if (csvText.length > MAX_CSV_CHARS) {
    return { plan: { ...empty, error: "That file is too large (limit 2MB)." }, writes: [] };
  }

  const grid = parseCsv(csvText);
  if (grid.length < 2) {
    return {
      plan: { ...empty, error: "No data rows found — expected a header row plus at least one product." },
      writes: [],
    };
  }
  if (grid.length - 1 > MAX_IMPORT_ROWS) {
    return {
      plan: { ...empty, error: `Too many rows (${grid.length - 1}). Import at most ${MAX_IMPORT_ROWS} at a time.` },
      writes: [],
    };
  }

  const { rows, unknownColumns } = mapCsvRows(grid);

  const [existing, categories] = await Promise.all([
    db.product.findMany({ select: { id: true, sku: true, slug: true } }),
    db.category.findMany({ select: { id: true, slug: true, name: true } }),
  ]);

  const bySku = new Map(existing.map((p) => [p.sku.trim().toUpperCase(), p]));
  const takenSlugs = new Map(existing.map((p) => [p.slug, p.id]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const categoryByKey = new Map<string, string>();
  for (const category of categories) {
    categoryByKey.set(category.slug.toLowerCase(), category.id);
    categoryByKey.set(category.name.toLowerCase(), category.id);
  }

  const defaultCategoryId =
    options.defaultCategoryId && categoryById.has(options.defaultCategoryId)
      ? options.defaultCategoryId
      : null;
  const defaultPriceCents =
    typeof options.defaultPriceTaka === "number" && options.defaultPriceTaka > 0
      ? Math.round(options.defaultPriceTaka * 100)
      : null;

  const planRows: ImportPlanRow[] = [];
  const writes: PreparedWrite[] = [];
  const seenSkus = new Set<string>();
  let needsCategory = false;
  let needsPrice = false;

  // Claims a slug that is free, or free apart from the product being updated.
  const claimSlug = (desired: string, ownerId: string | null): string => {
    const base = desired || "product";
    let candidate = base;
    let suffix = 2;
    while (takenSlugs.has(candidate) && takenSlugs.get(candidate) !== ownerId) {
      candidate = `${base}-${suffix++}`;
    }
    takenSlugs.set(candidate, ownerId ?? candidate);
    return candidate;
  };

  for (const row of rows) {
    const fields: ImportRowFields = row.fields;
    const sku = (fields.sku ?? "").trim();
    const name = fields.name ?? "";
    const errors = [...row.errors];
    const warnings: string[] = [];

    const skuKey = sku.toUpperCase();
    if (sku && seenSkus.has(skuKey)) {
      errors.push("Duplicate SKU — an earlier row in this file already uses it");
    }
    if (sku) seenSkus.add(skuKey);

    const match = sku ? bySku.get(skuKey) : undefined;

    if (errors.length > 0) {
      planRows.push({
        lineNumber: row.lineNumber,
        sku,
        name,
        action: "skip",
        changedFields: [],
        slugFrom: null,
        slugTo: null,
        draft: false,
        errors,
        warnings,
      });
      continue;
    }

    const rowCategoryId = fields.categoryKey
      ? categoryByKey.get(fields.categoryKey.toLowerCase()) ?? null
      : null;
    if (fields.categoryKey && !rowCategoryId) {
      warnings.push(`Category "${fields.categoryKey}" not found`);
    }

    if (match) {
      // ---- update: only the columns present in the file are written ----
      const data: Partial<ProductWriteData> = {};
      const changed: string[] = [];

      const set = <K extends keyof ProductWriteData>(key: K, value: ProductWriteData[K], label: string) => {
        data[key] = value;
        changed.push(label);
      };

      if (fields.name) set("name", fields.name, "title");
      if (fields.brand) set("brand", fields.brand, "brand");
      if (fields.scale) set("scale", fields.scale, "scale");
      if (fields.shortDescription) set("shortDescription", fields.shortDescription, "short description");
      if (fields.descriptionHtml) {
        set("description", sanitizeDescriptionHtml(fields.descriptionHtml), "description");
      }
      if (fields.features) set("features", fields.features, "features");
      if (fields.specs) set("specs", fields.specs, "specs");
      if (fields.images && fields.images.length > 0) set("images", fields.images, "photos");
      if (fields.videoUrl) set("videoUrl", fields.videoUrl, "video");
      if (fields.popupVideoUrl) set("popupVideoUrl", fields.popupVideoUrl, "popup video");
      if (typeof fields.priceCents === "number") set("priceCents", fields.priceCents, "price");
      if (typeof fields.compareAtPriceCents === "number") {
        set("compareAtPriceCents", fields.compareAtPriceCents, "compare-at price");
      }
      if (rowCategoryId) set("categoryId", rowCategoryId, "category");
      if (typeof fields.stockQty === "number") set("stockQty", fields.stockQty, "stock");
      if (typeof fields.featured === "boolean") set("featured", fields.featured, "featured");
      if (typeof fields.isNew === "boolean") set("isNew", fields.isNew, "new badge");
      if (typeof fields.inStock === "boolean") set("inStock", fields.inStock, "in stock");

      let slugTo: string | null = null;
      if (fields.slug && fields.slug !== match.slug) {
        if (options.updateSlugs) {
          const claimed = claimSlug(fields.slug, match.id);
          if (claimed !== fields.slug) {
            warnings.push(`Slug "${fields.slug}" is taken — using "${claimed}"`);
          }
          data.slug = claimed;
          slugTo = claimed;
          changed.push("URL slug");
        } else {
          warnings.push(`Keeping current URL (file says "${fields.slug}")`);
        }
      }

      if (changed.length === 0) {
        planRows.push({
          lineNumber: row.lineNumber,
          sku,
          name: name || match.slug,
          action: "skip",
          changedFields: [],
          slugFrom: match.slug,
          slugTo: null,
          draft: false,
          errors: [],
          warnings: [...warnings, "Nothing to change"],
        });
        continue;
      }

      planRows.push({
        lineNumber: row.lineNumber,
        sku,
        name: name || match.slug,
        action: "update",
        changedFields: changed,
        slugFrom: match.slug,
        slugTo,
        draft: false,
        errors: [],
        warnings,
      });
      writes.push({ kind: "update", sku, id: match.id, slug: slugTo ?? match.slug, data });
      continue;
    }

    // ---- create ----
    if (!fields.name) {
      errors.push("Product title is required to create a new product");
    }

    const categoryId = rowCategoryId ?? defaultCategoryId;
    if (!categoryId) {
      needsCategory = true;
      errors.push("No category — pick one below or add a Category column");
    }

    const priceCents = fields.priceCents ?? defaultPriceCents;
    if (typeof priceCents !== "number") {
      needsPrice = true;
      errors.push("No price — set one below or add a Price column");
    }

    if (errors.length > 0) {
      planRows.push({
        lineNumber: row.lineNumber,
        sku,
        name,
        action: "skip",
        changedFields: [],
        slugFrom: null,
        slugTo: null,
        draft: false,
        errors,
        warnings,
      });
      continue;
    }

    const images = fields.images ?? [];
    const draft = images.length === 0;
    if (draft) {
      warnings.push("No photos — imported as a hidden draft until you add some");
    }

    const blanks = (["brand", "scale", "shortDescription"] as const).filter((key) => !fields[key]);
    if (blanks.length > 0) warnings.push(`Blank: ${blanks.join(", ")}`);

    const desiredSlug = fields.slug || slugify(fields.name ?? sku);
    const slug = claimSlug(desiredSlug, null);
    if (slug !== desiredSlug) {
      warnings.push(`Slug "${desiredSlug}" is taken — using "${slug}"`);
    }

    const data: ProductWriteData = {
      name: fields.name as string,
      slug,
      brand: fields.brand ?? "",
      sku,
      categoryId: categoryId as string,
      priceCents: priceCents as number,
      compareAtPriceCents: fields.compareAtPriceCents ?? null,
      scale: fields.scale ?? "",
      shortDescription: fields.shortDescription ?? "",
      description: fields.descriptionHtml ? sanitizeDescriptionHtml(fields.descriptionHtml) : "",
      features: fields.features ?? [],
      specs: fields.specs ?? [],
      images,
      featured: fields.featured ?? false,
      isNew: fields.isNew ?? false,
      inStock: fields.inStock ?? true,
      stockQty: fields.stockQty ?? 0,
      videoUrl: fields.videoUrl ?? null,
      popupVideoUrl: fields.popupVideoUrl ?? null,
      archivedAt: draft ? new Date() : null,
    };

    planRows.push({
      lineNumber: row.lineNumber,
      sku,
      name: fields.name as string,
      action: "create",
      changedFields: [],
      slugFrom: null,
      slugTo: slug,
      draft,
      errors: [],
      warnings,
    });
    writes.push({ kind: "create", sku, data });
  }

  const plan: ImportPlan = {
    ok: true,
    rows: planRows,
    unknownColumns,
    createCount: planRows.filter((r) => r.action === "create").length,
    updateCount: planRows.filter((r) => r.action === "update").length,
    skipCount: planRows.filter((r) => r.action === "skip").length,
    needsCategory,
    needsPrice,
  };

  return { plan, writes };
}

export async function previewProductCsvAction(
  csvText: string,
  options: ImportOptions = {}
): Promise<ImportPlan> {
  try {
    await requirePermission("PRODUCTS_CREATE");
  } catch (error) {
    const denied = authErrorResult(error);
    return {
      ok: false,
      error: denied?.error ?? "Not allowed.",
      rows: [],
      unknownColumns: [],
      createCount: 0,
      updateCount: 0,
      skipCount: 0,
      needsCategory: false,
      needsPrice: false,
    };
  }

  try {
    const { plan } = await prepare(csvText, options);
    return plan;
  } catch (error) {
    console.error("previewProductCsv error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not read that file.",
      rows: [],
      unknownColumns: [],
      createCount: 0,
      updateCount: 0,
      skipCount: 0,
      needsCategory: false,
      needsPrice: false,
    };
  }
}

export async function commitProductCsvAction(
  csvText: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  let ctx;
  try {
    ctx = await requirePermission("PRODUCTS_CREATE");
  } catch (error) {
    const denied = authErrorResult(error);
    return { ok: false, error: denied?.error ?? "Not allowed.", created: 0, updated: 0, failed: [] };
  }

  const { plan, writes } = await prepare(csvText, options);
  if (!plan.ok) {
    return { ok: false, error: plan.error, created: 0, updated: 0, failed: [] };
  }

  // Editing existing products is a separate permission from adding new ones.
  if (writes.some((write) => write.kind === "update")) {
    try {
      await requirePermission("PRODUCTS_EDIT");
    } catch (error) {
      const denied = authErrorResult(error);
      return {
        ok: false,
        error: denied?.error ?? "This file updates existing products, which you cannot edit.",
        created: 0,
        updated: 0,
        failed: [],
      };
    }
  }

  let created = 0;
  let updated = 0;
  const failed: { sku: string; message: string }[] = [];
  const touchedSlugs: string[] = [];

  // Row at a time: a bad row should not roll back the good ones.
  for (const write of writes) {
    try {
      if (write.kind === "create") {
        const product = await db.product.create({ data: write.data });
        created++;
        touchedSlugs.push(product.slug);
        await logActivity({
          actor: ctx,
          action: "PRODUCT_CREATED",
          entityType: "PRODUCT",
          entityId: product.id,
          description: `Imported ${product.name} from CSV`,
          metadata: { sku: product.sku, slug: product.slug, draft: Boolean(write.data.archivedAt) },
        });
      } else {
        const product = await db.product.update({ where: { id: write.id }, data: write.data });
        updated++;
        touchedSlugs.push(product.slug, write.slug);
        await logActivity({
          actor: ctx,
          action: "PRODUCT_UPDATED",
          entityType: "PRODUCT",
          entityId: product.id,
          description: `Updated ${product.name} from CSV`,
          metadata: { sku: product.sku, fields: Object.keys(write.data) },
        });
      }
    } catch (error) {
      failed.push({
        sku: write.sku,
        message: error instanceof Error ? error.message : "Write failed",
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/adpnl/products");
  for (const slug of new Set(touchedSlugs)) {
    revalidatePath(`/products/${slug}`);
  }

  return { ok: true, created, updated, failed };
}
