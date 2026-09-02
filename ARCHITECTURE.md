# KANZIE — Architecture

Reference for how this store is built and how each feature actually behaves.
Written against the code as it stands; where something is half-finished or
has a sharp edge, that's said plainly rather than left for you to discover.

---

## 1. Stack

| Piece | Choice | Notes |
|---|---|---|
| Framework | Next.js **16.3.3**, App Router | Route groups `(storefront)` / `(admin)` |
| React | 19.2.8 | Server Components by default |
| Language | TypeScript 5 | |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`) | No config file — CSS-first setup in `globals.css` |
| Database | MySQL via **Prisma 6.4.1** | Hosted on Hostinger |
| Auth | `jose` JWT in an httpOnly cookie + `bcryptjs` | No NextAuth |
| Cart | `zustand` + `persist` | Browser-only |
| Validation | `zod` 4 | Checkout payload + product form |
| Icons | `lucide-react` | |
| Fonts | Poppins (headings) + Lato (body) via `next/font` | |

There is **no payment gateway**. Orders are placed unpaid and confirmed by
phone — see [§6](#6-the-order-lifecycle).

Build command is `prisma generate && next build --webpack`. The `--webpack`
flag is deliberate: Next 16's default SWC binary needs glibc ≥ 2.29 and the
CloudLinux 8 host ships 2.28.

---

## 2. Directory map

```
src/
├── middleware.ts              # Gate on /admin/* — verifies the JWT cookie
├── app/
│   ├── layout.tsx             # <html>, fonts, metadata
│   ├── (storefront)/
│   │   ├── layout.tsx         # AnnouncementBar + Header + CartDrawer + Footer
│   │   ├── page.tsx           # Homepage
│   │   ├── products/page.tsx           # Listing (?category=slug)
│   │   ├── products/[slug]/page.tsx    # Detail
│   │   ├── cart/page.tsx
│   │   └── checkout/page.tsx
│   ├── (admin)/admin/
│   │   ├── layout.tsx         # Renders AdminShell once a session exists
│   │   ├── login/  page.tsx   # Dashboard
│   │   ├── products/ (list, new, [id]/edit)
│   │   ├── orders/   (list, [id])
│   │   ├── categories/  inventory/  banner/  fraud-check/  settings/
│   └── api/
│       ├── checkout/route.ts          # POST — creates the order
│       ├── admin/upload/route.ts      # POST — image upload (auth required)
│       ├── uploads/[...path]/route.ts # GET  — serves uploaded files
│       └── video/route.ts             # GET  — video proxy / range streaming
├── components/                # Storefront components
│   └── admin/                 # Admin components
└── lib/
    ├── db.ts  auth.ts  crypto.ts  format.ts  site-config.ts
    ├── products.ts  orders.ts  inventory.ts  inventory-shared.ts
    ├── hero.ts  body-banner.ts  uploads.ts  video.ts  cart-store.ts
    ├── fraud-check.ts  courier-credentials.ts
    ├── schemas/product.ts
    └── actions/              # "use server" — every admin mutation
```

**Convention:** `lib/<thing>.ts` holds reads and pure logic; `lib/actions/<thing>.ts`
holds the `"use server"` mutations. Anything a client component needs to
import (types, labels, constants) must not sit in a file that imports `db` —
that's why `inventory-shared.ts` exists alongside `inventory.ts`.

---

## 3. Data model

`prisma/schema.prisma`. No `migrations/` directory — the schema is applied
with `prisma db push`.

```
AdminUser      id, email(unique), passwordHash, name
Category       id, slug(unique), name, sortOrder, parentId? ──┐ self-relation
                                                              │ (one level)
Product        id, slug(unique), sku(unique), name, brand, categoryId,
               priceCents, compareAtPriceCents?, scale,
               shortDescription, description,
               features(Json), specs(Json), images(Json),
               featured, isNew, inStock, stockQty,
               costPriceCents?, lowStockThreshold?,
               videoUrl?, archivedAt?
Order          id, tranId(unique), status, totalAmountCents, currency,
               customerName/Email/Phone/Address/City,
               trackingNumber?, adminNotes?
OrderItem      orderId, productId?(SetNull), + name/sku/slug/price snapshot
OrderEvent     orderId, status, note        # append-only order timeline
StockMovement  productId, delta, resultQty, reason, note?, orderId?,
               actorName?                   # append-only stock audit
