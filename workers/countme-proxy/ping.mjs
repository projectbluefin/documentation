// Active-system count: each Project Bluefin system sends at most one
// PUT /v1/ping {"image": "<image-name>/<image-flavor>:<stream>"} per day
// (projectbluefin-countme, shipped by projectbluefin/common). The Worker keeps
// one counter per UTC day and image: no per-system rows, no IPs.
//
// The image allowlist rejects anything that is not a known Bluefin image
// shape. An anonymous endpoint cannot authenticate its callers.

export const PING_IMAGE_FAMILIES = ["dakota", "utah"];
const IMAGE_RE = new RegExp(
  `^(?:${PING_IMAGE_FAMILIES.join("|")})(?:-[a-z0-9]+){0,3}/[a-z0-9-]{1,32}:(?:stable|testing|unknown)$`,
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
