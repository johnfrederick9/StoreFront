# Storefront: Supabase → Neon + Drizzle + Auth.js + Vercel Blob

> Greenfield rebuild of the data layer. The old Storefront tables were already
> dropped from the shared Supabase project, so **there is no data or user
> migration** — new users sign up fresh on the new stack.

## Target stack

| Concern | Was (Supabase) | Now |
| --- | --- | --- |
| Database | Supabase Postgres | **Neon** (serverless Postgres) |
| Query layer | `supabase.from(...)` | **Drizzle ORM** (type-safe) |
| Migrations | hand-pasted `schema.sql` | **drizzle-kit** (`generate` + `migrate`) |
| Auth | Supabase Auth | **Auth.js / NextAuth v5** (Credentials + JWT sessions) |
| File storage | Supabase Storage buckets | **Vercel Blob** |
| Authorization | Postgres RLS (`owner_id = auth.uid()`) | **App-layer checks** (`where ownerId = session.user.id`) |
| RPC functions | `decrement_product_stock`, `get_order_receipt` | Drizzle (atomic `UPDATE`, join query) |

## Phase 0 — Provisioning (you, in dashboards) — DO THIS FIRST

1. **Neon** → create a project → copy the pooled connection string into
   `DATABASE_URL`.
2. **Vercel Blob** → Storage → Create Blob store → copy `BLOB_READ_WRITE_TOKEN`.
3. **Auth secret** → run `npx auth secret` (or `openssl rand -base64 32`) →
   `AUTH_SECRET`.
4. Keep `RESEND_API_KEY` and the Stripe keys you already have.

`web/.env.local` ends up with:
```
DATABASE_URL=postgresql://...neon.tech/...?sslmode=require
AUTH_SECRET=...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
RESEND_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```
The old `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` go away.

## Phase 1 — Drizzle schema + DB client  ⬅ in progress

- `npm i drizzle-orm @neondatabase/serverless` + `npm i -D drizzle-kit dotenv`
- `lib/db/schema.ts` — 5 store tables + Auth.js tables (users w/ `passwordHash`,
  accounts, sessions, verificationTokens) + `passwordResetTokens`.
- `lib/db/index.ts` — Neon pool + Drizzle instance (transaction-capable).
- `drizzle.config.ts`
- Generate + push: `npx drizzle-kit generate && npx drizzle-kit migrate`.

## Phase 2 — Auth.js (NextAuth v5)

- `npm i next-auth@beta @auth/drizzle-adapter bcryptjs` + `-D @types/bcryptjs`
- `auth.config.ts` (edge-safe: providers list + authorized callback for
  middleware) and `auth.ts` (adapter + Credentials provider w/ bcrypt verify,
  `session.strategy = 'jwt'`).
- `app/api/auth/[...nextauth]/route.ts` — export the handlers.
- `middleware.ts` — replace `proxy.ts` route protection with NextAuth.
- Rewrite: `signup/actions.ts` (hash + insert user), `login/actions.ts`
  (`signIn('credentials')`), `dashboard/actions.ts` (`signOut`).
- **Password reset** (Credentials has none built in): `passwordResetTokens`
  table + `forgot-password` (issue token, email via Resend) +
  `reset-password` (verify token, update hash). Delete `auth/callback/route.ts`
  (was Supabase email-confirm).

## Phase 3 — DB queries (Supabase → Drizzle)

Replace every `supabase.from(...)` (~15 files) with Drizzle. Each query that
was protected by RLS gets an explicit `where(eq(stores.ownerId, session.user.id))`.
Files: `dashboard/page.tsx`, `dashboard/new/actions.ts`,
`dashboard/[slug]/{page,products/*,orders/*}`, `s/[slug]/*`,
`api/checkout/route.ts`, `api/stripe/webhook/route.ts`.

## Phase 4 — Storage (Supabase → Vercel Blob)

- `npm i @vercel/blob`
- `dashboard/new/actions.ts` (store logo) + `dashboard/[slug]/products/actions.ts`
  (product image): `put(path, file, { access: 'public' })` → store returned URL.
- `lib/image.ts`: drop the Supabase render-URL rewrite; serve Blob URLs through
  `next/image` for resizing instead (passthrough helper).

## Phase 5 — RPC → Drizzle

- `api/stripe/webhook/route.ts`: `decrement_product_stock` →
  `update(products).set({ stock: sql\`stock - ${qty}\` }).where(and(eq(id), gte(stock, qty))).returning()`.
- `s/[slug]/success/page.tsx`: `get_order_receipt` → Drizzle join across
  orders/order_items/products/stores.

## Phase 6 — Cleanup + verify

- Delete `lib/supabase/*`, `supabase/` SQL (`schema.sql`, `multi_project.sql`,
  `restore_to_new_project.sql`), `proxy.ts`.
- `npm uninstall @supabase/ssr @supabase/supabase-js`.
- `npx tsc --noEmit`, `npm run build`, manual smoke test (signup, login,
  create store, upload logo, add product w/ image, storefront browse, checkout,
  webhook order, receipt, password reset).

## Done-when checklist

- [ ] Neon DB reachable; migrations applied.
- [ ] Signup / login / logout / password reset work (fresh accounts).
- [ ] Dashboard scoped to the logged-in owner; no cross-store leakage.
- [ ] Logo + product image upload to Vercel Blob; images render.
- [ ] Checkout → Stripe → webhook creates order, decrements stock atomically.
- [ ] Receipt page renders via the Drizzle query.
- [ ] No `@supabase/*` imports remain; build is clean.
