-- Góc thử đồ (Studio 2D) đọc từ database (25/10/2026).
--
-- products.wear: món này đeo thử được trên nhân vật thế nào (null = không):
--   { "slot": "bag" | "wrist" | "charm" | "hair",   cầm tay / cổ tay / móc túi / tóc
--     "h":  0.02–0.6    cao bằng bao nhiêu phần chiều cao nhân vật
--     "dx", "dy": -0.5–0.5   xê dịch từ điểm bàn tay / gáy (theo chiều cao nhân vật)
--     "ax", "ay": 0–1        điểm cầm trên ảnh (0,0 = góc trên trái; quai túi ≈ 0.5, 0)
--     "img":  ảnh riêng để đeo (không có: Ảnh cắt nền của món / của mẫu) }
-- Mỗi "Mẫu" (options.choices[]) có thêm "cut": ảnh cắt nền của mẫu đó.
--
-- Chạy TRƯỚC khi merge. Bảng products cấp quyền THEO CỘT: cột mới phải
-- GRANT riêng, không thì khách đọc products sẽ lỗi permission denied.

create or replace function public.product_wear_ok(w jsonb)
returns boolean
language sql
immutable
set search_path to ''
as $$
  select w is null or (
    jsonb_typeof(w) = 'object'
    and not exists (select 1 from jsonb_object_keys(w) k where k not in ('slot', 'h', 'dx', 'dy', 'ax', 'ay', 'img'))
    and coalesce(w->>'slot', '') in ('bag', 'wrist', 'charm', 'hair')
    and case when jsonb_typeof(w->'h') = 'number' then (w->>'h')::numeric between 0.02 and 0.6 else false end
    and case when not w ? 'dx' then true when jsonb_typeof(w->'dx') = 'number' then abs((w->>'dx')::numeric) <= 0.5 else false end
    and case when not w ? 'dy' then true when jsonb_typeof(w->'dy') = 'number' then abs((w->>'dy')::numeric) <= 0.5 else false end
    and case when not w ? 'ax' then true when jsonb_typeof(w->'ax') = 'number' then (w->>'ax')::numeric between 0 and 1 else false end
    and case when not w ? 'ay' then true when jsonb_typeof(w->'ay') = 'number' then (w->>'ay')::numeric between 0 and 1 else false end
    and (not w ? 'img' or coalesce(w->>'img', '') ~
      '^(images/studio/wear/[a-z0-9_-]+\.webp|https://dxdovvqsfjeizsoprrfn\.supabase\.co/storage/v1/object/public/gem-media/[A-Za-z0-9%._-]+)$')
  )
$$;

-- choices[].cut: the same paths as image (a cut-out is a webp / png)
create or replace function public.product_options_ok(o jsonb)
returns boolean
language sql
immutable
set search_path to ''
as $$
  select o is null or (
    jsonb_typeof(o) = 'object'
    and jsonb_typeof(o->'choices') = 'array'
    and jsonb_array_length(o->'choices') between 1 and 60
    and char_length(coalesce(o->>'label_vi', '')) between 1 and 40
    and char_length(coalesce(o->>'label_en', '')) <= 40
    and not exists (
      select 1 from jsonb_array_elements(o->'choices') c
      where jsonb_typeof(c) <> 'object'
         or coalesce(c->>'key', '') !~ '^[a-z0-9-]{1,40}$'
         or char_length(coalesce(c->>'vi', '')) not between 1 and 60
         or char_length(coalesce(c->>'en', '')) > 60
         or char_length(coalesce(c->>'note_vi', '')) > 300
         or char_length(coalesce(c->>'note_en', '')) > 300
         or (c ? 'out' and jsonb_typeof(c->'out') <> 'boolean')
         or (c ? 'image' and jsonb_typeof(c->'image') <> 'null' and coalesce(c->>'image', '') !~
               '^(images/products/[a-z0-9_.-]+\.(webp|png|jpe?g)|https://dxdovvqsfjeizsoprrfn\.supabase\.co/storage/v1/object/public/gem-media/[A-Za-z0-9%._-]+)$')
         or (c ? 'cut' and jsonb_typeof(c->'cut') <> 'null' and coalesce(c->>'cut', '') !~
               '^(images/studio/[a-z0-9/_-]+\.(webp|png)|https://dxdovvqsfjeizsoprrfn\.supabase\.co/storage/v1/object/public/gem-media/[A-Za-z0-9%._-]+)$')
    )
    and (select count(distinct c->>'key') from jsonb_array_elements(o->'choices') c)
        = jsonb_array_length(o->'choices')
  )
