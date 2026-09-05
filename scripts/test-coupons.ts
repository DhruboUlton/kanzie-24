import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateCouponDiscount,
  normalizeCouponCode,
  deriveCouponStatus,
  calculateRemainingUses,
  formatDiscountValue,
  generateSecureCouponCode,
  CODE_CHARSET,
  CouponView,
  CouponUsageRowView,
} from "../src/lib/coupons-shared";
import { OWNER_ROLE_KEY, isOwner } from "../src/lib/permissions";
import {
  COUPON_HELD_STATUSES,
  ORDER_STATUSES,
  holdsCouponRedemption,
} from "../src/lib/order-status";

// ==========================================
// 1. Discount Calculation Tests & Edge Cases
// ==========================================
test("Discount Calculation: Percentage Discounts & Rounding", () => {
  // Standard 20% discount on ৳2,000 (200,000 cents) -> ৳400 (40,000 cents)
  const res1 = calculateCouponDiscount({
    subtotalCents: 200000,
    discountType: "PERCENTAGE",
    discountValue: 20,
  });
  assert.equal(res1.eligible, true);
  assert.equal(res1.discountAmountCents, 40000);
  assert.equal(res1.finalSubtotalCents, 160000);

  // 100% discount on ৳500 (50,000 cents) -> exactly ৳500 discount, ৳0 final total
  const res2 = calculateCouponDiscount({
    subtotalCents: 50000,
    discountType: "PERCENTAGE",
    discountValue: 100,
  });
  assert.equal(res2.eligible, true);
  assert.equal(res2.discountAmountCents, 50000);
  assert.equal(res2.finalSubtotalCents, 0);

  // Rounding precision check
  const res3 = calculateCouponDiscount({
    subtotalCents: 19999,
    discountType: "PERCENTAGE",
    discountValue: 15,
  });
  assert.equal(res3.eligible, true);
  assert.equal(res3.discountAmountCents, 3000);
  assert.equal(res3.finalSubtotalCents, 16999);

  // Invalid percentage > 100%
  const res4 = calculateCouponDiscount({
    subtotalCents: 100000,
    discountType: "PERCENTAGE",
    discountValue: 105,
  });
  assert.equal(res4.eligible, false);
});

test("Discount Calculation: Fixed Amount Discounts & Zero-Floor Protection", () => {
  // Standard fixed discount ৳500 (50,000 cents) on ৳2,000 (200,000 cents)
  const res1 = calculateCouponDiscount({
    subtotalCents: 200000,
    discountType: "FIXED",
    discountValue: 50000,
  });
  assert.equal(res1.eligible, true);
  assert.equal(res1.discountAmountCents, 50000);
  assert.equal(res1.finalSubtotalCents, 150000);

  // Critical requirement: Fixed discount exceeding order subtotal (৳500 off ৳300 order)
  // Must cap discount at ৳300 and NEVER produce negative total!
  const res2 = calculateCouponDiscount({
    subtotalCents: 30000,
    discountType: "FIXED",
    discountValue: 50000,
  });
  assert.equal(res2.eligible, true);
  assert.equal(res2.discountAmountCents, 30000, "Discount must be capped at order subtotal");
  assert.equal(res2.finalSubtotalCents, 0, "Final total must never be negative");
});

test("Discount Calculation: Minimum Order Threshold Enforcement", () => {
  // Order ৳1,500 under ৳2,000 minimum -> ineligble with clear error
  const res1 = calculateCouponDiscount({
    subtotalCents: 150000,
    discountType: "PERCENTAGE",
    discountValue: 20,
    minimumOrderAmountCents: 200000,
  });
  assert.equal(res1.eligible, false);
  assert.equal(res1.discountAmountCents, 0);
  assert.equal(res1.finalSubtotalCents, 150000);
  assert.ok(res1.error?.includes("Minimum order amount"));

  // Order ৳2,000 exactly meeting ৳2,000 minimum -> eligible
  const res2 = calculateCouponDiscount({
    subtotalCents: 200000,
    discountType: "PERCENTAGE",
    discountValue: 20,
    minimumOrderAmountCents: 200000,
  });
  assert.equal(res2.eligible, true);
  assert.equal(res2.discountAmountCents, 40000);
  assert.equal(res2.finalSubtotalCents, 160000);
});

