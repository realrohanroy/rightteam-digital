# Right Team Digital — website

The website of **Right Team Digital**, the digital-marketing arm of Right Team Private Limited. Lead generation comes first, then reels and video, social and creators, and search and websites. The site also runs a **creator network**: creators register online, the team verifies them on a private review page, and approved creators appear in the **Find a Creator** directory within seconds.

| | |
|---|---|
| **Live site** | <https://rightteam.in> on **Hostinger**, deployed automatically from this repo's `main` branch (hPanel → GIT). See [docs/DEPLOY.md](docs/DEPLOY.md). |
| **Old preview** | `rightteam-digital.vercel.app` is being retired. Keep `.vercelignore` until the Vercel project is deleted. |
| **Creator data** | Supabase (Postgres, Auth and Storage), project `yucjszatcjmobpyetqjg`, region Mumbai. See [docs/ONBOARDING.md](docs/ONBOARDING.md). |
| **Tech** | Plain HTML, CSS and JavaScript: GSAP + ScrollTrigger, Lenis and Three.js from CDNs. No framework and no build step. |
| **Search** | Google Search Console is verified for `rightteam.in`, and `sitemap.xml` is submitted. |

---

## ⚠️ Rules everyone must follow

1. **Every push to `main` goes live.** Check changes locally first (see "Run it on your computer").
2. **Never commit creator personal data:** CSV or XLSX exports, `supabase/seed/`, `.env` files, phone numbers, emails. The repo is **public on GitHub**. `.gitignore` blocks the usual files, but check `git status` before every commit.
3. **Never put the Supabase `service_role` / secret key anywhere in this repo.** Only the *publishable* key belongs in `assets/js/content.js`; it's designed to be public.
4. **Contact details, dates of birth, gender, rates and team notes never appear on the public site.** They live only in the private `creator_private` table, and only `admin.html` shows them, to signed-in reviewers.
5. **After editing anything in `assets/css` or `assets/js`, bump its `?v=` number** in every `.html` file that loads it, or visitors keep the old cached file:
   ```bash
   sed -i 's/site\.js?v=41/site.js?v=42/' *.html
   ```
