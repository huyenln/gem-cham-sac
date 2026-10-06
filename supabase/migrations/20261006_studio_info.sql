-- Gem Studio: what a studio picture IS and what it says (loại + câu chuyện +
-- lời thoại), keyed by its image path so it follows the picture into every
-- layout. Customers read it (studio.html); only the owner writes (admin.html).
-- Run once in Supabase → SQL Editor. Then run the GRANT-vs-policy check in
-- docs/design.md: it must show no row for studio_info.

create table if not exists public.studio_info (
  src        text primary key check (char_length(src) between 1 and 400),
  kind       text not null default 'decor' check (kind in ('decor','product','story','zone','talk','board')),
  title_vi   text check (char_length(title_vi) <= 120),
  title_en   text check (char_length(title_en) <= 120),
  body_vi    text check (char_length(body_vi) <= 4000),
  body_en    text check (char_length(body_en) <= 4000),
  image      text check (char_length(image) <= 400),
  link       text check (char_length(link) <= 300),
  lines      jsonb not null default '[]'::jsonb
             check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) <= 20),
  updated_at timestamptz not null default now()
);

alter table public.studio_info enable row level security;

create policy si_read_all     on public.studio_info for select to anon, authenticated using (true);
create policy si_insert_owner on public.studio_info for insert to authenticated with check (is_owner());
create policy si_update_owner on public.studio_info for update to authenticated using (is_owner()) with check (is_owner());
create policy si_delete_owner on public.studio_info for delete to authenticated using (is_owner());

-- RLS filters ROWS, GRANT opens the DOOR: both are needed.
grant select on public.studio_info to anon, authenticated;
grant insert, update, delete on public.studio_info to authenticated;
