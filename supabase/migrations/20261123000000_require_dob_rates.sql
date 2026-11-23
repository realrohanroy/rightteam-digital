-- Registrations from the website must include a date of birth and at least one rate.
--
-- Run once in the Supabase SQL Editor (Ctrl+A, then Run). Safe to run again.
--
-- How: a check on new creator_private rows. It runs inside submit_creator, so a
-- registration without them is refused as a whole (nothing is saved, no row in
-- creators either) and the form shows the message next to the right field.
--
-- It applies only to requests from the website (the anon / authenticated roles).
-- The SQL Editor, the service role and NocoDB are not affected, so the team can
-- still add or import creators whose DOB or rates aren't known yet.
-- Existing rows are not touched.
--
-- submit_creator itself is unchanged, so this does not undo the hardening migration.

create or replace function public._require_dob_rates()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
begin
  if v_role not in ('anon', 'authenticated') then
    return new;   -- SQL Editor, service role, NocoDB
  end if;

  if new.date_of_birth is null then
    raise exception 'Enter your date of birth' using errcode = '22023', hint = 'date_of_birth';
  end if;

  if not exists (
    select 1 from jsonb_each_text(coalesce(new.rates, '{}'::jsonb)) e(k, v)
    where v ~ '^\d{1,9}(\.\d+)?$' and v::numeric > 0
  ) then
    raise exception 'Enter your rate for at least one format' using errcode = '22023', hint = 'rates';
  end if;

  return new;
end $$;

revoke all on function public._require_dob_rates() from public, anon, authenticated;

drop trigger if exists require_dob_rates on public.creator_private;
create trigger require_dob_rates
  before insert on public.creator_private
  for each row execute function public._require_dob_rates();

-- Check it worked: this should return one row named require_dob_rates.
-- select tgname from pg_trigger where tgrelid = 'public.creator_private'::regclass and not tgisinternal;
