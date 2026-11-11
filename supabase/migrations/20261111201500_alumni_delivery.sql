alter table public.demands
  add column if not exists delivery text;

alter table public.demands
  drop constraint if exists demands_delivery_check;

alter table public.demands
  add constraint demands_delivery_check
  check (delivery is null or delivery in ('okul', 'kargo'));

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
        'delivery', d.delivery,
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

drop function if exists public.submit_demand(jsonb);
drop function if exists private.submit_demand(jsonb);

create function private.submit_demand(p_items jsonb, p_delivery text default null)
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
  chosen text;
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

  chosen := nullif(lower(btrim(coalesce(p_delivery, ''))), '');
  if prole = 'mezun' then
    if chosen is null or chosen not in ('okul', 'kargo') then
      return jsonb_build_object('error', 'Teslim şeklini seç.', 'status', 400);
    end if;
  else
    chosen := null;
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

  insert into public.demands (user_id, requester_name, role, delivery)
  values (uid, pname, prole, chosen)
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

create function public.submit_demand(p_items jsonb, p_delivery text default null)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.submit_demand(p_items, p_delivery);
$$;

revoke all on function private.submit_demand(jsonb, text) from public;
revoke all on function public.submit_demand(jsonb, text) from public;

grant execute on function private.submit_demand(jsonb, text)
to anon, authenticated, postgres, service_role;
grant execute on function public.submit_demand(jsonb, text)
to anon, authenticated, service_role;

notify pgrst, 'reload schema';
