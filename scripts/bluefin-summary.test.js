const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { loadTsxModule } = require("./lib/load-tsx");

const { allBluefinDaily, allBluefinSummary } = loadTsxModule(
  path.join(
    __dirname,
    "..",
    "src",
    "components",
    "analytics",
    "firstPartyCountme.ts",
  ),
);

const daily = allBluefinDaily([
  { day: "2026-10-23", image: "dakota/core:stable", n: 200 },
  { day: "2026-10-23", image: "utah/core:testing", n: 10 },
]);

test("Classic's 4.6k badge plus one daily 210 is an approximate 4810", () => {
  assert.deepEqual(allBluefinSummary(daily, "4.6k"), {
    total: 4810,
    classic: 4600,
    daily: 210,
    day: "2026-10-23",
    approximate: true,
  });
});

test("the latest measured day never carries an older stream forward", () => {
  const staggered = {
    days: ["2026-10-22", "2026-10-23", "2026-10-24"],
    streams: {
      stable: [200, null, null],
      testing: [null, 10, null],
      unknown: [null, null, null],
    },
  };
  assert.deepEqual(allBluefinSummary(staggered, "100"), {
    total: 110,
    classic: 100,
    daily: 10,
    day: "2026-10-23",
    approximate: false,
  });
});

test("zero in both sources is measured data, not unavailable", () => {
  const zero = allBluefinDaily([
    { day: "2026-10-23", image: "dakota/core:stable", n: 0 },
  ]);
  assert.deepEqual(allBluefinSummary(zero, "0"), {
    total: 0,
    classic: 0,
    daily: 0,
    day: "2026-10-23",
    approximate: false,
  });
});

test("badge counts accept whole groups and case-insensitive compact boundaries", () => {
  for (const [message, classic, approximate] of [
    ["999", 999, false],
    ["1k", 1000, true],
    ["999k", 999000, true],
    ["1M", 1000000, true],
    ["1.25m", 1250000, true],
    ["999m", 999000000, true],
    ["1B", 1000000000, true],
    ["0k", 0, true],
    [" 1,234,567 ", 1234567, false],
  ]) {
    const summary = allBluefinSummary(daily, message);
    assert.equal(summary?.classic, classic, message);
    assert.equal(summary?.total, classic + 210, message);
    assert.equal(summary?.approximate, approximate, message);
  }
});

test("absent or invalid Classic never becomes a partial daily total", () => {
  for (const message of [
    null,
    "",
    " ",
    "unavailable",
    "NaN",
    "Infinity",
    "-1",
    "-1k",
    "1.5",
    "1,23",
    "12,3456",
    "1,000k",
    "1kk",
    "1e3",
    "1 k",
    "1k extra",
    "9".repeat(400),
    `${"9".repeat(400)}b`,
  ]) {
    assert.equal(allBluefinSummary(daily, message), null, String(message));
  }
});

test("missing or invalid daily data never becomes a partial Classic total", () => {
  assert.equal(allBluefinSummary(allBluefinDaily([]), "4.6k"), null);
  assert.equal(
    allBluefinSummary(
      {
        days: ["2026-10-23"],
        streams: { stable: [null], testing: [null], unknown: [null] },
      },
      "4.6k",
    ),
    null,
  );
  for (const n of [NaN, Infinity, -1]) {
    assert.equal(
      allBluefinSummary(
        allBluefinDaily([
          { day: "2026-10-23", image: "dakota/core:stable", n },
        ]),
        "4.6k",
      ),
      null,
    );
  }
});
