import { db } from "@/lib/db";

export const TESTIMONIALS_KEY = "storefront_testimonials";

export const DEFAULT_AVATAR = "/testimonials/marcus.jpg";

// The whole list lives in one SiteSetting row, and that column is TEXT —
// about 64KB. These caps are what keep a long review from overflowing it,
// which would either throw on save or (without strict mode) truncate the
// JSON into something unparseable and take every real review with it.
export const MAX_NAME = 80;
export const MAX_ROLE = 100;
export const MAX_QUOTE = 1000;
export const MAX_TESTIMONIALS = 40;

/**
 * Reviews are rendered with next/image, which refuses any host that is not
 * in `remotePatterns` — an external URL there produces a broken circle on
 * the storefront rather than a picture. So only same-site paths are kept.
 * "//host" is protocol-relative and leaves the site, so it is excluded too.
 */
export function normalizeAvatar(raw: unknown): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar: string;
  rating: number; // 1 to 5
  isActive: boolean;
  createdAt: string;
}

export const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: "review-1",
    name: "Marcus T.",
    role: "Parent & Sandbox Tester",
    quote:
      "My son runs the excavator in the backyard every single day after school. The bucket actually scoops — it's not just a toy that rolls around.",
    avatar: "/testimonials/marcus.jpg",
    rating: 5,
    isActive: true,
    createdAt: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "review-2",
    name: "Priya R.",
    role: "Verified Buyer",
    quote:
      "Bought the excavator and dump truck together so they'd match. Battery life is solid and the remotes don't interfere with each other.",
    avatar: "/testimonials/priya.jpg",
    rating: 5,
    isActive: true,
    createdAt: "2026-08-18T14:30:00.000Z",
  },
  {
    id: "review-3",
    name: "Dan K.",
    role: "Parent of 7-Year-Old",
    quote:
      "Sturdier than I expected for the price. Survived a summer of sandbox abuse from a 7-year-old.",
    avatar: "/testimonials/dan.jpg",
    rating: 5,
    isActive: true,
    createdAt: "2026-08-20T09:15:00.000Z",
  },
  {
    id: "review-4",
    name: "Sarah M.",
    role: "Verified Buyer",
    quote:
      "The metal bucket and realistic motor sound effects blew my kids away. It has handled wet gravel and mud without a hiccup.",
    avatar: "/testimonials/sarah.jpg",
    rating: 5,
    isActive: true,
    createdAt: "2026-08-22T16:45:00.000Z",
  },
  {
    id: "review-5",
    name: "Liam C.",
    role: "RC Hobbyist & Collector",
    quote:
      "Proportional hydraulic-style controls are surprisingly precise for this tier. One of the best scale models in my RC fleet.",
    avatar: "/testimonials/liam.jpg",
    rating: 5,
    isActive: true,
    createdAt: "2026-08-25T11:20:00.000Z",
  },
  {
    id: "review-6",
    name: "Elena R.",
    role: "Verified Gift Buyer",
    quote:
      "Got this for my nephew's birthday and he hasn't put it down. Fast shipping and the build quality feels super solid right out of the box.",
    avatar: "/testimonials/elena.jpg",
    rating: 5,
    isActive: true,
    createdAt: "2026-08-28T13:10:00.000Z",
  },
];

export function parseTestimonials(raw: unknown): Testimonial[] | null {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed)) return null;

  const result: Testimonial[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const { id, name, role, quote, avatar, rating, isActive, createdAt } =
      item as Partial<Testimonial>;

    if (typeof name !== "string" || !name.trim()) continue;
    if (typeof quote !== "string" || !quote.trim()) continue;

    result.push({
      id: typeof id === "string" && id ? id : `review-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim().slice(0, MAX_NAME),
      role: typeof role === "string" ? role.trim().slice(0, MAX_ROLE) : "",
      quote: quote.trim().slice(0, MAX_QUOTE),
      avatar: normalizeAvatar(avatar) ?? DEFAULT_AVATAR,
      rating: typeof rating === "number" && rating >= 1 && rating <= 5 ? Math.round(rating) : 5,
      isActive: isActive !== false,
      createdAt: typeof createdAt === "string" ? createdAt : new Date().toISOString(),
    });
  }

  return result;
}

export async function getTestimonials(onlyActive = false): Promise<Testimonial[]> {
  try {
    const row = await db.siteSetting.findUnique({
      where: { key: TESTIMONIALS_KEY },
    });

    // No row at all means this store has never edited its reviews, so the
    // presets stand in as sample content.
    if (!row?.value) {
      return onlyActive
        ? DEFAULT_TESTIMONIALS.filter((t) => t.isActive)
        : DEFAULT_TESTIMONIALS;
    }

    // A row that parses to an empty list is a deliberate "show none" and is
    // honoured as one. Treating it as absence is what used to republish six
    // invented customers the moment an owner deleted or hid the last real
    // review — the worst possible thing for a shop to do by itself.
    //
    // null is different: the stored value was not usable JSON, so falling
    // back beats blanking the section on a corrupt row.
    const parsed = parseTestimonials(row.value);
    const list = parsed ?? DEFAULT_TESTIMONIALS;

    return onlyActive ? list.filter((t) => t.isActive) : list;
  } catch {
    return onlyActive
      ? DEFAULT_TESTIMONIALS.filter((t) => t.isActive)
      : DEFAULT_TESTIMONIALS;
  }
}
