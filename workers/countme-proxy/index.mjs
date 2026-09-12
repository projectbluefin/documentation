import {
  COUNTS_CACHE_TTL_SECONDS,
  normalizePathname,
  resolveRoute,
} from "./routes.mjs";
import {
  renderAccumulatingSvg,
  renderRepoBadge,
  renderRepoChartSvg,
} from "./render.mjs";
import {
  FIRST_PARTY,
  FIRST_PARTY_PENDING_REASON,
  PROJECTBLUEFIN_REPOS,
} from "../../scripts/lib/countme-sources.mjs";

const USER_AGENT = "projectbluefin-countme-worker/1.0";
const COUNT_METHOD = "first-party-d1-v1";
const COUNT_UNIT = "estimated weekly active systems";
const WEEK_WINDOW_DAYS = 180;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function baseHeaders(extra = {}) {
  return {
    "access-control-allow-origin": "*",
    "cache-control": "public, max-age=3600",
    ...extra,
  };
}

function isMetalinkRequest(pathname) {
  return pathname === "/metalink" || pathname === "/metalink/";
}

async function recordTelemetryEvent(
  env,
  { repo, tag, flavor, arch, bucket, gamemode },
) {
  if (!env || !env.DB) return;
  try {
    const receivedAt = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO telemetry_events (repo, tag, flavor, arch, bucket, gamemode, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(repo, tag, flavor, arch, bucket, gamemode, receivedAt)
      .run();
  } catch (err) {
    console.error("Failed to persist telemetry event:", err);
  }
}

async function createMetalinkResponse(request, env, ctx) {
  const url = new URL(request.url);
  const repo = url.searchParams.get("repo") || "unknown";
  const tag = url.searchParams.get("tag") || "unknown";
  const flavor = url.searchParams.get("flavor") || "unknown";
  const arch = url.searchParams.get("arch") || "unknown";
  const countme = url.searchParams.get("countme") || "unknown";
  const gamemode = url.searchParams.get("gamemode") === "1" ? 1 : 0;
  const bucket = parseInt(countme, 10) || 1;

  const persistPromise = recordTelemetryEvent(env, {
    repo,
    tag,
    flavor,
    arch,
    bucket,
    gamemode,
  });

  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(persistPromise);
  } else {
    await persistPromise;
  }

  return new Response(
    `countme accepted for repo=${repo} tag=${tag} flavor=${flavor} gamemode=${gamemode} arch=${arch} countme=${countme}\n`,
    {
      status: 200,
      headers: baseHeaders({
        "content-type": "text/plain;charset=UTF-8",
        "cache-control": "no-store",
      }),
    },
  );
}

function svgResponse(body, maxAgeSeconds) {
  return new Response(body, {
    status: 200,
    headers: baseHeaders({
      "content-type": "image/svg+xml; charset=UTF-8",
      "cache-control": `public, max-age=${maxAgeSeconds}`,
    }),
  });
}

function jsonResponse(payload, maxAgeSeconds) {
  return new Response(`${JSON.stringify(payload)}\n`, {
    status: 200,
    headers: baseHeaders({
      "content-type": "application/json;charset=UTF-8",
      "cache-control": `public, max-age=${maxAgeSeconds}`,
    }),
  });
}

/**
 * Weekly counts per first-party repo, Monday-anchored.
 *
 * `weekday 0` advances to that week's Sunday, so `-6 days` lands on its Monday
 * — the same week key the published series has always used.
 */
const WEEKLY_COUNTS_SQL = `SELECT date(received_at, 'weekday 0', '-6 days') AS week,
          repo,
          COUNT(*) AS hits
   FROM telemetry_events
   WHERE received_at >= date('now', '-${WEEK_WINDOW_DAYS} days')
     AND repo IN (${PROJECTBLUEFIN_REPOS.map(() => "?").join(", ")})
   GROUP BY week, repo
   ORDER BY week ASC`;

function countsMeta() {
  return {
    generatedAt: new Date().toISOString(),
    source: FIRST_PARTY.origin,
    method: COUNT_METHOD,
    unit: COUNT_UNIT,
  };
}

function pendingCounts() {
  return {
    ...countsMeta(),
    variants: [],
    weeks: [],
    unavailable: true,
    stateReason: FIRST_PARTY_PENDING_REASON,
  };
}

