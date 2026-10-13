-- Hàng ký gửi + lựa chọn (mùi / cỡ / mẫu) cho sản phẩm — 13/10/2026.
-- Đã chạy bằng Supabase MCP (migration gem_ky_gui_options).
--
-- products.consignor  tên nơi ký gửi; null = đồ Gem tự làm. Web hiện nhãn
--                     "Ký gửi · <tên>" trên thẻ và trong bảng chi tiết.
-- products.options    null, hoặc
--     { "label_vi": "Mùi hương", "label_en": "Scent",
--       "choices": [ { "key": "matcha-latte", "vi": "Matcha Latte", "en": "Matcha Latte",
--                      "note_vi": "…", "note_en": "…",
--                      "image": "images/products/….webp", "out": true }, … ] }
--     key   chữ thường / số / gạch ngang, KHÔNG đổi sau khi tạo: giỏ hàng của
--           khách và create_order() nhận lựa chọn bằng key.
--     out   true = lựa chọn đó tạm hết (ô mờ, không bấm được).
--     Mọi lựa chọn chung một giá — giá vẫn ở cột price của sản phẩm.
-- products.notes_vi / notes_en
--                     ghi chú cuối bảng chi tiết (bảng cỡ, chất liệu, cách
--                     dùng). Chữ thường, mỗi ý một dòng; web hiện bằng
--                     textContent, không bao giờ innerHTML.
-- order_items.option_vi
--                     lựa chọn khách đã chọn, chụp lại lúc đặt (tên tiếng
--                     Việt) — đơn cũ vẫn đúng khi sản phẩm đổi về sau.
--
-- GRANT: không cần thêm. anon đọc products bằng SELECT cả bảng, nhân sự ghi
-- bằng INSERT/UPDATE cả bảng, nên cột mới tự có quyền; order_items chỉ được
-- ghi qua create_order() (SECURITY DEFINER). Vẫn chạy câu kiểm
-- GRANT-vs-policy trong docs/design.md sau file này.
--
-- Chạy được trước khi code mới lên web: bản web cũ chỉ gửi sku + qty, mà
-- món cũ không có lựa chọn nên create_order() vẫn nhận như trước.

alter table public.products
  add column if not exists consignor text,
  add column if not exists options   jsonb,
  add column if not exists notes_vi  text,
  add column if not exists notes_en  text;

alter table public.order_items
  add column if not exists option_vi text;

-- Kiểm hình dạng options ngay trong database, để một lần sửa tay sai (hay
-- một bản admin cũ) không làm hỏng trang Sản phẩm.
create or replace function public.product_options_ok(o jsonb)
returns boolean
language sql
immutable
set search_path = ''
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
    )
    and (select count(distinct c->>'key') from jsonb_array_elements(o->'choices') c)
        = jsonb_array_length(o->'choices')
  )
$$;

-- Hàm chạy trong CHECK bằng quyền của người đang ghi (nhân sự), nên
-- authenticated cần EXECUTE; khách (anon) không ghi products nên không cần.
revoke execute on function public.product_options_ok(jsonb) from public, anon;
grant execute on function public.product_options_ok(jsonb) to authenticated;

alter table public.products drop constraint if exists products_options_ok;
alter table public.products add constraint products_options_ok
  check (public.product_options_ok(options));

alter table public.products drop constraint if exists products_consignor_len;
alter table public.products add constraint products_consignor_len
  check (consignor is null or char_length(consignor) between 1 and 80);

alter table public.products drop constraint if exists products_notes_len;
alter table public.products add constraint products_notes_len
  check (coalesce(char_length(notes_vi), 0) <= 4000 and coalesce(char_length(notes_en), 0) <= 4000);