$$;

alter table public.products add column if not exists wear jsonb;
alter table public.products drop constraint if exists products_wear_ok;
alter table public.products add constraint products_wear_ok check (public.product_wear_ok(wear));

-- Policy RLS lọc DÒNG, GRANT mở CỬA: khách đọc, nhân sự thêm / sửa
grant select (wear) on public.products to anon, authenticated;
grant insert (wear), update (wear) on public.products to authenticated;

-- The five pieces the corner had in code (js/studio.js WEAR until now):
-- their own drawn pictures, placed as before
update public.products set wear = '{"slot": "bag", "h": 0.2, "dy": -0.02, "ax": 0.44, "ay": 0, "img": "images/studio/wear/denim.webp"}'
  where sku = 'denim' and wear is null;
update public.products set wear = '{"slot": "bag", "h": 0.18, "dy": -0.02, "ax": 0.42, "ay": 0, "img": "images/studio/wear/oxford.webp"}'
  where sku = 'oxford' and wear is null;
update public.products set wear = '{"slot": "wrist", "h": 0.13, "dy": -0.05, "ax": 0.22, "ay": 0, "img": "images/studio/wear/daydeo.webp"}'
  where sku = 'daydeo' and wear is null;
update public.products set wear = '{"slot": "charm", "h": 0.1, "dy": 0, "ax": 0.2, "ay": 0.04, "img": "images/studio/wear/bloom.webp"}'
  where sku = 'bloom' and wear is null;
update public.products set wear = '{"slot": "hair", "h": 0.075, "dy": 0, "ax": 0.55, "ay": 0.5, "img": "images/studio/wear/scrunchie.webp"}'
  where sku = 'scrunchie' and wear is null;

-- Bags and pieces with a cut-out: tried on from now (sizes looked at on the
-- four characters; adjust in admin → Sản phẩm → Sửa → Đeo thử)
update public.products set wear = '{"slot": "bag", "h": 0.32, "ax": 0.5, "ay": 0}' where sku = 'tui-di-choi' and wear is null;
update public.products set wear = '{"slot": "bag", "h": 0.36, "ax": 0.5, "ay": 0}' where sku = 'tui-di-cho' and wear is null;
update public.products set wear = '{"slot": "bag", "h": 0.2, "ax": 0.5, "ay": 0}' where sku = 'tui-laptop' and wear is null;
-- the Origami pouch is a key ring: clipped to the bag, held by its ring
update public.products set wear = '{"slot": "charm", "h": 0.09, "ax": 0.17, "ay": 0.04}' where sku = 'origami' and wear is null;

-- Each "Mẫu" of the two bags: its own cut-out (tools/wear-cuts.py, cut from
-- its poster), so the bag in hand is the one picked
update public.products p set options = jsonb_set(p.options, '{choices}', (
  select jsonb_agg(case when c ? 'cut' or not (c->>'key' = any (array['bao-cat-meo', 'caro-hong', 'hoa-xanh', 'den-charm', 'do-den',
                                                                      'jeans-hong', 'jeans-vang', 'jeans-xanh']))
                        then c
                        else c || jsonb_build_object('cut', 'images/studio/wear/' || p.sku || '-' || (c->>'key') || '.webp') end
                   order by i)
  from jsonb_array_elements(p.options->'choices') with ordinality as t(c, i)))
where p.sku in ('tui-di-choi', 'tui-di-cho') and p.options is not null;
