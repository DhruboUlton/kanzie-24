# KANZIE Admin Build Plan

Seven phases from a hardcoded product array to a working admin panel. The order is
a dependency chain, not a preference — orders can't be managed before they're
stored, and nothing can be stored before there's a database.

| | |
|---|---|
| Products in code | 15 |
| Categories | 3 |
| Orders stored | 0 |
| Database tables | 0 |
| Auth | none |

---

## Where the code stands

Read from the current tree, not assumed. Two things here are load-bearing for the
whole plan: the product read path was already built as a database seam, and orders
are not recorded anywhere.

**HAVE — a clean swap seam for the catalog.**
All 15 products live in a hardcoded array in `src/lib/products.ts`, but every read
already goes through six `async` functions. Swapping the array for database queries
touches one file and no storefront component.

**MISSING — orders are never written down.**
`POST /api/checkout` mints a `tran_id`, opens the SSLCommerz session, and forgets
it. The IPN route validates the payment server-to-server and then discards the
result — there's a `TODO` in the file saying exactly this. An order screen has
nothing to show until this is fixed.

**RISK — no amount verification on the way back.**
The success and IPN routes check that SSLCommerz says `VALID`, but never compare
the returned `amount` and `currency` against what was actually owed. Worth closing
in Phase 2 regardless of the admin panel.

**MISSING — no authentication of any kind.**
No users, no sessions, no `middleware.ts`. All of it is Phase 3.

**RISK — product pages are static.**
`src/app/products/[slug]/page.tsx` uses `generateStaticParams`, so pages are frozen
at build time. Edits made in an admin panel would not appear until the next deploy
unless revalidation is added.

**RISK — product photos aren't licensed.**
Everything under `/public/products-dev/` is scraped placeholder imagery, flagged as
such in the source comments. Replace before launch, independent of this work.

**HAVE — the right dependencies already installed.**
Zod 4 for validation, Next 16.3.3 with Server Actions, React 19, Tailwind 4.
Nothing in the admin panel needs a framework change.

---

## Decisions first

Six answers set the shape of everything below. The recommendation on each is what
I'd pick for a 15-SKU store run by one person.

### 1. Where does it run?

Vercel has a read-only filesystem, which rules out storing products in a JSON file
and rules out writing uploads into `/public`. A Hostinger VPS allows both but you
manage the box.

**Pick: Vercel** — the storefront already previews there.

### 2. Which database?

Postgres on Neon (serverless, generous free tier, works on Vercel and a VPS alike),
MySQL if you stay on Hostinger, or SQLite via Turso for the smallest possible setup.

**Pick: Postgres on Neon.**

### 3. Prisma or Drizzle?

Prisma has better ergonomics and ships Prisma Studio, which is a usable emergency
admin from day one. Drizzle is lighter and starts faster on cold serverless
invocations.

**Pick: Prisma** — Studio covers you while Phase 4 is being built.

### 4. How do you log in?

A single owner account with an email and password is a few dozen lines. Auth.js
adds Google sign-in and multi-user roles, plus a dependency that churns between
major versions.

**Pick: one owner account, hand-rolled session cookie.**

### 5. Where do photos live?

Vercel Blob if you're on Vercel, Cloudinary if you want automatic resizing and
format conversion, Cloudflare R2 if you want the cheapest storage and don't mind
wiring the transforms yourself.

**Pick: Vercel Blob**, unless you want Cloudinary's auto-resizing.

### 6. Build it or adopt it?

