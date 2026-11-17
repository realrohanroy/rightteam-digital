-- Creator onboarding (Phase 1)
-- Run once in Supabase: Dashboard -> SQL Editor -> paste this file -> Run.
--
-- Design
--   creators          public-facing profile + review status (what the site may show)
--   creator_private   contact details, DOB, gender, rates, insight screenshots (never published)
--   submit_creator()  the ONLY way the public website can write. Anonymous visitors have no
--                     direct table access at all; the function validates and inserts both rows.
--   handle_available() lets the form warn about a taken handle before the creator fills 4 steps.
--   creator-uploads   private storage bucket; visitors may upload into pending/ only,
--                     they can never list, read, overwrite or delete files.
-- The ops team works in NocoDB (docs/ONBOARDING.md) with its own database role.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- types
do $$ begin
  create type public.creator_status as enum
    ('submitted', 'in_review', 'needs_info', 'approved', 'live', 'rejected', 'paused');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- tables
create table if not exists public.creators (
  id              uuid primary key default gen_random_uuid(),
  handle          text not null unique check (handle ~ '^[a-z0-9._]{1,30}$'),
  status          public.creator_status not null default 'submitted',
  featured        boolean not null default false,       -- pinned to the top of the directory
  name            text not null check (char_length(name) between 2 and 80),
  city            text not null check (char_length(city) between 2 and 60),
  state           text check (char_length(state) <= 60),
  langs           text[] not null default '{}',
  niches          text[] not null default '{}',
  roles           text[] not null default '{}',
  platforms       text[] not null default '{}',
  ig_followers    integer not null default 0 check (ig_followers >= 0),
  yt_subscribers  integer not null default 0 check (yt_subscribers >= 0),
  yt_link         text,
  other_link      text,
  avg_views       text,
  audience_in     text,
  setup           text,
  posts_consistently text,
  open_to_travel  boolean,
  collabs         text[] not null default '{}',
  brands          text,
  bio             text check (char_length(bio) <= 600),
  style           text check (char_length(style) <= 600),
  best_posts      text[] not null default '{}',
  portfolio_link  text,
  photo_path      text,                                   -- object in creator-uploads
  source          text not null default 'website',        -- website | google_form
  ops_notes       text,                                   -- internal, never published
  submitted_at    timestamptz not null default now(),
  reviewed_at     timestamptz,
  updated_at      timestamptz not null default now()
);

create table if not exists public.creator_private (
  creator_id      uuid primary key references public.creators(id) on delete cascade,
  email           text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone           text not null check (phone ~ '^\+?[0-9]{7,15}$'),
  whatsapp        text check (whatsapp ~ '^\+?[0-9]{7,15}$'),
  date_of_birth   date,
  gender          text,
  rates           jsonb not null default '{}'::jsonb,     -- {"reel": "5000", "story": "1500", ...}
  insights_paths  text[] not null default '{}',
  anything_else   text check (char_length(anything_else) <= 1000),
  consent_at      timestamptz not null,
  consent_version text not null
);

create index if not exists creators_status_idx on public.creators (status);

-- ---------------------------------------------------------------- housekeeping triggers
create or replace function public.creators_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status and new.status in ('approved', 'rejected', 'live') then
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  new.handle := lower(new.handle);
  return new;
end $$;

drop trigger if exists creators_touch on public.creators;
create trigger creators_touch before update on public.creators
  for each row execute function public.creators_touch();

-- ---------------------------------------------------------------- lock the tables down
alter table public.creators enable row level security;
alter table public.creator_private enable row level security;
-- no policies on purpose: anon / authenticated get nothing through the API
revoke all on public.creators, public.creator_private from anon, authenticated;

-- ---------------------------------------------------------------- helpers
create or replace function public._clean_list(v jsonb, max_items int default 12)
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(left(btrim(x), 60)) filter (where btrim(x) <> ''), '{}')
  from (select jsonb_array_elements_text(case when jsonb_typeof(v) = 'array' then v else '[]'::jsonb end) as x
        limit max_items) s
$$;

create or replace function public._clean_url(v text)
returns text language sql immutable set search_path = '' as $$
  select case when char_length(v) <= 300 and v ~* '^https?://[^\s<>"]{3,}$' then v end
$$;

