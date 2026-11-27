# Creator onboarding — setup and daily use

This replaces the Google Form. Creators register at `join.html`. The team reviews them on `admin.html` and publishes them to Find a Creator with one click (NocoDB, below, is optional for spreadsheet-style editing).

```
Creator ─► join.html ─► Supabase (Postgres + photo storage) ◄─ admin.html (review team)
                                     │
                                     └─► creators.html (approved creators, public fields only)
```

## Why it won't break like the Sheet did

| Before (Google Form + Sheet) | Now |
|---|---|
| Renaming a column broke the import script | Columns belong to the database. The team edits values, never the structure. |
| Photos were matched by the uploader's name in the Drive file name | The photo is uploaded with the registration itself. |
| The same creator could register twice | Instagram handle is unique. The form warns before step 2. |
| Contact details sat in the same sheet as everything else | Kept in a separate locked table, `creator_private`, that the website can never read. |
| Nobody could tell what was new or approved | Every creator has a `status`. |

## One-time setup (about 30 minutes)

You need a free Supabase account. The free tier covers far more than 1,000 creators.

1. **Create the project.** Go to supabase.com → New project. Choose region **Mumbai (ap-south-1)** and save the database password in your password manager.
2. **Create the tables.** Open the SQL Editor and run every file in `supabase/migrations/` in order of their dates: `20261117000000_creator_onboarding.sql`, then `20261119000000_form_parity.sql`, then `20261119100000_hardening.sql`. Each one is safe to run again.
3. **Connect the website.** Go to Project Settings → API. Copy the **Project URL** and the **anon public** key into `assets/js/content.js` under `onboarding`:
   ```js
   onboarding: { supabaseUrl: "https://xxxx.supabase.co", supabaseAnonKey: "eyJ…", fallbackForm: "" },
   ```
   The anon key is meant to be public. The database only lets it call `submit_creator()` and upload into `pending/`. Never paste the `service_role` key anywhere in the site.
4. **Optional, only for NocoDB: give the ops team their own database login.** Run this in the SQL Editor, replacing the password:
   ```sql
   create role ops_nocodb login password 'CHANGE-ME-long-random' in role ops_team;
   ```
   The team can change status, notes and profile fields. They can't delete creators, alter tables or touch anything outside these tables.
5. **Optional: set up NocoDB.** Either use NocoDB Cloud (free tier, nothing to host) or self-host with `ops/nocodb/docker-compose.yml`. Add a PostgreSQL data source using the `ops_nocodb` login. Then invite the team: **Editor** for reviewers, **Viewer** for everyone else.
6. **Import the Google Form responses.** Run the script below, then paste `supabase/seed/google_form_import.sql` into the SQL Editor and run it.
   ```bash
   python -I tools/import_form_to_supabase.py "path/to/Form responses.csv"
   ```
   The output file is git-ignored because it contains phone numbers. Delete it after importing.
7. **Switch over.** Update the Google Form's confirmation message, and its description, to point to `/join.html`. Close the form to new responses a week later.

## Set up the review page (Phase 2, about 10 minutes)

1. **Run the migration.** In the SQL Editor, run `supabase/migrations/20261127000000_publish_creators.sql`. The last lines print `admins`, `photos_bucket_public` and `creators_on_site`.
2. **Create a login for each reviewer.** Authentication → Users → **Add user** → Create new user. Enter their email and a password, and tick **Auto Confirm User**.
3. **Make them a reviewer.** In the SQL Editor, run this once per person with their email:
   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'reviewer@example.com';
   ```
   A login that isn't in `admins` can sign in but sees "This account isn't on the review team" and can't read anything.
4. **Stop strangers making accounts.** Authentication → Sign In / Providers → turn off **Allow new users to sign up**.
5. **Remove a reviewer** with `delete from public.admins where email = 'reviewer@example.com';`, and delete their user too.

## Daily use: rightteam.in/admin

Sign in with the email and password from step 2. The session ends when the browser tab closes.

The tabs are **To review**, **Waiting for info**, **On the site**, **Paused** and **Rejected**, with a count on each. The review queue shows the oldest registration first. For each creator:

1. **Check they're real.** Open their Instagram (and YouTube) from the buttons, and compare the follower counts they typed in. Their insight screenshots are underneath.
2. **Photo for the site.** Drag and zoom their uploaded photo so the face sits in the upper half, then press **Use this crop**. This saves a 600×660 portrait and a round 240×240 version. Without one, their card shows initials.
3. **Profile shown to brands.** Fix spelling, city, niches or numbers, then press **Save profile**. Tick **Feature** to pin them to the top of Find a Creator.
4. **Decide.** Type a short note if useful, then:
   - **Approve & publish**: they appear on Find a Creator within seconds.
   - **Ask for more info**: message them using the WhatsApp or email link in the private box, then move them back to review when they reply.
   - **Reject**: too small, not a fit, or spam.
   - **Take off the site** (for live creators): hides them without deleting anything. Approve again to bring them back.

Notes are saved with the date in **Team notes**. The private box (email, phone, WhatsApp, age, gender, rates) is only ever shown on this page. A creator under 18 is flagged: get a parent's or guardian's consent before any collaboration.

## Statuses

`submitted` → `in_review` → `live` (on the site). Side paths: `needs_info`, `rejected` and `paused`. `approved` (if set in NocoDB) also shows on the site.

## How publishing works

- `creators.html` loads the 61 creators from the old Google Form (`assets/js/creators-data.js`), then asks Supabase for `public_creators()`: the public fields of every `live` or `approved` creator, with no contact details, birth dates, gender, rates or notes. A handle in both lists shows the database version.
- If Supabase doesn't answer within 2.5 seconds, the page shows the static list alone.
- Cropped photos live in the public `creator-photos` bucket. The original uploads stay private in `creator-uploads`. Reviewers see them through links that expire after an hour.
- Every admin action is a database function that checks the login is in `admins`. The page itself holds no extra power.

## What visitors can and can't do

- **Can:** call `submit_creator(jsonb)`, which validates every field and writes both rows; call `handle_available(text)`; upload a JPG, PNG or WebP of up to 6 MB to `creator-uploads/pending/<uuid>.<ext>`.
- **Can't:** read any table, list or download any upload, or overwrite or delete anything.
- **Bots:** the form has a hidden field that real people never fill. Phase 2 adds Cloudflare Turnstile if spam appears.

The form shrinks photos in the browser (longest side 1,600 px) and re-encodes them, which removes location data from phone photos.

## Later

- Stage counts on a small dashboard.
- A Turnstile captcha if spam appears.
- Brand logins, so the directory can be unlocked for signed-in brands.
