const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { loadTsxModule } = require("./lib/load-tsx");

const { familyDaily, classicPopulation, sumBluefinHistories } = loadTsxModule(
  path.join(
    __dirname,
    "..",
    "src",
    "components",
    "analytics",
    "firstPartyCountme.ts",
  ),
);
const { UPSTREAM_ALLOWED } = loadTsxModule(
  path.join(__dirname, "lib", "countme-sources.mjs"),
);

// Actual publication dates and badge values from ublue-os/countme's Git history.
const RECORDED = [
  { date: "2026-10-08", count: 4500 },
  { date: "2026-10-15", count: 4100 },
  { date: "2026-10-22", count: 4600 },
];
const EMPTY = { days: [], values: [] };
const DAYS = Array.from(
  { length: 17 },
  (_, i) => `2026-10-${String(i + 8).padStart(2, "0")}`,
);

function dataset(observations = RECORDED, extra = {}) {
  return {
    generatedAt: "2026-10-24T00:00:00Z",
    source: UPSTREAM_ALLOWED.source,
    method: "classic-badge-history-v1",
    observations,
    ...extra,
  };
}

function daily(points, family = "dakota") {
  return familyDaily(
    points.map(([day, n, stream = "stable"]) => ({
      day,
      image: `${family}/core:${stream}`,
      n,
    })),
    family,
  );
}

const BLUEFIN = daily(DAYS.map((day) => [day, 129]));
const UTAH = daily(
  DAYS.map((day) => [day, 94, "testing"]),
  "utah",
);

test("the plotted total includes recorded Classic history, not just daily actives", () => {
  const classic = classicPopulation(dataset(), null, "2026-10-24");
  assert.deepEqual(classic, {
    days: ["2026-10-08", "2026-10-15", "2026-10-22"],
    values: [4500, 4100, 4600],
  });
  const total = sumBluefinHistories(BLUEFIN, UTAH, classic);
  assert.deepEqual(total, {
    days: DAYS,
    values: [
      ...Array(7).fill(4723),
      ...Array(7).fill(4323),
      ...Array(3).fill(4823),
    ],
  });
  assert.equal(total.values.at(-1), 4600 + 129 + 94);
  assert.notEqual(total.values.at(-1), 129 + 94);
});

test("different family start days use a sorted union, never index-wise addition", () => {
  const total = sumBluefinHistories(
    daily([
      ["2026-10-22", 10],
      ["2026-10-23", 20],
    ]),
    daily(
      [
        ["2026-10-23", 3],
        ["2026-10-24", 4],
      ],
      "utah",
    ),
    classicPopulation(dataset(), null, "2026-10-24"),
  );
  assert.deepEqual(total, {
    days: ["2026-10-22", "2026-10-23", "2026-10-24"],
    values: [null, 4623, null],
  });
});

test("each total uses only streams reported on that same date", () => {
  assert.deepEqual(
    sumBluefinHistories(
      daily([
        ["2026-10-22", 129],
        ["2026-10-23", 10, "testing"],
      ]),
      daily(
        [
          ["2026-10-22", 94],
          ["2026-10-23", 5, "unknown"],
        ],
        "utah",
      ),
      classicPopulation(dataset(), null, "2026-10-24"),
    ),
    { days: ["2026-10-22", "2026-10-23"], values: [4823, 4615] },
  );
});

test("missing family days remain gaps rather than carrying daily counts forward", () => {
  assert.deepEqual(
    sumBluefinHistories(
      daily([
        ["2026-10-22", 129],
        ["2026-10-24", 130],
      ]),
      daily(
        [
          ["2026-10-22", 94],
          ["2026-10-24", 110],
        ],
        "utah",
      ),
      classicPopulation(dataset(), null, "2026-10-24"),
    ),
    {
      days: ["2026-10-22", "2026-10-23", "2026-10-24"],
      values: [4823, null, 4840],
    },
  );
});

test("Classic is unknown before its first actual publication", () => {
  assert.deepEqual(
    sumBluefinHistories(
      daily([
        ["2026-10-07", 1],
        ["2026-10-08", 1],
        ["2026-10-09", 1],
      ]),
      daily(
        [
          ["2026-10-07", 2],
          ["2026-10-08", 2],
          ["2026-10-09", 2],
        ],
        "utah",
      ),
      classicPopulation(dataset(), null, "2026-10-24"),
    ),
    {
      days: ["2026-10-07", "2026-10-08", "2026-10-09"],
      values: [null, 4503, 4503],
    },
  );
});

test("an explicit Classic null stops the hold until a valid new publication", () => {
  const days = DAYS.slice(0, 5);
  const classic = classicPopulation(
    dataset([
      { date: "2026-10-11", count: 4100 },
      { date: "2026-10-08", count: 4500 },
      { date: "2026-10-09", count: null },
    ]),
    null,
    "2026-10-24",
  );
  assert.deepEqual(classic, {
    days: ["2026-10-08", "2026-10-09", "2026-10-11"],
    values: [4500, null, 4100],
  });
  assert.deepEqual(
    sumBluefinHistories(
      daily(days.map((day) => [day, 1])),
      daily(
        days.map((day) => [day, 2]),
        "utah",
      ),
      classic,
    ),
    { days, values: [4503, null, null, 4103, 4103] },
  );
});

