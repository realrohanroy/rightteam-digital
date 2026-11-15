// Land dots as [lon, lat] pairs, evenly spaced on the curved map surface used by
// assets/js/world.js (lon/lat compressed onto a sphere: theta = (lon-LON0)*KLON,
// phi = lat*KLAT). Must stay in sync with those constants in world.js.
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import { readFileSync, writeFileSync } from "fs";

const topo = JSON.parse(readFileSync("node_modules/world-atlas/land-110m.json", "utf8"));
const land = feature(topo, topo.objects.land);
const KLON = 0.47, KLAT = 0.5, LON0 = 15;
const STEP = Number(process.argv[2] || 1.7); // degrees of latitude between rows
const out = [];
for (let lat = 74; lat >= -56; lat -= STEP) {
  const phi = lat * KLAT * Math.PI / 180;
  // keep dot spacing on the surface equal to row spacing
  const dLon = (STEP * KLAT) / (KLON * Math.cos(phi));
  for (let lon = LON0 - 180; lon < LON0 + 180; lon += dLon) {
    const L = ((lon + 540) % 360) - 180;
    if (geoContains(land, [L, lat])) out.push(+lon.toFixed(2), +lat.toFixed(2));
  }
}
const js = `/* GENERATED: land dots for the presence map (lon,lat pairs; lon may exceed 180 to keep rows continuous). */\nwindow.RT_WORLD_DOTS=${JSON.stringify(out)};\n`;
writeFileSync(process.argv[3] || "world-dots.js", js);
console.log("dots", out.length / 2, "bytes", js.length);
