# Right Team Digital — website

The website of **Right Team Digital**, the digital-marketing arm of Right Team Private Limited. It offers lead generation first, then reels and video, social and creators, and search and websites. It also runs a creator network: brands browse creators on the site, and creators register through an online form.

| | |
|---|---|
| **Public site (now)** | <https://rightteam-digital.vercel.app>. Vercel **publishes every push to `main` automatically.** |
| **Production (planned)** | `https://rightteam.in`, served by the same Vercel project once the domain's DNS points there. See [docs/DEPLOY.md](docs/DEPLOY.md). Only `*.html`, `assets/`, `robots.txt` and `sitemap.xml` are published (`.vercelignore`). |
| **Creator registrations** | Supabase database. The team reviews them in NocoDB. See [docs/ONBOARDING.md](docs/ONBOARDING.md). |
| **Tech** | Plain HTML, CSS and JavaScript. No framework and no build step, so any static host works. |

---

## ⚠️ Rules everyone must follow

1. **Every push to `main` goes live on Vercel within a minute.** Check changes locally first (see "Run it on your computer" below).
2. **Never commit creator personal data.** That means CSV or XLSX form exports, `supabase/seed/`, `.env` files, phone numbers or emails. `.gitignore` blocks the usual files, but check `git status` before committing.
3. **Never put the Supabase `service_role` / secret key anywhere in this repo.** Only the *publishable* key belongs in `assets/js/content.js`; it's designed to be public.
4. **Contact details, dates of birth, gender and rates never appear on the site.** They exist only in the private `creator_private` table.
5. **After editing anything in `assets/css` or `assets/js`, bump the `?v=` number** in every `.html` file that loads it. Otherwise visitors keep running the old file from their browser cache. For example:
   ```bash
   sed -i 's/site\.js?v=36/site.js?v=37/' *.html
   ```

---

## Common tasks

