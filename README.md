# Right Team Digital — website

Static site (HTML/CSS/JS, no build step). Open with any static server:

```bash
python -m http.server 5510
```

## Pages
| File | Purpose |
|---|---|
| `index.html` | Home: hero with reel columns, 3D lead funnel, services, reels, reporting, creators, work, FAQ, CTA |
| `services.html` | All four services as chapters (`#lead-generation`, `#reels-video`, `#social-creators`, `#search-web`) + "What are you planning?" packages (`#planning`) |
| `work.html` | Reels strip + filterable case studies |
| `about.html` | About + how we work |
| `creators.html` | Find a Creator: Discover hero, filterable creator directory, profile drawer, shortlist tray → enquiry form |
| `start.html` | Enquiry form. Pre-selects from `?service=…`, `?goal=…` or `?creators=handle1,handle2` |
| `privacy.html`, `terms.html` | Short drafts — review before launch |

## Before launch — edit `assets/js/content.js`
1. **Reels**: done — 13 Instagram reels are listed in `content.js` (`ig` = the code after `/reel/`). Covers live in `assets/reels/<code>.jpg`; clicking a reel plays Instagram's official embed. To add one, save its cover there and add a line. Add `views` only with real numbers.
2. **Work**: replace sample case studies with real ones; fill `outcome` and `timeframe` only with verified results.
3. **Contact**: confirm `email`, add `whatsapp`, `instagram`, `linkedin`, `mainSite`.
4. **Form**: set `formEndpoint` (e.g. Formspree) so briefs arrive directly. Without it the form opens the visitor's email app.
5. The weekly report on the home page is marked "Example" — replace its numbers with a real client's (with permission) or keep the tag.

## Tech
- GSAP + ScrollTrigger (cdnjs), Lenis smooth scroll (unpkg), Three.js 0.160 (jsdelivr, `assets/js/funnel.js`).
- Respects `prefers-reduced-motion` (no pinning, static funnel, no marquee).
- Header, footer, icons, reels and work cards are rendered by `assets/js/site.js`.

## Cache busting
CSS/JS links carry `?v=N`. After changing any file in `assets/css` or `assets/js`, bump N in every `.html` file so returning visitors don't run stale code:
`sed -i 's/?v=2"/?v=3"/g' *.html`

## Creators (creators.html)
Creators come from the registration form export. To refresh after new sign-ups:

```bash
python -I tools/creators_from_form.py "path/to/Form responses 1.csv"
```

This writes `assets/js/creators-data.js` with **public fields only** (no email, phone, WhatsApp, date of birth, gender, rates or insight screenshots) and lists only creators with 1,000+ followers on Instagram or YouTube. Never commit the CSV (`*.csv` is git-ignored).

- **Photos**: in Google Forms → Responses → "Upload Your Profile Photo" → *View folder* → select all → Download (one zip). Extract it, then:
  ```bash
  python -I tools/creator_photos.py "path/to/extracted/folder"
  python -I tools/creators_from_form.py "path/to/Form responses.csv"
  ```
  `tools/creator_photo_map.json` maps each Instagram handle to the uploader name in the Drive file name; add new creators there. Photos are face-cropped, compressed and stripped of EXIF/GPS. Screenshots, PDFs and videos are skipped (initials shown instead).
- **Consent**: the form's checkbox covers being contacted, not being publicly listed. Add a "Show me on the Right Team creator page" checkbox (or get each creator's OK) before going live.
- Filters, counts and the hero all build themselves from the data; filtered views are shareable via the URL (e.g. `creators.html?niche=Food&travel=Travels+for+campaigns`).

