-- Membership lives in auth.users. Public catalog, campaign settings,
-- orders, and locks live here. Cross-user updates run in private functions.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres, service_role, anon, authenticated;

create table public.settings (
  id integer primary key,
  deadline timestamptz not null,
  activation integer not null,
  cap integer not null,
  payment_hours integer not null,
  constraint settings_singleton check (id = 1)
);

create table public.products (
  id text primary key,
  slug text not null,
  name text not null,
  short text not null,
  image_url text not null,
  cost100 integer not null check (cost100 > 0),
  sizes text[] not null,
  sort_order integer not null,
  size_chart jsonb not null
);

create table public.campaign_locks (
  product_id text primary key references public.products (id),
  locked_at timestamptz not null
);

create table public.lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null references public.products (id),
  size text not null,
  qty integer not null check (qty > 0),
  status text not null check (status in ('waitlist', 'committed', 'overflow', 'forfeited')),
  max_price integer,
  paid_at timestamptz,
  pay_by timestamptz,
  created_at timestamptz not null default now()
);

create index lines_product_status_idx on public.lines (product_id, status);
create index lines_user_created_idx on public.lines (user_id, created_at);

alter table public.settings enable row level security;
alter table public.products enable row level security;
alter table public.lines enable row level security;
alter table public.campaign_locks enable row level security;

create policy campaign_locks_none on public.campaign_locks
  for select to anon, authenticated
  using (false);

create policy settings_read on public.settings
  for select to anon, authenticated
  using (true);

create policy products_read on public.products
  for select to anon, authenticated
  using (true);

create policy lines_read_own on public.lines
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete, truncate on public.settings from anon, authenticated;
revoke insert, update, delete, truncate on public.products from anon, authenticated;
revoke all on public.lines from anon;
revoke insert, update, delete, truncate on public.lines from authenticated;
revoke all on public.campaign_locks from anon, authenticated;

insert into public.settings (id, deadline, activation, cap, payment_hours)
values (1, '2026-10-08 23:59:00+03', 70, 100, 48);

insert into public.products (id, slug, name, short, image_url, cost100, sizes, sort_order, size_chart)
values
  (
    'hoodie', 'hoodie', 'Zipup', 'Fermuarlı, ekose astar',
    'https://ortqerpwpwkomcmyoyim.supabase.co/storage/v1/object/public/products/hoodie.jpg',
    50000, array['S','M','L','XL','XXL'], 1,
    '{"note":"Fermuarlı, oversized. Göğüs ölçüleri giysi düz eni.","cols":["Beden","Göğüs","Boy","Kol"],"rows":[{"size":"S","a":58,"b":68,"c":60},{"size":"M","a":61,"b":70,"c":62},{"size":"L","a":64,"b":72,"c":64},{"size":"XL","a":67,"b":74,"c":65},{"size":"XXL","a":70,"b":76,"c":66}]}'::jsonb
  ),
  (
    'tee', 'tee', 'Reglan Kollu Tee', 'Bordo raglan kol',
    'https://ortqerpwpwkomcmyoyim.supabase.co/storage/v1/object/public/products/tee.jpg',
    25000, array['S','M','L','XL','XXL'], 2,
    '{"note":"Raglan kol, boxy kesim. Bir beden büyük düşünülebilir.","cols":["Beden","Göğüs","Boy","Kol"],"rows":[{"size":"S","a":54,"b":66,"c":21},{"size":"M","a":57,"b":68,"c":22},{"size":"L","a":60,"b":70,"c":23},{"size":"XL","a":63,"b":72,"c":24},{"size":"XXL","a":66,"b":74,"c":25}]}'::jsonb
  ),
  (
    'sweat', 'sweat', 'Sweatpants', 'Lacivert, yan şeritli eşofman',
    'https://ortqerpwpwkomcmyoyim.supabase.co/storage/v1/object/public/products/pants.jpg',
    40000, array['S','M','L','XL','XXL'], 3,
    '{"note":"Eşofman. Bel rahat lastikli; ölçü giysi düz eni.","cols":["Beden","Bel","Boy","Paça"],"rows":[{"size":"S","a":36,"b":100,"c":22},{"size":"M","a":38,"b":102,"c":23},{"size":"L","a":40,"b":104,"c":24},{"size":"XL","a":42,"b":106,"c":25},{"size":"XXL","a":44,"b":108,"c":26}]}'::jsonb
  ),
  (
    'tote', 'ringer', 'Ringer Tee', 'Bordo, beyaz yakalı ringer',
    'https://ortqerpwpwkomcmyoyim.supabase.co/storage/v1/object/public/products/ringer.jpg',
    25000, array['S','M','L','XL','XXL'], 4,
    '{"note":"Klasik ringer yaka. Göğüs ölçüleri giysi düz eni.","cols":["Beden","Göğüs","Boy","Kol"],"rows":[{"size":"S","a":54,"b":66,"c":21},{"size":"M","a":57,"b":68,"c":22},{"size":"L","a":60,"b":70,"c":23},{"size":"XL","a":63,"b":72,"c":24},{"size":"XXL","a":66,"b":74,"c":25}]}'::jsonb
  );

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = true;