create or replace function public._clean_count(v jsonb)
returns integer language sql immutable set search_path = '' as $$
  select case when v is null or jsonb_typeof(v) = 'null' then 0
              when (v #>> '{}') ~ '^[0-9]{1,9}$' then (v #>> '{}')::int
              else null end
$$;

-- ---------------------------------------------------------------- public API
create or replace function public.handle_available(p_handle text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.creators
                     where handle = lower(ltrim(btrim(p_handle), '@')))
$$;

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
  if exists (select 1 from unnest(v_ins) x where x !~ '^pending/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$') then
    raise exception 'Invalid screenshot upload' using errcode = '22023', hint = 'insights';
  end if;

  begin
    insert into public.creators (handle, name, city, state, langs, niches, roles, platforms,
      ig_followers, yt_subscribers, yt_link, other_link, avg_views, audience_in, setup,
      posts_consistently, open_to_travel, collabs, brands, bio, style, best_posts,
      portfolio_link, photo_path, source)
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
      public._clean_url(p->>'portfolio_link'), v_photo, 'website')
    returning id into v_id;
  exception when unique_violation then
    raise exception 'This Instagram handle is already registered. Email us to update your profile.'
      using errcode = '23505', hint = 'handle';
  end;

  insert into public.creator_private (creator_id, email, phone, whatsapp, date_of_birth, gender,
    rates, insights_paths, anything_else, consent_at, consent_version)
  values (v_id, lower(btrim(p->>'email')), v_phone, v_wa,
    nullif(p->>'date_of_birth', '')::date, left(nullif(p->>'gender', ''), 30),
    coalesce((select jsonb_object_agg(k, left(v, 40)) from jsonb_each_text(
       case when jsonb_typeof(p->'rates') = 'object' then p->'rates' else '{}'::jsonb end) e(k, v)
       where k in ('story', 'reel', 'post', 'yt_short', 'yt_long', 'collab') and btrim(v) <> ''), '{}'::jsonb),
    v_ins, left(nullif(btrim(p->>'anything_else'), ''), 1000), now(),
    coalesce(left(p->>'consent_version', 20), 'v1'));

  return v_id;
end $$;

revoke all on function public.submit_creator(jsonb), public.handle_available(text),
  public._clean_list(jsonb, int), public._clean_url(text), public._clean_count(jsonb) from public;
grant execute on function public.submit_creator(jsonb), public.handle_available(text) to anon, authenticated;

-- ---------------------------------------------------------------- photo + screenshot uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('creator-uploads', 'creator-uploads', false, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "creator uploads: insert into pending" on storage.objects;
create policy "creator uploads: insert into pending" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'creator-uploads'
              and (storage.foldername(name))[1] = 'pending'
              and name ~ '^pending/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$');
-- no select / update / delete policies: uploads are write-once and invisible to the public

-- ---------------------------------------------------------------- ops convenience view
create or replace view public.ops_review_queue with (security_invoker = true) as
  select c.status, c.handle, c.name, c.city, c.niches, c.ig_followers, c.yt_subscribers,
         p.email, p.phone, p.whatsapp, c.photo_path is not null as has_photo,
         c.submitted_at, c.ops_notes, c.id
  from public.creators c left join public.creator_private p on p.creator_id = c.id
  where c.status in ('submitted', 'in_review', 'needs_info')
  order by c.submitted_at;
revoke all on public.ops_review_queue from anon, authenticated;

-- ---------------------------------------------------------------- ops team access (NocoDB)
-- A group role; each real login (see docs/ONBOARDING.md) is made a member of it.
-- Can read everything and update review fields; cannot insert, delete or change the schema.
do $$ begin create role ops_team nologin; exception when duplicate_object then null; end $$;
grant usage on schema public to ops_team;
grant usage on type public.creator_status to ops_team;
grant select, update on public.creators to ops_team;
grant select, update on public.creator_private to ops_team;
grant select on public.ops_review_queue to ops_team;

drop policy if exists "ops team: read creators" on public.creators;
create policy "ops team: read creators" on public.creators for select to ops_team using (true);
drop policy if exists "ops team: update creators" on public.creators;
create policy "ops team: update creators" on public.creators for update to ops_team using (true) with check (true);
drop policy if exists "ops team: read private" on public.creator_private;
create policy "ops team: read private" on public.creator_private for select to ops_team using (true);
drop policy if exists "ops team: update private" on public.creator_private;
create policy "ops team: update private" on public.creator_private for update to ops_team using (true) with check (true);