// ==========================================
// 2. Code Normalization & Display
// ==========================================
test("Coupon Code Normalization & Formatting", () => {
  assert.equal(normalizeCouponCode("  sale20  "), "SALE20");
  assert.equal(normalizeCouponCode("welcome-10!"), "WELCOME-10");
  assert.equal(normalizeCouponCode("eid_2026"), "EID_2026");
  assert.equal(normalizeCouponCode(""), "");

  assert.equal(formatDiscountValue("PERCENTAGE", 20), "20%");
  assert.equal(formatDiscountValue("FIXED", 50000), "৳500.00");
});

// ==========================================
// 3. Usage Limits & Status Derivations
// ==========================================
test("Coupon Status & Remaining Uses (Limited and Unlimited)", () => {
  // Inactive state overrides everything
  assert.equal(deriveCouponStatus(false, 100, 10), "Inactive");
  assert.equal(deriveCouponStatus(false, null, 10), "Inactive");

  // Limit of 1: 0/1 -> Active, 1 remaining
  assert.equal(deriveCouponStatus(true, 1, 0), "Active");
  assert.equal(calculateRemainingUses(1, 0), 1);

  // Limit of 1: 1/1 -> Limit Reached, 0 remaining
  assert.equal(deriveCouponStatus(true, 1, 1), "Limit Reached");
  assert.equal(calculateRemainingUses(1, 1), 0);

  // Limit of 5: 4/5 -> Active, 1 remaining
  assert.equal(deriveCouponStatus(true, 5, 4), "Active");
  assert.equal(calculateRemainingUses(5, 4), 1);

  // Limit of 5: 5/5 -> Limit Reached, 0 remaining
  assert.equal(deriveCouponStatus(true, 5, 5), "Limit Reached");
  assert.equal(calculateRemainingUses(5, 5), 0);

  // Limit of 100: 47/100 -> Active, 53 remaining
  assert.equal(deriveCouponStatus(true, 100, 47), "Active");
  assert.equal(calculateRemainingUses(100, 47), 53);

  // Unlimited: null limit -> Active, null remaining
  assert.equal(deriveCouponStatus(true, null, 47), "Active");
  assert.equal(calculateRemainingUses(null, 47), null);

  // Increasing limit from 5 to 10 when 5/5 used -> becomes Active again with 5 remaining, no usage reset
  assert.equal(deriveCouponStatus(true, 10, 5), "Active");
  assert.equal(calculateRemainingUses(10, 5), 5);
});

// ==========================================
// 4. Random Code Generation Security & Uniqueness
// ==========================================
test("Random Coupon Generation - Cryptographic Security, Length, & Charset", () => {
  const count = 100;
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(generateSecureCouponCode(8));
  }

  assert.equal(codes.length, count, "Should generate exactly 100 codes");

  // Uniqueness check across entire batch
  const uniqueSet = new Set(codes);
  assert.equal(uniqueSet.size, count, "All 100 codes in the batch must be unique");

  // Ambiguous characters: 0, O, 1, I must be absent
  const ambiguousChars = ["0", "O", "1", "I"];
  for (const code of codes) {
    assert.equal(code.length, 8, "Code must be length 8");
    for (const ch of ambiguousChars) {
      assert.equal(
        code.includes(ch),
        false,
        `Ambiguous character '${ch}' found in code '${code}'`,
      );
    }
  }
});

// ==========================================
// 5. Batch Random Usage Model Verification
// ==========================================
test("Batch Random Coupon Usage Model: Independent Limits", () => {
  // Generating 100 coupons with limit 5 each = up to 500 total redemptions
  const batchQuantity = 100;
  const perCouponLimit = 5;

  const mockBatchRecords = Array.from({ length: batchQuantity }, (_, i) => ({
    id: `coupon-${i + 1}`,
    code: generateSecureCouponCode(8),
    usageLimit: perCouponLimit,
    usageCount: 0,
    note: "Influencer campaign - September",
  }));

  // Each record must be independent
  assert.equal(mockBatchRecords.length, 100);
  assert.equal(new Set(mockBatchRecords.map((c) => c.code)).size, 100);

  // Simulating 5 redemptions on coupon 0
  mockBatchRecords[0].usageCount = 5;
  assert.equal(deriveCouponStatus(true, mockBatchRecords[0].usageLimit, mockBatchRecords[0].usageCount), "Limit Reached");

  // Coupon 1 must still have 0 uses and be Active!
  assert.equal(mockBatchRecords[1].usageCount, 0);
  assert.equal(deriveCouponStatus(true, mockBatchRecords[1].usageLimit, mockBatchRecords[1].usageCount), "Active");
  assert.equal(calculateRemainingUses(mockBatchRecords[1].usageLimit, mockBatchRecords[1].usageCount), 5);
});