create policy products_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'products');

create or replace function private.payment_due(
  status text,
  locked_at timestamptz,
  deadline timestamptz,
  hours integer
)
returns timestamptz
language sql
immutable
security definer
set search_path = ''
as $$
  select case
    when status = 'frozen' then deadline + pg_catalog.make_interval(hours => hours)
    when status = 'locked' and locked_at is not null then locked_at + pg_catalog.make_interval(hours => hours)
    else null
  end;
$$;

create or replace function private.line_json(l public.lines)
returns jsonb
language sql
immutable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'id', l.id,
    'userId', l.user_id,
    'productId', l.product_id,
    'size', l.size,
    'qty', l.qty,
    'status', l.status,
    'maxPrice', l.max_price,
    'paidAt', l.paid_at,
    'payBy', l.pay_by,
    'createdAt', l.created_at
  );
$$;

create or replace function private.view_for(pid text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  cost integer;
  activation integer;
  cap integer;
  hours integer;
  deadline timestamptz;
  primary_qty integer;
  overflow_qty integer;
  raw_demand integer;
  demand integer;
  overflow integer;
  past boolean;
  status text;
  locked_at timestamptz;
  current_price integer;
begin
  select s.deadline, s.activation, s.cap, s.payment_hours
    into deadline, activation, cap, hours
  from public.settings s
  where s.id = 1;

  select p.cost100 into cost from public.products p where p.id = pid;

  select coalesce(sum(l.qty), 0) into primary_qty
  from public.lines l
  where l.product_id = pid and l.status in ('waitlist', 'committed');

  select coalesce(sum(l.qty), 0) into overflow_qty
  from public.lines l
  where l.product_id = pid and l.status = 'overflow';

  raw_demand := primary_qty;
  demand := least(raw_demand, cap);
  overflow := overflow_qty + greatest(0, raw_demand - cap);
  past := pg_catalog.now() >= deadline;

  if past and demand < activation then
    status := 'failed';
  elsif past then
    status := 'frozen';
  elsif raw_demand >= cap then
    status := 'locked';
  elsif demand >= activation then
    status := 'active';
  else
    status := 'pending';
  end if;

  select cl.locked_at into locked_at
  from public.campaign_locks cl
  where cl.product_id = pid;

  if demand >= activation then
    current_price := round(cost::numeric / greatest(1, demand))::integer;
  else
    current_price := null;
  end if;

  return pg_catalog.jsonb_build_object(
    'demand', demand,
    'overflow', overflow,
    'status', status,
    'currentPrice', current_price,
    'priceAt70', round(cost::numeric / activation)::integer,
    'priceAt100', round(cost::numeric / cap)::integer,
    'neededForActivation', greatest(0, activation - raw_demand),
    'neededForMin', greatest(0, cap - raw_demand),
    'paymentOpen', status in ('locked', 'frozen'),
    'payBy', private.payment_due(status, locked_at, deadline, hours)
  );
end;
$$;

create or replace function private.promote_overflow(pid text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  cap integer;
  free integer;
  rec public.lines;
  due timestamptz;
  new_status text;
  take integer;
  view jsonb;
begin
  select s.cap into cap from public.settings s where s.id = 1;

  select cap - coalesce(sum(l.qty), 0) into free
  from public.lines l
  where l.product_id = pid and l.status in ('waitlist', 'committed');

  if free <= 0 then
    return;
  end if;

  view := private.view_for(pid);
  due := (view->>'payBy')::timestamptz;

  for rec in
    select *
    from public.lines l
    where l.product_id = pid and l.status = 'overflow'
    order by l.created_at, l.id
    for update
  loop
    exit when free <= 0;
    new_status := case when rec.max_price is not null then 'committed' else 'waitlist' end;

    if rec.qty <= free then
      update public.lines
      set status = new_status,
          paid_at = case when new_status = 'committed' then null else paid_at end,
          pay_by = case when new_status = 'committed' then due else pay_by end
      where id = rec.id;
      free := free - rec.qty;
    else
      take := free;
      update public.lines set qty = qty - take where id = rec.id;
      insert into public.lines (
        user_id, product_id, size, qty, status, max_price, paid_at, pay_by, created_at
      ) values (
        rec.user_id,
        rec.product_id,
        rec.size,
        take,
        new_status,
        rec.max_price,
        null,
        case when new_status = 'committed' then due else null end,
        rec.created_at
      );
      free := 0;
    end if;
  end loop;
end;
$$;

create or replace function private.tick()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  p public.products;
  view jsonb;
  status text;
  deadline timestamptz;
  hours integer;
  locked_at timestamptz;
  due timestamptz;
  rec public.lines;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lawina-store'));

  select s.deadline, s.payment_hours into deadline, hours
  from public.settings s
  where s.id = 1;

  for p in select * from public.products order by sort_order loop
    view := private.view_for(p.id);
    status := view->>'status';

    if status = 'locked' and not exists (
      select 1 from public.campaign_locks cl where cl.product_id = p.id
    ) then
      insert into public.campaign_locks (product_id, locked_at)
      values (p.id, pg_catalog.now());
    end if;

    select cl.locked_at into locked_at
    from public.campaign_locks cl
    where cl.product_id = p.id;

    due := private.payment_due(status, locked_at, deadline, hours);

    if due is not null then
      update public.lines
      set pay_by = due
      where product_id = p.id
        and status = 'committed'
        and paid_at is null
        and pay_by is null;
    end if;

    for rec in
      select *
      from public.lines l
      where l.product_id = p.id
        and l.status = 'committed'
        and l.paid_at is null
        and l.pay_by is not null
        and l.pay_by < pg_catalog.now()
      for update
    loop
      update public.lines set status = 'forfeited' where id = rec.id;
      perform private.promote_overflow(p.id);
    end loop;
  end loop;
end;
$$;

create or replace function private.catalog_body()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  result jsonb := '[]'::jsonb;
  p public.products;
  mine jsonb;
  uid uuid := auth.uid();
begin
  for p in select * from public.products order by sort_order loop
    select coalesce(pg_catalog.jsonb_agg(private.line_json(l) order by l.created_at), '[]'::jsonb)
      into mine
    from public.lines l
    where l.product_id = p.id
      and uid is not null
      and l.user_id = uid;

    result := result || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'id', p.id,
        'slug', p.slug,
        'name', p.name,
        'short', p.short,
        'image', p.image_url,
        'cost100', p.cost100,
        'sizes', to_jsonb(p.sizes),
        'seedDemand', 0
      ) || private.view_for(p.id) || pg_catalog.jsonb_build_object('mine', mine)
    );
  end loop;

  return result;
