import test from "node:test";
import assert from "node:assert/strict";
import {
  applySalePercent,
  isValidSalePercent,
  resolveAvailability,
  resolvePricing,
  saleBadgeLabel,
} from "../src/lib/product-pricing";

const TAKA = (n: number) => n * 100;

// ==========================================
// 1. The pricing scenarios from the brief
// ==========================================
test("Normal product: no sale, charged the regular price", () => {
  const p = resolvePricing({ priceCents: TAKA(5000) });
  assert.equal(p.effectiveCents, TAKA(5000));
  assert.equal(p.originalCents, null, "nothing to strike through");
  assert.equal(p.percentOff, null);
  assert.equal(p.onSale, false);
  assert.equal(saleBadgeLabel(p), null, "no badge when not on sale");
});

test("20% off ৳5,000 is ৳4,000 with a 20% badge", () => {
  const p = resolvePricing({ priceCents: TAKA(5000), salePercent: 20 });
  assert.equal(p.effectiveCents, TAKA(4000));
  assert.equal(p.originalCents, TAKA(5000));
  assert.equal(p.percentOff, 20, "the badge must match what was configured");
  assert.equal(saleBadgeLabel(p), "20% OFF");
});

test("30% off ৳5,000 is ৳3,500 with a 30% badge", () => {
  const p = resolvePricing({ priceCents: TAKA(5000), salePercent: 30 });
  assert.equal(p.effectiveCents, TAKA(3500));
  assert.equal(p.percentOff, 30);
  assert.equal(saleBadgeLabel(p), "30% OFF");
});

test("A percentage sale supersedes any compare-at price", () => {
  // Both fields populated: only one answer may reach the customer.
  const p = resolvePricing({
    priceCents: TAKA(5000),
    salePercent: 20,
    compareAtPriceCents: TAKA(9999),
  });
  assert.equal(p.effectiveCents, TAKA(4000));
  assert.equal(p.originalCents, TAKA(5000), "the regular price is the original");
  assert.equal(p.percentOff, 20, "not the percentage implied by compare-at");
});

test("Compare-at alone still works, with a derived percentage", () => {
  const p = resolvePricing({
    priceCents: TAKA(4000),
    compareAtPriceCents: TAKA(5000),
  });
  assert.equal(p.effectiveCents, TAKA(4000));
  assert.equal(p.originalCents, TAKA(5000));
  assert.equal(p.percentOff, 20);
});

test("A compare-at at or below the price is not a discount", () => {
  for (const compareAt of [TAKA(4000), TAKA(3000)]) {
    const p = resolvePricing({ priceCents: TAKA(4000), compareAtPriceCents: compareAt });
    assert.equal(p.onSale, false, `compare-at ${compareAt} must not read as a sale`);
    assert.equal(p.originalCents, null);
    assert.equal(p.effectiveCents, TAKA(4000));
  }
});

// ==========================================
// 2. Invalid input must never reach a price
// ==========================================
test("Sale percentages outside 1-100 are refused", () => {
  for (const bad of [0, -10, 101, 1000, 12.5, NaN, Infinity, null, undefined, "20"]) {
    assert.equal(isValidSalePercent(bad), false, `${String(bad)} must be rejected`);
    const p = resolvePricing({ priceCents: TAKA(5000), salePercent: bad as number });
    assert.equal(p.effectiveCents, TAKA(5000), `${String(bad)} must not change the price`);
    assert.equal(p.onSale, false);
  }
  assert.equal(isValidSalePercent(1), true);
  assert.equal(isValidSalePercent(100), true);
});

test("100% off floors at zero, never negative", () => {
  const p = resolvePricing({ priceCents: TAKA(5000), salePercent: 100 });
  assert.equal(p.effectiveCents, 0);
  assert.ok(p.effectiveCents >= 0);
});

test("A negative or non-finite price yields no price, not a negative one", () => {
  for (const bad of [-1, NaN, Infinity]) {
    const p = resolvePricing({ priceCents: bad, salePercent: 20 });
    assert.ok(Number.isFinite(p.effectiveCents));
    assert.ok(p.effectiveCents >= 0, `${String(bad)} produced ${p.effectiveCents}`);
  }
});

test("Discounts round to whole cents and never exceed the price", () => {
  // 33% of ৳333.33 is not a whole number of cents.
  assert.equal(applySalePercent(33333, 33), Math.round(33333 * 0.67));
  assert.ok(applySalePercent(33333, 33) <= 33333);
  assert.equal(applySalePercent(100, 100), 0);
  assert.equal(applySalePercent(0, 50), 0);
});

