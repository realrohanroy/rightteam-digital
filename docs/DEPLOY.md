# Deploying to Hostinger: staging first, then rightteam.in

```
build the package  ─►  staging.rightteam.in (private, password-protected)  ─►  test  ─►  rightteam.in
python -I tools/build_deploy.py staging|production
```

The site is plain HTML, CSS and JavaScript. Hostinger only stores and serves files, and the creator form talks to Supabase directly, so there's no server software to install. The build script packages **only** the public files and runs safety checks first. It never includes `tools/`, `supabase/`, `docs/`, CSV files and so on.

---

## 0. Before you touch anything

1. **The old site is being retired** (decided 2026-11-20). rightteam.in currently runs the Right Team compliance site: a React frontend plus a backend. Before switching:
   - **Back up its data, not just its pages.** The backend may hold client enquiries or accounts in a database, possibly on another service such as Render, Railway or a VPS. Export that database and keep the export somewhere safe and private.
   - **Then shut that backend down** once the export is confirmed, so it stops costing money and doesn't leave personal data on a forgotten server.
   - **If any client still uses a login, form or link** from the old site, tell them where to go now.
2. **Don't touch email.** If anyone uses `@rightteam.in` email, it depends on the domain's **MX** and **TXT** DNS records. Every step below changes only the website. Never delete MX or TXT records.
3. **Find out where rightteam.in is hosted now.**
   - **hPanel → Websites:** if `rightteam.in` is listed, the current site is on Hostinger (**case A**).
   - **hPanel → Domains → rightteam.in → DNS / Nameservers:**
     - If the `@` A record points to an address Hostinger doesn't show as yours, or to Vercel or Netlify, the domain is at Hostinger but the site lives elsewhere (**case B**).
     - If the domain isn't in hPanel at all, the domain is registered elsewhere (**case C**). The DNS changes then happen at that registrar.

## 1. Back up the current site (keep it for at least a month)

- **Case A:**
  1. Go to **hPanel → Files → File Manager → `public_html`**, select everything, click **Compress → zip**, then download the zip.
  2. If the old site uses a database, export it under **hPanel → Databases → phpMyAdmin → Export**.
  3. Also take a snapshot under **hPanel → Files → Backups**.
- **Case B or C:** the old site stays untouched where it is. Just note its current DNS records (take a screenshot) so you can switch back.
- **Collect the old site's addresses:**
  1. Open `https://rightteam.in/sitemap.xml`, or **Google Search Console → Pages** if you have access.
  2. For each important old page, add a line to [`deploy/redirects.txt`](../deploy/redirects.txt), for example `contact-us  start.html`.

  Visitors and Google then land on a matching new page instead of an error. Any address not listed shows the "This page has moved" page.

## 2. Staging: `staging.rightteam.in`

1. **Create the subdomain:** **hPanel → Domains → Subdomains**, enter `staging`, then **Create**. Hostinger makes a folder for it; note the folder path.
2. **Turn on HTTPS:** **hPanel → Security → SSL**, then install the free certificate for `staging.rightteam.in`. It can take 10–30 minutes.
3. **Keep it private:** **hPanel → Advanced → Password Protect Directories**, choose the staging folder and set a username and password. Share them only with the team. The build also tells Google not to index staging.
4. **Build the package:**
   ```bash
   python -I tools/build_deploy.py staging
   ```
   This creates `dist/rightteam-digital-staging.zip`. Warnings, such as the Supabase hardening or TODO items, don't block staging.
5. **Upload it:**
   1. Open **File Manager**, go into the staging folder and **Upload** the zip.
   2. Right-click the zip and choose **Extract** into the current folder, then delete the zip.
   3. Turn on **Show hidden files** in File Manager's settings and check that `.htaccess` is there.

If the staging folder sits inside the old site's `public_html`, the old site's rules can affect it. Our `.htaccess` has its own rules, which take priority. If staging still shows the old site, check the subdomain's folder path.

## 3. Test staging (all of it, on a phone too)

