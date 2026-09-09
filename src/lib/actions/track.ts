"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { isValidBDLocalPhone, normalizeBDLocalPhone } from "@/lib/phone";
import { publicStageFor, PublicStage } from "@/lib/order-status";

// Public order lookup for the storefront's tracking page. No session, by
// design — a customer has no account.
//
// Everything here is shaped by one fact: a phone number is guessable, so
// this endpoint can be walked. Two consequences:
//
//  1. The reply carries no name, email, address or phone. Order id, date,
//     what was bought, the total, the stage and the tracking number are
//     enough for someone to recognise their own order, and are the least
//     that leaks if somebody enumerates numbers.
//  2. Lookups are throttled per IP below.
//
// An order id (KZ-xxxxxxxx-xxxxxxxx) is unguessable, so it is treated the
// same way rather than more generously — there is no reason to hand out
// more for it.

export type PublicOrderItem = { name: string; qty: number };

export type PublicOrder = {
  tranId: string;
  placedAt: string;
  updatedAt: string;
  stage: PublicStage | null; // null = cancelled
  rawStatus: string;
  items: PublicOrderItem[];
  totalAmountCents: number;
  trackingNumber: string | null;
};

export type TrackResult =
  | { success: true; orders: PublicOrder[] }
  | { success: false; error: string };

const MAX_RESULTS = 5;

// ── Throttle ───────────────────────────────────────────────────────────
// In-memory and per-process: it resets on redeploy and does not span
// instances. That is worth saying out loud — it raises the cost of walking
// the phone-number space, it does not make it impossible. A shared store
// would be the real fix if this ever gets abused.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; resetAt: number }>();

async function throttled(): Promise<boolean> {
  let ip = "unknown";
  try {
    const h = await headers();
    // CF-Connecting-IP first: it is the only one of these the sender cannot
    // choose. Cloudflare overwrites it, but *appends* to X-Forwarded-For, so
    // a request carrying its own `X-Forwarded-For: 1.2.3.4` arrives as
    // `1.2.3.4, <real ip>`. Keying this throttle on that first entry let one
    // machine look like a new address on every lookup — which is exactly the
    // walk this throttle exists to slow down.
    ip =
      h.get("cf-connecting-ip")?.trim() ||
      h.get("x-forwarded-for")?.split(",")[0].trim() ||
      h.get("x-real-ip") ||
      "unknown";
  } catch {
    return false;
  }

  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    // Opportunistic sweep so the map can't grow without bound.
    if (hits.size > 5000) {
      for (const [key, value] of hits) if (now > value.resetAt) hits.delete(key);
    }
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function toPublic(order: {
  tranId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  totalAmountCents: number;
  trackingNumber: string | null;
  items: { productName: string; qty: number }[];
}): PublicOrder {
  return {
    tranId: order.tranId,
    placedAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    stage: publicStageFor(order.status),
    rawStatus: order.status,
    items: order.items.map((i) => ({ name: i.productName, qty: i.qty })),
    totalAmountCents: order.totalAmountCents,
    trackingNumber: order.trackingNumber,
  };
}

const SELECT = {
  tranId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  totalAmountCents: true,
  trackingNumber: true,
  items: { select: { productName: true, qty: true } },
} as const;

// One message for "no such order" and "wrong number" alike, so this can't
// be used to test whether a given phone number shops here.
const NOT_FOUND =
  "No order found for that. Check the order ID or the phone number you ordered with.";

export async function trackOrderAction(rawQuery: string): Promise<TrackResult> {
  const query = String(rawQuery ?? "").trim();
  if (!query) {
    return { success: false, error: "Enter your order ID or phone number." };
  }
  if (query.length > 60) {
    return { success: false, error: NOT_FOUND };
  }

  if (await throttled()) {
    return {
      success: false,
      error: "Too many lookups just now. Wait a minute and try again.",
    };
  }

  try {
    // A valid Bangladeshi mobile means "find my orders"; anything else is
    // treated as an order id.
    const phone = normalizeBDLocalPhone(query);

    if (isValidBDLocalPhone(phone)) {
      const orders = await db.order.findMany({
        where: { customerPhone: phone },
        select: SELECT,
        orderBy: { createdAt: "desc" },
        take: MAX_RESULTS,
      });
      if (orders.length === 0) return { success: false, error: NOT_FOUND };
      return { success: true, orders: orders.map(toPublic) };
    }

    const order = await db.order.findFirst({
      where: { tranId: query },
      select: SELECT,
    });
    if (!order) return { success: false, error: NOT_FOUND };
    return { success: true, orders: [toPublic(order)] };
  } catch (error) {
    console.error("trackOrder error:", error);
    return {
      success: false,
      error: "Couldn't look that up right now. Please try again.",
    };
  }
}