/** Every Monday from `first` through `last`, so a silent week stays visible. */
function weekAxis(first, last) {
  const axis = [];
  for (
    let stamp = Date.parse(`${first}T00:00:00Z`);
    stamp <= Date.parse(`${last}T00:00:00Z`);
    stamp += WEEK_MS
  ) {
    axis.push(new Date(stamp).toISOString().slice(0, 10));
  }
  return axis;
}

/**
 * The counts document. A repo with no rows in a week is null, never 0: we
 * cannot distinguish "nobody reported" from "nobody was running it".
 */
async function aggregateWeeklyCounts(env) {
  if (!env || !env.DB) return pendingCounts();

  let rows;
  try {
    const query = await env.DB.prepare(WEEKLY_COUNTS_SQL)
      .bind(...PROJECTBLUEFIN_REPOS)
      .all();
    rows = (query && query.results) || [];
  } catch (err) {
    console.error("Failed to aggregate countme records:", err);
    return pendingCounts();
  }

  const counted = rows.filter(
    (row) => row && typeof row.week === "string" && Number.isFinite(row.hits),
  );
  if (counted.length === 0) return pendingCounts();

  const byWeek = new Map();
  for (const row of counted) {
    const week = byWeek.get(row.week) || new Map();
    week.set(row.repo, (week.get(row.repo) || 0) + row.hits);
    byWeek.set(row.week, week);
  }

  const observed = [...byWeek.keys()].sort();
  const weeks = weekAxis(observed[0], observed[observed.length - 1]).map(
    (week) => {
      const counts = byWeek.get(week);
      const entry = { week };
      for (const repo of PROJECTBLUEFIN_REPOS) {
        entry[repo] = counts && counts.has(repo) ? counts.get(repo) : null;
      }
      return entry;
    },
  );

  return {
    ...countsMeta(),
    variants: PROJECTBLUEFIN_REPOS.filter((repo) =>
      weeks.some((week) => week[repo] !== null),
    ),
    weeks,
  };
}

async function createCountsResponse(env) {
  return jsonResponse(
    await aggregateWeeklyCounts(env),
    COUNTS_CACHE_TTL_SECONDS,
  );
}

async function createChartResponse(env, repo) {
  const dataset = await aggregateWeeklyCounts(env);
  const body = dataset.unavailable
    ? renderAccumulatingSvg(repo, 0)
    : renderRepoChartSvg(dataset, repo);
  return svgResponse(body, COUNTS_CACHE_TTL_SECONDS);
}

async function createBadgeResponse(env, repo) {
  const dataset = await aggregateWeeklyCounts(env);
  return jsonResponse(renderRepoBadge(dataset, repo), COUNTS_CACHE_TTL_SECONDS);
}

async function createLegacyProxyResponse(upstream) {
  const upstreamRes = await fetch(upstream, {
    headers: { "user-agent": USER_AGENT },
  });

  if (!upstreamRes.ok) {
    return new Response(`upstream error: ${upstreamRes.status}`, {
      status: 502,
      headers: baseHeaders({ "content-type": "text/plain;charset=UTF-8" }),
    });
  }

  return new Response(upstreamRes.body, {
    status: 200,
    headers: baseHeaders({
      "content-type":
        upstreamRes.headers.get("content-type") || "application/octet-stream",
    }),
  });
}

async function proxyRequest(request, env, ctx) {
  const url = new URL(request.url);
  const pathname = normalizePathname(url.pathname);

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("method not allowed", {
      status: 405,
      headers: baseHeaders({ allow: "GET, HEAD" }),
    });
  }

  if (isMetalinkRequest(pathname)) {
    return createMetalinkResponse(request, env, ctx);
  }

  const route = resolveRoute(pathname);

  if (!route) {
    return new Response("not found", {
      status: 404,
      headers: baseHeaders({ "content-type": "text/plain;charset=UTF-8" }),
    });
  }

  if (route.kind === "counts") return createCountsResponse(env);
  if (route.kind === "chart") return createChartResponse(env, route.repo);
  if (route.kind === "badge") return createBadgeResponse(env, route.repo);

  return createLegacyProxyResponse(route.url);
}

export default {
  async fetch(request, env, ctx) {
    return proxyRequest(request, env, ctx);
  },
};
