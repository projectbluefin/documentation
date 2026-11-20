// Active-system count: each Project Bluefin system sends at most one
// PUT /v1/ping {"image": "<image-name>/<image-flavor>:<stream>"} per day
// (the projectbluefin-countme reporter; bootc images get it from
// projectbluefin/common, Bluefin Server ships its own copy). The Worker keeps
// one counter per UTC day and image: no per-system rows, no IPs.
//
// The image allowlist rejects anything that is not a known Bluefin image
// shape. An anonymous endpoint cannot authenticate its callers.

// Bootc images and printer containers: variants and flavors, stream from
// bootc status.
const STANDARD_FAMILIES = [
  "dakota",
  "utah",
  "ghostscript-printer-app",
  "hplip-printer-app",
  "gutenprint-printer-app",
  "ps-printer-app",
];
// Bluefin Server is a DDI: exact name, no variants or flavors, stream from
// image-tag (`latest`). The reporter only ever sends `server/main`.
const SERVER_FAMILIES = ["server"];

export const PING_IMAGE_FAMILIES = [...STANDARD_FAMILIES, ...SERVER_FAMILIES];
const IMAGE_RE = new RegExp(
  `^(?:${STANDARD_FAMILIES.join("|")})(?:-[a-z0-9]+){0,3}/[a-z0-9-]{1,32}:(?:stable|testing|unknown)$` +
    `|^server/main:(?:latest|unknown)$`,
  "u",
);

// Created through the Worker's own binding; deploys need no D1 permission.
const TABLE_SQL = `CREATE TABLE IF NOT EXISTS daily_pings (
  day TEXT NOT NULL, image TEXT NOT NULL, n INTEGER NOT NULL,
  PRIMARY KEY (day, image))`;
const UPSERT_SQL = `INSERT INTO daily_pings (day, image, n) VALUES (?, ?, 1)
  ON CONFLICT (day, image) DO UPDATE SET n = n + 1`;
export const DAILY_SQL = `SELECT day, image, n FROM daily_pings
  WHERE day >= date('now', '-90 days') ORDER BY day, image`;

function json(body, status) {
  return new Response(`${JSON.stringify(body)}\n`, {
    status,
    headers: {
      "access-control-allow-origin": "*",
      "content-type": "application/json;charset=UTF-8",
      "cache-control": "no-store",
    },
  });
}

export async function createPingResponse(request, env) {
  const body = await request.json().catch(() => null);
  if (typeof body?.image !== "string" || !IMAGE_RE.test(body.image)) {
    return json({ success: false, error: "invalid image" }, 400);
  }
  // Acknowledge only a confirmed write: a client told "success" does not retry.
  try {
    const day = new Date().toISOString().slice(0, 10);
    const results = await env.DB.batch([
      env.DB.prepare(TABLE_SQL),
      env.DB.prepare(UPSERT_SQL).bind(day, body.image),
    ]);
    if (results.every((r) => r?.success === true)) {
      return json({ success: true }, 200);
    }
  } catch (err) {
    console.error("Failed to count ping:", err);
  }
  return json({ success: false, error: "countme unavailable" }, 503);
}

export async function createDailyResponse(env) {
  try {
    await env.DB.prepare(TABLE_SQL).run();
    const { results } = await env.DB.prepare(DAILY_SQL).all();
    return json({ unit: "systems active per UTC day", days: results }, 200);
  } catch (err) {
    console.error("Failed to read daily pings:", err);
    return json({ unavailable: true, stateReason: "query failed" }, 200);
  }
}
