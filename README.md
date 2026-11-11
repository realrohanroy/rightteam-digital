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
| `start.html` | Enquiry form. Pre-selects from `?service=…` or `?goal=…` |
| `privacy.html`, `terms.html` | Short drafts — review before launch |

## Before launch — edit `assets/js/content.js`
1. **Reels**: put your `.mp4` files in `assets/reels/`, set `video`, `poster`, `link` (Instagram URL) and `views` (only real numbers). Remove `sample: true`.
2. **Work**: replace sample case studies with real ones; fill `outcome` and `timeframe` only with verified results.
3. **Contact**: confirm `email`, add `whatsapp`, `instagram`, `linkedin`, `mainSite`.
4. **Form**: set `formEndpoint` (e.g. Formspree) so briefs arrive directly. Without it the form opens the visitor's email app.
5. The weekly report on the home page is marked "Example" — replace its numbers with a real client's (with permission) or keep the tag.

## Tech
- GSAP + ScrollTrigger (cdnjs), Lenis smooth scroll (unpkg), Three.js 0.160 (jsdelivr, `assets/js/funnel.js`).
- Respects `prefers-reduced-motion` (no pinning, static funnel, no marquee).
- Header, footer, icons, reels and work cards are rendered by `assets/js/site.js`.
