-- Phase 2: review in admin.html, publish instantly to creators.html (2026-11-27)
-- Run in Supabase -> SQL Editor after the earlier migrations. Safe to run twice.
--
--   admins               who may use admin.html (Supabase Auth users, added by hand below)
--   admin_*()            the ONLY things admin.html can do; each checks is_admin() first
--   creator-photos       PUBLIC bucket with the cropped photos (600x660 + 240x240). Only admins write.
--   creator-uploads      stays private; admins may now read it (signed links) to review photos
--   public_creators()    what creators.html reads: public fields of approved / live creators only.
--                        Contact details, DOB, gender, rates, notes and screenshots are never in it.
--
-- After running: Authentication -> Users -> Add user (email + password) for each reviewer, then
--   insert into public.admins (user_id, email)
--   select id, email from auth.users where email = 'reviewer@example.com';
-- and turn OFF "Allow new users to sign up" (Authentication -> Sign In / Providers).

-- ---------------------------------------------------------------- columns
alter table public.creators add column if not exists photo_url  text;   -- public cropped portrait
alter table public.creators add column if not exists avatar_url text;   -- public 240x240 square
alter table public.creators add column if not exists published_at timestamptz;

-- ---------------------------------------------------------------- admins
create table if not exists public.admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  email    text not null,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from public.admins where user_id = auth.uid())
$$;

create or replace function public._require_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed. Sign in with a reviewer account.' using errcode = '42501';
  end if;
end $$;

