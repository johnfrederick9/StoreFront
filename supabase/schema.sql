-- Store Application schema
-- Paste this into the Supabase SQL editor after creating a new project.

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users not null,
  name text not null,
  slug text unique not null,
  currency text default 'USD',
  logo_url text,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores on delete cascade not null,
  name text not null,
  description text,
  price_cents int not null,
  image_url text,
  stock int default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores not null,
  customer_email text not null,
  customer_name text,
  total_cents int not null,
  status text default 'pending',
  stripe_session_id text unique,
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders on delete cascade not null,
  product_id uuid references products not null,
  quantity int not null,
  price_cents int not null
);

-- Stores the cart intent between /api/checkout and the Stripe webhook.
-- Keeps Stripe metadata under its 500-char-per-key limit regardless of cart size.
create table if not exists checkout_drafts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores on delete cascade not null,
  items jsonb not null,
  created_at timestamptz default now()
);

-- Indexes on foreign keys and common filter/order columns. Postgres does NOT
-- auto-index FKs, so queries like "list a store's products" sequential-scan
-- without these.
create index if not exists stores_owner_idx on stores (owner_id);
create index if not exists products_store_active_idx
  on products (store_id, active);
create index if not exists products_store_created_idx
  on products (store_id, created_at desc);
create index if not exists orders_store_created_idx
  on orders (store_id, created_at desc);
create index if not exists order_items_order_idx on order_items (order_id);
create index if not exists order_items_product_idx on order_items (product_id);
create index if not exists checkout_drafts_created_idx
  on checkout_drafts (created_at);

alter table stores enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table checkout_drafts enable row level security;

-- Anyone can create a draft (cart intent from a guest checkout). The draft is
-- later read by the webhook using the service role, so no SELECT policy is
-- needed for anon.
drop policy if exists "public creates checkout drafts" on checkout_drafts;
create policy "public creates checkout drafts"
  on checkout_drafts for insert
  with check (true);

drop policy if exists "owners manage their stores" on stores;
create policy "owners manage their stores"
  on stores for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "public reads stores" on stores;
create policy "public reads stores"
  on stores for select
  using (true);

drop policy if exists "public reads active products" on products;
create policy "public reads active products"
  on products for select
  using (active = true);

drop policy if exists "owners manage their products" on products;
create policy "owners manage their products"
  on products for all
  using (store_id in (select id from stores where owner_id = auth.uid()))
  with check (store_id in (select id from stores where owner_id = auth.uid()));

drop policy if exists "owners view their orders" on orders;
create policy "owners view their orders"
  on orders for select
  using (store_id in (select id from stores where owner_id = auth.uid()));

drop policy if exists "owners update their orders" on orders;
create policy "owners update their orders"
  on orders for update
  using (store_id in (select id from stores where owner_id = auth.uid()))
  with check (store_id in (select id from stores where owner_id = auth.uid()));

drop policy if exists "owners view their order items" on order_items;
create policy "owners view their order items"
  on order_items for select
  using (order_id in (
    select id from orders
    where store_id in (select id from stores where owner_id = auth.uid())
  ));

-- Atomic stock decrement. Called by the Stripe webhook after a successful
-- payment. The WHERE guard (stock >= p_quantity) makes the read + subtract
-- happen as a single row update — two concurrent checkouts for the last unit
-- cannot both succeed. Returns the new stock, or NULL if insufficient.
create or replace function decrement_product_stock(
  p_product_id uuid,
  p_quantity int
) returns int
language sql
security definer
set search_path = public
as $$
  update products
    set stock = stock - p_quantity
    where id = p_product_id
      and stock >= p_quantity
  returning stock;
$$;

-- Service role (webhook) is the only caller; anon/authenticated must not be
-- able to call this directly.
revoke all on function decrement_product_stock(uuid, int) from public;
revoke all on function decrement_product_stock(uuid, int) from anon;
revoke all on function decrement_product_stock(uuid, int) from authenticated;

-- Public receipt lookup by Stripe session id. Returns the order, its line
-- items, and the store (as JSONB) when the caller knows the exact session id.
-- Enumeration is prevented because session_ids are opaque 60+ char strings
-- only known to the buyer. SECURITY DEFINER bypasses RLS so anon can read
-- exactly one order without us opening up the orders table broadly.
create or replace function get_order_receipt(p_session_id text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id,
    'created_at', o.created_at,
    'total_cents', o.total_cents,
    'status', o.status,
    'customer_email', o.customer_email,
    'customer_name', o.customer_name,
    'store', jsonb_build_object(
      'name', s.name,
      'slug', s.slug,
      'currency', s.currency
    ),
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'name', p.name,
            'quantity', i.quantity,
            'price_cents', i.price_cents,
            'image_url', p.image_url
          )
          order by p.name
        )
        from order_items i
        left join products p on p.id = i.product_id
        where i.order_id = o.id
      ),
      '[]'::jsonb
    )
  )
  from orders o
  join stores s on s.id = o.store_id
  where o.stripe_session_id = p_session_id
  limit 1;
$$;

grant execute on function get_order_receipt(text) to anon, authenticated;

-- Storage bucket for store logos and product images (Week 2+)
insert into storage.buckets (id, name, public)
values ('store-logos', 'store-logos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public read store assets" on storage.objects;
create policy "public read store assets"
  on storage.objects for select
  using (bucket_id in ('store-logos', 'product-images'));

drop policy if exists "authenticated upload store assets" on storage.objects;
create policy "authenticated upload store assets"
  on storage.objects for insert
  with check (
    bucket_id in ('store-logos', 'product-images')
    and auth.role() = 'authenticated'
  );

drop policy if exists "authenticated delete own store assets" on storage.objects;
create policy "authenticated delete own store assets"
  on storage.objects for delete
  using (
    bucket_id in ('store-logos', 'product-images')
    and auth.uid() = owner
  );
