import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  parseCsvLine,
  splitCsvRow,
  normalizeVariant,
  aggregateWeeks,
  mergeHistory,
  tailRange,
  buildPayload,
  METHOD,
  VARIANTS,
  PROJECTBLUEFIN_IMAGES,
} from "./fetch-countme.js";

/**
 * A CSV record in the documented column order. Defaults describe an ordinary
 * countme row, so each test states only the field it is actually about.
 *
 * The default os_name is Aurora: this pipeline publishes upstream images only,
 * so a fixture naming a Project Bluefin image would be dropped before it
 * reached the rule under test.
 */
function row({
  week_start = "2026-07-27",
  week_end = "2026-08-02",
  hits = 1,
  os_name = "Aurora",
  os_version = "44",
  os_variant = "workstation",
  os_arch = "x86_64",
  sys_age = "1",
  repo_tag = "fedora-44",
  repo_arch = "x86_64",
} = {}) {
  return [
    week_start,
    week_end,
    hits,
    os_name,
    os_version,
    os_variant,
    os_arch,
    sys_age,
    repo_tag,
    repo_arch,
  ].join(",");
}

/** Parse a list of fixture records the way the fetcher does. */
function parseAll(lines) {
  return lines.map(parseCsvLine);
}

// ── parseCsvLine ─────────────────────────────────────────────────────────

test("parseCsvLine maps the documented header order", () => {
  const line =
    "2026-07-27,2026-08-03,42,Aurora,42,Workstation,x86_64,1,updates,x86_64";
  const parsed = parseCsvLine(line);
  assert.equal(parsed.week_start, "2026-07-27");
  assert.equal(parsed.week_end, "2026-08-03");
  assert.equal(parsed.hits, 42);
  assert.equal(parsed.os_name, "Aurora");
  assert.equal(parsed.os_arch, "x86_64");
  assert.equal(parsed.sys_age, 1);
  assert.equal(parsed.repo_tag, "updates");
});

test("splitCsvRow keeps a quoted field containing commas intact", () => {
  // Real upstream rows carry an os_name with commas, because it comes straight
  // from a machine's /etc/os-release NAME.
  const cols = splitCsvRow(
    '2026-06-22,2026-06-28,7,"SynetoOS - Platform, Copyright 2025",9.5,generic,x86_64,-1,epel-9,x86_64',
  );
  assert.equal(cols.length, 10);
  assert.equal(cols[3], "SynetoOS - Platform, Copyright 2025");
  assert.equal(cols[8], "epel-9");
});

test("splitCsvRow unescapes a doubled quote inside a quoted field", () => {
  const cols = splitCsvRow('a,"say ""hi""",b');
  assert.deepEqual(cols, ["a", 'say "hi"', "b"]);
});

test("parseCsvLine reads a quoted os_name without shifting later columns", () => {
  const parsed = parseCsvLine(
    '2026-07-27,2026-08-02,5,"Aurora, Special Edition",44,workstation,x86_64,2,fedora-44,x86_64',
  );
  assert.equal(parsed.os_name, "Aurora, Special Edition");
  assert.equal(parsed.hits, 5);
  assert.equal(parsed.repo_tag, "fedora-44");
  assert.equal(parsed.sys_age, 2);
});

test("parseCsvLine returns null for a row with the wrong column count", () => {
  // Reading hits out of a shifted row would corrupt a total silently.
  assert.equal(parseCsvLine("2026-07-27,2026-08-02,5"), null);
  assert.equal(parseCsvLine(`${row()},extra-column`), null);
});

// ── normalizeVariant ─────────────────────────────────────────────────────

test("normalizeVariant folds the upstream OS names this pipeline publishes", () => {
  assert.equal(normalizeVariant("Aurora"), "aurora");
  assert.equal(normalizeVariant("Bazzite"), "bazzite");
  assert.equal(normalizeVariant("Fedora Linux"), "fedora");
  assert.equal(normalizeVariant("Fedora"), "fedora");
});

test("normalizeVariant folds downstream spins of a published variant", () => {
  assert.equal(normalizeVariant("AuroraWorkstation"), "aurora");
  assert.equal(normalizeVariant("bazzite-deck"), "bazzite");
});

test("normalizeVariant returns null for unrecognised names", () => {
  assert.equal(normalizeVariant("Rocky Linux"), null);
  assert.equal(normalizeVariant(""), null);
  assert.equal(normalizeVariant(null), null);
});

