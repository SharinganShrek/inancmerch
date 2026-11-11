-- Reopen the drop through 13 Nov 2026 23:59 Istanbul.
-- Two price groups: slots 1-100 and 101-200. Lock at 200.

alter table public.settings
  add column if not exists batch_size integer not null default 100;

update public.settings
set
  deadline = '2026-11-13 23:59:00+03',
  activation = 70,
  cap = 200,
  batch_size = 100
where id = 1;

update public.products
set name = 'Zip-up Ceket', short = 'Fermuarlı, ekose astar', cost100 = 154000
where id = 'hoodie';

update public.products
set name = 'Reglan Kollu Tişört', short = 'Bordo raglan kol', cost100 = 71500
where id = 'tee';

update public.products
set name = 'Eşofman', short = 'Lacivert, yan şeritli', cost100 = 121000
where id = 'sweat';

update public.products
set
  name = 'Basic Tişört',
  short = 'Bordo, göğüs logolu',
  slug = 'basic',
  cost100 = 60500,
  image_url = 'https://ortqerpwpwkomcmyoyim.supabase.co/storage/v1/object/public/products/basic.png'
where id = 'tote';

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('ogrenci', 'veli', 'mezun', 'ogretmen')),
  full_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.demands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  requester_name text not null,
  role text not null check (role in ('ogrenci', 'veli', 'mezun', 'ogretmen')),
  created_at timestamptz not null default now()
);

alter table public.lines
  add column if not exists demand_id uuid references public.demands (id) on delete cascade,
  add column if not exists requester_name text,
  add column if not exists batch smallint;

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'lines'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.lines drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.lines
  drop constraint if exists lines_status_check;

alter table public.lines
  add constraint lines_status_check
  check (status in ('waitlist', 'committed', 'overflow', 'forfeited', 'submitted'));

alter table public.lines
  drop constraint if exists lines_batch_check;

alter table public.lines
  add constraint lines_batch_check
  check (batch is null or batch in (1, 2));

create index if not exists lines_demand_idx on public.lines (demand_id);
create index if not exists demands_user_created_idx on public.demands (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.demands enable row level security;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists demands_read_own on public.demands;
create policy demands_read_own on public.demands
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
revoke all on public.demands from anon, authenticated;
grant select on public.demands to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r text := lower(btrim(coalesce(new.raw_user_meta_data->>'role', '')));
  n text := regexp_replace(btrim(coalesce(new.raw_user_meta_data->>'full_name', '')), '\s+', ' ', 'g');
begin
  if r not in ('ogrenci', 'veli', 'mezun', 'ogretmen') then
    return new;
  end if;
  if length(n) < 5 or position(' ' in n) = 0 then
    return new;
  end if;
  insert into public.profiles (id, role, full_name)
  values (new.id, r, left(n, 80))
  on conflict (id) do update
    set role = excluded.role,
        full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.save_profile(p_role text, p_full_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  r text := lower(btrim(coalesce(p_role, '')));
  n text := regexp_replace(btrim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
begin
  if uid is null then
    return jsonb_build_object('error', 'Giriş gerekli.', 'status', 401);
  end if;
  if r not in ('ogrenci', 'veli', 'mezun', 'ogretmen') then
    return jsonb_build_object('error', 'Geçersiz seçim.', 'status', 400);
  end if;
  if length(n) < 5 or position(' ' in n) = 0 or length(n) > 80 then
    return jsonb_build_object('error', 'İsim ve soyisim gir.', 'status', 400);
  end if;
  insert into public.profiles (id, role, full_name)
  values (uid, r, n)
  on conflict (id) do update
    set role = excluded.role,
        full_name = excluded.full_name;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function private.catalog()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  deadline timestamptz;
  activation integer;
  cap integer;
  batch_size integer;
  result jsonb := '[]'::jsonb;
  p public.products;
  b1 integer;
  b2 integer;
  demand integer;
  status text;
  price70 integer;
  price100 integer;
  live1 integer;
  live2 integer;
  mine jsonb;
begin
  select s.deadline, s.activation, s.cap, s.batch_size
    into deadline, activation, cap, batch_size
  from public.settings s
  where s.id = 1;

  for p in
    select * from public.products order by sort_order
  loop
    select
      coalesce(sum(l.qty) filter (where l.batch = 1), 0)::integer,
      coalesce(sum(l.qty) filter (where l.batch = 2), 0)::integer
      into b1, b2
    from public.lines l
    where l.product_id = p.id
      and l.status = 'submitted';

    demand := coalesce(b1, 0) + coalesce(b2, 0);
    if demand >= cap then
      status := 'soldout';
    elsif now() >= deadline then
      status := 'closed';
    else
      status := 'open';
    end if;

    price70 := round(p.cost100::numeric / activation)::integer;
    price100 := round(p.cost100::numeric / batch_size)::integer;
    live1 := case when b1 >= activation then round(p.cost100::numeric / b1)::integer else null end;
    live2 := case when b2 >= activation then round(p.cost100::numeric / b2)::integer else null end;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'demandId', l.demand_id,
        'productId', l.product_id,
        'size', l.size,
        'qty', l.qty,
        'batch', l.batch,
        'requesterName', l.requester_name,
        'unitPrice', case when l.batch = 1 then live1 else live2 end,
        'createdAt', l.created_at
      )
      order by l.created_at
    ), '[]'::jsonb)
      into mine
    from public.lines l
    where l.product_id = p.id
      and l.user_id = uid
      and l.status = 'submitted';

    result := result || jsonb_build_array(jsonb_build_object(
      'id', p.id,
      'slug', p.slug,
      'name', p.name,
      'short', p.short,
      'image', p.image_url,
      'sizes', to_jsonb(p.sizes),
      'demand', demand,
      'batch1', b1,
      'batch2', b2,
      'priceAt70', price70,
      'priceAt100', price100,
      'status', status,
      'stock', cap,
      'mine', mine
    ));
  end loop;

  return result;