end;
$$;

create or replace function private.catalog()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform private.tick();
  return private.catalog_body();
end;
$$;

create or replace function private.cart()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  products jsonb;
  items jsonb;
begin
  if uid is null then
    return pg_catalog.jsonb_build_object('error', 'Giriş gerekli.', 'status', 401);
  end if;

  perform private.tick();
  products := private.catalog_body();

  select coalesce(pg_catalog.jsonb_agg(
    private.line_json(l) || pg_catalog.jsonb_build_object('product', item.product)
    order by l.created_at
  ), '[]'::jsonb)
    into items
  from public.lines l
  join lateral (
    select elem as product
    from pg_catalog.jsonb_array_elements(products) elem
    where elem->>'id' = l.product_id
  ) item on true
  where l.user_id = uid;

  return pg_catalog.jsonb_build_object('items', items, 'products', products);
end;
$$;

create or replace function private.add_line(
  p_product_id text,
  p_size text,
  p_qty integer,
  p_commit boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  product public.products;
  view jsonb;
  cap integer;
  slots integer;
  should_commit boolean;
  chunks jsonb := '[]'::jsonb;
  chunk jsonb;
  chunk_qty integer;
  chunk_status text;
  chunk_price integer;
  existing public.lines;
  created jsonb := '[]'::jsonb;
  inserted public.lines;
begin
  if uid is null then
    return pg_catalog.jsonb_build_object('error', 'Giriş yapmadan sepete ekleyemezsin.', 'status', 401);
  end if;

  perform private.tick();

  select * into product from public.products where id = p_product_id;
  if not found then
    return pg_catalog.jsonb_build_object('error', 'Ürün bulunamadı.', 'status', 404);
  end if;

  if p_size is null or btrim(p_size) = '' or not (p_size = any(product.sizes)) then
    return pg_catalog.jsonb_build_object('error', 'Beden seç.', 'status', 400);
  end if;

  if p_qty is null or p_qty < 1 or p_qty > 10 then
    return pg_catalog.jsonb_build_object('error', 'Adet 1–10 arasında olmalı.', 'status', 400);
  end if;

  view := private.view_for(product.id);
  if (view->>'status') in ('failed', 'frozen') then
    return pg_catalog.jsonb_build_object('error', 'Bu kampanya kapandı.', 'status', 400);
  end if;

  select s.cap into cap from public.settings s where s.id = 1;
  select greatest(0, cap - coalesce(sum(l.qty), 0)) into slots
  from public.lines l
  where l.product_id = product.id and l.status in ('waitlist', 'committed');

  should_commit := coalesce(p_commit, false)
    and (view->>'status') in ('active', 'locked');

  if slots <= 0 then
    chunks := pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'qty', p_qty,
      'status', 'overflow',
      'maxPrice', case when should_commit then (view->>'priceAt100')::integer else null end
    ));
  elsif p_qty <= slots then
    chunks := pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'qty', p_qty,
      'status', case when should_commit then 'committed' else 'waitlist' end,
      'maxPrice', case when should_commit then (view->>'currentPrice')::integer else null end
    ));
  else
    chunks := pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'qty', slots,
        'status', case when should_commit then 'committed' else 'waitlist' end,
        'maxPrice', case when should_commit then (view->>'currentPrice')::integer else null end
      ),
      pg_catalog.jsonb_build_object(
        'qty', p_qty - slots,
        'status', 'overflow',
        'maxPrice', case when should_commit then (view->>'priceAt100')::integer else null end
      )
    );
  end if;

  for chunk in select value from pg_catalog.jsonb_array_elements(chunks) loop
    chunk_qty := (chunk->>'qty')::integer;
    chunk_status := chunk->>'status';
    chunk_price := (chunk->>'maxPrice')::integer;

    inserted := null;
    if chunk_status <> 'committed' then
      select * into existing
      from public.lines l
      where l.user_id = uid
        and l.product_id = product.id
        and l.size = p_size
        and l.status = chunk_status
        and l.max_price is not distinct from chunk_price
      limit 1
      for update;
    else
      select * into existing from public.lines where false;
    end if;

    if found and existing.id is not null then
      update public.lines
      set qty = qty + chunk_qty
      where id = existing.id
      returning * into inserted;
    else
      insert into public.lines (
        user_id, product_id, size, qty, status, max_price, paid_at, pay_by
      ) values (
        uid, product.id, p_size, chunk_qty, chunk_status, chunk_price, null, null
      )
      returning * into inserted;
    end if;

    created := created || pg_catalog.jsonb_build_array(private.line_json(inserted));
  end loop;

  return pg_catalog.jsonb_build_object(
    'created', created,
    'view', private.view_for(product.id)
  );