test("normalizeVariant resolves no projectbluefin image, under any spelling", () => {
  // The rule: every Project Bluefin count comes from countme.projectbluefin.io.
  // A row here that looks like one of ours is an upstream artefact — Fedora
  // seeing an EPEL mirror hit, say — and bucketing it publishes that artefact
  // as a population. Dropping it is the whole point of this function.
  const spellings = PROJECTBLUEFIN_IMAGES.flatMap((image) => [
    image,
    image.toUpperCase(),
    image.replace(/-/g, " "),
    `${image}-dx`,
    `Project Bluefin ${image}`,
  ]);

  const bucketed = spellings.filter((name) => normalizeVariant(name) !== null);
  assert.deepEqual(
    bucketed,
    [],
    `these projectbluefin spellings were bucketed into a published variant: ${bucketed.join(", ")}`,
  );
});

test("VARIANTS names no projectbluefin image", () => {
  for (const image of PROJECTBLUEFIN_IMAGES) {
    assert.ok(
      !VARIANTS.includes(image),
      `${image} is counted by countme.projectbluefin.io, not by the Fedora CSV`,
    );
  }
});

// ── aggregateWeeks ───────────────────────────────────────────────────────
//
// The rules under test are ported from ublue-os/countme:data_processing.py.
// These are the assertions that keep this script agreeing with the project's
// published charts and badges.

test("aggregateWeeks counts a system once, not once per enabled repo", () => {
  // One machine, one week, four countme-enabled repos. `hits` counts requests,
  // so summing the column would report 4 systems where there is 1.
  const rows = parseAll([
    row({ repo_tag: "fedora-44" }),
    row({ repo_tag: "updates-released-f44" }),
    row({ repo_tag: "fedora-cisco-openh264-44" }),
    row({ repo_tag: "fedora-source-44" }),
  ]);
  const weeks = aggregateWeeks(rows);
  assert.equal(weeks.length, 1);
  assert.equal(weeks[0].aurora, 1);
});

test("aggregateWeeks excludes the legacy unique-IP rows carried as sys_age -1", () => {
  // sys_age -1 is not an "all ages" subtotal: mirrors-countme writes a separate
  // unique-IP estimate into the same table under that sentinel. Counting it
  // stacks two different metrics on top of each other.
  const rows = parseAll([
    row({ sys_age: "1", hits: 10 }),
    row({ sys_age: "4", hits: 5 }),
    row({ sys_age: "-1", hits: 900 }),
  ]);
  const weeks = aggregateWeeks(rows);
  assert.equal(weeks[0].aurora, 15);
});

test("aggregateWeeks sums releases and architectures, which are different machines", () => {
  // Each system has exactly one fedora-N repo, so summing across N sums across
  // releases rather than across one machine's repos.
  const rows = parseAll([
    row({ repo_tag: "fedora-44", os_arch: "x86_64", hits: 100 }),
    row({ repo_tag: "fedora-43", os_arch: "x86_64", hits: 20 }),
    row({ repo_tag: "fedora-44", os_arch: "aarch64", hits: 7 }),
  ]);
  const weeks = aggregateWeeks(rows);
  assert.equal(weeks[0].aurora, 127);
});

test("aggregateWeeks drops an EPEL row entirely instead of exempting it", () => {
  // The deleted NON_FEDORA_VARIANTS exemption let a CentOS Stream image skip
  // the ^fedora-N$ restriction and be summed across whatever EPEL mirrors it
  // reached. That sum is not a population, and the week it lands in is the one
  // the page publishes — so an EPEL row must produce no key and no week at all,
  // not a small number under some other name.
  const epelOnly = aggregateWeeks(
    parseAll([
      row({ os_name: "Bluefin LTS", repo_tag: "epel-10", hits: 150 }),
      row({ os_name: "Bluefin LTS", repo_tag: "epel-testing-10", hits: 9 }),
    ]),
  );
  assert.deepEqual(epelOnly, []);

  // And it contributes nothing to a week that does have real rows.
  const mixed = aggregateWeeks(
    parseAll([
      row({ os_name: "Aurora", repo_tag: "fedora-44", hits: 12 }),
      row({ os_name: "Bluefin LTS", repo_tag: "epel-10", hits: 150 }),
    ]),
  );
  assert.equal(mixed.length, 1);
  assert.deepEqual(Object.keys(mixed[0]).sort(), ["aurora", "week"]);
  assert.equal(mixed[0].aurora, 12);
});