end;
$$;

create or replace function private.my_demands()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  activation integer;
  batch_size integer;
  result jsonb;
begin
  if uid is null then
    return '[]'::jsonb;
  end if;

  select s.activation, s.batch_size
    into activation, batch_size
  from public.settings s
  where s.id = 1;

  select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb)
    into result
  from (
    select
      d.created_at,
      jsonb_build_object(
        'id', d.id,
        'createdAt', d.created_at,
        'requesterName', d.requester_name,
        'role', d.role,
        'items', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'productId', l.product_id,
              'productName', p.name,
              'image', p.image_url,
              'size', l.size,
              'qty', l.qty,
              'batch', l.batch,
              'unitPrice', case
                when l.batch = 1 and c.b1 >= activation then round(p.cost100::numeric / c.b1)::integer
                when l.batch = 2 and c.b2 >= activation then round(p.cost100::numeric / c.b2)::integer
                else null
              end,
              'priceAt70', round(p.cost100::numeric / activation)::integer,
              'priceAt100', round(p.cost100::numeric / batch_size)::integer,
              'batchCount', case when l.batch = 1 then c.b1 else c.b2 end
            )
            order by l.created_at
          )
          from public.lines l
          join public.products p on p.id = l.product_id
          left join lateral (
            select
              coalesce(sum(x.qty) filter (where x.batch = 1), 0)::integer as b1,
              coalesce(sum(x.qty) filter (where x.batch = 2), 0)::integer as b2
            from public.lines x
            where x.product_id = l.product_id
              and x.status = 'submitted'
          ) c on true
          where l.demand_id = d.id
            and l.status = 'submitted'
        ), '[]'::jsonb)
      ) as row_data
    from public.demands d
    where d.user_id = uid
  ) listed;

  return result;
end;
$$;

