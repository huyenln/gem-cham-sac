-- Bàn thiết kế: dây đeo cổ tay (22/10/2026). Run BEFORE the JS that offers
-- it goes live (an order with the stitch would be refused by the old
-- design_price). Safe to run twice.
--
-- 1. The strap is one side pieced from two fabrics, across ("ngang") or along
--    it ("doc"), no longer shown twice (outside / inside); an old "hai" code
--    reads as "ngang" (js/patch.js LEGACY). No charge for either layout
--    beyond the fabrics; Gem picking counts "ngang" as two fabrics.
-- 2. A machine stitch down the strap's middle (Gem's Janome): field 13 gets
--    "e<stitch><thread>", priced at products.daydeo.embroider (the owner sets
--    it in admin → Sản phẩm → Giá thiết kế; 10.000đ to start).
update public.settings
set value = jsonb_set(jsonb_set(value,
      '{products,daydeo,embroider}', coalesce(value #> '{products,daydeo,embroider}', '10000'::jsonb)),
      '{gem,ngang}', coalesce(value #> '{gem,ngang}', '2'::jsonb))
where key = 'design_pricing';

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
  extra  int := 0;
  nf     int;
  quote  boolean := false;
  tok    text;
  tv     jsonb;
begin
  if p_spec is null or length(p_spec) > 4000 then return null; end if;
  f := string_to_array(p_spec, '~');
  n := cardinality(f);
  -- 13: size / options; 14: each patch's fabric turned (no price)
  if n < 9 or n > 14 or f[1] <> '2' then return null; end if;
  if n = 14 and f[14] !~ '^[0-3]{1,64}$' then return null; end if;
  v_prod := f[2];
  v_lay  := f[3];
  v_fab  := case when n >= 11 then f[11] else '' end;
  v_ext  := case when n >= 13 then f[13] else '' end;

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
        -- an amount, or [from, to] (the bow, by its size)
        tv := cfg->'ties'->(substr(tok, 2)::int);
        if jsonb_typeof(tv) = 'array' then
          total := total + coalesce((tv->>0)::int, 0);
          extra := extra + greatest(coalesce((tv->>1)::int, 0) - coalesce((tv->>0)::int, 0), 0);
        elsif jsonb_typeof(tv) = 'number' then
          total := total + (tv #>> '{}')::int;
        end if;
      elsif tok ~ '^e[1-9][0-9]$' then
        -- the strap's stitch down the middle (which stitch, which thread)
        total := total + coalesce((cfg->>'embroider')::int, 0);
      else
        return null;
      end if;
    end loop;
  end if;

  return jsonb_build_object('price', case when quote then null else total end, 'from', total,
                            'max', case when quote then null else total + extra end);
end $function$;

-- only create_order (security definer) calls it
revoke execute on function public.design_price(text, text) from public, anon, authenticated;