test("aggregateWeeks applies the base-repo restriction to every variant", () => {
  // No variant is exempt any more: a non-fedora-N repo never contributes,
  // whoever the row belongs to.
  const rows = parseAll([
    row({ os_name: "Bazzite", repo_tag: "fedora-44", hits: 30 }),
    row({ os_name: "Bazzite", repo_tag: "rpmfusion-free", hits: 400 }),
    row({ os_name: "Fedora Linux", repo_tag: "updates-released-f44", hits: 9 }),
  ]);
  const weeks = aggregateWeeks(rows);
  assert.equal(weeks[0].bazzite, 30);
  assert.equal(weeks[0].fedora, undefined);
});

test("aggregateWeeks skips the two weeks upstream got wrong", () => {
  // 2024-12-29 is a partial year-end week; 2025-07-06 is a Fedora
  // infrastructure migration that shows as a ~40% drop.
  const rows = parseAll([
    row({ week_start: "2024-12-23", week_end: "2024-12-29", hits: 50 }),
    row({ week_start: "2025-06-30", week_end: "2025-07-06", hits: 60 }),
    row({ week_start: "2026-07-27", week_end: "2026-08-02", hits: 70 }),
  ]);
  const weeks = aggregateWeeks(rows);
  assert.deepEqual(
    weeks.map((w) => w.week),
    ["2026-07-27"],
  );
});

test("aggregateWeeks drops unrecognised OSes", () => {
  const rows = parseAll([
    row({ os_name: "Aurora", hits: 10 }),
    row({ os_name: "Bazzite", hits: 5 }),
    row({ os_name: "Rocky Linux", hits: 99 }),
  ]);
  const weeks = aggregateWeeks(rows);
  assert.equal(weeks[0].aurora, 10);
  assert.equal(weeks[0].bazzite, 5);
  assert.equal(weeks[0]["rocky linux"], undefined);
});

test("aggregateWeeks dropFirst drops the partial leading week", () => {
  const rows = parseAll([
    row({ week_start: "2026-07-20", week_end: "2026-07-26", hits: 10 }),
    row({ week_start: "2026-07-27", week_end: "2026-08-02", hits: 20 }),
  ]);
  const withDrop = aggregateWeeks(rows, { dropFirst: true });
  assert.equal(withDrop.length, 1);
  assert.equal(withDrop[0].week, "2026-07-27");

  const withoutDrop = aggregateWeeks(rows, { dropFirst: false });
  assert.equal(withoutDrop.length, 2);
});

test("aggregateWeeks dropFirst trims the partial week even when it survives no filter", () => {
  // The partial week is thin, so it can be filtered away entirely. Trimming the
  // first *surviving* week would then throw away a complete one instead.
  const rows = parseAll([
    row({
      week_start: "2026-07-20",
      week_end: "2026-07-26",
      sys_age: "-1",
      hits: 10,
    }),
    row({ week_start: "2026-07-27", week_end: "2026-08-02", hits: 20 }),
  ]);
  const weeks = aggregateWeeks(rows, { dropFirst: true });
  assert.deepEqual(
    weeks.map((w) => w.week),
    ["2026-07-27"],
  );
});

// ── mergeHistory ─────────────────────────────────────────────────────────

test("mergeHistory keeps existing weeks, replaces overlaps, sorts ascending, never duplicates", () => {
  const prior = [
    { week: "2026-07-13", aurora: 100 },
    { week: "2026-07-20", aurora: 200 },
  ];
  const fresh = [
    { week: "2026-07-20", aurora: 250 },
    { week: "2026-07-27", aurora: 300 },
  ];
  const merged = mergeHistory(prior, fresh);
  assert.equal(merged.length, 3);
  assert.equal(merged[0].week, "2026-07-13");
  assert.equal(merged[1].week, "2026-07-20");
  assert.equal(merged[1].aurora, 250); // fresh wins
  assert.equal(merged[2].week, "2026-07-27");
});

test("mergeHistory discards prior weeks counted by a different method", () => {
  // A routine run only sees a ~6 week window. Keeping older weeks that were
  // counted differently would leave one series with a step in the middle and
  // nothing on the page to say so.
  const prior = [{ week: "2026-07-13", aurora: 23737 }];
  const fresh = [{ week: "2026-07-27", aurora: 3761 }];
  const merged = mergeHistory(prior, fresh, "countme-hits-v0");
  assert.deepEqual(merged, fresh);
});

test("mergeHistory does not carry a banned key forward out of an older method", () => {
  // This is what the METHOD bump is for. A seed written before the
  // projectbluefin images left this pipeline still carries bluefin and
  // bluefin-lts keys; merging it forward would keep publishing Fedora-derived
  // numbers under our image names forever.
  const prior = [
    { week: "2026-07-13", aurora: 2800, bluefin: 3555, "bluefin-lts": 165 },
  ];
  const fresh = [{ week: "2026-07-27", aurora: 3063 }];
  const merged = mergeHistory(prior, fresh, "upstream-peers-v1");

  const keys = new Set(merged.flatMap((w) => Object.keys(w)));
  assert.ok(!keys.has("bluefin"), "bluefin survived a method change");
  assert.ok(!keys.has("bluefin-lts"), "bluefin-lts survived a method change");
  assert.deepEqual(merged, fresh);
});