- [ ] Every page opens: Home, Services, Work, Find a Creator, About, Start a Project, Join, Privacy, Terms.
- [ ] `http://staging.rightteam.in` switches to `https://` by itself.
- [ ] A made-up address like `/abc` shows the "This page has moved" page.
- [ ] The home page animations, the map and the reels run smoothly on a mid-range Android phone.
- [ ] **Find a Creator:** filters, search, shortlist, and sending the shortlist to the brief form.
- [ ] **Start a Project:** the brief reaches you, or opens the email app until a form endpoint is set.
- [ ] **Join as a Creator:**
  1. Do a full registration with handle `rt_test_staging`, a photo and a screenshot.
  2. Check it appears in NocoDB.
  3. Try registering the same handle again; it should be refused.
- [ ] Speed: <https://pagespeed.web.dev> on the home page. Aim for 80+ on mobile.
- [ ] Security headers: <https://securityheaders.com> should score **A** or better.

## 4. Gates before production (the production build enforces the first)

- [ ] **Supabase hardening is applied.** Run [`supabase/migrations/20261119100000_hardening.sql`](../supabase/migrations/20261119100000_hardening.sql). `build_deploy.py production` **refuses to build** until it is, because a public page exposes the Supabase key.
- [ ] **Placeholders are filled in** in `assets/js/content.js` (the build lists them): contact email, Instagram, LinkedIn, office hours. The footer's "Right Team Private Limited" link now goes to the About page, since the old company site is retired.
- [ ] **Creators have agreed** to appear publicly. The 27 creators on the page came from the Google Form; ask them, or have them re-register via `/join.html`.
- [ ] **The privacy policy mentions the creator form** (photo, contact details, rates, screenshots) and who can see that data. Have someone check the legal pages.
- [ ] **`deploy/redirects.txt` is filled in** from step 1.
- [ ] **Test rows are deleted** in the Supabase SQL Editor: `delete from public.creators where handle like 'rt_test_%';`

## 5. Go live on rightteam.in

Pick a quiet time, such as late evening. The switch takes about 15 minutes, plus DNS time in case B or C.

1. Build:
   ```bash
   python -I tools/build_deploy.py production
   ```
   This creates `dist/rightteam-digital-production.zip`.
2. **Case A (old site on Hostinger):**
   1. In **File Manager**, create a folder **outside** `public_html` called `old-site-YYYY-MM-DD`.
   2. **Move** everything from `public_html` into that folder.
   3. Upload the production zip to the now-empty `public_html`, **Extract** it, delete the zip, and check `.htaccess` is there.

   **Case B or C (domain pointed elsewhere):**
   1. In hPanel, **add rightteam.in as a website** (**Websites → Add website → use an existing domain**) and upload the zip to its `public_html`, as above.
   2. Change **only** the website DNS records to Hostinger's address (hPanel shows it):
      - the `@` **A** record;
      - the `www` record (CNAME to `rightteam.in`, or an A record to the same address).
      - Leave **MX/TXT alone**.
   3. DNS takes from a few minutes up to 24 hours. Remove the domain from the old host only after the new site shows everywhere.
3. **HTTPS:** **hPanel → Security → SSL** for `rightteam.in` and `www.rightteam.in`.
4. Repeat the **step 3 checklist** on `https://rightteam.in`, and also check:
   - `https://www.rightteam.in` goes to `https://rightteam.in`;
   - old addresses from `redirects.txt` land on the right pages.
5. **Google:** in **Search Console**, add or verify `rightteam.in`, submit `https://rightteam.in/sitemap.xml`, and watch the **Pages** report for errors over the next 2 weeks.
6. After a week with HTTPS working, raise `Strict-Transport-Security` in `deploy/htaccess.txt` to `max-age=31536000`, rebuild and re-upload.

## If something goes wrong: roll back

- **Case A:** move the new files out of `public_html` and move the `old-site-…` folder's contents back. It takes about 2 minutes.
- **Case B or C:** set the DNS records back to the values in your screenshot from step 1.

The creator registrations in Supabase are unaffected either way.

## Later updates

1. Change the code.
2. Run `python -I tools/build_deploy.py staging`, upload and test.
3. Run `… production`, upload to `public_html`, extract and overwrite.

If uploads get tedious, a GitHub Action can upload automatically over FTP: pushes to a `staging` branch go to staging, and a release tag goes to production.
