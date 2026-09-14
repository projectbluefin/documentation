const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

let routes;
let render;
let counts;
let policy;
let fetchHandler;

const repoRoot = path.join(__dirname, "..");

test.before(async () => {
  routes = await import("../workers/countme-proxy/routes.mjs");
  render = await import("../workers/countme-proxy/render.mjs");
  counts = await import("../workers/countme-proxy/counts.mjs");
  policy = await import("./lib/countme-sources.mjs");
  const mod = await import("../workers/countme-proxy/index.mjs");
  fetchHandler = mod.default.fetch;
});

const UBLUE_RAW_PREFIX = "https://raw.githubusercontent.com/ublue-os/countme/";
const WORKER_SOURCES = [
  "workers/countme-proxy/index.mjs",
  "workers/countme-proxy/routes.mjs",
  "workers/countme-proxy/render.mjs",
  "workers/countme-proxy/counts.mjs",
];

/**
 * A D1 stand-in. `rows` are what the weekly aggregate returns; `throws` makes
 * the query fail the way an unmigrated or unreachable database would.
 */
function stubDb(rows, { throws = false } = {}) {
  const statements = [];
  return {
    statements,
    env: {
      DB: {
        prepare(sql) {
          return {
            bind(...args) {
              statements.push({ sql, args });
              return {
                async all() {
                  if (throws) throw new Error("no such table");
                  return { results: rows };
                },
                async run() {
                  if (throws) throw new Error("no such table");
                },
              };
            },
          };
        },
      },
    },
  };
}

/** Replaces global fetch for one test and records every requested URL. */
function stubFetch(responder) {
  const calls = [];
  const original = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    calls.push(url);
    return responder(url, init);
  };

  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

function get(pathname, env) {
  return fetchHandler(
    new Request(`https://countme.projectbluefin.io${pathname}`),
    env,
  );
}

/** All `d` attributes of the rendered polyline segments. */
function pathData(svg) {
  return [...svg.matchAll(/<path d="([^"]+)"/gu)].map((match) => match[1]);
}

function pathPoints(d) {
  return [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/gu)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }));
}

test("no worker source names a forbidden count source", async () => {
  const { FORBIDDEN_SOURCES } = policy;

  for (const rel of WORKER_SOURCES) {
    const src = fs.readFileSync(path.join(repoRoot, rel), "utf8");
    for (const forbidden of FORBIDDEN_SOURCES) {
      assert.ok(
        !src.includes(forbidden),
        `${rel} names ${forbidden}; a Project Bluefin count comes from our own deployment`,
      );
    }
    assert.ok(
      !src.includes("countme-history.json"),
      `${rel} reads the Fedora-derived dataset`,
    );
  }
});

test("only the upstream image keeps an upstream source", () => {
  const { UPSTREAM_ALLOWED } = policy;

  assert.deepEqual(routes.resolveRoute("/badge-endpoints/bluefin.json"), {
    kind: "legacy",
    url: UPSTREAM_ALLOWED.source,
  });
  assert.deepEqual(routes.resolveRoute("/growth_bluefins.svg"), {
    kind: "legacy",
    url: `${UBLUE_RAW_PREFIX}main/growth_bluefins.svg`,
  });
  assert.deepEqual(
    routes.resolveRoute("/sources/ublue-os/bluefin/growth.svg"),
    {
      kind: "legacy",
      url: `${UBLUE_RAW_PREFIX}main/growth_bluefins.svg`,
    },
  );

  // The EPEL-summed upstream LTS series is not ours to republish.
  assert.deepEqual(routes.resolveRoute("/badge-endpoints/bluefin-lts.json"), {
    kind: "badge",
    repo: "bluefin-lts",
  });
  assert.equal(Object.keys(routes.LEGACY_ROUTES).length, 3);
});

