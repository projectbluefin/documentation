#!/usr/bin/env node
/**
 * Fetches registry data from hive.kubestellar.io/api/registry at build time.
 * Saves the projectbluefin entry to static/data/registry-data.json.
 *
 * The registry API has no CORS headers, so browser-side fetches are blocked.
 * This script runs in Node.js (no CORS restriction) and bakes the data in.
 *
 * Respects 24-hour file cache unless --force is passed.
 */

import { writeFileSync, existsSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../static/data/registry-data.json");
const REGISTRY_URL = "https://hive.kubestellar.io/api/registry";
const TARGET_ORG = "projectbluefin";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const force = process.argv.includes("--force");

if (!force && existsSync(OUT)) {
  const age = Date.now() - statSync(OUT).mtimeMs;
  if (age < CACHE_TTL_MS) {
    console.log(`fetch-registry-data: cache fresh (${Math.round(age / 60000)}m old), skipping`);
    process.exit(0);
  }
}

console.log(`fetch-registry-data: fetching ${REGISTRY_URL}`);
try {
  const res = await fetch(REGISTRY_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const entry = data.hives?.find((h) => h.org === TARGET_ORG) ?? null;
  if (!entry) {
    console.warn(`fetch-registry-data: no entry for org=${TARGET_ORG}, writing null`);
    writeFileSync(OUT, "null\n");
  } else {
    writeFileSync(OUT, JSON.stringify(entry, null, 2) + "\n");
    console.log(`fetch-registry-data: wrote ${OUT} (acmmLevel=${entry.acmmLevel}, mode=${entry.governorMode})`);
  }
} catch (err) {
  console.error(`fetch-registry-data: fetch failed: ${err.message}`);
  // Write a null file so the build doesn't fail and the dashboard degrades gracefully
  if (!existsSync(OUT)) writeFileSync(OUT, "null\n");
  process.exit(0);
}
