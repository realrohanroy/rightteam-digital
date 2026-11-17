"""One-time move of the Google Form responses into the Supabase onboarding tables.

Usage (from the project folder):
    python -I tools/import_form_to_supabase.py "path/to/Form responses.csv"

Writes supabase/seed/google_form_import.sql (git-ignored: it contains contact details).
Open Supabase -> SQL Editor, paste the file, Run. Safe to run twice: existing handles are skipped.

Status on import
    live       creators already shown on the website (assets/js/creators-data.js)
    in_review  everyone else, so the team decides in NocoDB
Photos are not uploaded: creators already on the site keep their processed photo in
assets/creators/; the rest are flagged "needs photo" in ops_notes.
"""
import csv, json, re, sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I drops the script folder
from creators_from_form import NICHE, ROLE, COLLAB, SETUP, CITY_FIX, col, num, handle_from, title, split, reels  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "supabase" / "seed" / "google_form_import.sql"
LIVE = set(re.findall(r'"handle": "([^"]+)"', (ROOT / "assets" / "js" / "creators-data.js").read_text(encoding="utf-8")))
PHOTOS = ROOT / "assets" / "creators"
VIEWS = {"Below 1K": "Below 1K", "1K–5K": "1K–5K", "5K–10K": "5K–10K", "10K–50K": "10K–50K",
         "50K–100K": "50K–100K", "100K+": "100K+", "Not Sure / New Creator": "New creator"}
AUDIENCE = {"Gujarat": "Gujarat", "Metro cities": "Metro cities", "Other Indian states": "Other Indian states"}
RATE_COLS = {"story": "Instagram Story Price", "reel": "Instagram Reel Price", "post": "Instagram Post Price",
             "yt_short": "YouTube short video", "yt_long": "Long YouTube video", "collab": "Price with collab"}