test("every first-party repo has a chart and a badge route", () => {
  for (const repo of policy.PROJECTBLUEFIN_REPOS) {
    assert.deepEqual(routes.resolveRoute(`/${repo}/growth.svg`), {
      kind: "chart",
      repo,
    });
  }

  for (const alias of [
    "/",
    "/growth.svg",
    "/sources/projectbluefin/bluefin/growth.svg",
  ]) {
    assert.deepEqual(routes.resolveRoute(alias), {
      kind: "chart",
      repo: "bluefin",
    });
  }

  for (const repo of ["bluefin-lts", "dakota", "utah", "server"]) {
    assert.deepEqual(routes.resolveRoute(`/badge-endpoints/${repo}.json`), {
      kind: "badge",
      repo,
    });
  }

  assert.deepEqual(routes.resolveRoute("/counts.json"), { kind: "counts" });
  assert.equal(routes.resolveRoute("/nope"), null);
  assert.deepEqual(routes.resolveRoute("/dakota/growth.svg/"), {
    kind: "chart",
    repo: "dakota",
  });
});

test("counts.json aggregates weekly records per first-party repo", async () => {
  const db = stubDb([
    { week: "2026-08-31", repo: "bluefin", gamemode: 0, hits: 3552 },
    { week: "2026-08-31", repo: "bluefin-lts", gamemode: 0, hits: 194 },
    { week: "2026-09-07", repo: "bluefin", gamemode: 0, hits: 3601 },
    { week: "2026-09-07", repo: "bluefin", gamemode: 1, hits: 1 },
  ]);

  const response = await get("/counts.json", db.env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.source, policy.FIRST_PARTY.origin);
  assert.equal(body.method, "first-party-d1-v2");
  assert.equal(body.unit, "estimated weekly active systems");
  assert.ok(!body.unavailable);
  assert.deepEqual(body.variants, ["bluefin", "bluefin-lts"]);
  assert.deepEqual(body.weeks, [
    {
      week: "2026-08-31",
      bluefin: 3552,
      "bluefin-lts": 194,
      dakota: null,
      utah: null,
      server: null,
      gaming: {
        bluefin: 0,
        "bluefin-lts": 0,
        dakota: null,
        utah: null,
        server: null,
      },
    },
    {
      week: "2026-09-07",
      bluefin: 3602,
      "bluefin-lts": null,
      dakota: null,
      utah: null,
      server: null,
      gaming: {
        bluefin: 1,
        "bluefin-lts": null,
        dakota: null,
        utah: null,
        server: null,
      },
    },
  ]);

  assert.ok(db.statements[0].sql.includes("telemetry_events"));
  assert.deepEqual(db.statements[0].args, [...counts.COUNTED_REPO_IDS]);
});

test("a repo missing from a week is null, never zero", async () => {
  const db = stubDb([{ week: "2026-08-31", repo: "bluefin", hits: 3552 }]);

  const response = await get("/counts.json", db.env);
  const text = await response.text();
  const week = JSON.parse(text).weeks[0];

  assert.equal(week.dakota, null);
  assert.equal(week.gaming.dakota, null);
  assert.ok("dakota" in week, "the key is present so the gap is explicit");
  assert.match(text, /"dakota":null/u);
  assert.ok(
    !/"dakota":0/u.test(text),
    "a silent repo is never counted as zero",
  );
});

test("a week nobody reported stays on the axis as a gap", async () => {
  const db = stubDb([
    { week: "2026-08-31", repo: "bluefin", hits: 10 },
    { week: "2026-09-14", repo: "bluefin", hits: 30 },
  ]);

  const body = await (await get("/counts.json", db.env)).json();

  assert.deepEqual(
    body.weeks.map((week) => week.week),
    ["2026-08-31", "2026-09-07", "2026-09-14"],
  );
  assert.equal(body.weeks[1].bluefin, null);
});

