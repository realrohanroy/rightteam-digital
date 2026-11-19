-- Form parity with the old Google Form (2026-11-19)
-- Run in Supabase -> SQL Editor after 20261117000000_creator_onboarding.sql. Safe to run twice.
--   creators.worked_with_brands   "Have you worked with brands before?" yes / no
--   creators.niche_other          free text when the creator picks the "Other" niche
--   creator_private.yt_insights_paths   up to 2 YouTube Studio analytics screenshots (private)
-- Gender and content style already had columns; the form now sends them.

alter table public.creators add column if not exists worked_with_brands boolean;
alter table public.creators add column if not exists niche_other text check (char_length(niche_other) <= 60);
alter table public.creator_private add column if not exists yt_insights_paths text[] not null default '{}';

create or replace function public.submit_creator(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id      uuid;
  v_handle  text := lower(ltrim(btrim(p->>'handle'), '@'));
  v_ig      int  := public._clean_count(p->'ig_followers');
  v_yt      int  := public._clean_count(p->'yt_subscribers');
  v_phone   text := regexp_replace(coalesce(p->>'phone', ''), '[\s()-]', '', 'g');
  v_wa      text := nullif(regexp_replace(coalesce(p->>'whatsapp', ''), '[\s()-]', '', 'g'), '');
  v_photo   text := nullif(p->>'photo_path', '');
  v_ins     text[] := public._clean_list(p->'insights_paths', 3);
  v_yt_ins  text[] := public._clean_list(p->'yt_insights_paths', 2);
begin
  -- bots fill hidden fields; pretend success so they don't retry
  if coalesce(p->>'website', '') <> '' then return gen_random_uuid(); end if;

  if v_handle !~ '^[a-z0-9._]{1,30}$' then
    raise exception 'Enter your Instagram handle, e.g. @yourname' using errcode = '22023', hint = 'handle';
  end if;
  if char_length(btrim(coalesce(p->>'name', ''))) not between 2 and 80 then
    raise exception 'Enter your full name' using errcode = '22023', hint = 'name';
  end if;
  if char_length(btrim(coalesce(p->>'city', ''))) not between 2 and 60 then
    raise exception 'Enter your city' using errcode = '22023', hint = 'city';
  end if;
  if coalesce(btrim(p->>'email'), '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address' using errcode = '22023', hint = 'email';
  end if;
  if v_phone !~ '^\+?[0-9]{7,15}$' then
    raise exception 'Enter a valid mobile number' using errcode = '22023', hint = 'phone';
  end if;
  if v_wa is not null and v_wa !~ '^\+?[0-9]{7,15}$' then
    raise exception 'Enter a valid WhatsApp number' using errcode = '22023', hint = 'whatsapp';
  end if;
  if coalesce(p->>'date_of_birth', '') <> '' and p->>'date_of_birth' !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Enter your date of birth' using errcode = '22023', hint = 'date_of_birth';
  end if;
  if coalesce((p->>'consent')::boolean, false) is not true then
    raise exception 'Please accept the consent statement' using errcode = '22023', hint = 'consent';
  end if;
  if v_ig is null or v_yt is null then
    raise exception 'Follower counts must be whole numbers' using errcode = '22023', hint = 'ig_followers';
  end if;
  if v_photo is not null and v_photo !~ '^pending/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$' then
    raise exception 'Invalid photo upload' using errcode = '22023', hint = 'photo';
  end if;
  if exists (select 1 from unnest(v_ins || v_yt_ins) x where x !~ '^pending/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$') then
    raise exception 'Invalid screenshot upload' using errcode = '22023', hint = 'insights';
  end if;

  begin
    insert into public.creators (handle, name, city, state, langs, niches, roles, platforms,
      ig_followers, yt_subscribers, yt_link, other_link, avg_views, audience_in, setup,
      posts_consistently, open_to_travel, collabs, brands, bio, style, best_posts,
      portfolio_link, photo_path, source, worked_with_brands, niche_other)
    values (v_handle, btrim(p->>'name'), btrim(p->>'city'), nullif(btrim(p->>'state'), ''),
      public._clean_list(p->'langs'), public._clean_list(p->'niches'), public._clean_list(p->'roles'),
      public._clean_list(p->'platforms'), v_ig, v_yt,
      public._clean_url(p->>'yt_link'), public._clean_url(p->>'other_link'),
      left(p->>'avg_views', 40), left(p->>'audience_in', 60), left(p->>'setup', 60),
      left(p->>'posts_consistently', 40), (p->>'open_to_travel')::boolean,
      public._clean_list(p->'collabs'), left(nullif(btrim(p->>'brands'), ''), 300),
      left(nullif(btrim(p->>'bio'), ''), 600), left(nullif(btrim(p->>'style'), ''), 600),
      (select coalesce(array_agg(u) filter (where u is not null), '{}')
         from (select public._clean_url(x) u from unnest(public._clean_list(p->'best_posts', 3)) x) s),
      public._clean_url(p->>'portfolio_link'), v_photo, 'website',
      case when p->>'worked_with_brands' in ('true', 'false') then (p->>'worked_with_brands')::boolean end,
      left(nullif(btrim(p->>'niche_other'), ''), 60))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'This Instagram handle is already registered. Email us to update your profile.'
      using errcode = '23505', hint = 'handle';
  end;

  insert into public.creator_private (creator_id, email, phone, whatsapp, date_of_birth, gender,
    rates, insights_paths, yt_insights_paths, anything_else, consent_at, consent_version)
  values (v_id, lower(btrim(p->>'email')), v_phone, v_wa,
    nullif(p->>'date_of_birth', '')::date, left(nullif(p->>'gender', ''), 30),
    coalesce((select jsonb_object_agg(k, left(v, 40)) from jsonb_each_text(
       case when jsonb_typeof(p->'rates') = 'object' then p->'rates' else '{}'::jsonb end) e(k, v)
       where k in ('story', 'reel', 'post', 'yt_short', 'yt_long', 'collab') and btrim(v) <> ''), '{}'::jsonb),
    v_ins, v_yt_ins, left(nullif(btrim(p->>'anything_else'), ''), 1000), now(),
    coalesce(left(p->>'consent_version', 20), 'v1'));

  return v_id;
end $$;
