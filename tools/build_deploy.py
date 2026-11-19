"""Build the upload package for Hostinger: only the public website, nothing else from the repo.

Usage (from the project folder):
    python -I tools/build_deploy.py staging       -> dist/staging/     + dist/rightteam-digital-staging.zip
    python -I tools/build_deploy.py production    -> dist/production/  + dist/rightteam-digital-production.zip

Upload the zip in Hostinger hPanel -> File Manager, extract it in the site's folder.
See docs/DEPLOY.md for the full staging -> production process.

What goes in: the *.html pages, assets/, .htaccess, robots.txt, sitemap.xml, 404.html.
What never goes in: tools/, supabase/, docs/, ops/, test/, lib/, scripts/, CSV/SQL/env files.

Checks (a production build stops on a failure; staging only warns):
  * the Supabase hardening migration is live (the page publishes the key, so the database must be locked)
  * no private files slipped into the package
  * TODO placeholders still in content.js are listed
"""
import json, re, shutil, sys, urllib.request, zipfile
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEPLOY = ROOT / "deploy"
HOSTS = {"staging": "staging.rightteam.in", "production": "rightteam.in"}
PAGES = ["index", "services", "work", "creators", "about", "start", "join", "privacy", "terms"]
FORBIDDEN = re.compile(r"\.(csv|xlsx|sql|py|md|env|pyc|log|zip)$|(^|/)(\.git|\.env|node_modules|tools|supabase|docs|ops|test|lib|scripts)(/|$)", re.I)

# Optional old-site redirects, one per line: "old/path  new-page.html" (kept in deploy/redirects.txt)
REDIRECTS = DEPLOY / "redirects.txt"


def supabase_hardened():
    """True / False / None (couldn't tell) — is submit_creator v3 with the upload limiter live?"""
    js = (ROOT / "assets" / "js" / "content.js").read_text(encoding="utf-8")
    url = re.search(r'supabaseUrl:\s*"([^"]+)"', js)
    key = re.search(r'supabaseAnonKey:\s*"([^"]+)"', js)
    if not (url and key and url.group(1) and key.group(1)):
        return None
    req = urllib.request.Request(url.group(1).rstrip("/") + "/rest/v1/rpc/creator_uploads_recent", data=b"{}", method="POST",
                                 headers={"apikey": key.group(1), "Authorization": "Bearer " + key.group(1), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status == 200
    except urllib.error.HTTPError as e:
        return False if e.code == 404 else None
    except Exception:
        return None


def redirect_rules():
    if not REDIRECTS.exists():
        return ""
    out = []
    for line in REDIRECTS.read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip()
        if not line:
            continue
        old, new = line.split()
        old = re.escape(old.strip("/")).replace(r"\-", "-")
        out.append(f"  RewriteRule ^{old}/?$ /{new.lstrip('/')} [L,R=301]")
    return "\n".join(out)


def main(env):
    if env not in HOSTS:
        sys.exit("usage: python -I tools/build_deploy.py staging|production")
    host, prod = HOSTS[env], env == "production"
    problems, warnings = [], []

    hardened = supabase_hardened()
    if hardened is False:
        (problems if prod else warnings).append(
            "Supabase hardening is NOT applied. Run supabase/migrations/20261119100000_hardening.sql in the SQL Editor first.")
    elif hardened is None:
        warnings.append("Couldn't reach Supabase to confirm the hardening migration. Check it before going live.")

    todos = [l.strip() for l in (ROOT / "assets/js/content.js").read_text(encoding="utf-8").splitlines() if "TODO" in l]
    if todos:
        warnings.append(f"{len(todos)} TODO placeholders in assets/js/content.js:\n      " + "\n      ".join(t[:110] for t in todos))

    out = ROOT / "dist" / env
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    for p in sorted(ROOT.glob("*.html")):
        shutil.copy2(p, out / p.name)
    shutil.copytree(ROOT / "assets", out / "assets", ignore=shutil.ignore_patterns(".*", "Thumbs.db", "*.psd", "*.ai"))

    env_headers = ('  Header always set X-Robots-Tag "noindex, nofollow"' if not prod else
                   '  # raise to max-age=31536000 once HTTPS has worked for a week\n'
                   '  Header always set Strict-Transport-Security "max-age=86400"')
    ht = (DEPLOY / "htaccess.txt").read_text(encoding="utf-8")
    ht = ht.replace("{{ENV}}", env).replace("{{HOST}}", host).replace("{{ENV_HEADERS}}", env_headers)
    ht = ht.replace("{{REDIRECTS}}", redirect_rules() if prod else "  # (redirects are only added to the production build)")
    (out / ".htaccess").write_text(ht, encoding="utf-8", newline="\n")

    if prod:
        (out / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: https://{host}/sitemap.xml\n", encoding="utf-8")
        today = date.today().isoformat()
        urls = "".join(f"  <url><loc>https://{host}/{'' if p == 'index' else p + '.html'}</loc><lastmod>{today}</lastmod></url>\n" for p in PAGES)
        (out / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n'
                                         '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n", encoding="utf-8")
    else:
        (out / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")

    # nothing private may ship
    leaked = [str(p.relative_to(out)).replace("\\", "/") for p in out.rglob("*") if p.is_file() and FORBIDDEN.search(str(p.relative_to(out)).replace("\\", "/"))]
    if leaked:
        problems.append("private files in the package: " + ", ".join(leaked))
    missing = [f"{p}.html" for p in PAGES + ["404"] if not (out / f"{p}.html").exists()]
    if missing:
        problems.append("missing pages: " + ", ".join(missing))

    for w in warnings:
        print("WARNING:", w)
    if problems:
        for p in problems:
            print("STOP:", p)
        shutil.rmtree(out)
        sys.exit(1)

    z = ROOT / "dist" / f"rightteam-digital-{env}.zip"
    with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in sorted(out.rglob("*")):
            if p.is_file():
                zf.write(p, p.relative_to(out).as_posix())
    files = sum(1 for p in out.rglob("*") if p.is_file())
    print(f"built {env} for https://{host}: {files} files, {z.stat().st_size / 1e6:.1f} MB -> {z.relative_to(ROOT)}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "")
