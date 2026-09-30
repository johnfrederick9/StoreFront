# Storefront → Standalone Supabase Project (Migration Runbook)

> **Status:** planning. No data has been deleted yet. This document is the
> agreed plan; the destructive SQL is written *after* and only run at the end.

## Why

Storefront currently **shares one Supabase project** with Alay-Trabaho (same
Postgres, same `auth.users`). They were combined only because of the free-tier
2-project limit. We are splitting them so each app has independent auth, RLS,
and billing — and so the cross-app `user_metadata.app` gates can be retired.

## Decisions (locked)

| Question | Decision |
| --- | --- |
| Which app moves? | **Storefront moves out** to a brand-new project. Alay-Trabaho keeps the current/shared project. |
| User accounts? | **Keep accounts, password reset OK.** Migrate store-owner emails/profiles; each owner does a one-time password reset on first login to the new project. |

## What actually moves

A **Storefront user = a store owner** (`stores.owner_id → auth.users`).
Customers are *guest checkouts* (`orders.customer_email`) and are **not** auth
users — nothing to migrate for them.

**Tables** (in FK dependency order — create/insert parents first):

1. `stores`        (owned by `auth.users.id`)
2. `products`      (→ stores)
3. `orders`        (→ stores)
4. `order_items`   (→ orders, products)
5. `checkout_drafts` (→ stores; transient, can be skipped — see note)

**Also project-scoped, must be recreated on the new project:**

- Functions: `decrement_product_stock(uuid,int)`, `get_order_receipt(text)`
- RLS policies on all five tables + `storage.objects`
- Storage buckets: `store-logos`, `product-images` **and the files inside them**
- Indexes (defined in `schema.sql`)

> All of the above except the data rows and the files is already reproduced by
> running `supabase/schema.sql` on the new project. So schema is a one-shot;
> only **rows + storage files + users** need a real migration.

## Pre-flight checklist

- [ ] You have room for a second Supabase project (the original blocker).
- [ ] Note the **old** project ref/URL and the **new** one — easy to mix up.
- [ ] Have the `service_role` key for **both** projects (needed for user import
      and storage copy). Keep it server-side only; never commit it.
- [ ] Decide a low-traffic window — orders placed mid-migration on the old
      project won't exist on the new one.

## Steps

### 1. Create the new project
Supabase dashboard → New project. Record its URL + anon key + service_role key.

### 2. Build the schema on the new project
Run `supabase/schema.sql` in the **new** project's SQL Editor. It's idempotent
and creates tables, indexes, RLS, functions, and the storage buckets.
**Do NOT run `multi_project.sql` on the new project** — the `app` gate is only
needed while sharing; standalone Storefront doesn't need it.

### 3. Migrate the data rows (old → new)
Two practical options:

- **Option A — pg_dump (recommended, preserves everything):**
  ```bash
  # Dump only Storefront's tables from the OLD project, data only:
  pg_dump "$OLD_DB_URL" \
    --data-only --no-owner --disable-triggers \
    -t public.stores -t public.products -t public.orders \
    -t public.order_items -t public.checkout_drafts \
    > storefront_data.sql
  # Load into the NEW project:
  psql "$NEW_DB_URL" -f storefront_data.sql
  ```
  (Connection strings are in each project's Database settings.)

- **Option B — CSV per table** via the Table Editor export/import, in the FK
  order listed above. Slower, fine for small datasets.

> `checkout_drafts` is transient cart state between checkout and the Stripe
> webhook — safe to skip; only in-flight carts would be lost.

### 4. Migrate the users (store owners)
Because we chose **password reset OK**, we move identities without password
hashes:

1. Export owner accounts from the **old** project:
   ```sql
   select u.id, u.email, u.raw_user_meta_data
   from auth.users u
   where u.id in (select owner_id from public.stores);
   ```
2. Recreate them on the **new** project using the Admin API (service_role),
   preserving the **same `id`** so `stores.owner_id` keeps matching:
   ```ts
   // run server-side against the NEW project
   await admin.auth.admin.createUser({
     id,                       // reuse the old uid → FK integrity
     email,
     email_confirm: true,
     user_metadata,            // no 'app' tag needed on the standalone project
   })
   ```
   (If the Admin API rejects a forced `id`, import via the `auth.users` table
   with the service role instead, then they reset password as below.)
3. Tell owners to use **"Forgot password"** on first login to set a new
   password on the new project.

### 5. Repoint Storefront's env vars + redeploy
In `web/.env` (local) and Vercel → Project → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL  = <NEW project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY = <NEW anon key>
SUPABASE_SERVICE_ROLE_KEY = <NEW service_role>   # if used by webhook
```
Redeploy. **Verify** login, store dashboard, product list, a test checkout, and
that store logos/product images load (see step 6).

### 6. Migrate storage files
The buckets exist (step 2) but the **files don't**. Image URLs in `products`
/ `stores` point at the OLD project and will 404 once it's cleaned. Copy each
file from old → new bucket (download via service_role, re-upload), or have
owners re-upload. Confirm `logo_url` / `image_url` resolve on the new project.

### 7. Remove the cross-app gating code (Storefront repo)
Once the standalone project is verified, delete the gating we added for the
shared setup:

- `web/app/signup/actions.ts` — drop the `app: 'storefront'` tag from `data`.
- `web/app/login/actions.ts` — remove the
  `data.user?.user_metadata?.app !== 'storefront'` check + `signOut()`.
- `web/lib/supabase/proxy.ts` — remove the `isStrayUser` guard; use `user`
  directly again.
- Delete `supabase/multi_project.sql` (no longer relevant).

### 8. Clean the OLD (now Alay-Trabaho-only) project
**Only after steps 1–7 are verified.** Run the diagnostic-first cleanup that
lives in the Alay-Trabaho repo:
`alay_trabaho_web/supabase/separate_projects.sql`
— it drops Storefront's tables and removes orphaned `auth.users` rows. The
destructive statements there are commented out until you confirm the counts.

## Rollback

Until step 8 runs, the old project still has all Storefront data and users
intact. To roll back: point Storefront's env vars back at the old project and
redeploy. Keep `storefront_data.sql` and the user export until you're confident
the new project is healthy.

## Done-when

- [ ] Storefront runs entirely on the new project (login, dashboard, checkout,
      images).
- [ ] Owners can reset passwords and sign in.
- [ ] Cross-app gating code removed from the Storefront repo.
- [ ] Old project cleaned via `separate_projects.sql`; only Alay-Trabaho
      tables/users remain.
