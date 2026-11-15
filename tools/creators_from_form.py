"""Convert the creator registration form export (CSV) into the PUBLIC data file
assets/js/creators-data.js used by creators.html.

Usage (from the project folder):
    python -I tools/creators_from_form.py "path/to/Form responses.csv"

Privacy: only brand-relevant, public-facing fields are written. Email, phone,
WhatsApp, date of birth, gender, rates and insight screenshots are NEVER copied.
Never commit the CSV itself to the repo.

Curation: creators are listed only with >= MIN_REACH followers on Instagram or
subscribers on YouTube (tiny accounts weaken the page for brands).
"""
import csv, json, re, sys
from pathlib import Path

MIN_REACH = 1000
OUT = Path(__file__).resolve().parent.parent / "assets" / "js" / "creators-data.js"

NICHE = {
    "Fashion & Beauty": "Fashion & Beauty", "Lifestyle": "Lifestyle", "Food & Restaurants": "Food",
    "Travel": "Travel", "Health & Fitness": "Health & Fitness", "Technology & Gadgets": "Tech",
    "Business & Startups": "Business", "Finance & Education": "Finance & Education",
    "Parenting & Family": "Parenting", "Entertainment & Comedy": "Comedy", "Gaming": "Gaming",
    "Local / City-Based Content": "City & Local",
}
ROLE = {
    "UGC Creator": "UGC", "Podcaster": "Podcasts", "YouTuber": "YouTube videos", "AI Content Creator": "AI content",
    "Video Creator / Editor": "Shoots & edits", "Blogger": "Blogging",
}
COLLAB = {
    "Paid Brand Collaborations": "Paid collabs", "Barter / Product Exchange": "Barter", "UGC Creation (Without Posting)": "UGC without posting",
    "Influencer Campaigns": "Influencer campaigns", "Podcast Collaborations": "Podcasts", "Event Invitations / Coverage": "Events",
    "Long-Term Brand Partnerships": "Long-term partnerships", "Affiliate Partnerships": "Affiliate",
}
SETUP = {"Yes, Complete Setup": "Own shoot & edit setup", "Smartphone-Based Setup": "Shoots on phone", "I Need Production Support": "Needs production support"}
CITY_FIX = {"ahemdabad": "Ahmedabad", "ahmedabad": "Ahmedabad", "surat": "Surat"}


def col(row, prefix):
    for k, v in row.items():
        if k and k.strip().lower().startswith(prefix.lower()):
            return (v or "").strip()
    return ""


def num(s):
    s = (s or "").lower().replace(",", "").replace("+", "").strip()
    m = re.match(r"([\d.]+)\s*([kml]?)", s)
    if not m:
        return 0
    n = float(m.group(1)) * {"k": 1e3, "m": 1e6, "l": 1e5, "": 1}[m.group(2)]
    return int(n)


def handle_from(link):
    link = (link or "").strip()
    if link.startswith("@"):
        return link[1:].split()[0]
    m = re.search(r"instagram\.com/([A-Za-z0-9._]+)", link)
    return m.group(1) if m else ""


def title(s):
    """Names: capitalise each word ("shivam roy" -> "Shivam Roy", "THAKOR VIJAY" -> "Thakor Vijay")."""
    s = re.sub(r"\s+", " ", (s or "").strip())
    words = s.split(" ")
    if s.isupper():
        words = [w.lower() for w in words]
    return " ".join(w[:1].upper() + w[1:] for w in words if w)


def split(s):
    return [x.strip() for x in re.split(r",", s or "") if x.strip()]


def reels(s):
    urls = re.findall(r"https?://(?:www\.)?(?:instagram\.com/(?:reel|p)/[A-Za-z0-9_-]+|youtube\.com/shorts/[A-Za-z0-9_-]+)", s or "")
    clean = []
    for u in urls:
        u = u.replace("http://", "https://").replace("https://instagram.com", "https://www.instagram.com").replace("https://youtube.com", "https://www.youtube.com") + "/"
        if u not in clean:
            clean.append(u)
    return clean[:3]


def main(csv_path):
    rows = list(csv.DictReader(open(csv_path, encoding="utf-8-sig", newline="")))
    out, skipped = [], []
    for r in rows:
        name = title(col(r, "Full Name"))
        handle = handle_from(col(r, "Instagram profile link"))
        ig = num(col(r, "Instagram followers"))
        yt = num(col(r, "YouTube subscribers"))
        yt_link = col(r, "YouTube channel link")
        if not yt_link.lower().startswith("http"):
            yt, yt_link = 0, ""
        if max(ig, yt) < MIN_REACH or not handle:
            skipped.append(f"{name} (@{handle or '?'}, IG {ig}, YT {yt})")
            continue
        city_raw = col(r, "City").strip()
        city = CITY_FIX.get(city_raw.lower(), title(city_raw) if city_raw.islower() else city_raw.strip())
        niches = [NICHE[n] for n in split(col(r, "Your Content Niche")) if n in NICHE]
        platforms = [p.title() if p.lower() != "youtube" else "YouTube" for p in split(col(r, "Which Platforms"))]
        about = col(r, "About You")
        style = col(r, "Describe your content style")
        brands = col(r, "If yes, which brands")
        worked = col(r, "Have you worked with brands").lower().startswith("yes")
        out.append({
            "handle": handle,
            "name": name,
            "city": city,
            "state": col(r, "State"),
            "langs": [l.title() for l in split(col(r, "Preferred Content Language"))],
            "niches": niches or ["Lifestyle"],
            "roles": [ROLE[x] for x in split(col(r, "Your Creator Identity")) if x in ROLE],
            "platforms": platforms or ["Instagram"],
            "followers": ig,
            "yt": yt,
            "ytLink": yt_link.split("?")[0] if yt_link else "",
            "avgViews": col(r, "Average Reel / Video Views").replace("Not Sure / New Creator", "New creator"),
            "audienceIn": col(r, "Where is most of your audience located"),
            "setup": SETUP.get(col(r, "Do You Have Your Own Shooting"), ""),
            "posts": col(r, "Do you post consistently"),
            "travels": col(r, "Are You Open to Outstation").lower().startswith("yes"),
            "collabs": [COLLAB[x] for x in split(col(r, "What Kind of Collaborations")) if x in COLLAB],
            "brands": brands if worked and brands.lower() not in ("", "none", "na", "no", "not fix") else "",
            "bio": re.sub(r"\s+", " ", about or style)[:220],
            "style": re.sub(r"\s+", " ", style)[:260] if about else "",
            "reels": reels(col(r, "Links to your 3 best posts")),
            "photo": "",  # add later, e.g. "assets/creators/<handle>.jpg"
        })
    out.sort(key=lambda c: max(c["followers"], c["yt"]), reverse=True)
    js = ("/* GENERATED by tools/creators_from_form.py from the creator registration form.\n"
          "   Public fields only (no contact details, birth dates, gender or rates).\n"
          "   To add a photo: put it in assets/creators/ and set \"photo\". */\n"
          "window.RT = window.RT || {};\nwindow.RT.creators = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
    OUT.write_text(js, encoding="utf-8")
    print(f"listed {len(out)} creators -> {OUT.name}")
    print(f"skipped {len(skipped)} under {MIN_REACH} reach: " + "; ".join(skipped))


if __name__ == "__main__":
    main(sys.argv[1])
