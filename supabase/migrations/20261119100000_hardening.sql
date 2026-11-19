-- Hardening after abuse testing (2026-11-19)
-- Run in Supabase -> SQL Editor after the two earlier migrations. Safe to run twice.
--
--   * photo is required server-side and must be a real, unused upload (bots can't skip it)
--   * screenshots must be real uploads too
--   * rate limits: 20 registrations per network per hour, 120 across the site per 10 minutes
--   * uploads limited to 200 per 10 minutes site-wide, 3 MB each (the form sends ~0.3–1 MB)
--   * text is cleaned: control / direction-override characters removed, and leading = + - @
--     stripped so an exported CSV can't run spreadsheet formulas
--   * date of birth validated (real date, age 13–100); under-18s are flagged for guardian consent
--   * yes/no answers that aren't true/false are stored as empty instead of erroring

-- ---------------------------------------------------------------- helpers
create or replace function public._clean_text(v text, max_len int default 600)
returns text language sql immutable set search_path = '' as $$
  select nullif(left(btrim(regexp_replace(
           regexp_replace(coalesce(v, ''), '[[:cntrl:]​-‏‪-‮⁦-⁩﻿]', ' ', 'g'),
           '^[\s=+\-@]+', '')), max_len), '')
$$;

create or replace function public._clean_list(v jsonb, max_items int default 12)
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(x) filter (where x is not null), '{}')
  from (select public._clean_text(e, 60) as x
        from jsonb_array_elements_text(case when jsonb_typeof(v) = 'array' then v else '[]'::jsonb end) e
        limit max_items) s
$$;

create or replace function public._bool(v text)
returns boolean language sql immutable set search_path = '' as $$
  select case lower(btrim(coalesce(v, ''))) when 'true' then true when 'false' then false end
$$;

create or replace function public._upload_ok(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_path ~ '^pending/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
     and exists (select 1 from storage.objects o where o.bucket_id = 'creator-uploads' and o.name = p_path)
$$;

-- ---------------------------------------------------------------- rate limiting
create table if not exists public.submission_log (
  id      bigint generated always as identity primary key,
  ip_hash text not null,
  at      timestamptz not null default now()
);
create index if not exists submission_log_at_idx on public.submission_log (at);
alter table public.submission_log enable row level security;
revoke all on public.submission_log from anon, authenticated;

create or replace function public._client_ip_hash()
returns text language sql stable set search_path = '' as $$
  -- Supabase passes the visitor's address in these headers; only a hash is stored
  select md5('rt-onboarding:' || coalesce(
           nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json->>'x-forwarded-for', ''), ',', 1)), ''),
           nullif(current_setting('request.headers', true), '')::json->>'cf-connecting-ip',
           'unknown'))
$$;

-- uploads: a site-wide ceiling so nobody can fill the storage quota
create or replace function public.creator_uploads_recent()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from storage.objects
  where bucket_id = 'creator-uploads' and created_at > now() - interval '10 minutes'
$$;
revoke all on function public.creator_uploads_recent() from public;
grant execute on function public.creator_uploads_recent() to anon, authenticated;

update storage.buckets set file_size_limit = 3145728 where id = 'creator-uploads';

drop policy if exists "creator uploads: insert into pending" on storage.objects;
create policy "creator uploads: insert into pending" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'creator-uploads'
              and (storage.foldername(name))[1] = 'pending'
              and name ~ '^pending/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
              and public.creator_uploads_recent() < 200);