test("valid zero in every source remains a measured zero", () => {
  const classic = classicPopulation(
    dataset([{ date: "2026-10-22", count: 0 }]),
    "0",
    "2026-10-24",
  );
  assert.deepEqual(classic.values, [0, 0]);
  assert.deepEqual(
    sumBluefinHistories(
      daily([["2026-10-24", 0]]),
      daily([["2026-10-24", 0]], "utah"),
      classic,
    ),
    { days: ["2026-10-24"], values: [0] },
  );
});

test("missing, malformed, or wrong-source history cannot produce partial totals", () => {
  const malformed = [
    null,
    undefined,
    {},
    dataset(RECORDED, { unavailable: true }),
    dataset(RECORDED, { source: "https://countme.projectbluefin.io" }),
    dataset(RECORDED, { source: `${UPSTREAM_ALLOWED.source}?other=true` }),
    dataset(RECORDED, { method: "classic-snapshot" }),
    dataset(RECORDED, { generatedAt: "not-a-date" }),
    dataset(null),
    dataset([null]),
    dataset([{ date: "2026-02-30", count: 4600 }]),
    dataset([{ date: "2026-10-24T00:00:00Z", count: 4600 }]),
    dataset([{ date: 20261024, count: 4600 }]),
    ...[NaN, Infinity, -Infinity, -1, "4600", undefined].map((count) =>
      dataset([...RECORDED, { date: "2026-10-24", count }]),
    ),
  ];
  for (const history of malformed) {
    const classic = classicPopulation(history, null, "2026-10-24");
    assert.deepEqual(classic, EMPTY);
    assert.deepEqual(sumBluefinHistories(BLUEFIN, UTAH, classic), {
      days: DAYS,
      values: DAYS.map(() => null),
    });
  }
});

test("missing or invalid daily readings cannot become a partial Classic total", () => {
  const classic = classicPopulation(dataset(), null, "2026-10-24");
  assert.deepEqual(sumBluefinHistories(familyDaily([]), UTAH, classic), {
    days: DAYS,
    values: DAYS.map(() => null),
  });
  assert.deepEqual(sumBluefinHistories(BLUEFIN, familyDaily([]), classic), {
    days: DAYS,
    values: DAYS.map(() => null),
  });
  for (const n of [NaN, Infinity, -1, Number.MAX_VALUE]) {
    const total = sumBluefinHistories(
      daily([
        ["2026-10-24", n],
        ["2026-10-24", Number.MAX_VALUE, "testing"],
      ]),
      daily([["2026-10-24", 94]], "utah"),
      classic,
    );
    assert.deepEqual(total.values, [null]);
  }
});

test("the current badge changes only its actual observed day, not earlier points", () => {
  const historical = classicPopulation(dataset(), null, "2026-10-24");
  const current = classicPopulation(dataset(), "4.7k", "2026-10-24");
  assert.deepEqual(current, {
    days: [...historical.days, "2026-10-24"],
    values: [...historical.values, 4700],
  });
  const before = sumBluefinHistories(BLUEFIN, UTAH, historical);
  const after = sumBluefinHistories(BLUEFIN, UTAH, current);
  assert.deepEqual(after.values.slice(0, -1), before.values.slice(0, -1));
  assert.equal(after.values.at(-1), 4923);
  assert.deepEqual(
    classicPopulation(
      dataset([{ date: "2026-10-24", count: 4500 }]),
      "4.6k",
      "2026-10-24",
    ),
    { days: ["2026-10-24"], values: [4600] },
  );
});

test("a current badge without history creates one observation, never past history", () => {
  const classic = classicPopulation(null, "4.6k", "2026-10-24");
  assert.deepEqual(classic, { days: ["2026-10-24"], values: [4600] });
  assert.deepEqual(sumBluefinHistories(BLUEFIN, UTAH, classic), {
    days: DAYS,
    values: [...Array(16).fill(null), 4823],
  });
  for (const badge of [null, "", "unavailable", "-1", "NaN", "Infinity"]) {
    assert.deepEqual(classicPopulation(null, badge, "2026-10-24"), EMPTY);
    assert.deepEqual(
      classicPopulation(dataset(), badge, "2026-10-24"),
      classicPopulation(dataset(), null, "2026-10-24"),
    );
  }
  assert.deepEqual(classicPopulation(null, "4.6k", "2026-02-30"), EMPTY);
});

test("publication ordering and duplicate-day replacement are deterministic", () => {
  const input = dataset([
    { date: "2026-10-22", count: 4500 },
    { date: "2026-10-08", count: 4100 },
    { date: "2026-10-22", count: 4600 },
  ]);
  const expected = {
    days: ["2026-10-08", "2026-10-22"],
    values: [4100, 4600],
  };
  assert.deepEqual(classicPopulation(input, null, "2026-10-24"), expected);
  assert.deepEqual(classicPopulation(input, null, "2026-10-24"), expected);
  assert.deepEqual(
    sumBluefinHistories(familyDaily([]), familyDaily([]), EMPTY),
    EMPTY,
  );
});