6. **If you edit an inline `<script>` in `index.html`, update its hash** in the `.htaccess` Content-Security-Policy, or browsers will block it. See [Security](#security).

---

## Common tasks

| I want to… | Where | Who |
|---|---|---|
| Review, approve or remove creators | <https://rightteam.in/admin> ([how](docs/ONBOARDING.md#daily-use-rightteaminadmin)) | Review team |
| Add or remove a reviewer | Supabase → Authentication + the `admins` table ([how](docs/ONBOARDING.md#set-up-the-review-page-phase-2-about-10-minutes)) | Admin |
| Change the email, WhatsApp, Instagram, LinkedIn or office hours | `assets/js/content.js` → `site` | Anyone, then a developer pushes |
| Show or hide the phone number in the footer | `assets/js/content.js` → `site.phone` (empty = hidden, as now) | Developer |
| Add a reel | `assets/js/content.js` → `reels`, with the cover in `assets/reels/<code>.jpg` | Developer |
| Replace a sample case study with a real one | `assets/js/content.js` → `work` | Developer |
| Change the countries on the presence map | `assets/js/content.js` → `presence` | Developer |
| Pin a creator to the top of the directory | Tick **Feature** in `admin.html` (or `PINNED` in `assets/js/creators.js` for Google Form creators) | Review team |
| Refresh the Google Form creators from a new export | [Creator directory](#creator-directory-creators) below | Developer |
| Redirect an old address to a new page | `.htaccess` → "old site addresses" | Developer |
| Undo a bad change | `git revert <commit>` and push; Hostinger redeploys | Developer |

---

## Run it on your computer

```bash
python -I tools/dev_server.py        # http://localhost:5510
```

This local server behaves like the live `.htaccess`. It serves clean addresses (`/creators`), redirects `.html` addresses, and sends the same security headers, so a Content-Security-Policy problem shows up locally first. `python -m http.server` also works, but only with `.html` addresses.

The creator form and `admin.html` talk to the **real** Supabase project even when you run them locally. Use handles starting `rt_test_` for test registrations, then delete them (see [Creator onboarding](#creator-onboarding-join)).

## What's where

```
*.html                  the pages (see below); served without ".html" (/creators)
404.html                shown for any address that doesn't exist
.htaccess               Apache rules: HTTPS, clean URLs, allowlist of public files, security headers, caching
sitemap.xml, robots.txt search engines
assets/css/site.css     all public-site styles;  admin.css = the review page
assets/js/content.js    ALL editable content and settings: contact, reels, work, presence map, Supabase keys
assets/js/site.js       shared code: header, footer, icons, reels, animations, the Start a Project form
assets/js/creators.js   Find a Creator page
assets/js/creators-data.js   creators from the old Google Form (generated, public fields only)
assets/js/creators-live.js   adds creators approved in admin.html, read live from Supabase
assets/js/join.js       creator registration form
assets/js/admin.js      the review page
assets/js/funnel.js, world.js, world-dots.js, intro.js   Three.js lead funnel, presence map, home intro
assets/creators/        Google Form creator photos (generated, face-cropped)
assets/reels/           reel cover images
supabase/migrations/    database setup: run in the Supabase SQL Editor, in date order
deploy/                 old .htaccess template, old-URL redirect list
tools/                  helper scripts (never served): dev server, build, form import, photo cropping
docs/                   ONBOARDING.md (creators), DEPLOY.md (Hostinger)
ops/nocodb/             optional self-hosted NocoDB (spreadsheet view of the database)
lib/, scripts/, test/   Three.js visual debugging and regression tests (Parallax, needs Deno)
```

### Pages

| Address | File | What it is |
|---|---|---|
| `/` | `index.html` | Home: intro, hero with a rotating word and reel columns, 3D "From scroll to sale" lead funnel, services, reels, presence map, reporting, creators, work, FAQ |
| `/services` | `services.html` | The four services (`#lead-generation`, `#reels-video`, `#social-creators`, `#search-web`) and packages (`#planning`) |
| `/work` | `work.html` | Reels strip and case studies |
| `/about` | `about.html` | About the company and how we work |
| `/creators` | `creators.html` | Find a Creator: floating "Discover" hero, filterable directory. **Locked for now:** cards are frosted and profile actions say "Coming soon" until brand logins exist (`LOCKED` in `creators.js`) |
| `/start` | `start.html` | Start a Project (brief form). Pre-fills from `?service=…`, `?goal=…` or `?creators=handle1,handle2` |
| `/join` | `join.html` | Creator registration: 4 steps; DOB and at least one rate are required; saved to Supabase |
| `/admin` | `admin.html` | Creator review for the team: login only, never indexed or cached |
| `/privacy`, `/terms` | `privacy.html`, `terms.html` | Drafts that need legal review (`noindex`) |

Old addresses still work: `/creators.html`, `/creators/` and `/index.html` all 301-redirect to the clean address, keeping any `?query`.

## Editing content: `assets/js/content.js`

Nearly everything a non-developer would want to change is in this one file.

- **`site`**:
  - Contact: `email`, `phone` (empty hides the footer Call button), `whatsapp` (country code, no `+`), `instagram`, `linkedin`.
  - Office `hours`, which drive the footer's "At our desks / After hours".
  - `formEndpoint`: where Start a Project briefs go. While it's empty, the brief opens the visitor's email app. A new endpoint's domain must be added to `connect-src` in `.htaccess`.
  - `onboarding`: the Supabase URL and publishable key.
- **`reels`**: `ig` is the code after `/reel/` in the Instagram link, and the cover goes in `assets/reels/<code>.jpg`. Add `views` only with real numbers.
- **`work`**: case studies. Fill `outcome` and `timeframe` only with verified results; samples carry a "Sample" tag.
- **`presence`**: map locations. Entries marked `confirm: true` are placeholders.

## Creator directory (`/creators`)

Two sources, merged in the browser:

1. **Google Form creators (static):** `assets/js/creators-data.js` lists 61 creators with 1,000+ followers, 37 with photos. Rebuild it from a new export with:
   ```bash
   python -I tools/creators_from_form.py "path/to/Form responses.csv"   # rebuild creators-data.js
   python -I tools/creator_photos.py "path/to/extracted/photos"         # face-crop photos into assets/creators/
   ```
   `tools/creator_photo_map.json` links each handle to the uploader name in the Drive file name. Photos are face-cropped with OpenCV and have their location data removed. Screenshots and résumés are left out on purpose.
2. **Website registrations (live):** `creators-live.js` calls `public_creators()` in Supabase. It returns public fields of creators the team approved in `admin.html`. If Supabase doesn't answer within 2.5 seconds, the page shows the static list alone. A handle in both lists shows the database version.

> **Consent:** the Google Form's consent didn't clearly cover public listing. Get each creator's OK, or ask them to re-register on `/join`, before unlocking the directory.

## Creator onboarding (`/join`)

```
creator ─► /join ─► Supabase (Postgres + private uploads) ◄─ /admin (review team, Supabase Auth)
                                       │
                                       └─► public_creators() ─► /creators (public fields only)
```

- **Public profile and private details are separate tables.** Public fields go to `creators`. Contact, DOB, gender, rates and screenshots go to `creator_private`.
- **Visitors can only register.** They can't read any table, and their uploads are write-once and private. Everything else goes through `security definer` functions that check the caller.
- **Reviewers** sign in with Supabase Auth. Every `admin_*` function checks the login is in `public.admins`; the page itself has no special power.
- **Built-in protections:**
  - photo required, and it must be a real upload;
  - rate limits (20 registrations per network per hour, 120 site-wide per 10 minutes);
  - text cleaned against spreadsheet-formula and direction-override tricks;
  - ages 13–100, with under-18s flagged for guardian consent;
  - duplicate handles refused.
- **Statuses:** `submitted` → `in_review` → `live` (on the site), plus `needs_info`, `rejected` and `paused`.

**Database changes** live in `supabase/migrations/`. Run them **by hand** in the Supabase SQL Editor, **in date order**:

| File | What it does | Applied |
|---|---|---|
| `20261117000000_creator_onboarding.sql` | Tables, privacy rules, the registration function, photo storage, ops access | ✅ |
| `20261119000000_form_parity.sql` | Gender, content style, worked-with-brands, YouTube screenshots, "Other" niche | ✅ (columns only) |
| `20261119100000_hardening.sql` | Abuse protection (see above) | ✅ |
| `20261123000000_require_dob_rates.sql` | Website registrations must include a date of birth and at least one rate | ⏳ run it |
| `20261127000000_publish_creators.sql` | Reviewer logins (`admins`), `admin_*` functions, public `creator-photos` bucket, `public_creators()` | ✅ 2026-11-27 |

> ⚠️ Don't re-run an **older** file after a newer one. `form_parity.sql` holds an older registration function that would undo the hardening. To change a function, write a **new** migration with a later date.
>
> To test a migration before running it on the real project, use a local PostgreSQL with small stand-ins for Supabase's `auth` and `storage` schemas. This is how the Phase 2 migration was tested.

**Delete test registrations:**
```sql
delete from public.creators where handle like 'rt_test_%';
```

## Security

| Layer | What's in place |
|---|---|
| **What's served** | `.htaccess` allowlist: only the pages, `assets/`, `robots.txt` and `sitemap.xml`. `tools/`, `supabase/`, `docs/`, `README.md` and `.git` return 404/403. No directory listings. |
| **Addresses** | HTTPS only, `www` → bare domain, one clean address per page, canonical tags, `noindex` on privacy, terms, 404 and admin. The `.html` in old links was never a security issue, only cosmetic. |
| **Headers** | `Content-Security-Policy`: scripts only from this site, the three pinned CDNs and two inline scripts allowed by hash; `frame-ancestors 'none'`. Also `Strict-Transport-Security` (1 year), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`. `/admin` is `no-store` with `X-Robots-Tag: noindex`. |
| **Third-party code** | GSAP, ScrollTrigger and Lenis load with Subresource Integrity hashes. The Three.js import is pinned by an import-map integrity hash. A tampered CDN file won't run. |
| **Data** | Row-level security with no public policies. Contact data only in `creator_private`. Every write goes through validated functions. Reviewer access is checked in the database. Photos are re-encoded to remove location data. |
| **Accounts** | Supabase sign-ups are turned off; reviewers are added by hand. The review session lives only in the browser tab. |

**Inline script hashes:** after editing an inline `<script>` in `index.html`, recompute its hash and replace the old one in `.htaccess`:
```bash
python -c "import re,hashlib,base64;s=open('index.html',encoding='utf-8').read();[print('sha256-'+base64.b64encode(hashlib.sha256(m.encode()).digest()).decode()) for m in re.findall(r'<script(?: type=\"importmap\")?>(.*?)</script>',s,re.S)]"
```

## Deploying

- **Hostinger (`rightteam.in`):** hPanel's GIT deployment pulls `main` on every push, usually within a minute or two. Hostinger's CDN may hold an old copy briefly; purge it in hPanel if a change doesn't appear.
- A new top-level public file must be added to the `.htaccess` allowlist and to `tools/build_site.mjs`.
- `npm run build` writes `_site/` with only the public files and fails if a private file slipped in.
- Fallback without Git: `python -I tools/build_deploy.py production` builds a zip of only the public files ([docs/DEPLOY.md](docs/DEPLOY.md)).

## Testing before you push

- **By hand:** run `tools/dev_server.py`, open the pages you touched on desktop and a phone-sized window, and check the console shows no errors or "Content Security Policy" messages. For form changes, do one full registration with an `rt_test_` handle.
- **Visual regression tests** for the Three.js funnel and map (needs [Deno](https://deno.com)):
  ```bash
  deno task visual:run
  deno task visual:accept   # after an intended visual change
  ```

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| A change doesn't show | Browser or CDN cache. Press **Ctrl+Shift+R**, check you bumped `?v=`, or purge the CDN in hPanel. |
| Console says "Refused to load / execute … Content Security Policy" | A new outside script, image host or API isn't in the `.htaccess` policy, or an inline script changed without a new hash. |
| `/admin` says "This account isn't on the review team" | That login's email isn't in `public.admins`. Run the insert in [docs/ONBOARDING.md](docs/ONBOARDING.md). |
| An approved creator isn't on `/creators` | Check their status is **On the site** in `/admin`, then hard-refresh. |
| `/join` says "Online registration opens soon" | `onboarding.supabaseUrl` or `supabaseAnonKey` in `content.js` is empty. |
| Registration fails with "column … does not exist" | A migration wasn't applied. See the table above. |
| "Too many registrations from your network" | The rate limit (20 per network per hour). Raise it in a new migration if an event needs more. |
| A SQL file "ran" but nothing changed | The file was empty or only part was selected. Open it, check its length, press Ctrl+A, then Run. |

## Still to do

- [ ] Run `20261123000000_require_dob_rates.sql`
- [ ] Real contact email, Instagram, LinkedIn and office hours in `content.js`; the phone number is hidden for now
- [ ] Real presence-map locations (replace the `confirm: true` entries)
- [ ] Real case studies and results in `work`
- [ ] `formEndpoint` for Start a Project briefs
- [ ] Creators' consent for public listing, then brand logins to unlock the directory (`LOCKED` in `creators.js`)
- [ ] Legal review of `privacy.html` and `terms.html`, which must mention the creator data
- [ ] Old rightteam.in addresses → `.htaccess` redirects, from Search Console's "Not found (404)" list
- [ ] Delete the Vercel project, then `.vercelignore`
- [x] Phase 2: review page and instant publishing (`/admin`)
- [x] Clean URLs and security headers