test("a -gaming id counts as its base image in game mode", () => {
  assert.deepEqual(counts.normalizeCountmeRepo("dakota-gaming", 1), {
    repo: "dakota",
    gaming: true,
  });

  // The suffix alone is enough: a client that forgets the flag still lands in
  // the same bucket, and so does one that sends the flag without the suffix.
  assert.deepEqual(counts.normalizeCountmeRepo("dakota-gaming", 0), {
    repo: "dakota",
    gaming: true,
  });
  assert.deepEqual(counts.normalizeCountmeRepo("dakota", 1), {
    repo: "dakota",
    gaming: true,
  });
  assert.deepEqual(counts.normalizeCountmeRepo("dakota", 0), {
    repo: "dakota",
    gaming: false,
  });

  // Game mode is an attribute of a ping, not an image of Dakota's.
  assert.deepEqual(counts.normalizeCountmeRepo("bluefin-lts-gaming", 0), {
    repo: "bluefin-lts",
    gaming: true,
  });

  // Anything outside the first-party set still drops, suffixed or not.
  assert.equal(counts.normalizeCountmeRepo("eos", 0), null);
  assert.equal(counts.normalizeCountmeRepo("eos-gaming", 1), null);
  assert.equal(counts.normalizeCountmeRepo("-gaming", 1), null);
  assert.equal(counts.normalizeCountmeRepo(undefined, 0), null);
});

test("normalization is idempotent", () => {
  for (const [repo, gamemode] of [
    ["dakota-gaming", 1],
    ["dakota-gaming", 0],
    ["dakota", 1],
    ["bluefin", 0],
  ]) {
    const once = counts.normalizeCountmeRepo(repo, gamemode);
    const twice = counts.normalizeCountmeRepo(once.repo, once.gaming ? 1 : 0);
    assert.deepEqual(twice, once, `${repo}/${gamemode} must settle`);
  }
});

test("dakota-gaming folds into the dakota total and its gaming share", async () => {
  const db = stubDb([
    { week: "2026-09-07", repo: "dakota", gamemode: 0, hits: 18 },
    { week: "2026-09-07", repo: "dakota-gaming", gamemode: 1, hits: 1 },
    { week: "2026-09-07", repo: "eos", gamemode: 0, hits: 8 },
  ]);

  const body = await (await get("/counts.json", db.env)).json();
  const week = body.weeks[0];

  assert.equal(week.dakota, 19, "the gaming image is part of Dakota");
  assert.equal(week.gaming.dakota, 1);
  assert.ok(!("dakota-gaming" in week), "gaming is not a repo of its own");
  assert.ok(!("eos" in week), "a repo outside the policy set never appears");
  assert.deepEqual(body.variants, ["dakota"]);
});

test("a repo that reported no game mode that week is 0, not null", async () => {
  const db = stubDb([
    { week: "2026-09-07", repo: "bluefin", gamemode: 0, hits: 12 },
    { week: "2026-09-07", repo: "dakota", gamemode: 1, hits: 3 },
  ]);

  const week = (await (await get("/counts.json", db.env)).json()).weeks[0];

  assert.equal(week.gaming.bluefin, 0, "it reported, nobody was in game mode");
  assert.equal(week.gaming.utah, null, "it did not report at all");
  assert.equal(week.utah, null);
  assert.equal(week.gaming.dakota, 3, "every Dakota ping was in game mode");
  assert.equal(week.dakota, 3);
});

test("the gaming share never exceeds the total it came from", async () => {
  const db = stubDb([
    { week: "2026-08-31", repo: "dakota", gamemode: 0, hits: 18 },
    { week: "2026-08-31", repo: "dakota-gaming", gamemode: 1, hits: 4 },
    { week: "2026-08-31", repo: "bluefin", gamemode: 1, hits: 1 },
    { week: "2026-09-14", repo: "bluefin-lts", gamemode: 0, hits: 2 },
    { week: "2026-09-14", repo: "dakota", gamemode: 1, hits: 7 },
  ]);

  const body = await (await get("/counts.json", db.env)).json();

  for (const week of body.weeks) {
    for (const repo of policy.PROJECTBLUEFIN_REPOS) {
      const total = week[repo];
      const gaming = week.gaming[repo];

      if (total === null) {
        assert.equal(gaming, null, `${repo} ${week.week}: no data either way`);
        continue;
      }
      assert.ok(
        gaming <= total,
        `${repo} ${week.week}: gaming ${gaming} exceeds total ${total}`,
      );
    }
  }
});

