# Creator onboarding — setup and daily use

This replaces the Google Form. Creators register at `join.html`. The ops team reviews them in NocoDB, a screen that looks like Google Sheets. Publishing approved creators to the site automatically is Phase 2.

```
Creator ─► join.html ─► Supabase (Postgres + private photo storage) ◄─ NocoDB (ops team)
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
2. **Create the tables.** Open SQL Editor and paste `supabase/migrations/20261117000000_creator_onboarding.sql`. Run it. It's safe to run again.
3. **Connect the website.** Go to Project Settings → API. Copy the **Project URL** and the **anon public** key into `assets/js/content.js` under `onboarding`:
   ```js
   onboarding: { supabaseUrl: "https://xxxx.supabase.co", supabaseAnonKey: "eyJ…", fallbackForm: "" },
   ```
   The anon key is meant to be public. The database only lets it call `submit_creator()` and upload into `pending/`. Never paste the `service_role` key anywhere in the site.
4. **Give the ops team their own database login.** Run this in the SQL Editor, replacing the password:
   ```sql
   create role ops_nocodb login password 'CHANGE-ME-long-random' in role ops_team;
   ```
   The team can change status, notes and profile fields. They can't delete creators, alter tables or touch anything outside these tables.
5. **Set up NocoDB.** Either use NocoDB Cloud (free tier, nothing to host) or self-host with `ops/nocodb/docker-compose.yml`. Add a PostgreSQL data source using the `ops_nocodb` login. Then invite the team: **Editor** for reviewers, **Viewer** for everyone else.
6. **Import the Google Form responses.** Run the script below, then paste `supabase/seed/google_form_import.sql` into the SQL Editor and run it.
   ```bash
   python -I tools/import_form_to_supabase.py "path/to/Form responses.csv"
   ```
   The output file is git-ignored because it contains phone numbers. Delete it after importing.
7. **Switch over.** Update the Google Form's confirmation message, and its description, to point to `/join.html`. Close the form to new responses a week later.

## Daily use (ops team, in NocoDB)

1. Open the **ops_review_queue** view. It lists new registrations, oldest first, with contact details.
2. Open the creator in **creators** and check the Instagram handle and the follower count. Counts are self-reported, so open the profile and look.
3. Set **status**:
   - `in_review`: you're looking at it.
   - `needs_info`: you messaged them for something. Note what in `ops_notes`.
   - `approved`: it will go on the site.
   - `rejected`: too small, not a fit, or spam.
   - `paused`: hide a live creator temporarily.
4. Tick **featured** to pin a creator to the top row of the directory. This becomes automatic in Phase 2.

The `reviewed_at` date fills itself in.

## Statuses

`submitted` → `in_review` → `approved` → `live` (set by publishing, Phase 2)

Side paths: `needs_info`, `rejected` and `paused`.

## What visitors can and can't do

- **Can:** call `submit_creator(jsonb)`, which validates every field and writes both rows; call `handle_available(text)`; upload a JPG, PNG or WebP of up to 6 MB to `creator-uploads/pending/<uuid>.<ext>`.
- **Can't:** read any table, list or download any upload, or overwrite or delete anything.
- **Bots:** the form has a hidden field that real people never fill. Phase 2 adds Cloudflare Turnstile if spam appears.

The form shrinks photos in the browser (longest side 1,600 px) and re-encodes them, which removes location data from phone photos.

## Phase 2 (next)

- A GitHub Action, triggered by approval or run nightly, rebuilds `assets/js/creators-data.js` from `status in ('approved','live')`. It downloads and crops photos with `tools/creator_photos.py`, then sets them to `live`.
- Stage counts on a small dashboard.
- A Turnstile captcha if needed.