| I want to… | Where | Who |
|---|---|---|
| Review new creator registrations | NocoDB → `ops_review_queue` ([how](docs/ONBOARDING.md#daily-use-ops-team-in-nocodb)) | Ops team |
| Change the email, WhatsApp, Instagram, LinkedIn or office hours | `assets/js/content.js` → `site` | Anyone, then a developer pushes |
| Add a reel | `assets/js/content.js` → `reels`, with the cover in `assets/reels/<code>.jpg` | Developer |
| Replace a sample case study with a real one | `assets/js/content.js` → `work` | Developer |
| Change the countries on the presence map | `assets/js/content.js` → `presence` | Developer |
| Pin creators to the top of the directory | `assets/js/creators.js` → `PINNED` | Developer |
| Choose which faces float in the creators hero | `assets/js/creators.js` → the hero swap list under `const HERO` | Developer |
| Refresh the creator directory from a form export | [Creator directory](#creator-directory-creatorshtml) below | Developer |
| Put the site on staging or production | [docs/DEPLOY.md](docs/DEPLOY.md) | Developer |
| Undo a bad change on Vercel | Vercel → Deployments → the previous one → **Promote to Production**, or `git revert` and push | Developer |

---

## Run it on your computer

```bash
python -m http.server 5510
```

Then open <http://localhost:5510>. Any static server works. The creator form on `join.html` talks to the **real** Supabase project even when you run it locally, so use handles starting `rt_test_` for test registrations and delete them afterwards (see [Creator onboarding](#creator-onboarding-joinhtml)).

## What's where

```
*.html                  the pages (see below)
404.html                "This page has moved": shown for any address that doesn't exist
assets/css/site.css     all styles
assets/js/content.js    ALL editable content and settings: contact, reels, work, presence map, Supabase keys
assets/js/site.js       shared code: header, footer, icons, reels, animations, the Start a Project form
assets/js/creators.js   Find a Creator page;  creators-data.js = the listed creators (generated)
assets/js/join.js       creator registration form
assets/js/funnel.js, world.js, world-dots.js, intro.js   Three.js funnel, presence map, home intro
assets/creators/        creator photos (generated, face-cropped)
assets/reels/           reel cover images
supabase/migrations/    database setup: run in the Supabase SQL Editor, in date order
deploy/                 Hostinger server config (.htaccess template) and old-URL redirects
tools/                  Python/Node helper scripts (never uploaded to the server)
docs/                   ONBOARDING.md (creator registrations), DEPLOY.md (Hostinger)
ops/nocodb/             self-hosted NocoDB option (Docker)
lib/, scripts/, test/   Three.js visual debugging and regression tests (Parallax, needs Deno)
```

### Pages

| File | What it is |
|---|---|
| `index.html` | Home: intro, hero with reel columns, 3D lead funnel, services, reels, presence map, reporting, creators, work, FAQ |
| `services.html` | The four services (`#lead-generation`, `#reels-video`, `#social-creators`, `#search-web`) and packages (`#planning`) |
| `work.html` | Reels strip and case studies |
| `about.html` | About the company and how we work |
| `creators.html` | Find a Creator: floating "Discover" hero, filterable directory, profile drawer, shortlist sent to the brief form |
| `start.html` | Start a Project (brief form). Pre-fills from `?service=…`, `?goal=…` or `?creators=handle1,handle2` |
| `join.html` | Creator registration: 4 steps, saved to Supabase |
| `privacy.html`, `terms.html` | Drafts that need legal review before production |

## Editing content: `assets/js/content.js`

Nearly everything a non-developer would want to change is in this one file.

- **`site`**:
  - Contact details: `email`, `whatsapp` (country code, no `+`), `instagram`, `linkedin`.
  - Office `hours` (drive the footer's "At our desks / After hours").
  - `formEndpoint`: where Start a Project briefs go. While it's empty, the brief opens the visitor's email app.
  - `onboarding`: the Supabase URL and publishable key for `join.html`.
- **`reels`**: `ig` is the code after `/reel/` in the Instagram link, and the cover goes in `assets/reels/<code>.jpg`. Add `views` only with real numbers.
- **`work`**: case studies. Fill `outcome` and `timeframe` only with verified results; samples carry a "Sample" tag.
- **`presence`**: map locations, each with a city, country, latitude and longitude. Entries marked `confirm: true` are placeholders (Lagos, London, Singapore, New York); replace them with real locations. The land outline (`assets/js/world-dots.js`) is separate and doesn't need regenerating when locations change.

## Creator directory (`creators.html`)

The directory is **static**: it's built from `assets/js/creators-data.js`, which a script generates. It shows public fields only, lists creators with 1,000+ followers, and puts creators with photos first.

```bash
python -I tools/creators_from_form.py "path/to/Form responses.csv"   # rebuild creators-data.js
python -I tools/creator_photos.py "path/to/extracted/photos"         # face-crop photos into assets/creators/
```

`tools/creator_photo_map.json` links each Instagram handle to the uploader name in the Drive file name. Photos are compressed and stripped of location data. Creators without a usable photo show their initials.

> **Not automatic yet (Phase 2):** creators who register on `join.html` and are approved in NocoDB don't appear in the directory automatically. Until Phase 2 (a GitHub Action that publishes approved creators) is built, a developer adds them.

> **Consent:** the 27 creators listed came from the old Google Form, whose consent didn't clearly cover public listing. Get each one's OK, or ask them to re-register on `join.html`, before production.

## Creator onboarding (`join.html`)

```
creator ─► join.html ─► Supabase (Postgres + private photo storage) ◄─ NocoDB (ops team)
```

- **Public profile and private details are separate.** Public fields go to `creators`. Contact details, date of birth, gender, rates and screenshots go to `creator_private`.
- **Visitors can only register.** They can't read anything, and uploads are write-once and private.
- **Built-in protections:**
  - photo required;
  - rate limits (20 registrations per network per hour);
  - text cleaned against spreadsheet-formula injection;
  - ages 13–100, with under-18s flagged for guardian consent;
  - duplicate handles refused.
- **Statuses:** `submitted` → `in_review` → `approved` → `live`, plus `needs_info`, `rejected` and `paused`.

**Database changes** live in `supabase/migrations/` and are run **by hand** in the Supabase SQL Editor, **in date order**:

| File | What it does | Applied on the project |
|---|---|---|
| `20261117000000_creator_onboarding.sql` | Tables, privacy rules, the registration function, photo storage, ops access | ✅ |
| `20261119000000_form_parity.sql` | Gender, content style, worked-with-brands, YouTube screenshots, "Other" niche | ✅ (columns only) |
| `20261119100000_hardening.sql` | Abuse protection (see above) | ✅ |

> ⚠️ Don't re-run an **older** file after a newer one. `form_parity.sql` contains an older version of the registration function and would undo the hardening. To change the function, write a **new** migration file with a later date.

**Delete test registrations:**
```sql
delete from public.creators where handle like 'rt_test_%';
```

Full setup, NocoDB connection and the daily review flow: [docs/ONBOARDING.md](docs/ONBOARDING.md).

## Deploying

- **Vercel (current public site):** automatic on every push to `main`. To roll back, use Vercel → Deployments → the previous deployment → **Promote to Production**.
- **Hostinger (planned home on `rightteam.in`):**
  ```bash
  python -I tools/build_deploy.py staging      # or: production
  ```
  This builds `dist/rightteam-digital-<env>.zip` containing **only** the public files. You upload and extract it in hPanel's File Manager. The production build **refuses to run** if the Supabase hardening isn't live, and lists any placeholders left in `content.js`. The full process, including backup, staging, checklist, switch-over and rollback, is in [docs/DEPLOY.md](docs/DEPLOY.md).

## Testing before you push

- **By hand:** open the pages you touched, on desktop and a phone-sized window, and check the browser console has no errors. For form changes, do one full registration with an `rt_test_` handle.
- **Visual regression tests** for the Three.js funnel and map (needs [Deno](https://deno.com)):
  ```bash
  deno task visual:run
  deno task visual:accept   # after an intended visual change
  ```

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| A change doesn't show | The browser is using an old cached copy. Press **Ctrl+Shift+R**, and check you bumped `?v=`. |
| `join.html` says "Online registration opens soon" | `onboarding.supabaseUrl` or `supabaseAnonKey` in `content.js` is empty. |
| Registration fails with "column … does not exist" | A migration wasn't applied. See the table above. |
| "Too many registrations from your network" | The rate limit: 20 per network per hour, aimed at spam. Raise it in a new migration if an event needs more. |
| New columns don't show in NocoDB | NocoDB → the data source → **Sync metadata**. |
| NocoDB shows a record limit | The free plan allows 1,000 records. Upgrade, or self-host via `ops/nocodb/`. |
| A SQL file "ran" but nothing changed | The file was empty or only part was selected. Open it, check its length, press Ctrl+A, then Run. |

## Still to do before production

- [ ] Real contact email, WhatsApp, Instagram, LinkedIn and office hours in `content.js` (the deploy build lists what's left)
- [ ] Real presence-map locations (replace the `confirm: true` entries)
- [ ] Real case studies and results in `work`
- [ ] `formEndpoint` for Start a Project briefs
- [ ] Creators' consent for public listing
- [ ] Legal review of `privacy.html` and `terms.html`, which must mention the creator form's data
- [ ] Old rightteam.in addresses in `deploy/redirects.txt`
- [ ] Phase 2: approved creators published to the directory automatically