test("counts.json declares a source every first-party repo may use", async () => {
  const db = stubDb([{ week: "2026-08-31", repo: "utah", hits: 7 }]);
  const text = await (await get("/counts.json", db.env)).text();
  const body = JSON.parse(text);

  for (const repo of policy.PROJECTBLUEFIN_REPOS) {
    assert.ok(
      policy.isPermittedSource(repo, body.source),
      `${repo} may not be published from ${body.source}`,
    );
  }

  for (const forbidden of policy.FORBIDDEN_SOURCES) {
    assert.ok(!text.includes(forbidden));
  }
});

test("counts.json is cacheable and readable cross-origin", async () => {
  const db = stubDb([{ week: "2026-08-31", repo: "utah", hits: 7 }]);
  const response = await get("/counts.json", db.env);

  assert.equal(
    response.headers.get("content-type"),
    "application/json;charset=UTF-8",
  );
  assert.equal(response.headers.get("cache-control"), "public, max-age=900");
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
});

test("an unbound database yields a pending document at HTTP 200", async () => {
  const response = await get("/counts.json", {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.unavailable, true);
  assert.equal(body.stateReason, policy.FIRST_PARTY_PENDING_REASON);
  assert.deepEqual(body.weeks, []);
  assert.deepEqual(body.variants, []);
  assert.equal(body.source, policy.FIRST_PARTY.origin);
});

test("a failing query yields a pending document at HTTP 200", async () => {
  const db = stubDb([], { throws: true });
  const response = await get("/counts.json", db.env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.unavailable, true);
  assert.equal(body.stateReason, policy.FIRST_PARTY_PENDING_REASON);
});

test("an empty database yields a pending document at HTTP 200", async () => {
  const db = stubDb([]);
  const body = await (await get("/counts.json", db.env)).json();

  assert.equal(body.unavailable, true);
  assert.equal(body.stateReason, policy.FIRST_PARTY_PENDING_REASON);
});

test("charts and badges show the total, game mode included", async () => {
  const db = stubDb([
    { week: "2026-08-31", repo: "bluefin-lts", gamemode: 0, hits: 100 },
    { week: "2026-09-07", repo: "bluefin-lts", gamemode: 0, hits: 194 },
    { week: "2026-09-07", repo: "bluefin-lts-gaming", gamemode: 1, hits: 6 },
  ]);
  const stub = stubFetch(async () => new Response("", { status: 500 }));

  try {
    const chart = await get("/bluefin-lts/growth.svg", db.env);
    const svg = await chart.text();

    assert.equal(
      chart.headers.get("content-type"),
      "image/svg+xml; charset=UTF-8",
    );
    assert.equal(chart.headers.get("cache-control"), "public, max-age=900");
    assert.match(svg, /Bluefin LTS/u);
    assert.match(svg, />200</u, "the plotted value is the population");

    const badge = await get("/badge-endpoints/bluefin-lts.json", db.env);
    assert.deepEqual(await badge.json(), {
      schemaVersion: 1,
      label: "Bluefin LTS",
      message: "200",
      color: "bc8cff",
    });

    const empty = await get("/badge-endpoints/dakota.json", db.env);
    assert.equal((await empty.json()).message, "accumulating");
  } finally {
    stub.restore();
  }

  assert.deepEqual(
    stub.calls,
    [],
    "a first-party count never leaves the edge for another service",
  );
});

test("an unbound database still renders an accumulating chart", async () => {
  const stub = stubFetch(async () => new Response("", { status: 500 }));

  try {
    const response = await get("/bluefin/growth.svg", {});
    const svg = await response.text();

    assert.equal(response.status, 200);
    assert.match(svg, /Bluefin — accumulating data/u);
    assert.match(svg, /0 weekly data points recorded/u);
  } finally {
    stub.restore();
  }

  assert.deepEqual(stub.calls, []);
});

test("legacy routes proxy the upstream artifacts", async () => {
  const stub = stubFetch(
    async () =>
      new Response("<svg/>", {
        status: 200,
        headers: { "content-type": "image/svg+xml" },
      }),
  );

  try {
    for (const pathname of [
      "/growth_bluefins.svg",
      "/sources/ublue-os/bluefin/growth.svg",
      "/badge-endpoints/bluefin.json",
    ]) {
      assert.equal((await get(pathname, {})).status, 200);
    }
  } finally {
    stub.restore();
  }

  assert.equal(stub.calls.length, 3);
  assert.ok(stub.calls.every((url) => url.startsWith(UBLUE_RAW_PREFIX)));
  assert.ok(stub.calls.includes(policy.UPSTREAM_ALLOWED.source));
});

test("breaks the line at a missing week instead of interpolating or zeroing", () => {
  const svg = render.renderRepoChartSvg(
    {
      weeks: [
        { week: "2026-01-05", dakota: 10 },
        { week: "2026-01-12", dakota: 20 },
        { week: "2026-01-19", dakota: null },
        { week: "2026-01-26", dakota: 40 },
        { week: "2026-02-02", dakota: 50 },
      ],
    },
    "dakota",
  );

  const paths = pathData(svg);
  assert.equal(paths.length, 2, "a gap must split the series into two paths");

  const segments = paths.map(pathPoints);
  assert.deepEqual(
    segments.map((points) => points.length),
    [2, 2],
    "the gap week must not contribute a vertex",
  );

  const interpolatedX = (segments[0][1].x + segments[1][0].x) / 2;
  const plotted = segments.flat();
  assert.ok(
    plotted.every((point) => point.x !== interpolatedX),
    "no vertex may sit at the interpolated gap position",
  );

  const baseline = Math.max(...plotted.map((point) => point.y));
  assert.ok(
    plotted.every((point) => point.y <= baseline),
    "a gap must never be drawn down at the baseline",
  );
});

test("plots a recorded zero as a point rather than a gap", () => {
  const svg = render.renderRepoChartSvg(
    {
      weeks: [
        { week: "2026-01-05", dakota: 0 },
        { week: "2026-01-12", dakota: 5 },
        { week: "2026-01-19", dakota: 10 },
      ],
    },
    "dakota",
  );

  const paths = pathData(svg);
  assert.equal(paths.length, 1);
  assert.equal(pathPoints(paths[0]).length, 3);
  assert.match(svg, />0</u);
});

test("prints the current value and its week as text in the chart", () => {
  const svg = render.renderRepoChartSvg(
    {
      weeks: [
        { week: "2026-07-13", bluefin: 3900 },
        { week: "2026-07-20", bluefin: 4095 },
        { week: "2026-07-27", bluefin: null },
      ],
    },
    "bluefin",
  );

  assert.match(svg, />4,095</u);
  assert.match(svg, /week of 2026-07-20/u);
  assert.match(
    svg,
    /aria-label="[^"]*current 4,095 for the week of 2026-07-20/u,
  );
  assert.match(svg, /role="img"/u);
});