SiteSetting    key(PK), value(Text)         # generic key/value store
```

Three deliberate choices worth knowing:

- **`OrderItem` snapshots** name, SKU, slug and price. Editing or deleting a
  product later never rewrites order history.
- **`Product.archivedAt`** — products are archived, never deleted, so old
  orders keep their link.
- **`SiteSetting`** is a generic KV table. Banners, courier credentials and
  store settings all live there, which is why adding those features needed
  no migration.

### Categories nest exactly one level

A category with a `parentId` is a subcategory and cannot itself have
children — enforced in `lib/actions/category.ts`, not by the schema.
Parents act as groupings; products are assigned to leaves. `onDelete: SetNull`
means deleting a parent promotes its children rather than destroying them.

---

## 4. Storefront

### Homepage (`(storefront)/page.tsx`)

One query batch (`Promise.all`), then sections in order: **Hero → Featured →
Brand strip → USP strip → Body banner → New arrivals → Category tiles →
per-category rows → Articles → Testimonials**.

### Hero — two mutually exclusive styles

`components/Hero.tsx` picks one based on `hero_mode` in `SiteSetting`:

- **`coverflow`** (`HeroSlider.tsx`) — transparent PNG cut-outs rotating over
  a solid colour, one shared headline and CTA, an oversized backdrop word per
  slide.
- **`banner`** (`HeroBannerSlider.tsx`) — full-bleed images that crossfade,
  each with its own *optional* heading, subheading and CTA.

Only one value is stored, so "both at once" is unrepresentable. Banner mode
with no images falls back to coverflow rather than rendering an empty hero.

**How the coverflow ring works** (the part that has bitten us twice): each
slide carries a signed `offset` from centre. Slots `-1, 0, +1` are on screen;
`±n/2` is off screen. A slide leaving on one side has to return on the other,
and `+n/2` and `-n/2` are the same ring position — so the wrap is free, *but
only if it happens while the slide is hidden and before the move that brings
it back*. Each move therefore runs in two frames: park the hidden slides on
the side they'll enter from with transitions **off**, then animate. Moves are
queued rather than allowed to interrupt each other, because a move needs a
parked ring to start from. Fold the wrap into the move instead and a slide
sails across the screen the wrong way; let moves interrupt and slides drift
off-screen permanently.

### Catalogue

`lib/products.ts` is the only read path. **Every getter falls back to the
hardcoded `FALLBACK_PRODUCTS` array if the database throws**, so the shop
still renders during an outage. Archived products (`archivedAt != null`) are
excluded everywhere.

- `/products?category=<slug>` — flat listing, filtered in the page.
- `/products/[slug]` — `force-dynamic`; gallery, specs, features, optional
  video, add-to-cart.
- Nav categories come from `getCategoryTree()` in the storefront layout, so a
  new subcategory appears in the dropdowns immediately.

### Cart

`lib/cart-store.ts` — zustand persisted to `localStorage` under `rc-toy-cart`.
Client-side only; the server never sees it until checkout. **"Buy now"**
bypasses the cart via `sessionStorage` (`kanzie-buy-now`), read exactly once
so it survives the navigation without polluting the saved cart.

---

## 5. Admin

### Authentication

Two layers, both required:

1. **`src/middleware.ts`** — matches `/admin/:path*`, verifies the JWT in the
   `kanzie_admin_session` cookie, redirects to `/admin/login?from=…` if
   missing or invalid. Already-logged-in visitors to `/admin/login` bounce to
   the dashboard.
2. **`requireAdmin()`** — called at the top of every server action. The
   middleware protects pages; this protects the mutations, which are
   reachable independently of any page.

Session: `jose` HS256 JWT, 7-day expiry, httpOnly cookie, `secure` in
production, `sameSite: lax`. Signed with `ADMIN_SESSION_SECRET`.

> **Security note.** `lib/actions/auth.ts` accepts a hardcoded
> `admin@kanzie.com` / `admin123456` whenever no matching `AdminUser` row is
> found — including when the database is unreachable. It was a bootstrap
> convenience. There is no password-change UI yet, so rotating it currently
> means updating the `AdminUser` row directly and removing that fallback.

### Screens

| Route | What it does |
|---|---|
| `/admin` | Revenue, order counts, low-stock list, recent orders |
| `/admin/products` | List, search, archive/restore |
| `/admin/products/new`, `/[id]/edit` | Full product form (zod-validated) |
| `/admin/orders`, `/[id]` | Order pipeline, status changes, notes, packing slip |
| `/admin/inventory` | Stock levels, adjustments, audit trail — [§7](#7-inventory) |
| `/admin/categories` | Categories and one level of subcategories |
| `/admin/banner` | Hero banner + body banner editors, with live previews |
| `/admin/fraud-check` | Courier delivery history lookup — [§8](#8-fraud-check) |
| `/admin/settings` | Announcement bar, support contacts |

Every admin page is `force-dynamic` — they must never be prerendered at build
time, since they query the database behind an auth check.

`AdminShell` owns the sidebar drawer state shared by the mobile header button
and the sidebar itself.

---

## 6. The order lifecycle

There is no payment gateway. The flow is deliberately manual:

```
customer submits  ──▶  POST /api/checkout  ──▶  Order(PENDING) + OrderEvent
                                                       │
       success recap with Order ID  ◀────────────────────┘
                                                       │