-- Đặt đơn: như cũ, thêm phần lựa chọn. Món có lựa chọn thì mỗi dòng phải gửi
-- kèm "option" (key), lựa chọn đó phải có thật và còn hàng.
create or replace function public.create_order(
  p_name text, p_phone text, p_items jsonb,
  p_email text default null, p_address text default null, p_note text default null,
  p_channel text default null, p_payment text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id       uuid;
  v_code     text;
  v_sub      integer := 0;
  v_unpriced boolean := false;
  v_count    integer;
  v_pay      text;
  v_thresh   integer;
  it         jsonb;
  v_qty      integer;
  v_p        public.products%rowtype;
  v_choice   jsonb;
  v_opt      text;
begin
  if coalesce(btrim(p_name), '')  = '' then
    return jsonb_build_object('ok', false, 'error', 'no_name');
  end if;
  if coalesce(btrim(p_phone), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'no_phone');
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'bad_items');
  end if;

  v_count := jsonb_array_length(p_items);
  if v_count = 0 or v_count > 50 then
    return jsonb_build_object('ok', false, 'error', 'bad_items');
  end if;

  v_pay := case when p_payment in ('cod', 'qr') then p_payment end;

  v_code := public.gen_order_code();
  insert into public.orders (code, name, phone, email, address, note, channel, payment_method)
  values (v_code, btrim(p_name), btrim(p_phone),
          nullif(btrim(coalesce(p_email, '')),   ''),
          nullif(btrim(coalesce(p_address, '')), ''),
          nullif(btrim(coalesce(p_note, '')),    ''),
          case when p_channel in ('zalo','messenger','email') then p_channel end,
          v_pay)
  returning id into v_id;

  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((it->>'qty')::int, 0);
    if v_qty < 1 or v_qty > 99 then
      raise exception 'bad_qty' using errcode = 'check_violation';
    end if;

    select * into v_p from public.products
    where sku = (it->>'sku') and is_published;

    if not found then
      raise exception 'unknown_sku' using errcode = 'check_violation';
    end if;

    -- Món có lựa chọn (mùi, cỡ, mẫu): phải chọn một, và lựa chọn đó phải còn.
    -- Tên lựa chọn được chụp lại vào order_items như tên và giá.
    v_opt := null;
    if v_p.options is not null then
      select c into v_choice
        from jsonb_array_elements(v_p.options->'choices') c
       where c->>'key' = (it->>'option')
       limit 1;
      if v_choice is null then
        raise exception 'need_option' using errcode = 'check_violation';
      end if;
      if coalesce((v_choice->>'out')::boolean, false) then
        raise exception 'option_out' using errcode = 'check_violation';
      end if;
      v_opt := v_choice->>'vi';
    end if;

    insert into public.order_items (order_id, product_id, sku, name_vi, qty, price, price_max, option_vi)
    values (v_id, v_p.id, v_p.sku, v_p.name_vi, v_qty, v_p.price, v_p.price_max, v_opt);

    if v_p.price is null then
      v_unpriced := true;
    else
      v_sub := v_sub + v_p.price * v_qty;
    end if;
  end loop;

  -- Đơn to mà chọn COD thì từ chối, để khách chọn lại chứ không im lặng đổi
  -- hộ — đổi hộ là khách tưởng trả khi nhận rồi lại bị đòi trả trước.
  select coalesce((value->>'prepay_threshold')::int, 0) into v_thresh
  from public.settings where key = 'payment';

  if v_thresh > 0 and v_pay = 'cod' and v_sub >= v_thresh then
    raise exception 'prepay_required' using errcode = 'check_violation';
  end if;

  update public.orders
     set subtotal = v_sub, has_unpriced = v_unpriced
   where id = v_id;

  return jsonb_build_object('ok', true, 'code', v_code, 'subtotal', v_sub,
                            'has_unpriced', v_unpriced, 'payment_method', v_pay);
exception
  when check_violation then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end $function$;

-- Mail báo đơn (Edge Function notify) in thêm lựa chọn của từng món.
create or replace function public.notify_payload(p_kind text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare v jsonb; v_at timestamptz; v_to jsonb;
begin
  if p_kind = 'order' then
    select to_jsonb(o) || jsonb_build_object('items', coalesce((
             select jsonb_agg(jsonb_build_object('name', i.name_vi, 'option', i.option_vi,
                                                 'qty', i.qty, 'price', i.price) order by i.name_vi)
             from public.order_items i where i.order_id = o.id), '[]'::jsonb)), o.created_at
      into v, v_at from public.orders o where o.id = p_id;
  elsif p_kind = 'booking' then
    select to_jsonb(b) || jsonb_build_object('starts_at', s.starts_at, 'workshop', w.name_vi), b.created_at
      into v, v_at
      from public.bookings b join public.sessions s on s.id = b.session_id
      left join public.workshop_types w on w.id = s.workshop_type_id
     where b.id = p_id;
  elsif p_kind = 'note' then
    select to_jsonb(n), n.created_at into v, v_at from public.notes n where n.id = p_id;
  else
    return jsonb_build_object('error', 'bad_kind');
  end if;

  if v is null then return jsonb_build_object('error', 'not_found'); end if;
  if v_at < now() - interval '1 hour' then return jsonb_build_object('old', true); end if;

  insert into public.notify_log (kind, ref) values (p_kind, p_id) on conflict do nothing;
  if not found then return jsonb_build_object('dup', true); end if;

  select coalesce(jsonb_agg(u.email), '[]'::jsonb) into v_to
    from public.staff st join auth.users u on u.id = st.user_id where u.email is not null;

  return jsonb_build_object('data', v, 'to', v_to);
end $function$;