test("renders accumulating data when a repo has fewer than two points", () => {
  const empty = render.renderRepoChartSvg(
    { weeks: [{ week: "2026-01-05", bluefin: 10 }] },
    "dakota",
  );
  assert.match(empty, /Dakota — accumulating data/u);
  assert.match(empty, /0 weekly data points recorded/u);
  assert.equal(pathData(empty).length, 0);

  const single = render.renderRepoChartSvg(
    {
      weeks: [
        { week: "2026-01-05", utah: 7 },
        { week: "2026-01-12", utah: null },
      ],
    },
    "utah",
  );
  assert.match(single, /Utah — accumulating data/u);
  assert.match(single, /1 weekly data point recorded/u);
  assert.match(
    single,
    /aria-label="Utah accumulating data, 1 weekly data point recorded"/u,
  );
});

test("published svg copy describes the data, never the infrastructure", () => {
  const svgs = [
    render.renderAccumulatingSvg("dakota", 0),
    render.renderRepoChartSvg(
      {
        weeks: [
          { week: "2026-01-05", bluefin: 10 },
          { week: "2026-01-12", bluefin: 20 },
        ],
      },
      "bluefin",
    ),
  ];

  for (const svg of svgs) {
    const copy = [...svg.matchAll(/>([^<>]+)</gu)].map((m) => m[1]).join(" ");
    for (const banned of [
      /projectbluefin\.io/iu,
      /\bendpoint\b/iu,
      /\bD1\b/u,
      /cloudflare/iu,
      /\bworker\b/iu,
      /https?:\/\//u,
      /telemetry/iu,
    ]) {
      assert.doesNotMatch(copy, banned);
    }
  }

  assert.ok(
    render
      .renderAccumulatingSvg("dakota", 0)
      .includes(policy.FIRST_PARTY_PENDING_REASON),
  );
});