admin phones the customer  ──▶  CONFIRMED  ──▶  stock deducted (SALE movements)
                                    │
                          PACKED ─▶ SHIPPED ─▶ DELIVERED
                                    │
                               CANCELLED  ──▶  stock returned (RETURN movements)
```

**Order ID.** `tranId`, formatted `KZ-<base36 timestamp>-<8 hex>`, unique,
generated in `/api/checkout`. Shown to the customer on success and used
throughout the admin.

**Prices are never trusted from the client.** `/api/checkout` validates the
payload with zod (slug + qty only), then `createPendingOrder` re-looks-up
every product server-side and computes the total itself.

**Stock timing.** `PENDING` deliberately does *not* reserve stock — an
unconfirmed order is only a promise. It shows on the inventory screen as
**Promised** instead. Stock moves when the status crosses into
`CONFIRMED/PACKED/SHIPPED/DELIVERED`, and moves back if it leaves that set.
Both directions are guarded on the *previous* status, so re-confirming never
double-deducts and cancelling twice never double-credits.

**Checkout page detail.** It snapshots the submitted items before clearing
the cart, so the success recap still shows what was ordered.

---

## 7. Inventory

`Product.stockQty` is the live count. `StockMovement` is the append-only
record of how it got there.

**One mutation path.** Everything — inline `+`/`−`, the adjust dialog, bulk
receive, and order status changes — goes through `recordStockChange()` in
`lib/inventory.ts`. It runs in a transaction that reads the current quantity,
writes the new one, syncs `inStock` (`after > 0`), and writes the audit row
together. They cannot disagree, and two concurrent adjustments can't both
write from the same stale number.

**Derived numbers:**

- `committed` = units inside `PENDING` orders.
- `available` = `stockQty − committed`.
- Status, worst first: `OVERSOLD` (available < 0) → `OUT` (stock ≤ 0) →
  `LOW` (stock ≤ threshold) → `OK`.
- Threshold = `Product.lowStockThreshold` if set, else the store-wide
  `inventory_low_stock_threshold` setting, else 5.

**Valuation** uses the optional `costPriceCents`. Because cost is optional,
the summary card reports how many products it actually knows a cost for
rather than presenting a partial total as complete.

Reasons: `RESTOCK`, `SALE`, `RETURN`, `DAMAGE`, `LOST`, `CORRECTION`. Each
movement records the admin's name, or `System` for order-driven changes.

---

## 8. Fraud check

Bangladeshi COD is high-risk, so `/admin/fraud-check` looks a phone number up
against three couriers' merchant portals and reports each one's delivery
history for that customer.

`lib/fraud-check.ts` talks to **Pathao**, **RedX** and **Steadfast**
directly — no third-party service in between. All three run in parallel
(`Promise.all`) with an 8-second timeout each, and one courier failing is
reported as a per-courier error rather than failing the request. Access
tokens and session cookies are cached in-process for 50 minutes.

Output is each courier's raw success / cancel / total plus delivered and
return percentages. **There is no combined score** — the operator reads the
three and judges.

**Credentials** are your own merchant logins, resolved per field from
`SiteSetting` first (entered through the UI) and falling back to environment
variables. Passwords are encrypted with **AES-256-GCM** before storage, keyed
from a SHA-256 of `ADMIN_SESSION_SECRET`. A saved password is never sent back
to the browser, so a blank password field means "leave unchanged" rather than
"clear".

---

## 9. Cross-cutting mechanics

### Uploads must live outside the app directory

Hostinger deploys into a fresh `hbuilds/versions/<uuid>/` folder, repoints
`current` at it, and prunes the old one. Anything written under the app root
is destroyed on the next deploy. Worse, Next indexes `public/` at **build
time**, so a file written there at runtime is invisible to the static handler
and to `next/image` even before a redeploy.

So: `lib/uploads.ts` resolves the upload directory as
`UPLOAD_DIR` → `$HOME/uploads` (production) → `public/uploads` (dev), and
`/api/uploads/[...path]` serves the files, refusing path traversal, unknown
extensions and anything that isn't a regular file, and caching hard since
upload filenames are unique. Uploaded images are referenced as
`/api/uploads/<file>` and rendered with `unoptimized` (or a plain `<img>`
where the source may be an arbitrary external URL), because `next.config.mjs`
declares no `remotePatterns`.

The upload route generates the filename server-side and derives the extension
from the validated MIME type — the client's filename never reaches the path.
Limits: 10 MB, JPEG/PNG/WebP/GIF/AVIF, admin session required.

### Database-outage fallbacks

Storefront reads fall back to `FALLBACK_PRODUCTS`; the announcement bar,
banners, hero and admin dashboard each catch and render defaults. The site
degrades rather than 500s.

### Revalidation

Server actions call `revalidatePath` for every surface they affect. Stock
writes revalidate the storefront too, since stock drives the ADD TO CART
button — a correction that stopped at the admin panel would be half-applied.

---

## 10. Environment

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | MySQL connection string |
| `ADMIN_SESSION_SECRET` | yes | Signs admin JWTs **and** derives the credential-encryption key |
| `UPLOAD_DIR` | no | Overrides upload location; falls back to `$HOME/uploads` in production |
| `PATHAO_USER` / `PATHAO_PASSWORD` | no | Fraud check, if not set in the UI |
| `REDX_PHONE` / `REDX_PASSWORD` | no | ” |
| `STEADFAST_USER` / `STEADFAST_PASSWORD` | no | ” |

> Changing `ADMIN_SESSION_SECRET` invalidates every session **and** makes
> stored courier passwords undecryptable. Re-enter them after a rotation.

### Hostinger notes

- **LiteSpeed escapes `%` as `\%`** when injecting environment variables into
  the Node process. A DB password containing `%` fails authentication with no
  useful error. Keep it alphanumeric. (Read `/proc/<pid>/environ` to confirm
  what the process actually received.)
- glibc 2.28 → the build must use `--webpack`.
- The build runs `prisma generate`, **not** `db push`. Schema changes must be
  applied to the database separately, before deploying code that depends on
  them.
- After a schema change the running app needs a restart to pick up the
  regenerated Prisma client.

---

## 11. Known gaps

Accurate as of this document; worth clearing before launch.

1. **Hardcoded admin fallback** — `admin@kanzie.com` / `admin123456` works
   whenever the `AdminUser` lookup misses. No password-change UI exists.
2. **`README.md` is still create-next-app boilerplate.**
3. **`.env.local.example` is stale** — it says `/api/checkout` returns 501,
   which hasn't been true since the manual order flow landed.
4. **`/api/video` caches Google Drive downloads into `public/videos/`** —
   inside the app directory, so on Hostinger the cache is destroyed by every
   deploy and the redirect it issues can 404. Same class of bug that uploads
   already fixed; it should write to the upload directory and stream through
   a route instead.
5. **No `prisma/migrations/`** — schema is applied with `db push`, so there's
   no recorded history and no rollback path.
6. **No rate limiting** on `/api/checkout` or the admin login.
7. **`catch (err: any)`** throughout trips `@typescript-eslint/no-explicit-any`.
   Lint is not part of the build, so it doesn't block deploys.
8. **One live product has a broken image** from an old `/uploads/...` path
   saved before the upload fix; the file was destroyed by a redeploy and the
   product needs re-uploading.
