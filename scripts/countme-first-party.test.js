const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repo = path.join(__dirname, "..");
const policy = import("./lib/countme-sources.mjs");

/**
 * The count-source rule, enforced.
 *
 * Every Project Bluefin number comes from countme.projectbluefin.io and nothing
 * else. The single exception is ublue-os/bluefin:stable, whose number is
 * upstream's to publish.
 *
 * This rule lived in prose in projectbluefin/common for months and was broken
 * anyway: fetch-countme.js carried a NON_FEDORA_VARIANTS exemption whose only
 * purpose was to sum Bluefin LTS across EPEL repo hits, and /analytics published
 * the result as a population. Prose cannot fail a build. This can.
 */

const read = (rel) => fs.readFileSync(path.join(repo, rel), "utf8");

/**
 * Components that consume `static/data/countme-history.json`. Reading a
 * Project Bluefin count out of it — by any spelling — is reading a Fedora
 * number under our name.
 */
const CONSUMERS = [
  "src/components/analytics/CountmeAnalyticsCharts.tsx",
  "src/components/factory/panels/MetricsPanels.tsx",
  "src/components/reports/ReportCountmeTrend.tsx",
];

test("the Fedora CSV pipeline publishes no projectbluefin image", async () => {
  const { PROJECTBLUEFIN_REPOS } = await policy;
  const src = read("scripts/fetch-countme.js");

  // VARIANTS is the published key set. A projectbluefin repo appearing in it is
  // a Fedora-derived number wearing our name.
  const variants = /export const VARIANTS = \[([\s\S]*?)\]/.exec(src);
  assert.ok(variants, "fetch-countme.js must export VARIANTS");
  const published = [...variants[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

  for (const banned of PROJECTBLUEFIN_REPOS) {
    assert.ok(
      !published.includes(banned),
      `${banned} is a projectbluefin image; its count comes from ` +
        `countme.projectbluefin.io, never from the Fedora CSV`,
    );
  }
});

test("no EPEL exemption can reappear in the counting rule", async () => {
  const src = read("scripts/fetch-countme.js");

  // NON_FEDORA_VARIANTS existed solely to let Bluefin LTS skip the base-repo
  // restriction and be summed across EPEL mirrors. That is the exact mechanism
  // that turned an upstream artefact into a published LTS population.
  assert.ok(
    !/export const NON_FEDORA_VARIANTS/.test(src),
    "NON_FEDORA_VARIANTS is the EPEL exemption; it does not come back",
  );
  assert.ok(
    !/normalizeVariant[\s\S]*?return "bluefin-lts"/.test(src),
    "the Fedora CSV parser must not resolve any row to bluefin-lts",
  );
});

test("the shipped dataset carries no projectbluefin count", async () => {
  const { PROJECTBLUEFIN_REPOS, FORBIDDEN_SOURCES } = await policy;
  const data = JSON.parse(read("static/data/countme-history.json"));

  for (const forbidden of FORBIDDEN_SOURCES) {
    if (!String(data.source ?? "").includes(forbidden)) continue;
    // This dataset is upstream-derived, so it may not name one of our images.
    for (const week of data.weeks ?? []) {
      for (const banned of PROJECTBLUEFIN_REPOS) {
        assert.ok(
          !(banned in week),
          `week ${week.week} carries "${banned}" from ${data.source} — ` +
            `a Project Bluefin count may only come from ` +
            `countme.projectbluefin.io`,
        );
      }
    }
  }
});

test("no component reads a projectbluefin count out of the upstream dataset", async () => {
  const { PROJECTBLUEFIN_REPOS } = await policy;

  // Reading w.bluefin or w["bluefin-lts"] out of a consumer is reading a
  // Fedora number. This catches the literal spelling; the computed spelling
  // has its own test below, because it is the one that got through.

  const offenders = [];
  for (const rel of CONSUMERS) {
    const full = path.join(repo, rel);
    if (!fs.existsSync(full)) continue;
    const src = fs.readFileSync(full, "utf8");
    for (const banned of PROJECTBLUEFIN_REPOS) {
      const patterns = [
        new RegExp(`\\bw\\.${banned}\\b`),
        new RegExp(`\\["${banned}"\\]`),
        new RegExp(`\\blatest\\.${banned}\\b`),
        new RegExp(`latestWeek\\.${banned}\\b`),
      ];
      if (patterns.some((p) => p.test(src)))
        offenders.push(`${rel}: ${banned}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "these read a Project Bluefin count out of the Fedora-derived dataset:\n" +
      offenders.join("\n"),
  );
});

test("no consumer reaches a countme week by a key list of its own", async () => {
  const { PROJECTBLUEFIN_REPOS } = await policy;
  const { VARIANTS } = await import("./fetch-countme.js");

  // The literal check above missed this twice, because the offending code never
  // writes the name down next to the week. It writes a list of ids somewhere
  // else and indexes with a variable:
  //
  //   const familyIds = BLUEFIN_FAMILY_IMAGES.map((f) => f.id);
  //   const fleetOf = (w) => sumPresent(familyIds.map((id) => w[id]));
  //
  // which published a "Project Bluefin fleet" line out of the Fedora CSV while
  // reading, letter for letter, as if it touched nothing of ours.
  const WEEKISH = "w|week|latest|latestWeek|prev\\d*|previous|current";
  const computedIndex = new RegExp(
    `(?:\\b(?:${WEEKISH})\\b|\\(\\s*(?:${WEEKISH})\\s+as\\b[^)]*\\))` +
      `\\s*\\[\\s*([A-Za-z_$][\\w$.]*)\\s*\\]`,
    "g",
  );

  const offenders = [];
  for (const rel of CONSUMERS) {
    const full = path.join(repo, rel);
    if (!fs.existsSync(full)) continue;
    const src = fs.readFileSync(full, "utf8");

    // 1. A catalogue of our images, keyed straight into a week. The catalogue
    //    is legitimate — it drives the publication matrix — but its ids name
    //    images this dataset may not count, so they never become week keys.
    const catalogued = /BLUEFIN_FAMILY_IMAGES|ProjectBluefinImageSpec/.test(
      src,
    );
    for (const [match, key] of src.matchAll(computedIndex)) {
      if (catalogued) offenders.push(`${rel}: ${match.trim()} (${key})`);
    }

    // 2. A hand-written key list mixing our images with upstream variants.
    //    Those two sets are counted by different services, so one list holding
    //    both is a list of keys into whichever single dataset is at hand — and
    //    the only dataset at hand here is the upstream one.
    for (const [literal] of src.matchAll(/\[[^[\]]*\]/g)) {
      const strings = [...literal.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
      const ours = strings.filter((s) => PROJECTBLUEFIN_REPOS.includes(s));
      const upstream = strings.filter((s) => VARIANTS.includes(s));
      if (ours.length && upstream.length)
        offenders.push(`${rel}: ${literal.trim()}`);
    }

    // 3. A countme week type that declares one of our images as a field. The
    //    shape is the claim: if the type says the week carries `bluefin`, some
    //    reader eventually believes it.
    for (const [, body] of src.matchAll(
      /(?:interface|type)\s+\w*(?:Countme|Week)\w*[^{]*\{([^}]*)\}/g,
    )) {
      for (const banned of PROJECTBLUEFIN_REPOS) {
        if (new RegExp(`(?:^|[\\s{,;])"?${banned}"?\\s*\\??\\s*:`).test(body))
          offenders.push(`${rel}: week type declares "${banned}"`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "these reach a Project Bluefin count by a key the file supplies itself:\n" +
      offenders.join("\n"),
  );
});

test("isPermittedSource allows exactly one upstream pairing", async () => {
  const { isPermittedSource, UPSTREAM_ALLOWED, FIRST_PARTY } = await policy;

  assert.ok(isPermittedSource(UPSTREAM_ALLOWED.id, UPSTREAM_ALLOWED.source));
  assert.ok(isPermittedSource("bluefin-lts", `${FIRST_PARTY.origin}/summary`));

  // The exception is one image from one endpoint, not a general licence.
  assert.ok(
    !isPermittedSource(
      "bluefin-lts",
      "https://data-analysis.fedoraproject.org/csv-reports/countme/totals.csv",
    ),
  );
  assert.ok(!isPermittedSource("bluefin-lts", UPSTREAM_ALLOWED.source));
  assert.ok(!isPermittedSource("dakota", UPSTREAM_ALLOWED.source));
  assert.ok(
    !isPermittedSource(
      UPSTREAM_ALLOWED.id,
      "https://data-analysis.fedoraproject.org/csv-reports/countme/totals.csv",
    ),
  );
});

test("countme is never called telemetry in published copy", () => {
  // It is countme. "Telemetry" is the word the privacy pages use to say what
  // Bluefin does NOT do, so borrowing it for countme copy contradicts them.
  const surfaces = [
    "docs/analytics.mdx",
    "src/components/analytics/CountmeAnalyticsCharts.tsx",
    "src/components/reports/ReportCountmeTrend.tsx",
  ];

  const offenders = [];
  for (const rel of surfaces) {
    const full = path.join(repo, rel);
    if (!fs.existsSync(full)) continue;
    fs.readFileSync(full, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (/telemetry/i.test(line))
          offenders.push(`${rel}:${i + 1} ${line.trim()}`);
      });
  }

  assert.deepEqual(
    offenders,
    [],
    `say "countme", not "telemetry":\n${offenders.join("\n")}`,
  );
});
