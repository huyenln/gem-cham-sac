-- create_order(): cờ "tự đến lấy" (p_pickup) — 18/11/2026 (Anna).
--
-- Ngưỡng bắt buộc chuyển khoản (settings.payment.prepay_threshold, đặt 250.000đ) chỉ áp cho
-- đơn GIAO TẬN NƠI: đơn tự đến lấy hàng có sẵn trả khi đến lấy được, món vẫn nằm ở studio.
-- Trước đây database không biết đơn nào tự đến lấy (web chỉ gửi chữ "Tự đến cửa hàng lấy" vào
-- ô địa chỉ), nên ngưỡng chặn cả đơn tự đến lấy.
--   - p_pickup boolean default false, ở CUỐI: web cũ không gửi nó vẫn gọi được (mặc định = giao).
--   - Tự đến lấy: địa chỉ ghi cố định "Tự đến lấy tại studio" (không lấy chữ trình duyệt gửi),
--     để nhân sự không thấy một địa chỉ giao trên đơn đã được miễn chuyển khoản trước.
--   - Ngoài hai chỗ đó, thân hàm giữ nguyên bản đang chạy.
--
-- Thêm tham số = hàm MỚI (chữ ký khác): phải DROP bản cũ (PostgREST báo lỗi khi có hai bản
-- cùng tên khớp lời gọi) rồi CẤP LẠI QUYỀN như cũ: anon + authenticated EXECUTE, PUBLIC không.
-- Thiếu GRANT là khách không đặt được đơn ("permission denied") — lỗi đã dính ba lần.
--
-- CHẠY TRƯỚC KHI MERGE (web cũ vẫn chạy với hàm mới). Kiểm sau khi chạy: cuối file.
-- Đổi ngưỡng thành 250.000đ thì làm SAU KHI MERGE (web mới mới mở nút "Trả khi nhận" cho đơn
-- tự đến lấy từ 250.000đ): admin → Cài đặt, hoặc câu update ở cuối file.

begin;

drop function if exists public.create_order(text, text, jsonb, text, text, text, text, text);

create function public.create_order(p_name text, p_phone text, p_items jsonb, p_email text default null::text, p_address text default null::text, p_note text default null::text, p_channel text default null::text, p_payment text default null::text, p_pickup boolean default false)
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
  v_pickup   boolean := coalesce(p_pickup, false);
  it         jsonb;
  v_qty      integer;
  v_p        public.products%rowtype;
  v_choice   jsonb;
  v_opt      text;
  v_spec     text;
  v_dp       jsonb;
  v_price    integer;
  v_pmax     integer;
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
          -- Tự đến lấy: một chữ cố định, không phải địa chỉ trình duyệt gửi lên
          case when v_pickup then 'Tự đến lấy tại studio'
               else nullif(btrim(coalesce(p_address, '')), '') end,
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

    -- Thiết kế riêng (mã từ Bàn thiết kế): giá tính theo thiết kế, không theo
    -- giá món; túi thiết kế không cần chọn "Mẫu". Cỡ riêng: chưa có giá.
    v_opt := null;
    v_spec := nullif(it->>'spec', '');
    v_price := v_p.price;
    v_pmax := v_p.price_max;
    if v_spec is not null then
      v_dp := public.design_price(v_spec, v_p.sku);
      if v_dp is null then
        raise exception 'bad_design' using errcode = 'check_violation';
      end if;
      v_price := (v_dp->>'price')::int;
      v_pmax := case when (v_dp->>'max')::int > v_price then (v_dp->>'max')::int end;
      v_opt := case when v_price is null then 'Thiết kế riêng · cỡ riêng, báo giá sau' else 'Thiết kế riêng' end;
    -- Món có lựa chọn (mùi, cỡ, mẫu): phải chọn một, và lựa chọn đó phải còn.
    -- Tên lựa chọn được chụp lại vào order_items như tên và giá.
    elsif v_p.options is not null then
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
    values (v_id, v_p.id, v_p.sku, v_p.name_vi, v_qty, v_price, v_pmax, v_opt);

    if v_price is null then
      v_unpriced := true;
    else
      v_sub := v_sub + v_price * v_qty;
    end if;
  end loop;

  -- Đơn GIAO TẬN NƠI to mà chọn COD thì từ chối, để khách chọn lại chứ không
  -- im lặng đổi hộ — đổi hộ là khách tưởng trả khi nhận rồi lại bị đòi trả
  -- trước. Đơn tự đến lấy thì trả khi đến lấy được (Anna 18/11/2026).
  select coalesce((value->>'prepay_threshold')::int, 0) into v_thresh
  from public.settings where key = 'payment';

  if v_thresh > 0 and v_pay = 'cod' and v_sub >= v_thresh and not v_pickup then
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

revoke all on function public.create_order(text, text, jsonb, text, text, text, text, text, boolean) from public;
grant execute on function public.create_order(text, text, jsonb, text, text, text, text, text, boolean) to anon, authenticated;

commit;

-- Kiểm sau khi chạy (ba vai: khách = anon, đăng nhập = authenticated; nhân sự cũng là
-- authenticated — hàm SECURITY DEFINER nên chỉ cần quyền EXECUTE). Mong đợi: t, t, f.
--   select has_function_privilege('anon', 'public.create_order(text,text,jsonb,text,text,text,text,text,boolean)', 'execute'),
--          has_function_privilege('authenticated', 'public.create_order(text,text,jsonb,text,text,text,text,text,boolean)', 'execute'),
--          exists (select 1 from pg_proc where proname = 'create_order' and pronargs = 8);
--
-- SAU KHI MERGE — ngưỡng 250.000đ cho đơn giao tận nơi:
--   update public.settings set value = jsonb_set(value, '{prepay_threshold}', '250000') where key = 'payment';