def q(v):
    """SQL literal."""
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, int):
        return str(v)
    if isinstance(v, list):
        return "array[" + ",".join(q(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
    if isinstance(v, dict):
        return q(json.dumps(v, ensure_ascii=False)) + "::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


def dash(s):
    return re.sub(r"\s*[–—�-]\s*", "–", (s or "").strip())


def phone(s):
    p = re.sub(r"[\s()-]", "", s or "")
    return p if re.fullmatch(r"\+?\d{7,15}", p) else None


def date_order(rows):
    """Google exports dates in the sheet's locale. Work out d/m vs m/d from the data."""
    firsts, seconds = [], []
    for r in rows:
        for k in ("Timestamp", "Date of Birth"):
            m = re.match(r"(\d{1,2})/(\d{1,2})/\d{4}", col(r, k))
            if m:
                firsts.append(int(m.group(1))); seconds.append(int(m.group(2)))
    if any(x > 12 for x in seconds):
        return "mdy"
    return "dmy"  # also the Indian default when ambiguous


def parse_date(s, order, with_time=False):
    s = (s or "").strip()
    if not s:
        return None
    fmt = ("%m/%d/%Y" if order == "mdy" else "%d/%m/%Y") + (" %H:%M:%S" if with_time else "")
    try:
        d = datetime.strptime(s, fmt)
    except ValueError:
        return None
    return d.strftime("%Y-%m-%d %H:%M:%S+05:30") if with_time else d.strftime("%Y-%m-%d")


def main(csv_path):
    rows = list(csv.DictReader(open(csv_path, encoding="utf-8-sig", newline="")))
    order = date_order(rows)
    stmts, skipped, flagged, seen = [], [], 0, set()
    # newest first, so a creator who registered twice keeps their latest answers
    rows.sort(key=lambda r: parse_date(col(r, "Timestamp"), order, True) or "", reverse=True)
    for r in rows:
        handle = handle_from(col(r, "Instagram profile link")).lower().rstrip(".")
        name = title(col(r, "Full Name"))
        if not re.fullmatch(r"[a-z0-9._]{1,30}", handle) or len(name) < 2:
            skipped.append(name or "(no name)"); continue
        if handle in seen:
            continue
        seen.add(handle)
        notes = []
        city_raw = col(r, "City").strip()
        city = CITY_FIX.get(city_raw.lower(), title(city_raw)) or "Unknown"
        yt_link = col(r, "YouTube channel link")
        yt_ok = yt_link.lower().startswith("http")
        email = col(r, "Email address").strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            notes.append(f"email needs checking: {email or 'missing'}"); email = "missing@example.invalid"
        mob = phone(col(r, "Mobile Number"))
        if not mob:
            notes.append(f"mobile needs checking: {col(r, 'Mobile Number') or 'missing'}"); mob = "0000000"
        has_photo = (PHOTOS / f"{handle}.jpg").exists()
        if not has_photo:
            notes.append("needs photo")
        if notes:
            flagged += 1
        brands = col(r, "If yes, which brands")
        worked = col(r, "Have you worked with brands").lower().startswith("yes")
        rates = {k: col(r, c)[:40] for k, c in RATE_COLS.items() if col(r, c).strip()}
        c = {
            "handle": handle, "status": "live" if handle in LIVE else "in_review", "name": name, "city": city,
            "state": col(r, "State").strip() or None,
            "langs": [l.title() for l in split(col(r, "Preferred Content Language"))],
            "niches": [NICHE[n] for n in split(col(r, "Your Content Niche")) if n in NICHE],
            "roles": [ROLE[x] for x in split(col(r, "Your Creator Identity")) if x in ROLE],
            "platforms": [p.title() if p.lower() != "youtube" else "YouTube" for p in split(col(r, "Which Platforms"))],
            "ig_followers": num(col(r, "Instagram followers")), "yt_subscribers": num(col(r, "YouTube subscribers")) if yt_ok else 0,
            "yt_link": yt_link.split("?")[0][:300] if yt_ok else None,
            "other_link": (col(r, "TikTok / Facebook") if col(r, "TikTok / Facebook").lower().startswith("http") else "")[:300] or None,
            "avg_views": VIEWS.get(dash(col(r, "Average Reel / Video Views")), dash(col(r, "Average Reel / Video Views")) or None),
            "audience_in": AUDIENCE.get(col(r, "Where is most of your audience located").strip()) or (col(r, "Where is most of your audience located").strip() or None),
            "setup": SETUP.get(col(r, "Do You Have Your Own Shooting"), None),
            "posts_consistently": dash(col(r, "Do you post consistently")) or None,
            "open_to_travel": col(r, "Are You Open to Outstation").lower().startswith("yes"),
            "collabs": [COLLAB[x] for x in split(col(r, "What Kind of Collaborations")) if x in COLLAB],
            "brands": brands[:300] if worked and brands.lower() not in ("", "none", "na", "no", "not fix") else None,
            "bio": re.sub(r"\s+", " ", col(r, "About You"))[:600] or None,
            "style": re.sub(r"\s+", " ", col(r, "Describe your content style"))[:600] or None,
            "best_posts": reels(col(r, "Links to your 3 best posts")),
            "portfolio_link": (col(r, "Share Your Best Work") if col(r, "Share Your Best Work").lower().startswith("http") else "")[:300] or None,
            "source": "google_form", "ops_notes": "; ".join(notes) or None,
        }
        submitted = parse_date(col(r, "Timestamp"), order, True)
        p = {
            "email": email, "phone": mob, "whatsapp": phone(col(r, "WhatsApp Number")),
            "date_of_birth": parse_date(col(r, "Date of Birth"), order), "gender": col(r, "Gender").strip()[:30] or None,
            "rates": rates, "anything_else": col(r, "Anything else you")[:1000] or None,
            "consent_at": submitted or "now()", "consent_version": "google-form",
        }
        cols = ", ".join(c) + ", submitted_at"
        vals = ", ".join((q(v) + "::public.creator_status") if k == "status" else q(v) for k, v in c.items())
        vals += ", " + (q(submitted) + "::timestamptz" if submitted else "now()")
        pvals = ", ".join("now()" if v == "now()" else (q(v) + ("::timestamptz" if k == "consent_at" else "::date" if k == "date_of_birth" and v else "")) for k, v in p.items())
        stmts.append(
            f"with c as (\n  insert into public.creators ({cols})\n  values ({vals})\n  on conflict (handle) do nothing returning id\n)\n"
            f"insert into public.creator_private (creator_id, {', '.join(p)})\nselect id, {pvals} from c;\n")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("-- GENERATED by tools/import_form_to_supabase.py. Contains contact details: never commit.\n"
                   "begin;\n" + "\n".join(stmts) + "commit;\n", encoding="utf-8")
    print(f"dates read as {order}; wrote {len(stmts)} creators -> {OUT.relative_to(ROOT)}")
    live = sum(1 for s in stmts if "'live'::" in s)
    print(f"{live} live on the site, {flagged} flagged in ops_notes for the team")
    if skipped:
        print(f"skipped {len(skipped)} without a usable Instagram handle: " + ", ".join(skipped))


if __name__ == "__main__":
    main(sys.argv[1])
