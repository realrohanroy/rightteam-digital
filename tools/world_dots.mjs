// Land dots as [lon, lat] pairs on an even grid for the FLAT presence map in
// assets/js/world.js (x = (lon-LON0)*KLON, y = lat*KLAT, in radians).
// Must stay in sync with those constants in world.js.
// Run: npm i d3-geo topojson-client world-atlas && node tools/world_dots.mjs 1.7 assets/js/world-dots.js
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import { readFileSync, writeFileSync } from "fs";

const topo = JSON.parse(readFileSync("node_modules/world-atlas/land-110m.json", "utf8"));
const land = feature(topo, topo.objects.land);
const KLON = 0.47, KLAT = 0.58, LON0 = 15;
const STEP = Number(process.argv[2] || 1.7); // degrees of latitude between rows
const dLon = (STEP * KLAT) / KLON; // same spacing across as down
const out = [];
for (let lat = 74; lat >= -56; lat -= STEP) {
  for (let lon = LON0 - 180; lon < LON0 + 180; lon += dLon) {
    const L = ((lon + 540) % 360) - 180;
    if (geoContains(land, [L, lat])) out.push(+lon.toFixed(2), +lat.toFixed(2));
  }
}
const js = `/* GENERATED: land dots for the presence map (lon,lat pairs; lon may exceed 180 to keep rows continuous). */\nwindow.RT_WORLD_DOTS=${JSON.stringify(out)};\n`;
writeFileSync(process.argv[3] || "world-dots.js", js);
console.log("dots", out.length / 2, "bytes", js.length);
