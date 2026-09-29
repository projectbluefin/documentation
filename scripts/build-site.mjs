#!/usr/bin/env node
/**
 * Builds the site with each translated locale in its own process, in parallel.
 *
 * `docusaurus build` builds locales one after another in a single process, so
 * every translated locale that goes live adds its full build time to CI (~10s
 * each on a hosted runner, with ~20 locales open for translation). Here the
 * English build and a bounded pool of translated builds run concurrently.
 *
 * Isolation per translated process:
 * - `DOCUSAURUS_GENERATED_FILES_DIR_NAME` gives each its own generated-files
 *   dir instead of the shared `.docusaurus/`.
 * - `--out-dir .locale-build` keeps it out of `build/`, which the English
 *   build clears on start; outputs move into `build/<locale>/` at the end.
 * - `DOCUSAURUS_NO_PERSISTENT_CACHE` stops concurrent writers sharing
 *   `node_modules/.cache/rspack`.
 *
 * A single `--locale` build normally drops the `/<locale>/` baseUrl segment;
 * docusaurus.config.ts pins it per locale, and `assertLocalizedBaseUrl` fails
 * the build if a translated output was rendered against the English root.
 *
 * CI spreads the locales over several runners, because one 4-vCPU runner is
 * CPU-bound: `--matrix` prints the job list, `--part en` builds English and
 * `--part <i>/<n>` builds shard i of n translated locales (in parallel).
 *
 * Usage: node scripts/build-site.mjs [--matrix | --part en|<i>/<n>]
 *                                   [extra docusaurus build args]
 * Env:   BUILD_LOCALE_CONCURRENCY — translated builds at once
 *        (default: available CPUs - 1, minimum 1)
 */

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { availableParallelism } from "node:os";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { translatedLocales } from "./lib/translated-locales.mjs";
import { mapWithConcurrency } from "./lib/request-queue.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STAGE = ".locale-build";
const DOCUSAURUS = createRequire(import.meta.url).resolve(
  "@docusaurus/core/bin/docusaurus.mjs",
);
/** Translated locales per CI shard: about one runner's worth of parallel builds. */
const LOCALES_PER_SHARD = 4;

/**
 * Splits translated locales into the fewest shards of at most `perShard`,
 * round-robin so shards stay even. Every locale lands in exactly one shard;
 * a locale missing here would build nowhere and silently never deploy.
 */
export function planShards(locales, perShard = LOCALES_PER_SHARD) {
  const count = Math.ceil(locales.length / perShard);
  return Array.from({ length: count }, (_, s) =>
    locales.filter((_, i) => i % count === s),
  );
}

/** The GitHub Actions matrix: English plus one job per translated shard. */
export function buildMatrix(locales, perShard = LOCALES_PER_SHARD) {
  const shards = planShards(locales, perShard);
  return {
    include: [
      { part: "en" },
      ...shards.map((_, s) => ({ part: `${s + 1}/${shards.length}` })),
    ],
  };
}

/** The translated locales a `<i>/<n>` part builds; throws on a stale plan. */
export function localesForPart(part, locales, perShard = LOCALES_PER_SHARD) {
  const match = /^(\d+)\/(\d+)$/.exec(part);
  const shards = planShards(locales, perShard);
  if (!match || Number(match[2]) !== shards.length) {
    throw new Error(
      `build-site: part "${part}" does not match ${shards.length} shard(s) ` +
        `for [${locales.join(" ")}]`,
    );
  }
  const shard = shards[Number(match[1]) - 1];
  if (!shard) throw new Error(`build-site: no shard ${part}`);
  return shard;
}

/** True when a built page references its own locale's base URL. The HTML
 * minifier drops attribute quotes, so `href=/pl/…` and `href="/pl/…"` both count. */
export function hasLocalizedBaseUrl(html, locale) {
  return new RegExp(`(?:href|src)=["']?/${locale}/`).test(html);
}

function assertLocalizedBaseUrl(locale) {
  const index = join(ROOT, "build", locale, "index.html");
  if (!hasLocalizedBaseUrl(readFileSync(index, "utf8"), locale)) {
    throw new Error(
      `build/${locale}/index.html has no /${locale}/ URLs — it was built ` +
        `against the English root. Is i18n.localeConfigs.${locale}.baseUrl set?`,
    );
  }
}

