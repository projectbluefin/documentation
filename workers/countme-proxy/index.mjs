import {
  normalizePathname,
  createPendingProjectbluefinSvg,
  isProjectBluefinPrimary,
  resolveChartTarget,
} from "./routes.mjs";

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

function createMetalinkResponse(request) {
  const url = new URL(request.url);
  const repo = url.searchParams.get("repo") || "unknown";
  const tag = url.searchParams.get("tag") || "unknown";
  const flavor = url.searchParams.get("flavor") || "unknown";
  const arch = url.searchParams.get("arch") || "unknown";
  const countme = url.searchParams.get("countme") || "unknown";

  return new Response(
    `countme accepted for repo=${repo} tag=${tag} flavor=${flavor} arch=${arch} countme=${countme}\n`,
    {
      status: 200,
      headers: baseHeaders({
        "content-type": "text/plain;charset=UTF-8",
        "cache-control": "no-store",
      }),
    },
  );
}

async function proxyRequest(request) {
  const url = new URL(request.url);
  const pathname = normalizePathname(url.pathname);

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("method not allowed", {
      status: 405,
      headers: baseHeaders({ allow: "GET, HEAD" }),
    });
  }

  if (isMetalinkRequest(pathname)) {
    return createMetalinkResponse(request);
  }

  const upstream = resolveChartTarget(pathname);

  if (!upstream) {
    return new Response("not found", {
      status: 404,
      headers: baseHeaders({ "content-type": "text/plain;charset=UTF-8" }),
    });
  }

  const upstreamRes = await fetch(upstream, {
    headers: { "user-agent": "projectbluefin-countme-worker/1.0" },
  });

  if (upstreamRes.ok) {
    const contentType =
      upstreamRes.headers.get("content-type") || "application/octet-stream";
    return new Response(upstreamRes.body, {
      status: 200,
      headers: baseHeaders({
        "content-type": contentType,
      }),
    });
  }

  if (isProjectBluefinPrimary(pathname)) {
    return new Response(createPendingProjectbluefinSvg(), {
      status: 200,
      headers: baseHeaders({ "content-type": "image/svg+xml; charset=UTF-8" }),
    });
  }

  return new Response(`upstream error: ${upstreamRes.status}`, {
    status: 502,
    headers: baseHeaders({ "content-type": "text/plain;charset=UTF-8" }),
  });
}

export default {
  async fetch(request) {
    return proxyRequest(request);
  },
};