end;
$$;

create or replace function private.remove_line(p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  rec public.lines;
begin
  if uid is null then
    return pg_catalog.jsonb_build_object('error', 'Giriş gerekli.', 'status', 401);
  end if;

  perform private.tick();

  select * into rec
  from public.lines
  where id = p_id and user_id = uid
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('error', 'Satır bulunamadı.', 'status', 404);
  end if;

  if rec.status = 'committed' then
    return pg_catalog.jsonb_build_object(
      'error', 'Kesinleşen sipariş silinemez — fiyatın sonradan artmasın diye.',
      'status', 409
    );
  end if;

  delete from public.lines where id = rec.id;
  perform private.promote_overflow(rec.product_id);
  return pg_catalog.jsonb_build_object('ok', true);
end;
$$;

create or replace function private.commit_lines(p_ids uuid[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  rec public.lines;
  view jsonb;
  found boolean := false;
  committed integer := 0;
  price integer;
  deadline timestamptz;
  hours integer;
  locked_at timestamptz;
begin
  if uid is null then
    return pg_catalog.jsonb_build_object('error', 'Giriş gerekli.', 'status', 401);
  end if;

  perform private.tick();

  select s.deadline, s.payment_hours into deadline, hours
  from public.settings s where s.id = 1;

  for rec in
    select *
    from public.lines l
    where l.user_id = uid
      and l.status = 'waitlist'
      and (p_ids is null or cardinality(p_ids) = 0 or l.id = any(p_ids))
    for update
  loop
    found := true;
    view := private.view_for(rec.product_id);
    if (view->>'status') in ('pending', 'failed') then
      continue;
    end if;

    price := coalesce((view->>'currentPrice')::integer, (view->>'priceAt70')::integer);
    select cl.locked_at into locked_at
    from public.campaign_locks cl
    where cl.product_id = rec.product_id;

    update public.lines
    set status = 'committed',
        max_price = price,
        paid_at = null,
        pay_by = private.payment_due(view->>'status', locked_at, deadline, hours)
    where id = rec.id;

    committed := committed + 1;
  end loop;

  if not found then
    return pg_catalog.jsonb_build_object('error', 'Kesinleştirilecek talep yok.', 'status', 400);
  end if;

  if committed = 0 then
    return pg_catalog.jsonb_build_object('error', 'Bu ürünler henüz 70 talebe ulaşmadı.', 'status', 409);
  end if;

  return pg_catalog.jsonb_build_object('ok', true, 'count', committed);
end;
$$;

create or replace function private.pay_line(p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  rec public.lines;
  view jsonb;
  current_price integer;
  unit integer;
begin
  if uid is null then
    return pg_catalog.jsonb_build_object('error', 'Giriş gerekli.', 'status', 401);
  end if;

  perform private.tick();

  select * into rec
  from public.lines
  where id = p_id and user_id = uid
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('error', 'Satır bulunamadı.', 'status', 404);
  end if;

  if rec.status <> 'committed' then
    return pg_catalog.jsonb_build_object('error', 'Sadece kesinleşen sipariş ödenir.', 'status', 409);
  end if;

  if rec.paid_at is not null then
    return pg_catalog.jsonb_build_object('error', 'Bu satır zaten ödendi.', 'status', 409);
  end if;

  if not exists (select 1 from public.products p where p.id = rec.product_id) then
    return pg_catalog.jsonb_build_object('error', 'Ürün yok.', 'status', 404);
  end if;

  view := private.view_for(rec.product_id);
  current_price := (view->>'currentPrice')::integer;

  if rec.max_price is null then
    unit := current_price;
  elsif current_price is null then
    unit := rec.max_price;
  else
    unit := least(rec.max_price, current_price);
  end if;

  if unit is null then
    return pg_catalog.jsonb_build_object('error', 'Bu ürün henüz üretime girmedi.', 'status', 409);
  end if;

  update public.lines set paid_at = pg_catalog.now() where id = rec.id;
  return pg_catalog.jsonb_build_object('ok', true, 'amount', unit * rec.qty);
end;
$$;

create or replace function public.catalog()
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.catalog();
$$;

create or replace function public.cart()
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.cart();
$$;

create or replace function public.add_line(
  p_product_id text,
  p_size text,
  p_qty integer,
  p_commit boolean
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.add_line(p_product_id, p_size, p_qty, p_commit);
$$;

create or replace function public.remove_line(p_id uuid)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.remove_line(p_id);
$$;

create or replace function public.commit_lines(p_ids uuid[])
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.commit_lines(p_ids);
$$;

create or replace function public.pay_line(p_id uuid)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.pay_line(p_id);
$$;

revoke all on all functions in schema private from public;
revoke all on function
  public.catalog(),
  public.cart(),
  public.add_line(text, text, integer, boolean),
  public.remove_line(uuid),
  public.commit_lines(uuid[]),
  public.pay_line(uuid)
from public;

grant execute on all functions in schema private to postgres, service_role;
grant execute on function
  private.catalog(),
  private.cart(),
  private.add_line(text, text, integer, boolean),
  private.remove_line(uuid),
  private.commit_lines(uuid[]),
  private.pay_line(uuid)
to anon, authenticated;

grant execute on function
  public.catalog(),
  public.cart(),
  public.add_line(text, text, integer, boolean),
  public.remove_line(uuid),
  public.commit_lines(uuid[]),
  public.pay_line(uuid)
to anon, authenticated, service_role;

notify pgrst, 'reload schema';