test("accepts metalink pings from Dakota countme clients", async () => {
  const request = new Request(
    "https://countme.projectbluefin.io/metalink?repo=dakota&tag=latest&flavor=default&arch=x86_64&countme=3",
  );

  const response = await fetchHandler(request);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get("content-type"),
    "text/plain;charset=UTF-8",
  );
  assert.match(
    await response.text(),
    /countme accepted for repo=dakota tag=latest flavor=default gamemode=0 arch=x86_64 countme=3/i,
  );
});

test("accepts metalink pings with gamemode enabled and persists to D1", async () => {
  const inserted = [];
  const mockEnv = {
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async run() {
                inserted.push({ sql, args });
              },
            };
          },
        };
      },
    },
  };

  const request = new Request(
    "https://countme.projectbluefin.io/metalink?repo=dakota&tag=testing&flavor=gaming&gamemode=1&arch=x86_64&countme=1",
  );

  const response = await fetchHandler(request, mockEnv);

  assert.equal(response.status, 200);
  assert.match(
    await response.text(),
    /countme accepted for repo=dakota tag=testing flavor=gaming gamemode=1 arch=x86_64 countme=1/i,
  );
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].args[0], "dakota");
  assert.equal(inserted[0].args[1], "testing");
  assert.equal(inserted[0].args[2], "gaming");
  assert.equal(inserted[0].args[5], 1); // gamemode
});

test("accepts metalink pings from Bluefin countme clients", async () => {
  const request = new Request(
    "https://countme.projectbluefin.io/metalink?repo=bluefin&tag=stable&flavor=main&arch=x86_64&countme=2",
  );

  const response = await fetchHandler(request);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get("content-type"),
    "text/plain;charset=UTF-8",
  );
  assert.match(
    await response.text(),
    /countme accepted for repo=bluefin tag=stable flavor=main gamemode=0 arch=x86_64 countme=2/i,
  );
});

test("accepts metalink pings from Bluefin LTS countme clients", async () => {
  const request = new Request(
    "https://countme.projectbluefin.io/metalink?repo=bluefin-lts&tag=stable&flavor=main&arch=x86_64&countme=4",
  );

  const response = await fetchHandler(request);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get("content-type"),
    "text/plain;charset=UTF-8",
  );
  assert.match(
    await response.text(),
    /countme accepted for repo=bluefin-lts tag=stable flavor=main gamemode=0 arch=x86_64 countme=4/i,
  );
});

test("accepts metalink pings from Utah countme clients", async () => {
  const request = new Request(
    "https://countme.projectbluefin.io/metalink?repo=utah&tag=testing&flavor=default&arch=x86_64&countme=1",
  );

  const response = await fetchHandler(request);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get("content-type"),
    "text/plain;charset=UTF-8",
  );
  assert.match(
    await response.text(),
    /countme accepted for repo=utah tag=testing flavor=default gamemode=0 arch=x86_64 countme=1/i,
  );
});

