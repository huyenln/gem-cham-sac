-- Giá thiết kế riêng (Bàn thiết kế, 15/10/2026). Một thiết kế không còn lấy
-- giá cố định của món: giá = nền (cỡ thường) + công kiểu ghép + mỗi vải thêm
-- + cỡ lớn hơn + tuỳ chọn túi (chần bông, túi trong, khoá kéo, nút bấm, kiểu
-- buộc vai của túi buộc vai).
-- Cỡ khách tự điền: Gem báo giá sau (dòng đơn không có giá, đơn "có món chưa
-- có giá" như món "Liên hệ").
--
--   settings 'design_pricing'   các con số; khách đọc được (trang tự tính
--                               giá), chỉ nhân sự ghi (admin → Sản phẩm →
--                               Giá thiết kế, chỉ owner thấy nút).
--   design_price(spec, sku)     cùng phép tính với GemPatch.price() trong
--                               js/patch.js — sửa một bên thì sửa bên kia.
--   create_order                dòng có mã thiết kế (items[].spec) lấy giá từ
--                               design_price, không từ products.price; bỏ qua
--                               bắt buộc chọn "Mẫu" của túi (thiết kế là mẫu).
--
-- Chạy trong Supabase → SQL Editor, rồi chạy câu kiểm GRANT-vs-policy trong
-- docs/design.md (settings đã có GRANT, chỉ đổi policy đọc).

-- 1. ai cũng đọc được bảng giá thiết kế (như 'payment')
drop policy if exists st_read_public on public.settings;
create policy st_read_public on public.settings for select to anon, authenticated
  using (key in ('payment', 'design_pricing'));

-- 2. các con số ban đầu (= PRICING trong js/patch.js)
insert into public.settings (key, value) values ('design_pricing', $json$
{
  "fabric": 5000,
  "gem": {
    "mot": 1,
    "hai": 2,
    "doc": 2,
    "vuong": 3,
    "cabin": 3,
    "sao": 3,
    "chong": 2,
    "net": 3,
    "tuve": 1,
    "hoa1": 2,
    "hoa2": 3,
    "hoa3": 3
  },
  "products": {
    "goi": {
      "base": 150000,
      "fabric": 10000,
      "layouts": {
        "cabin": 30000,
        "sao": 50000,
        "chong": 30000,
        "net": 40000,
        "tuve": 30000
      },
      "sizes": [
        0,
        20000,
        40000
      ]
    },
    "lotcoc": {
      "base": 30000,
      "layouts": {
        "vuong": 5000,
        "cabin": 10000,
        "chong": 10000,
        "net": 10000,
        "tuve": 5000
      }
    },
    "lotcocv": {
      "base": 30000,
      "layouts": {
        "vuong": 5000,
        "cabin": 10000,
        "chong": 10000,
        "net": 10000,
        "tuve": 5000
      }
    },
    "scrunchie": {
      "base": 20000,
      "layouts": {
        "net": 5000,
        "tuve": 5000
      }
    },
    "origami": {
      "base": 70000,
      "layouts": {
        "hai": 5000,
        "net": 10000,
        "tuve": 10000
      }
    },
    "oxford": {
      "base": 130000,
      "fabric": 10000,
      "layouts": {
        "hai": 10000,
        "vuong": 20000,
        "net": 30000,
        "tuve": 20000
      }
    },
    "bloom": {
      "base": 25000,
      "layouts": {
        "hoa2": 10000,
        "hoa3": 20000,
        "tuve": 10000
      }
    },
    "bookmark": {
      "base": 22000,
      "layouts": {
        "tuve": 5000
      }
    },
    "daydeo": {
      "base": 35000,
      "layouts": {
        "tuve": 5000
      }
    },
    "tuitote": {
      "base": 160000,
      "fabric": 10000,
      "layouts": {
        "hai": 10000,
        "doc": 20000,
        "vuong": 30000,
        "net": 40000,
        "tuve": 30000
      },
      "sizes": [
        0,
        20000
      ],
      "quilt": 70000,
      "pocket": 20000,
      "zip": 30000,
      "snap": 10000
    },
    "tuino": {
      "base": 220000,
      "fabric": 10000,
      "layouts": {
        "hai": 10000,
        "doc": 20000,
        "vuong": 30000,
        "net": 40000,
        "tuve": 30000
      },
      "sizes": [
        0,
        30000
      ],
      "quilt": 60000,
      "pocket": 20000,
      "zip": 30000,
      "snap": 10000
    },
    "tuikhoa": {
      "base": 200000,
      "fabric": 10000,
      "layouts": {
        "hai": 10000,
        "doc": 20000,
        "vuong": 30000,
        "net": 40000,
        "tuve": 30000
      },
      "quilt": 50000,
      "pocket": 20000,
      "snap": 10000
    },
    "tuitamgiac": {
      "base": 100000,
      "fabric": 10000,
      "layouts": {
        "hai": 10000,
        "doc": 20000,
        "vuong": 30000,
        "net": 40000,
        "tuve": 30000
      },
      "quilt": 60000,
      "pocket": 20000,
      "zip": 30000,
      "snap": 10000
    },
    "tuibuoc": {
      "base": 180000,
      "fabric": 10000,
      "layouts": {
        "hai": 10000,
        "doc": 20000,
        "vuong": 30000,
        "net": 40000,
        "tuve": 30000
      },
      "quilt": 60000,
      "pocket": 20000,
      "snap": 10000,
      "ties": [
        0,
        0,
        10000,
        15000
      ]
    },
    "laptop": {
      "base": 260000,
      "fabric": 10000,
      "layouts": {
        "hai": 10000,
        "doc": 20000,
        "vuong": 30000,
        "net": 40000,
        "tuve": 30000
      },
      "sizes": [
        0,
        10000,
        20000
      ],
      "quilt": 50000,
      "pocket": 20000,
      "snap": 10000
    },
    "laptopq": {
      "base": 290000,
      "fabric": 10000,
      "layouts": {
        "hai": 10000,
        "doc": 20000,
        "vuong": 30000,
        "net": 40000,
        "tuve": 30000
      },
      "sizes": [
        0,
        10000,
        20000
      ],
      "quilt": 50000,
      "pocket": 20000,
      "snap": 10000
    }
  }
}
$json$::jsonb)
on conflict (key) do nothing;

-- 3. giá một thiết kế. null = mã không hợp lệ.
--    {price: số | null (cỡ riêng → báo giá), from: số}
create or replace function public.design_price(p_spec text, p_sku text)
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  f      text[];
  n      int;
  v_prod text;
  v_lay  text;
  v_fab  text;
  v_ext  text;
  pr     jsonb;
  cfg    jsonb;
  total  int;
  nf     int;
  quote  boolean := false;
  tok    text;
begin
  if p_spec is null or length(p_spec) > 4000 then return null; end if;
  f := string_to_array(p_spec, '~');
  n := cardinality(f);
  if n < 9 or n > 13 or f[1] <> '2' then return null; end if;
  v_prod := f[2];
  v_lay  := f[3];
  v_fab  := case when n >= 11 then f[11] else '' end;
  v_ext  := case when n = 13 then f[13] else '' end;

  -- the piece must be ordered as its own product
  if p_sku is distinct from (case
       when v_prod = 'lotcocv' then 'lotcoc'
       when v_prod = 'tuitote' then 'tui-di-cho'
       when v_prod in ('tuino', 'tuikhoa', 'tuitamgiac', 'tuibuoc') then 'tui-di-choi'
       when v_prod in ('laptop', 'laptopq') then 'tui-laptop'
       else v_prod end) then
    return null;
  end if;

  select value into pr from public.settings where key = 'design_pricing';
  cfg := pr->'products'->v_prod;
  if cfg is null or (cfg->>'base') is null then return null; end if;

  total := (cfg->>'base')::int + coalesce((cfg->'layouts'->>v_lay)::int, 0);
  if v_fab <> '' then
    select count(distinct c) into nf from regexp_split_to_table(v_fab, '') c;
  else
    nf := coalesce((pr->'gem'->>v_lay)::int, 2);
  end if;
  total := total + greatest(nf - 1, 0) * coalesce((cfg->>'fabric')::int, (pr->>'fabric')::int, 0);

  if v_ext <> '' then
    foreach tok in array string_to_array(v_ext, '.') loop
      if tok ~ '^s[1-9]$' then
        total := total + coalesce((cfg->'sizes'->>(substr(tok, 2)::int))::int, 0);
      elsif tok ~ '^c[0-9]{1,3}x[0-9]{1,3}$' then
        quote := true;
      elsif tok = 'q' then
        total := total + coalesce((cfg->>'quilt')::int, 0);
      elsif tok ~ '^p[1-5]$' then
        total := total + substr(tok, 2)::int * coalesce((cfg->>'pocket')::int, 0);
      elsif tok = 'z' then
        total := total + coalesce((cfg->>'zip')::int, 0);
      elsif tok = 'n' then
        total := total + coalesce((cfg->>'snap')::int, 0);
      elsif tok ~ '^t[1-9]$' then
        total := total + coalesce((cfg->'ties'->>(substr(tok, 2)::int))::int, 0);
      else
        return null;
      end if;
    end loop;
  end if;

  return jsonb_build_object('price', case when quote then null else total end, 'from', total);
end $function$;

-- only create_order (security definer) calls it
revoke execute on function public.design_price(text, text) from public, anon, authenticated;

-- 4. đơn hàng: dòng thiết kế lấy giá từ design_price
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
      v_pmax := null;
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
