// Builds the public website into _site/ for Hostinger (build command: npm run build,
// output directory: _site). No dependencies. It copies ONLY what visitors may open:
// the root *.html pages, assets/, robots.txt, sitemap.xml and .htaccess.
// tools/, supabase/, docs/, README.md and everything else never reach the server.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "_site");
const FORBIDDEN = /\.(csv|xlsx|sql|py|md|env|ts|mjs|log|zip|psd|ai)$|(^|\/)(tools|supabase|docs|ops|test|lib|scripts|deploy|node_modules)(\/|$)/i;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const pages = readdirSync(ROOT).filter((f) => f.endsWith(".html"));
for (const f of pages) cpSync(join(ROOT, f), join(OUT, f));
for (const f of ["robots.txt", "sitemap.xml", ".htaccess"]) if (existsSync(join(ROOT, f))) cpSync(join(ROOT, f), join(OUT, f));
cpSync(join(ROOT, "assets"), join(OUT, "assets"), {
  recursive: true,
  filter: (src) => !basename(src).startsWith(".") && !/^(Thumbs\.db)$/i.test(basename(src)),
});

// safety net: nothing private may ship
const files = [];
const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(relative(OUT, p).split(sep).join("/")); });
walk(OUT);
const leaked = files.filter((f) => FORBIDDEN.test(f));
if (leaked.length) { console.error("Refusing to publish private files:", leaked); process.exit(1); }
if (!pages.includes("index.html")) { console.error("index.html missing"); process.exit(1); }

console.log(`Built _site/: ${pages.length} pages, ${files.length} files.`);