test("the themed legacy chart recolours upstream without re-deriving it", async () => {
  // isPermittedSource allows exactly one source for ublue-os/bluefin:stable, so
  // this route must fetch the same artifact the untouched route serves and only
  // change its colours. Recomputing the series from Fedora's CSV — how upstream
  // builds it — would be a forbidden source wearing our palette.
  const upstreamSvg =
    '<svg xmlns="http://www.w3.org/2000/svg">' +
    '<rect fill="#ffffff" width="10" height="10"/>' +
    '<path stroke="#cccccc" d="M0 0"/>' +
    '<text fill="#616161">2026-01</text>' +
    '<path stroke="#77aadd" d="M1 1 L2 2"/>' +
    "</svg>";

  const calls = [];
  const restore = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(upstreamSvg, {
      status: 200,
      headers: { "content-type": "image/svg+xml" },
    });
  };

  try {
    const res = await fetchHandler(
      new Request("https://countme.projectbluefin.io/legacy/bluefin.svg"),
      {},
      { waitUntil() {} },
    );
    const body = await res.text();

    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /svg/);
    assert.equal(
      calls.length,
      1,
      "the themed chart must come from one upstream fetch",
    );
    assert.match(calls[0], /ublue-os\/countme/);
    assert.doesNotMatch(
      calls[0],
      /data-analysis\.fedoraproject\.org/,
      "the series must never be recomputed from the forbidden source",
    );

    // Upstream's white canvas must not survive onto a dark panel.
    assert.doesNotMatch(body, /#ffffff/i);
    assert.doesNotMatch(body, /#77aadd/i);
    assert.match(body, /#58a6ff/, "the series takes the Bluefin accent");

    // The geometry is upstream's and must be untouched.
    assert.match(body, /d="M1 1 L2 2"/);
    assert.match(body, /2026-01/);
  } finally {
    globalThis.fetch = restore;
  }
});

test("the untouched legacy route still returns upstream's own bytes", async () => {
  const upstreamSvg =
    '<svg><rect fill="#ffffff"/><path stroke="#77aadd"/></svg>';
  const restore = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(upstreamSvg, {
      status: 200,
      headers: { "content-type": "image/svg+xml" },
    });

  try {
    const res = await fetchHandler(
      new Request("https://countme.projectbluefin.io/growth_bluefins.svg"),
      {},
      { waitUntil() {} },
    );
    const body = await res.text();
    assert.match(body, /#ffffff/, "upstream's artifact stays byte-for-byte");
    assert.match(body, /#77aadd/);
  } finally {
    globalThis.fetch = restore;
  }
});

test("the chart title is inked, not left to default black", async () => {
  // matplotlib omits `style` on the title's group, so a remap that only
  // rewrites declared colours leaves it black on a dark panel. Every other text
  // group carries its own fill.
  const upstreamSvg =
    '<svg xmlns="http://www.w3.org/2000/svg">' +
    '<g id="text_17"><g style="fill: #616161" transform="translate(1 2)"/></g>' +
    '<g id="text_18">\n <!-- Weekly Active Devices -->\n ' +
    '<g transform="translate(3 4)"/></g>' +
    '<g id="line2d_1"><g transform="translate(5 6)"/></g>' +
    "</svg>";

  const restore = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(upstreamSvg, {
      status: 200,
      headers: { "content-type": "image/svg+xml" },
    });

  try {
    const res = await fetchHandler(
      new Request("https://countme.projectbluefin.io/legacy/bluefin.svg"),
      {},
      { waitUntil() {} },
    );
    const body = await res.text();

    assert.match(
      body,
      /<g id="text_18">\s*<!-- Weekly Active Devices -->\s*<g style="fill: #8b949e" transform="translate\(3 4\)"/u,
      "the title must be given the same ink as the axis labels",
    );
    // A plotted group is not text and must keep its own styling untouched.
    assert.match(body, /<g id="line2d_1"><g transform="translate\(5 6\)"/u);
  } finally {
    globalThis.fetch = restore;
  }
});