-- ---------------------------------------------------------------- admin: read
create or replace function public.admin_creators()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._require_admin();
  return coalesce((
    select jsonb_agg(to_jsonb(c) || jsonb_build_object('private', to_jsonb(p) - 'creator_id')
           order by c.submitted_at desc)
    from public.creators c left join public.creator_private p on p.creator_id = c.id), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------- admin: write
create or replace function public.admin_set_status(p_id uuid, p_status text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.creators;
begin
  perform public._require_admin();
  if p_status not in ('in_review', 'needs_info', 'live', 'rejected', 'paused', 'submitted') then
    raise exception 'Unknown status %', p_status using errcode = '22023';
  end if;
  update public.creators set
    status = p_status::public.creator_status,
    ops_notes = case when p_note is null then ops_notes
                     else nullif(btrim(concat_ws(E'\n', ops_notes,
                            to_char(now() at time zone 'Asia/Kolkata', 'DD Mon') || ': ' || left(btrim(p_note), 500))), '') end,
    published_at = case when p_status = 'live' then coalesce(published_at, now()) else published_at end,
    reviewed_at = case when p_status in ('live', 'rejected') then now() else reviewed_at end
  where id = p_id returning * into v;
  if not found then raise exception 'Creator not found' using errcode = 'P0002'; end if;
  return to_jsonb(v);
end $$;

-- corrections a reviewer may make before publishing (public profile fields only)
create or replace function public.admin_update_profile(p_id uuid, p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.creators;
begin
  perform public._require_admin();
  update public.creators set
    name           = coalesce(public._clean_text(p->>'name', 80), name),
    city           = coalesce(public._clean_text(p->>'city', 60), city),
    state          = case when p ? 'state' then public._clean_text(p->>'state', 60) else state end,
    bio            = case when p ? 'bio' then public._clean_text(p->>'bio', 600) else bio end,
    style          = case when p ? 'style' then public._clean_text(p->>'style', 600) else style end,
    brands         = case when p ? 'brands' then public._clean_text(p->>'brands', 300) else brands end,
    niches         = case when p ? 'niches' then public._clean_list(p->'niches') else niches end,
    langs          = case when p ? 'langs' then public._clean_list(p->'langs') else langs end,
    ig_followers   = case when p ? 'ig_followers' then coalesce(public._clean_count(p->'ig_followers'), ig_followers) else ig_followers end,
    yt_subscribers = case when p ? 'yt_subscribers' then coalesce(public._clean_count(p->'yt_subscribers'), yt_subscribers) else yt_subscribers end,
    featured       = coalesce(public._bool(p->>'featured'), featured),
    ops_notes      = case when p ? 'ops_notes' then public._clean_text(p->>'ops_notes', 2000) else ops_notes end
  where id = p_id returning * into v;
  if not found then raise exception 'Creator not found' using errcode = 'P0002'; end if;
  return to_jsonb(v);
end $$;

-- the cropped photo the reviewer uploaded to creator-photos
create or replace function public.admin_set_photo(p_id uuid, p_photo text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.creators;
begin
  perform public._require_admin();
  if p_photo !~ '^[a-z0-9._]{1,30}-[0-9]{10,16}\.jpg$' or p_avatar !~ '^[a-z0-9._]{1,30}-[0-9]{10,16}-sq\.jpg$'
     or not exists (select 1 from storage.objects where bucket_id = 'creator-photos' and name = p_photo)
     or not exists (select 1 from storage.objects where bucket_id = 'creator-photos' and name = p_avatar) then
    raise exception 'Photo upload not found' using errcode = '22023';
  end if;
  update public.creators set photo_url = p_photo, avatar_url = p_avatar where id = p_id returning * into v;
  if not found then raise exception 'Creator not found' using errcode = 'P0002'; end if;
  return to_jsonb(v);
end $$;

-- ---------------------------------------------------------------- public: the directory
create or replace function public.public_creators()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'handle', c.handle, 'name', c.name, 'city', c.city, 'state', coalesce(c.state, ''),
    'langs', c.langs, 'niches', c.niches, 'roles', c.roles, 'platforms', c.platforms,
    'followers', c.ig_followers, 'yt', c.yt_subscribers, 'ytLink', coalesce(c.yt_link, ''),
    'avgViews', coalesce(c.avg_views, ''), 'audienceIn', coalesce(c.audience_in, ''),
    'setup', coalesce(c.setup, ''), 'posts', coalesce(c.posts_consistently, ''),
    'travels', coalesce(c.open_to_travel, false), 'collabs', c.collabs,
    'brands', case when c.worked_with_brands is not false then coalesce(c.brands, '') else '' end,
    'bio', coalesce(c.bio, c.style, ''), 'style', case when c.bio is not null then coalesce(c.style, '') else '' end,
    'reels', c.best_posts, 'featured', c.featured,
    'photo', coalesce(c.photo_url, ''), 'avatar', coalesce(c.avatar_url, '')
  ) order by c.featured desc, greatest(c.ig_followers, c.yt_subscribers) desc), '[]'::jsonb)
  from public.creators c
  where c.status in ('approved', 'live')
$$;

revoke all on function public.is_admin(), public._require_admin(), public.admin_creators(),
  public.admin_set_status(uuid, text, text), public.admin_update_profile(uuid, jsonb),
  public.admin_set_photo(uuid, text, text), public.public_creators() from public, anon, authenticated;
grant execute on function public.is_admin(), public.admin_creators(), public.admin_set_status(uuid, text, text),
  public.admin_update_profile(uuid, jsonb), public.admin_set_photo(uuid, text, text) to authenticated;
grant execute on function public.public_creators() to anon, authenticated;

-- ---------------------------------------------------------------- storage
-- reviewers can read the private uploads (photo + insight screenshots) through signed links
drop policy if exists "creator uploads: admins read" on storage.objects;
create policy "creator uploads: admins read" on storage.objects
  for select to authenticated using (bucket_id = 'creator-uploads' and public.is_admin());

-- published photos: public to read, only admins write
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('creator-photos', 'creator-photos', true, 1048576, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "creator photos: admins insert" on storage.objects;
create policy "creator photos: admins insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'creator-photos' and public.is_admin()
    and name ~ '^[a-z0-9._]{1,30}-[0-9]{10,16}(-sq)?\.jpg$');
drop policy if exists "creator photos: admins read" on storage.objects;
create policy "creator photos: admins read" on storage.objects
  for select to authenticated using (bucket_id = 'creator-photos' and public.is_admin());
drop policy if exists "creator photos: admins delete" on storage.objects;
create policy "creator photos: admins delete" on storage.objects
  for delete to authenticated using (bucket_id = 'creator-photos' and public.is_admin());

-- ---------------------------------------------------------------- check
select
  (select count(*) from public.admins) as admins,
  (select public from storage.buckets where id = 'creator-photos') as photos_bucket_public,
  jsonb_array_length(public.public_creators()) as creators_on_site;