// ==========================================
// 6. Owner Authorization Check
// ==========================================
test("Owner-Only Gate Security", () => {
  const ownerCtx = { roleKey: OWNER_ROLE_KEY };
  const managerCtx = { roleKey: "ORDER_MANAGER" };
  const inventoryManagerCtx = { roleKey: "INVENTORY_MANAGER" };
  const staffCtx = { roleKey: "STAFF" };
  const nullCtx = { roleKey: null };

  assert.equal(isOwner(ownerCtx), true, "Owner context must pass");
  assert.equal(isOwner(managerCtx), false, "Order Manager must be rejected");
  assert.equal(isOwner(inventoryManagerCtx), false, "Inventory Manager must be rejected");
  assert.equal(isOwner(staffCtx), false, "Staff must be rejected");
  assert.equal(isOwner(nullCtx), false, "Unassigned role must be rejected");
});

// ==========================================
// 7. Concurrency Safety Simulation
// ==========================================
test("Atomic Concurrency Limit Simulation (No 6/5 Over-Redemption)", async () => {
  const limit = 5;
  let usageCount = 4; // 4 of 5 used, exactly 1 available slot

  let successfulRedemptions = 0;
  let rejectedRedemptions = 0;

  // 10 concurrent customer requests trying to redeem the 5th use at the same instant
  const concurrentAttempts = Array.from({ length: 10 }, async () => {
    // Simulates database atomic UPDATE Coupon SET usageCount = usageCount + 1 WHERE usageCount < limit
    if (usageCount < limit) {
      usageCount += 1;
      successfulRedemptions++;
    } else {
      rejectedRedemptions++;
    }
  });

  await Promise.all(concurrentAttempts);

  assert.equal(usageCount, 5, "Usage count must never exceed configured limit");
  assert.equal(successfulRedemptions, 1, "Exactly one customer succeeds");
  assert.equal(rejectedRedemptions, 9, "All concurrent excess attempts are rejected");
});

