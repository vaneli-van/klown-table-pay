-- Run this once in the shared Klown Pay Supabase project (SQL editor).
-- Staff-gated branding writer for Admin Central.
-- Mirrors the staff check used by public.save_pos_odoo_credentials.
create or replace function public.save_restaurant_branding(
  p_restaurant_id uuid,
  p_logo_url text,
  p_hero_url text,
  p_accent_color text,
  p_tagline_top text,
  p_tagline_bottom text,
  p_welcome_copy text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.staff s
    where s.id = auth.uid() and s.status = 'active'
  ) then
    raise exception 'Not authorised';
  end if;

  if p_accent_color is not null and p_accent_color !~ '^#[0-9a-fA-F]{6}$' then
    raise exception 'accent_color must be a #rrggbb hex value';
  end if;

  update public.restaurants
     set logo_url        = nullif(btrim(coalesce(p_logo_url, '')), ''),
         hero_url        = nullif(btrim(coalesce(p_hero_url, '')), ''),
         accent_color    = nullif(btrim(coalesce(p_accent_color, '')), ''),
         tagline_top     = nullif(btrim(coalesce(p_tagline_top, '')), ''),
         tagline_bottom  = nullif(btrim(coalesce(p_tagline_bottom, '')), ''),
         welcome_copy    = nullif(btrim(coalesce(p_welcome_copy, '')), '')
   where id = p_restaurant_id;

  if not found then
    raise exception 'Restaurant not found';
  end if;
end;
$$;

revoke all on function public.save_restaurant_branding(uuid, text, text, text, text, text, text) from public, anon;
grant execute on function public.save_restaurant_branding(uuid, text, text, text, text, text, text) to authenticated;