test("mergeHistory keeps prior weeks when the method matches", () => {
  const prior = [{ week: "2026-07-13", aurora: 3555 }];
  const fresh = [{ week: "2026-07-27", aurora: 3761 }];
  const merged = mergeHistory(prior, fresh, METHOD);
  assert.equal(merged.length, 2);
});

// ── tailRange ────────────────────────────────────────────────────────────

test("tailRange computes correct byte ranges", () => {
  assert.deepEqual(tailRange(1000, 250), { start: 750, end: 999 });
  assert.deepEqual(tailRange(100, 250), { start: 0, end: 99 });
});

// ── buildPayload ─────────────────────────────────────────────────────────

test("buildPayload produces the documented shape", () => {
  const weeks = [{ week: "2026-07-27", aurora: 42 }];
  const payload = buildPayload(weeks, {
    generatedAt: "2026-08-07T20:00:00Z",
  });
  assert.deepEqual(Object.keys(payload), [
    "generatedAt",
    "source",
    "method",
    "unit",
    "variants",
    "weeks",
    "unavailable",
    "stateReason",
  ]);
  assert.equal(payload.method, METHOD);
  assert.equal(payload.unavailable, false);
  assert.equal(payload.stateReason, null);
  assert.equal(payload.weeks.length, 1);
  assert.deepEqual(payload.variants, VARIANTS);
  // The payload declares its own key set; a reader trusts it, so it may not
  // advertise an image this pipeline is not allowed to count.
  for (const image of PROJECTBLUEFIN_IMAGES) {
    assert.ok(!payload.variants.includes(image));
  }
});

test("buildPayload can retain history while marking a failed refresh unavailable", () => {
  const payload = buildPayload([{ week: "2026-07-27", aurora: 42 }], {
    generatedAt: "2026-08-07T20:00:00Z",
    unavailable: true,
    stateReason: "Countme request failed",
  });

  assert.equal(payload.unavailable, true);
  assert.equal(payload.stateReason, "Countme request failed");
  assert.deepEqual(payload.weeks, [{ week: "2026-07-27", aurora: 42 }]);
});

// ── committed seed ───────────────────────────────────────────────────────

const seed = JSON.parse(
  readFileSync(
    new URL("../static/data/countme-history.json", import.meta.url),
    "utf-8",
  ),
);

test("the committed seed was produced by the current method", () => {
  // A seed left behind by an older counting rule would be served to readers as
  // if it were current. mergeHistory drops such weeks on the next run, but the
  // committed file is what ships until then.
  assert.equal(seed.method, METHOD);
});

test("the committed seed carries only the variants this pipeline may publish", () => {
  const keys = new Set(seed.weeks.flatMap((w) => Object.keys(w)));
  keys.delete("week");
  for (const key of keys) {
    assert.ok(
      VARIANTS.includes(key),
      `week key "${key}" is not one of the published variants ${VARIANTS.join(", ")}`,
    );
  }
});

test("committed seed magnitudes agree with ublue-os/countme", () => {
  // The dashboard and the project's README badges are two views of one number.
  // This pins the order of magnitude offline: before ADR 0004 the site said
  // 23,737 weekly Bluefin devices while the badge said 3.8k. The same failure
  // mode applies to every variant here — dropping the one-repo-per-system rule
  // multiplies each of these by the number of countme-enabled repos.
  const latest = seed.weeks.at(-1);
  assert.ok(latest, "seed has at least one week");
  assert.ok(
    latest.fedora > 100_000 && latest.fedora < 5_000_000,
    `Fedora weekly devices out of expected range: ${latest.fedora}. ` +
      `Compare against Fedora's published countme totals before changing this bound.`,
  );
  assert.ok(
    latest.aurora > 100 && latest.aurora < 50_000,
    `Aurora weekly devices out of expected range: ${latest.aurora}. ` +
      `Compare against ublue-os/countme badge-endpoints before changing this bound.`,
  );
  // Fedora is the base every one of these images derives from, so it is the
  // largest number in the file by orders of magnitude.
  assert.ok(
    latest.fedora > latest.bazzite && latest.bazzite > latest.aurora,
    "expected fedora > bazzite > aurora",
  );
});
