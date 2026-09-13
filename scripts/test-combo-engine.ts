import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { calculateComboPrice } from "../src/lib/combos-shared";

const db = new PrismaClient();

test("Combo Pricing Engine: Buy 2 Caps @ 20% OFF (Matches Screenshot)", () => {
  const capPriceCents = 119900; // Tk 1,199
  const items = [
    { productId: "cap-1", priceCents: capPriceCents },
    { productId: "cap-2", priceCents: capPriceCents },
  ];

  const result = calculateComboPrice(items, 20);

  // Original: 2 * 1,199 = Tk 2,398 (239,800 cents)
  assert.equal(result.originalTotalCents, 239800, "Original total should be 239,800 cents (Tk 2,398)");

  // Discount: 20% of 239,800 = 47,960 cents (Tk 479.60, rounded to 47,960)
  assert.equal(result.discountAmountCents, 47960, "Discount should be 47,960 cents");

  // Discounted Final Total: 239,800 - 47,960 = 191,840 cents -> Tk 1,918.40 (Tk 1,918)
  assert.equal(Math.round(result.finalTotalCents / 100), 1918, "Final price should round to Tk 1,918 exactly as in screenshot");

  // Verify item allocations sum up to exactly finalTotalCents
  const allocatedSum = result.itemPrices.reduce((sum, i) => sum + i.discountedPriceCents, 0);
  assert.equal(allocatedSum, result.finalTotalCents, "Allocated item prices must sum to exact total cents");
});

test("Combo Pricing Engine: Buy 3 Caps @ 30% OFF (Matches Screenshot)", () => {
  const capPriceCents = 119900; // Tk 1,199
  const items = [
    { productId: "cap-1", priceCents: capPriceCents },
    { productId: "cap-2", priceCents: capPriceCents },
    { productId: "cap-3", priceCents: capPriceCents },
  ];

  const result = calculateComboPrice(items, 30);

  // Original: 3 * 1,199 = Tk 3,597 (359,700 cents)
  assert.equal(result.originalTotalCents, 359700, "Original total should be 359,700 cents (Tk 3,597)");

  // Discount: 30% of 359,700 = 107,910 cents (Tk 1,079.10)
  assert.equal(result.discountAmountCents, 107910, "Discount should be 107,910 cents");

  // Discounted Final Total: 359,700 - 107,910 = 251,790 cents -> Tk 2,517.90 (Tk 2,518)
  assert.equal(Math.round(result.finalTotalCents / 100), 2518, "Final price should round to Tk 2,518 exactly as in screenshot");

  const allocatedSum = result.itemPrices.reduce((sum, i) => sum + i.discountedPriceCents, 0);
  assert.equal(allocatedSum, result.finalTotalCents, "Allocated item prices must sum to exact total cents");
});

test("Combo Pricing Engine: Mixed price products and penny allocation", () => {
  const items = [
    { productId: "cap-expensive", priceCents: 150000 }, // Tk 1,500
    { productId: "cap-cheaper", priceCents: 100000 },   // Tk 1,000
  ];

  const result = calculateComboPrice(items, 25);
  // Total: 2,500. Discount 25%: 625. Final: 1,875.
  assert.equal(result.originalTotalCents, 250000);
  assert.equal(result.discountAmountCents, 62500);
  assert.equal(result.finalTotalCents, 187500);

  const allocatedSum = result.itemPrices.reduce((sum, i) => sum + i.discountedPriceCents, 0);
  assert.equal(allocatedSum, result.finalTotalCents, "Zero-rounding cent discrepancy allowed");
});

test("Database Integration: Combo, Tiers, and Products in MySQL", async () => {
  const products = await db.product.findMany({
    where: { archivedAt: null },
    take: 2,
  });

  if (products.length < 2) {
    console.log("Skipping DB test: not enough products in DB.");
    return;
  }

  const p1 = products[0];
  const p2 = products[1];

  // Clean up any stale test combo
  await db.combo.deleteMany({
    where: { name: "INTEGRATION_TEST_COMBO" },
  });

  // Create Combo
  const combo = await db.combo.create({
    data: {
      name: "INTEGRATION_TEST_COMBO",
      headline: "BUY MORE GET MORE 🔥",
      subtext: "Choose Any 2 caps here 👇",
      allowSameProduct: true,
      isActive: true,
      priority: 999,
      products: {
        create: [
          { productId: p1.id },
          { productId: p2.id },
        ],
      },
      tiers: {
        create: [
          {
            quantity: 2,
            discountPercent: 20,
            label: "BUY 2 CAPS",
            badgeText: "GET 20% OFF!",
            subtext: "Choose Any 2 caps here 👇",
            isPopular: false,
            sortOrder: 0,
          },
          {
            quantity: 3,
            discountPercent: 30,
            label: "BUY 3 CAPS",
            badgeText: "GET 30% OFF!",
            subtext: "Choose Any 3 caps here 👇",
            isPopular: true,
            sortOrder: 1,
          },
        ],
      },
    },
    include: {
      tiers: true,
      products: true,
    },
  });

  assert.ok(combo.id, "Combo must have an ID");
  assert.equal(combo.tiers.length, 2, "Must have 2 tiers");
  assert.equal(combo.products.length, 2, "Must have 2 products");

  // Query back with relational join
  const fetched = await db.combo.findUnique({
    where: { id: combo.id },
    include: {
      tiers: { orderBy: { quantity: "asc" } },
      products: { include: { product: true } },
    },
  });

  assert.ok(fetched);
  assert.equal(fetched.tiers[0].quantity, 2);
  assert.equal(fetched.tiers[0].discountPercent, 20);
  assert.equal(fetched.tiers[1].quantity, 3);
  assert.equal(fetched.tiers[1].isPopular, true);

  // Clean up
  await db.combo.delete({ where: { id: combo.id } });
  const count = await db.combo.count({ where: { id: combo.id } });
  assert.equal(count, 0, "Test combo must be deleted");
});
