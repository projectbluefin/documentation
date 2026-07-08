const ROUTES = {
  "/growth_bluefins.svg":
    "https://raw.githubusercontent.com/ublue-os/countme/main/growth_bluefins.svg",
  "/sources/ublue-os/bluefin/growth.svg":
    "https://raw.githubusercontent.com/ublue-os/countme/main/growth_bluefins.svg",
  "/sources/projectbluefin/bluefin/growth.svg":
    "https://raw.githubusercontent.com/projectbluefin/countme/main/growth_bluefins.svg",
  "/badge-endpoints/bluefin.json":
    "https://raw.githubusercontent.com/ublue-os/countme/main/badge-endpoints/bluefin.json",
  "/badge-endpoints/bluefin-lts.json":
    "https://raw.githubusercontent.com/ublue-os/countme/main/badge-endpoints/bluefin-lts.json",
};

function baseHeaders(extra = {}) {
  return {
    "cache-control": "public, max-age=3600",
    ...extra,
  };
}

export function mapRequestPath(pathname) {
  return ROUTES[pathname] || null;
}

export function createPendingProjectbluefinSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-label="projectbluefin bluefin countme pending">
  <rect width="1280" height="720" fill="#0d1117"/>
  <rect x="30" y="30" width="1220" height="660" rx="12" fill="#161b22" stroke="#30363d" stroke-width="2"/>
  <text x="70" y="140" fill="#c9d1d9" font-size="40" font-family="Inter, Segoe UI, Arial, sans-serif">projectbluefin/bluefin countme chart pending</text>
  <text x="70" y="210" fill="#8b949e" font-size="28" font-family="Inter, Segoe UI, Arial, sans-serif">countme.projectbluefin.io configured, waiting for projectbluefin/countme artifacts</text>
  <line x1="70" y1="560" x2="1210" y2="360" stroke="#58a6ff" stroke-width="4" stroke-dasharray="12 10" opacity="0.75"/>
  <text x="70" y="620" fill="#8b949e" font-size="24" font-family="Inter, Segoe UI, Arial, sans-serif">Legacy data available at /sources/ublue-os/bluefin/growth.svg</text>
</svg>`;
}

function isProjectBluefinPrimary(pathname) {
  return pathname === "/sources/projectbluefin/bluefin/growth.svg";
}

async function proxyRequest(request) {
  const url = new URL(request.url);
  const upstream = mapRequestPath(url.pathname);

  if (!upstream) {
    return new Response("not found", {
      status: 404,
      headers: baseHeaders({ "content-type": "text/plain;charset=UTF-8" }),
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("method not allowed", {
      status: 405,
      headers: baseHeaders({ allow: "GET, HEAD" }),
    });
  }

  const upstreamRes = await fetch(upstream, {
    headers: { "user-agent": "projectbluefin-countme-worker/1.0" },
  });

  if (upstreamRes.ok) {
    const contentType = upstreamRes.headers.get("content-type") || "application/octet-stream";
    return new Response(upstreamRes.body, {
      status: 200,
      headers: baseHeaders({
        "content-type": contentType,
      }),
    });
  }

  if (isProjectBluefinPrimary(url.pathname)) {
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