create or replace function private.submit_demand(p_items jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  pname text;
  prole text;
  deadline timestamptz;
  cap integer;
  batch_size integer;
  item jsonb;
  pid text;
  sz text;
  qty integer;
  current_qty integer;
  planned integer;
  base integer;
  take1 integer;
  take2 integer;
  prod public.products;
  added jsonb := '{}'::jsonb;
  pending jsonb := '[]'::jsonb;
  did uuid;
begin
  if uid is null then
    return jsonb_build_object('error', 'Talep için giriş yap.', 'status', 401);
  end if;

  select full_name, role into pname, prole
  from public.profiles
  where id = uid;

  if pname is null or btrim(pname) = '' then
    return jsonb_build_object('error', 'Hesabında isim kaydı yok.', 'status', 400);
  end if;

  select s.deadline, s.cap, s.batch_size
    into deadline, cap, batch_size
  from public.settings s
  where s.id = 1;

  if now() >= deadline then
    return jsonb_build_object('error', 'Talep alma kapandı.', 'status', 409);
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('error', 'Sepet boş.', 'status', 400);
  end if;

  if jsonb_array_length(p_items) > 40 then
    return jsonb_build_object('error', 'Sepet çok büyük.', 'status', 400);
  end if;

  perform pg_advisory_xact_lock(hashtext('lawina-store'));

  for item in select value from jsonb_array_elements(p_items)
  loop
    pid := item->>'productId';
    sz := item->>'size';
    if item->>'qty' is null or item->>'qty' !~ '^[0-9]+$' then
      return jsonb_build_object('error', 'Adet 1 ile 10 arasında olmalı.', 'status', 400);
    end if;
    qty := (item->>'qty')::integer;
    if qty < 1 or qty > 10 then
      return jsonb_build_object('error', 'Adet 1 ile 10 arasında olmalı.', 'status', 400);
    end if;

    select * into prod from public.products where id = pid;
    if not found then
      return jsonb_build_object('error', 'Ürün bulunamadı.', 'status', 400);
    end if;
    if sz is null or not (sz = any (prod.sizes)) then
      return jsonb_build_object('error', 'Beden seç.', 'status', 400);
    end if;

    select coalesce(sum(l.qty), 0)::integer into current_qty
    from public.lines l
    where l.product_id = pid
      and l.status = 'submitted';

    planned := coalesce((added->>pid)::integer, 0);
    base := current_qty + planned;
    if base >= cap then
      return jsonb_build_object('error', prod.name || ' tükendi.', 'status', 409);
    end if;
    if base + qty > cap then
      return jsonb_build_object('error', prod.name || ' için yeterli kontenjan kalmadı.', 'status', 409);
    end if;

    if base < batch_size then
      take1 := least(qty, batch_size - base);
      take2 := qty - take1;
    else
      take1 := 0;
      take2 := qty;
    end if;

    if take1 > 0 then
      pending := pending || jsonb_build_array(jsonb_build_object(
        'productId', pid, 'size', sz, 'qty', take1, 'batch', 1
      ));
    end if;
    if take2 > 0 then
      pending := pending || jsonb_build_array(jsonb_build_object(
        'productId', pid, 'size', sz, 'qty', take2, 'batch', 2
      ));
    end if;
    added := jsonb_set(added, array[pid], to_jsonb(planned + qty), true);
  end loop;

  insert into public.demands (user_id, requester_name, role)
  values (uid, pname, prole)
  returning id into did;

  for item in select value from jsonb_array_elements(pending)
  loop
    insert into public.lines (
      user_id, product_id, size, qty, status, demand_id, requester_name, batch
    ) values (
      uid,
      item->>'productId',
      item->>'size',
      (item->>'qty')::integer,
      'submitted',
      did,
      pname,
      (item->>'batch')::smallint
    );
  end loop;

  return jsonb_build_object('ok', true, 'demandId', did);
end;
$$;

create or replace function public.save_profile(p_role text, p_full_name text)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.save_profile(p_role, p_full_name);
$$;

create or replace function public.my_demands()
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.my_demands();
$$;

create or replace function public.submit_demand(p_items jsonb)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.submit_demand(p_items);
$$;

revoke all on function private.handle_new_user() from public;
revoke all on function private.save_profile(text, text) from public;
revoke all on function private.my_demands() from public;
revoke all on function private.submit_demand(jsonb) from public;
revoke all on function public.save_profile(text, text) from public;
revoke all on function public.my_demands() from public;
revoke all on function public.submit_demand(jsonb) from public;

grant usage on schema private to supabase_auth_admin;
grant execute on function private.handle_new_user() to supabase_auth_admin;
grant execute on function
  private.save_profile(text, text),
  private.my_demands(),
  private.submit_demand(jsonb)
to anon, authenticated, postgres, service_role;
grant execute on function
  public.save_profile(text, text),
  public.my_demands(),
  public.submit_demand(jsonb)
to anon, authenticated, service_role;

notify pgrst, 'reload schema';
