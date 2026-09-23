import {
  COUNTS_CACHE_TTL_SECONDS,
  normalizePathname,
  resolveRoute,
} from "./routes.mjs";
import {
  renderAccumulatingSvg,
  restyleUpstreamChart,
  renderRepoBadge,
  renderRepoChartSvg,
} from "./render.mjs";
import {
  WEEKLY_COUNTS_SQL,
  buildCountsDocument,
  normalizeCountmeRepo,
  pendingCountsDocument,
} from "./counts.mjs";

const USER_AGENT = "projectbluefin-countme-worker/1.0";

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
  if (!env || !env.DB) return false;
  try {
    const receivedAt = new Date().toISOString();
    const result = await env.DB.prepare(
      `INSERT INTO telemetry_events (repo, tag, flavor, arch, bucket, gamemode, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(repo, tag, flavor, arch, bucket, gamemode, receivedAt)
      .run();
    return result?.success === true;
  } catch (err) {
    console.error("Failed to persist telemetry event:", err);
    return false;
  }
}

async function createMetalinkResponse(request, env) {
  const url = new URL(request.url);
  const repo = url.searchParams.get("repo") || "unknown";
  const tag = url.searchParams.get("tag") || "unknown";
  const flavor = url.searchParams.get("flavor") || "unknown";
  const arch = url.searchParams.get("arch") || "unknown";
  const countme = url.searchParams.get("countme") || "unknown";
  const gamemode = url.searchParams.get("gamemode") === "1" ? 1 : 0;
  const bucket = parseInt(countme, 10) || 1;
  if (normalizeCountmeRepo(repo, gamemode)?.repo !== "dakota") {
    return new Response("unsupported repository", {
      status: 400,
      headers: baseHeaders({ "cache-control": "no-store" }),
    });
  }

  const persisted = await recordTelemetryEvent(env, {
    repo,
    tag,
    flavor,
    arch,
    bucket,
    gamemode,
  });

  if (!persisted) {
    return new Response("countme unavailable", {
      status: 503,
      headers: baseHeaders({ "cache-control": "no-store" }),
    });
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

/** Runs the weekly query and hands the rows to the counting rules. */
async function aggregateWeeklyCounts(env) {
  if (!env || !env.DB) return pendingCountsDocument();

  try {
    const query = await env.DB.prepare(WEEKLY_COUNTS_SQL).all();
    return buildCountsDocument((query && query.results) || []);
  } catch (err) {
    console.error("Failed to aggregate countme records:", err);
    return pendingCountsDocument();
  }
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

/**
 * Upstream's chart in the Bluefin palette.
 *
 * The bytes are fetched from the same artifact the untouched legacy route
 * serves, so the data and its provenance are identical; only the four colours
 * matplotlib emits are rewritten. A failure falls back to nothing rather than
 * to a substitute series: there is no other permitted source for this image.
 */
async function createThemedLegacyResponse(upstream) {
  const upstreamRes = await fetch(upstream, {
    headers: { "user-agent": USER_AGENT },
  });

  if (!upstreamRes.ok) {
    return new Response(`upstream error: ${upstreamRes.status}`, {
      status: 502,
      headers: baseHeaders({ "content-type": "text/plain;charset=UTF-8" }),
    });
  }

  return svgResponse(
    restyleUpstreamChart(await upstreamRes.text()),
    COUNTS_CACHE_TTL_SECONDS,
  );
}

async function proxyRequest(request, env) {
  const url = new URL(request.url);
  const pathname = normalizePathname(url.pathname);

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("method not allowed", {
      status: 405,
      headers: baseHeaders({ allow: "GET, HEAD" }),
    });
  }

  if (isMetalinkRequest(pathname)) {
    if (request.method === "HEAD") {
      return new Response(null, {
        status: 405,
        headers: baseHeaders({ allow: "GET", "cache-control": "no-store" }),
      });
    }
    return createMetalinkResponse(request, env);
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
  if (route.kind === "legacy-themed")
    return createThemedLegacyResponse(route.url);

  return createLegacyProxyResponse(route.url);
}

export default {
  async fetch(request, env) {
    return proxyRequest(request, env);
  },
};