/** Runs `docusaurus build <args>`, prefixing its output with `label`. */
function build(label, args, env = {}) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [DOCUSAURUS, "build", ...args], {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const prefix = (stream, out) => {
      let rest = "";
      stream.on("data", (chunk) => {
        const lines = (rest + chunk).split("\n");
        rest = lines.pop();
        for (const line of lines) out.write(`[${label}] ${line}\n`);
      });
      stream.on("end", () => rest && out.write(`[${label}] ${rest}\n`));
    };
    prefix(child.stdout, process.stdout);
    prefix(child.stderr, process.stderr);
    child.on("error", (err) => {
      console.error(`[${label}] failed to start: ${err.message}`);
      done({ label, ok: false });
    });
    child.on("close", (code, signal) =>
      done({ label, ok: code === 0 && signal === null }),
    );
  });
}

/** Per-process scratch the translated builds write; removed before and after. */
function removeScratch(locales) {
  for (const dir of [STAGE, ...locales.map((l) => `.docusaurus-${l}`)]) {
    rmSync(join(ROOT, dir), { recursive: true, force: true });
  }
}

function buildTranslated(locales, extraArgs, concurrency) {
  return mapWithConcurrency(
    locales,
    (locale) =>
      build(locale, ["--locale", locale, "--out-dir", STAGE, ...extraArgs], {
        DOCUSAURUS_GENERATED_FILES_DIR_NAME: `.docusaurus-${locale}`,
        DOCUSAURUS_NO_PERSISTENT_CACHE: "true",
      }),
    { concurrency },
  );
}

function moveIntoBuild(locales) {
  mkdirSync(join(ROOT, "build"), { recursive: true });
  for (const locale of locales) {
    const from = join(ROOT, STAGE, locale);
    if (!existsSync(from)) {
      throw new Error(`build-site: ${locale} produced no ${STAGE}/${locale}`);
    }
    renameSync(from, join(ROOT, "build", locale));
    assertLocalizedBaseUrl(locale);
  }
}

function failIfAny(results) {
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    throw new Error(
      `build-site: failed: ${failed.map((r) => r.label).join(", ")}`,
    );
  }
}

async function main() {
  const argv = process.argv.slice(2);
  // An explicit `--locale` (e.g. `npm run build:ci -- --locale de` to preview
  // one translation) is a single ordinary build; hand it to Docusaurus as is.
  if (argv.includes("--locale")) {
    failIfAny([await build("build", argv)]);
    return;
  }
  const locales = translatedLocales(join(ROOT, "i18n"));
  if (argv[0] === "--matrix") {
    process.stdout.write(JSON.stringify(buildMatrix(locales)));
    return;
  }
  if (argv[0] === "--list-locales") {
    process.stdout.write(locales.join(" "));
    return;
  }
  const part = argv[0] === "--part" ? argv[1] : null;
  const extraArgs = part === null ? argv : argv.slice(2);
  const concurrency = Math.max(
    1,
    Number(process.env.BUILD_LOCALE_CONCURRENCY) || availableParallelism() - 1,
  );

  if (part === "en") {
    failIfAny([await build("en", ["--locale", "en", ...extraArgs])]);
    return;
  }
  const translated = part === null ? locales : localesForPart(part, locales);
  console.log(
    `build-site: ${part === null ? "en + " : ""}${translated.length} ` +
      `translated locale(s) [${translated.join(" ")}], ${concurrency} at a time`,
  );
  // A full local build runs English beside the translated pool; English
  // clears build/ on start, so translated output is moved in afterwards.
  removeScratch(translated);
  try {
    const [english, results] = await Promise.all([
      part === null
        ? build("en", ["--locale", "en", ...extraArgs])
        : Promise.resolve(null),
      buildTranslated(translated, extraArgs, concurrency),
    ]);
    failIfAny([...(english ? [english] : []), ...results]);
    moveIntoBuild(translated);
  } finally {
    removeScratch(translated);
  }
  console.log(
    `build-site: ${translated.length + (part === null ? 1 : 0)} locale(s) built`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