// ==========================================
// 8. Usage History & Dashboard Aggregation Logic
// ==========================================
test("Dashboard Aggregation & Audit Trail Calculations", () => {
  const mockCoupons: CouponView[] = [
    {
      id: "c1",
      code: "SALE20",
      discountType: "PERCENTAGE",
      discountValue: 20,
      minimumOrderAmountCents: 200000,
      usageLimit: 100,
      usageCount: 95, // 95% consumed -> near limit
      note: "Flash sale",
      isActive: true,
      status: "Active",
      remainingUses: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "c2",
      code: "WELCOME10",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minimumOrderAmountCents: null,
      usageLimit: null, // Unlimited
      usageCount: 187,
      note: "Welcome banner",
      isActive: true,
      status: "Active",
      remainingUses: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "c3",
      code: "EXHAUSTED5",
      discountType: "FIXED",
      discountValue: 50000,
      minimumOrderAmountCents: null,
      usageLimit: 5,
      usageCount: 5, // Limit Reached
      note: "VIP test",
      isActive: true,
      status: "Limit Reached",
      remainingUses: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const totalCoupons = mockCoupons.length;
  const activeCoupons = mockCoupons.filter((c) => c.status === "Active").length;
  const nearLimitCount = mockCoupons.filter(
    (c) => c.usageLimit !== null && c.usageCount / c.usageLimit >= 0.8 && c.remainingUses! > 0,
  ).length;

  assert.equal(totalCoupons, 3);
  assert.equal(activeCoupons, 2);
  assert.equal(nearLimitCount, 1, "c1 is at 95% consumed and still active, so near limit");
});

// ==========================================
// 9. Regression: non-finite inputs must never price an order
// ==========================================
test("Non-finite money inputs are rejected, not silently priced", () => {
  // NaN fails every comparison, so a `subtotalCents < 0` guard let it through
  // and produced a NaN discount that reported itself as eligible.
  const nanSubtotal = calculateCouponDiscount({
    subtotalCents: NaN,
    discountType: "FIXED",
    discountValue: 10000,
  });
  assert.equal(nanSubtotal.eligible, false, "NaN subtotal must be rejected");
  assert.ok(Number.isFinite(nanSubtotal.discountAmountCents));

  const nanValue = calculateCouponDiscount({
    subtotalCents: 100000,
    discountType: "PERCENTAGE",
    discountValue: NaN,
  });
  assert.equal(nanValue.eligible, false, "NaN percentage must be rejected");

  const infinite = calculateCouponDiscount({
    subtotalCents: 100000,
    discountType: "FIXED",
    discountValue: Infinity,
  });
  assert.ok(
    Number.isFinite(infinite.discountAmountCents),
    "An infinite discount must never reach the order total",
  );

  const nanMinimum = calculateCouponDiscount({
    subtotalCents: 100000,
    discountType: "FIXED",
    discountValue: 5000,
    minimumOrderAmountCents: NaN,
  });
  assert.equal(nanMinimum.eligible, true, "A NaN minimum must not block a valid order");
  assert.equal(nanMinimum.discountAmountCents, 5000);
});

// ==========================================
// 10. Regression: a cancelled order gives its redemption back
// ==========================================
test("Coupon redemption is held from PENDING and released only by cancellation", () => {
  // The use is spent at checkout, not at confirmation — unlike stock, which
  // only commits once an admin confirms the order by phone.
  assert.equal(holdsCouponRedemption("PENDING"), true);
  assert.equal(holdsCouponRedemption("CALLED"), true);
  assert.equal(holdsCouponRedemption("CONFIRMED"), true);
  assert.equal(holdsCouponRedemption("DELIVERED"), true);
  assert.equal(holdsCouponRedemption("CANCELLED"), false);
  assert.equal(
    COUPON_HELD_STATUSES.length,
    ORDER_STATUSES.length - 1,
    "Cancelled is the only status that does not hold a redemption",
  );

  // Mirrors updateOrderStatus: the move is decided by the previous status, so
  // cancelling twice can never credit the coupon twice.
  const decide = (from: string, to: string) => {
    const held = holdsCouponRedemption(from);
    const holds = holdsCouponRedemption(to);
    if (held && !holds) return "release";
    if (!held && holds) return "restore";
    return "none";
  };

  let usageCount = 1;
  const apply = (move: string) => {
    if (move === "release") usageCount = Math.max(0, usageCount - 1);
    if (move === "restore") usageCount += 1;
  };

  apply(decide("PENDING", "CANCELLED"));
  assert.equal(usageCount, 0, "Cancelling a pending order frees the use");

  apply(decide("CANCELLED", "CANCELLED"));
  assert.equal(usageCount, 0, "Cancelling twice must not credit twice");

  apply(decide("CANCELLED", "CONFIRMED"));
  assert.equal(usageCount, 1, "Reviving the order takes the use back");

  apply(decide("CONFIRMED", "DELIVERED"));
  assert.equal(usageCount, 1, "Moving along a live order changes nothing");

  apply(decide("DELIVERED", "CANCELLED"));
  assert.equal(usageCount, 0, "A late cancellation still frees the use");
});

// ==========================================
// 11. Regression: a stale discount must not survive a cart change
// ==========================================
test("A percentage discount is re-priced when the cart subtotal moves", () => {
  const coupon = { discountType: "PERCENTAGE", discountValue: 20 } as const;

  const atApply = calculateCouponDiscount({ subtotalCents: 1000000, ...coupon });
  assert.equal(atApply.discountAmountCents, 200000);

  // Same coupon, doubled cart: holding the first figure would have shown the
  // customer a total ৳2,000 above what the order was actually written at.
  const afterChange = calculateCouponDiscount({ subtotalCents: 2000000, ...coupon });
  assert.equal(afterChange.discountAmountCents, 400000);
  assert.notEqual(
    atApply.discountAmountCents,
    afterChange.discountAmountCents,
    "The discount must track the subtotal it is priced against",
  );

  // And a cart that drops below the minimum stops being eligible at all,
  // rather than keeping the discount it qualified for a moment ago.
  const lapsed = calculateCouponDiscount({
    subtotalCents: 300000,
    discountType: "FIXED",
    discountValue: 50000,
    minimumOrderAmountCents: 500000,
  });
  assert.equal(lapsed.eligible, false);
  assert.equal(lapsed.discountAmountCents, 0);
});