-- ---------------------------------------------------------------- submit_creator v3
create or replace function public.submit_creator(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id      uuid;
  v_handle  text := lower(ltrim(btrim(coalesce(p->>'handle', '')), '@'));
  v_name    text := public._clean_text(p->>'name', 80);
  v_city    text := public._clean_text(p->>'city', 60);
  v_ig      int  := public._clean_count(p->'ig_followers');
  v_yt      int  := public._clean_count(p->'yt_subscribers');
  v_phone   text := regexp_replace(coalesce(p->>'phone', ''), '[\s()-]', '', 'g');
  v_wa      text := nullif(regexp_replace(coalesce(p->>'whatsapp', ''), '[\s()-]', '', 'g'), '');
  v_photo   text := nullif(p->>'photo_path', '');
  v_ins     text[] := array(select jsonb_array_elements_text(case when jsonb_typeof(p->'insights_paths') = 'array' then p->'insights_paths' else '[]' end) limit 3);
  v_yt_ins  text[] := array(select jsonb_array_elements_text(case when jsonb_typeof(p->'yt_insights_paths') = 'array' then p->'yt_insights_paths' else '[]' end) limit 2);
  v_dob     date;
  v_age     int;
  v_note    text;
  v_ip      text := public._client_ip_hash();
begin
  -- bots fill hidden fields; pretend success so they don't retry
  if coalesce(p->>'website', '') <> '' then return gen_random_uuid(); end if;

  if (select count(*) from public.submission_log where ip_hash = v_ip and at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many registrations from your network. Please try again in an hour.' using errcode = 'P0001', hint = 'rate';
  end if;
  if (select count(*) from public.submission_log where at > now() - interval '10 minutes') >= 120 then
    raise exception 'We''re getting a lot of registrations right now. Please try again in 10 minutes.' using errcode = 'P0001', hint = 'rate';
  end if;

  if v_handle !~ '^[a-z0-9._]{1,30}$' then
    raise exception 'Enter your Instagram handle, e.g. @yourname' using errcode = '22023', hint = 'handle';
  end if;
  if char_length(coalesce(v_name, '')) < 2 then
    raise exception 'Enter your full name' using errcode = '22023', hint = 'name';
  end if;
  if char_length(coalesce(v_city, '')) < 2 then
    raise exception 'Enter your city' using errcode = '22023', hint = 'city';
  end if;
  if v_photo is null or not public._upload_ok(v_photo)
     or exists (select 1 from public.creators where photo_path = v_photo) then
    raise exception 'Add a profile photo' using errcode = '22023', hint = 'photo';
  end if;
  if exists (select 1 from unnest(v_ins || v_yt_ins) x where not public._upload_ok(x)) then
    raise exception 'One of the screenshots didn''t upload. Please choose it again.' using errcode = '22023', hint = 'insights';
  end if;
  -- must start with a letter or digit, so "=cmd@x.co" can't become a spreadsheet formula
  if coalesce(btrim(p->>'email'), '') !~* '^[a-z0-9][^@\s]*@[^@\s]+\.[^@\s]+$' or char_length(p->>'email') > 254 then
    raise exception 'Enter a valid email address' using errcode = '22023', hint = 'email';
  end if;
  if v_phone !~ '^\+?[0-9]{7,15}$' then
    raise exception 'Enter a valid mobile number' using errcode = '22023', hint = 'phone';
  end if;
  if v_wa is not null and v_wa !~ '^\+?[0-9]{7,15}$' then
    raise exception 'Enter a valid WhatsApp number' using errcode = '22023', hint = 'whatsapp';
  end if;
  if coalesce(p->>'date_of_birth', '') <> '' then
    begin
      if p->>'date_of_birth' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'bad'; end if;
      v_dob := (p->>'date_of_birth')::date;
    exception when others then
      raise exception 'Enter a real date of birth' using errcode = '22023', hint = 'date_of_birth';
    end;
    v_age := extract(year from age(current_date, v_dob));
    if v_age < 13 or v_age > 100 then
      raise exception 'Check your date of birth' using errcode = '22023', hint = 'date_of_birth';
    end if;
    if v_age < 18 then v_note := 'Under 18: get a parent/guardian''s consent before any collaboration'; end if;
  end if;
  if public._bool(p->>'consent') is not true then
    raise exception 'Please accept the consent statement' using errcode = '22023', hint = 'consent';
  end if;
  if v_ig is null or v_yt is null then
    raise exception 'Follower counts must be whole numbers' using errcode = '22023', hint = 'ig_followers';
  end if;

  begin
    insert into public.creators (handle, name, city, state, langs, niches, roles, platforms,
      ig_followers, yt_subscribers, yt_link, other_link, avg_views, audience_in, setup,
      posts_consistently, open_to_travel, collabs, brands, bio, style, best_posts,
      portfolio_link, photo_path, source, worked_with_brands, niche_other, ops_notes)
    values (v_handle, v_name, v_city, public._clean_text(p->>'state', 60),
      public._clean_list(p->'langs'), public._clean_list(p->'niches'), public._clean_list(p->'roles'),
      public._clean_list(p->'platforms'), v_ig, v_yt,
      public._clean_url(p->>'yt_link'), public._clean_url(p->>'other_link'),
      public._clean_text(p->>'avg_views', 40), public._clean_text(p->>'audience_in', 60), public._clean_text(p->>'setup', 60),
      public._clean_text(p->>'posts_consistently', 40), public._bool(p->>'open_to_travel'),
      public._clean_list(p->'collabs'), public._clean_text(p->>'brands', 300),
      public._clean_text(p->>'bio', 600), public._clean_text(p->>'style', 600),
      (select coalesce(array_agg(u) filter (where u is not null), '{}')
         from (select public._clean_url(x) u
               from jsonb_array_elements_text(case when jsonb_typeof(p->'best_posts') = 'array' then p->'best_posts' else '[]' end) x
               limit 3) s),
      public._clean_url(p->>'portfolio_link'), v_photo, 'website',
      public._bool(p->>'worked_with_brands'), public._clean_text(p->>'niche_other', 60), v_note)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'This Instagram handle is already registered. Email us to update your profile.'
      using errcode = '23505', hint = 'handle';
  end;

  insert into public.creator_private (creator_id, email, phone, whatsapp, date_of_birth, gender,
    rates, insights_paths, yt_insights_paths, anything_else, consent_at, consent_version)
  values (v_id, lower(btrim(p->>'email')), v_phone, v_wa, v_dob, public._clean_text(p->>'gender', 30),
    coalesce((select jsonb_object_agg(k, public._clean_text(v, 40)) from jsonb_each_text(
       case when jsonb_typeof(p->'rates') = 'object' then p->'rates' else '{}'::jsonb end) e(k, v)
       where k in ('story', 'reel', 'post', 'yt_short', 'yt_long', 'collab') and public._clean_text(v, 40) is not null), '{}'::jsonb),
    v_ins, v_yt_ins, public._clean_text(p->>'anything_else', 1000), now(),
    coalesce(public._clean_text(p->>'consent_version', 20), 'v1'));

  insert into public.submission_log (ip_hash) values (v_ip);
  delete from public.submission_log where at < now() - interval '2 days';
  return v_id;
end $$;

revoke all on function public._clean_text(text, int), public._bool(text), public._upload_ok(text),
  public._client_ip_hash(), public._clean_list(jsonb, int) from public, anon, authenticated;
grant execute on function public.submit_creator(jsonb) to anon, authenticated;