// ==========================================
// 3. Availability
// ==========================================
test("Sold Out overrides stock on hand", () => {
  // The brief's scenario: five in stock, deliberately held back.
  const a = resolveAvailability({ soldOut: true, stockQty: 5, inStock: true });
  assert.equal(a.purchasable, false);
  assert.equal(a.status, "SOLD_OUT");
  assert.equal(a.label, "Sold Out");
});

test("Zero stock is not purchasable", () => {
  const a = resolveAvailability({ soldOut: false, stockQty: 0, inStock: true });
  assert.equal(a.purchasable, false);
  assert.equal(a.status, "OUT_OF_STOCK");
});

test("Clearing Sold Out restores purchasing, subject to quantity", () => {
  assert.equal(resolveAvailability({ soldOut: false, stockQty: 5 }).purchasable, true);
  assert.equal(resolveAvailability({ soldOut: false, stockQty: 0 }).purchasable, false);
});

test("Records with no quantity fall back to inStock", () => {
  // The seed catalogue carries inStock but not always a count.
  assert.equal(resolveAvailability({ inStock: true }).purchasable, true);
  assert.equal(resolveAvailability({ inStock: false }).purchasable, false);
  assert.equal(resolveAvailability({}).purchasable, true, "unknown defaults to sellable");
});

// ==========================================
// 4. Ordering
// ==========================================
test("Lower display order comes first, with deterministic tie-breaking", () => {
  type Row = { id: string; categoryOrder: number; createdAt: Date };
  const sort = (rows: Row[]) =>
    [...rows].sort((a, b) => {
      const order = a.categoryOrder - b.categoryOrder;
      if (order !== 0) return order;
      const created = b.createdAt.getTime() - a.createdAt.getTime();
      return created !== 0 ? created : a.id.localeCompare(b.id);
    });

  const day = (n: number) => new Date(2026, 0, n);
  const rows: Row[] = [
    { id: "C", categoryOrder: 3, createdAt: day(1) },
    { id: "A", categoryOrder: 1, createdAt: day(2) },
    { id: "B", categoryOrder: 2, createdAt: day(3) },
  ];
  assert.deepEqual(sort(rows).map((r) => r.id), ["A", "B", "C"]);

  // Equal priorities fall back to newest, then to id — never to chance.
  const tied: Row[] = [
    { id: "z", categoryOrder: 1, createdAt: day(5) },
    { id: "a", categoryOrder: 1, createdAt: day(5) },
    { id: "m", categoryOrder: 1, createdAt: day(9) },
  ];
  assert.deepEqual(sort(tied).map((r) => r.id), ["m", "a", "z"]);
  assert.deepEqual(sort(tied).map((r) => r.id), sort([...tied].reverse()).map((r) => r.id),
    "the same set must sort the same way regardless of input order");
});

test("Category order and featured order are independent axes", () => {
  const products = [
    { id: "A", categoryOrder: 8, featured: true, featuredOrder: 2 },
    { id: "B", categoryOrder: 1, featured: false, featuredOrder: 0 },
    { id: "C", categoryOrder: 9, featured: true, featuredOrder: 1 },
  ];
  const byCategory = [...products].sort((a, b) => a.categoryOrder - b.categoryOrder);
  const byFeatured = products
    .filter((p) => p.featured)
    .sort((a, b) => a.featuredOrder - b.featuredOrder);

  assert.deepEqual(byCategory.map((p) => p.id), ["B", "A", "C"]);
  assert.deepEqual(byFeatured.map((p) => p.id), ["C", "A"],
    "A sits 8th in its category yet second among featured");
});

// ==========================================
// 5. Existing products keep working
// ==========================================
test("A product carrying none of the new fields behaves as before", () => {
  // Exactly the shape of a row written before this feature existed.
  const legacy = { priceCents: TAKA(1099), inStock: true, stockQty: 12 };
  const pricing = resolvePricing(legacy);
  assert.equal(pricing.effectiveCents, TAKA(1099));
  assert.equal(pricing.onSale, false);
  assert.equal(resolveAvailability(legacy).purchasable, true);

  // And one that used the old compare-at sale mechanism.
  const legacySale = { priceCents: TAKA(1299), compareAtPriceCents: TAKA(1599) };
  assert.equal(resolvePricing(legacySale).effectiveCents, TAKA(1299));
  assert.equal(resolvePricing(legacySale).onSale, true);
});