Everything below is hand-rolled. Payload CMS runs inside Next.js and would hand you
auth, media, and CRUD screens nearly free — at the cost of adopting its data
conventions. See [The shortcut](#the-shortcut-stated-honestly) at the end.

**Pick: hand-rolled** — the store is small and the payment flow is custom.

---

## The seven phases

Each phase names what gets built, what it's blocked by, and the check that says
it's actually finished. Sizes are rough: **S** is an afternoon, **M** is a day or
two, **L** is longer.

### Phase 1 — Put a database behind the existing seam

**Size M · blocked by: the six decisions**

The catalog moves from a TypeScript array into Postgres, and the storefront doesn't
notice. This works because `src/lib/products.ts` was written with exactly this
migration in mind — keep the six exported function signatures identical and no
component needs editing.

- `prisma/schema.prisma` — Category, Product, Order, OrderItem, OrderEvent, AdminUser
- `prisma/seed.ts` — imports the current 15 products verbatim, so nothing is retyped or lost
- Rewrite the internals of `src/lib/products.ts`; exported signatures unchanged
- Swap build-time `generateStaticParams` for on-demand `revalidatePath`, so admin edits appear immediately without a redeploy
- Add `DATABASE_URL` to `.env.local.example` with a comment, never a real value

The shape worth agreeing on before any of it is written:

```prisma
model Product {
  id                  String    @id @default(cuid())
  slug                String    @unique
  name, brand, sku    String
  category            Category  @relation(...)
  priceCents          Int                // integers only — never floats
  compareAtPriceCents Int?
  scale               String
  shortDescription    String
  description         String
  features            String[]
  specs               Json               // [{ label, value }]
  images              String[]
  featured            Boolean   @default(false)
  isNew               Boolean   @default(false)
  inStock             Boolean   @default(true)
  stockQty            Int?               // Phase 7 turns the boolean into a count
  videoUrl            String?
  archivedAt          DateTime?          // soft delete — orders reference products
}
```

**Done when:** the storefront renders identically to today, `npx tsc --noEmit` is
clean, and all 15 products plus 3 categories are queryable from the database.

### Phase 2 — Start recording orders

**Size M · blocked by: Phase 1**

This is the prerequisite everyone forgets. An orders screen is worthless until
orders exist as rows, so the payment routes have to learn to write before the admin
can learn to read. This phase also closes the amount-check gap flagged above.

- `POST /api/checkout` writes a `PENDING` order plus line items *before* redirecting, snapshotting the server-looked-up price on each line
- IPN route marks the order `PAID` on `VALID`/`VALIDATED`, and stores `val_id`, `bank_tran_id`, and card type
- **Verify the returned amount and currency match the order total** before marking anything paid
- Success, fail, and cancel routes update status too — keyed on `tran_id` and guarded so an already-paid order can't be re-applied
- Every status change writes an `OrderEvent` row, which becomes the timeline in Phase 6

> **Careful:** the IPN and the browser redirect both arrive, in either order, and
> SSLCommerz retries the IPN on any non-2xx response. Every write here has to be
> safe to run twice.

**Done when:** a sandbox payment produces a `PAID` order with correct line items,
and replaying the same IPN twice changes nothing the second time.

### Phase 3 — Login and the admin shell

**Size M · blocked by: Phase 1**

The admin needs its own chrome — no announcement bar, no cart drawer, no storefront
footer. In the App Router that means route groups, which physically moves existing
page files. It's the one disruptive step in the plan, so it's worth doing
deliberately in its own commit.

- Move storefront chrome out of the root layout into `app/(storefront)/layout.tsx`; the root layout keeps only `html`, `body`, and fonts
- `app/(admin)/admin/layout.tsx` — sidebar nav, no storefront components
- `/admin/login` with a bcrypt password hash on the `AdminUser` row
- Session in an `httpOnly`, `Secure`, `SameSite=Lax` signed cookie, keyed off a new `ADMIN_SESSION_SECRET`
- `middleware.ts` redirects unauthenticated hits on `/admin/*` to the login page
- Rate-limit failed login attempts

> **Security:** middleware is a redirect convenience, not a security boundary — it
> can be bypassed. Every admin server action and route handler must independently
> verify the session before it touches data.

**Done when:** every storefront page still renders correctly after the file moves,
`/admin` bounces you to login when signed out, and a direct call to an admin action
without a valid session is rejected server-side.

### Phase 4 — Product management

**Size L · blocked by: Phases 1, 3**

The screen you'll actually live in. One shared form covers create and edit, so
there's a single place to change when the product shape changes.

- `/admin/products` — table with thumbnail, name, SKU, category, price, stock and flags; search, category filter, sort
- `/admin/products/new` and `/admin/products/[id]/edit` sharing one form component
- Repeatable rows for `features` and `specs`, and an image list you can reorder and remove from
- Video field validated through the existing `parseVideoUrl` in `src/lib/video.ts`, with a live preview and a clear error for unsupported hosts
- One Zod schema in `src/lib/schemas/product.ts` used by both the form and the server action
- Slug auto-generated from the name, editable, checked for uniqueness
- Delete sets `archivedAt` rather than removing the row, so past orders keep resolving
- Each save revalidates `/`, `/products`, and that product's page

> **Note:** use Server Actions rather than route handlers for admin writes — they
> carry a built-in origin check, so you get CSRF protection without building it.

**Done when:** you can create a product, see it on the storefront without
redeploying, edit its price, and archive it — all without touching code.

### Phase 5 — Photo uploads

**Size S · blocked by: Phase 4**

Until this lands, product images are pasted URLs. After it, you drop files onto the
form.

- Upload action streams to the blob store and saves the returned URL on the product
- Allowlist JPEG, PNG, and WebP by content type; cap the file size; generate the stored filename server-side rather than trusting the client's
- One-time script to move the existing `/public/products-dev/` files into the blob store

> **Reminder:** those existing files are scraped placeholders and aren't licensed
> for production. Migrating them keeps development working; it doesn't make them
> shippable.

**Done when:** a photo dropped on the edit form appears on the live product page,
and a `.txt` renamed to `.jpg` is rejected.

### Phase 6 — Order management

**Size M · blocked by: Phases 2, 3**

Now that orders are rows with an event history, this is mostly presentation.

- `/admin/orders` — transaction ID, date, customer, total, status, payment method; filter by status and date range
- `/admin/orders/[id]` — line items at their purchased prices, customer and shipping details, gateway fields, and the status timeline
- Mark packed, shipped with a tracking number, delivered, or cancelled — each with an optional note, each writing an `OrderEvent`
- Printable packing slip

> **Scope:** issuing real refunds means integrating the separate SSLCommerz refund
> API. Out of scope here — for now a cancellation is a status and a note, and the
> money moves in their merchant dashboard. Say if you want it included.

**Done when:** a sandbox order appears in the list within seconds of payment, opens
with correct line items, and can be walked through to Delivered with the timeline
recording each step.

### Phase 7 — Dashboard and settings

**Size M · blocked by: Phases 4, 6**

The part that makes it feel finished rather than functional. Everything here is
optional and can be picked apart by usefulness.

- `/admin` landing — revenue, order count, average order value, recent orders, low stock
- Turn `inStock` into a real `stockQty` count, decremented when an order is paid
- Category create, rename, reorder, delete
- A settings table for the announcement bar text, hero slides, and featured-product ordering — the last things still hardcoded in components

**Done when:** the announcement bar and hero slider can be changed from `/admin`
without a deploy.

---

## Rules that hold across every phase

Constraints that already exist in this codebase and shouldn't be broken by the new
work.

| Rule | Why it matters here |
|---|---|
| **Money is integers** | Prices are stored as `priceCents` and only converted at the SSLCommerz boundary, which wants taka. Keep every total in integer cents and never let a float into the math. |
| **Never trust client prices** | The checkout route already re-looks-up every price server-side, with a comment saying so. Order writes in Phase 2 must keep doing this — snapshot the server's price onto the line item, not the browser's. |
| **Secrets stay out of git** | `.env*` is gitignored except `.env*.example`. Every new key — `DATABASE_URL`, `ADMIN_SESSION_SECRET`, the blob token — gets an entry in the example file with a comment and no value. |
| **Server actions over route handlers** | For admin mutations, actions give you origin checking for free. Route handlers would need CSRF protection built by hand. |
| **Revalidate on write** | Every admin save has to invalidate the pages it affects, or the storefront keeps serving the version from before your edit. |
| **Soft delete only** | Orders reference products. Hard-deleting a product breaks the history of everyone who bought it. |
| **Read the local Next docs** | Per the repo's own `AGENTS.md`: Next 16 has breaking changes against older conventions. Check `node_modules/next/dist/docs/` before writing routing or caching code. |

---

## The shortcut, stated honestly

### Payload CMS would collapse phases 3 through 5

Payload runs inside a Next.js App Router project and would hand you authentication,
media uploads, and generated CRUD screens for products and categories — most of two
weeks of the plan above, essentially free. That's a real offer and I'd rather you
hear it than discover it later.

The cost: you adopt its collection conventions, its admin UI look, and its data
layer, which replaces the clean seam already sitting in `src/lib/products.ts`.
Orders still need custom work either way, since they come from SSLCommerz rather
than a Payload checkout.

**My call: build it.** Fifteen products and one payment integration isn't enough
surface area to justify inheriting a framework's opinions, and the product read path
is already shaped for a plain database. But if speed matters more than fit, Payload
is the honest fast path — say so and I'll replan around it.

---

*Plan only — no application code changed. Repo: rc-toy-store · branch main · 28 Aug 2026*
