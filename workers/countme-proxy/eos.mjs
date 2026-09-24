// eos-phone-home receiver: counts active systems, nothing else.
//
// The HTTP contract matches endlessm/eos-activation-server (api/activation.js,
// api/ping.js), so the unmodified upstream client works with only
// `host = https://countme.projectbluefin.io` in /etc/eos-phone-home.conf:
// PUT JSON, schema-validated, reply {"success": true}. Where upstream queues
// each record for Azafea, this bumps per-day counters in D1. Vendor and
// product are validated (the client always sends them) but never stored.
// `serial` and `mac_hash` stay in the activate schema only so upstream-shaped
// bodies validate; eos-phone-home does not send them and they are never stored.

const MAX_LABEL = 128;
const STRING = (v) => typeof v === "string";
const LABEL = (v) => STRING(v) && v.length <= MAX_LABEL;
const BOOL = (v) => typeof v === "boolean";
const UINT = (v) => Number.isInteger(v) && v >= 0;

const SCHEMAS = {
  activate: {
    required: ["image", "vendor", "product", "release"],
    types: {
      image: LABEL,
      vendor: STRING,
      product: STRING,
      serial: STRING,
      release: LABEL,
      live: BOOL,
      dualboot: BOOL,
      mac_hash: (v) => UINT(v) && v <= 2 ** 32 - 1,
    },
  },
  ping: {
    required: ["image", "vendor", "product", "release"],
    types: {
      image: LABEL,
      vendor: STRING,
      product: STRING,
      release: LABEL,
      dualboot: BOOL,
      count: UINT,
      metrics_enabled: BOOL,
      metrics_environment: STRING,
    },
  },
};

export const EOS_PATHS = { "/v1/activate": "activate", "/v1/ping": "ping" };

/** Same required fields and types as eos-activation-server, plus label caps. */
export function validEosRecord(kind, body) {
  const { required, types } = SCHEMAS[kind];
  if (body === null || typeof body !== "object" || Array.isArray(body))
    return false;
  if (!required.every((key) => key in body)) return false;
  return Object.entries(types).every(
    ([key, ok]) => !(key in body) || ok(body[key]),
  );
}

// Per-day counters only: no per-system rows, no IPs, no hardware fields.
// The Worker creates these itself through its D1 binding, once per isolate,
// so deploying needs no migration step or D1 permission on the CI token.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS eos_activations (
    day TEXT NOT NULL, image TEXT NOT NULL, release TEXT NOT NULL,
    n INTEGER NOT NULL, PRIMARY KEY (day, image, release))`,
  `CREATE TABLE IF NOT EXISTS eos_pings (
    day TEXT NOT NULL, image TEXT NOT NULL, release TEXT NOT NULL,
    n INTEGER NOT NULL, first INTEGER NOT NULL, PRIMARY KEY (day, image, release))`,
];

let tablesReady = null;
function ensureTables(db) {
  tablesReady ??= Promise.all(SCHEMA.map((sql) => db.prepare(sql).run())).catch(
    (err) => {
      tablesReady = null; // retry on the next request
      throw err;
    },
  );
  return tablesReady;
}

const ACTIVATE_SQL = `INSERT INTO eos_activations (day, image, release, n) VALUES (?, ?, ?, 1)
  ON CONFLICT (day, image, release) DO UPDATE SET n = n + 1`;

// `count` is how many times this system pinged successfully before, so
// count == 0 marks a system's first ping.
const PING_SQL = `INSERT INTO eos_pings (day, image, release, n, first) VALUES (?, ?, ?, 1, ?)
  ON CONFLICT (day, image, release) DO UPDATE SET n = n + 1, first = first + excluded.first`;

export const EOS_DAILY_SQL = `SELECT day, SUM(n) AS active, SUM(first) AS new
  FROM eos_pings WHERE day >= ? GROUP BY day ORDER BY day`;

export const EOS_WINDOW_DAYS = 90;

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

export async function createEosRecordResponse(kind, request, env) {
  if (
    !(request.headers.get("content-type") || "").includes("application/json")
  ) {
    return new Response("Not Acceptable", { status: 406 });
  }
  let body = null;
  try {
    body = await request.json();
  } catch {
    // falls through to the schema error, as upstream does for bad JSON
  }
  if (!validEosRecord(kind, body)) {
    return json(
      { error: "Request failed schema validation", success: false },
      400,
    );
  }
  if (!env || !env.DB)
    return json({ error: "countme unavailable", success: false }, 503);

  const day = new Date().toISOString().slice(0, 10);
  // Acknowledge only a confirmed write, as /metalink does: a client told
  // "success" never retries, so anything else must be a retryable 503.
  let persisted = false;
  try {
    await ensureTables(env.DB);
    const statement =
      kind === "activate"
        ? env.DB.prepare(ACTIVATE_SQL).bind(day, body.image, body.release)
        : env.DB.prepare(PING_SQL).bind(
            day,
            body.image,
            body.release,
            body.count === 0 ? 1 : 0,
          );
    persisted = (await statement.run())?.success === true;
  } catch (err) {
    console.error("Failed to count eos-phone-home record:", err);
  }
  if (!persisted)
    return json({ error: "countme unavailable", success: false }, 503);
  return json({ success: true }, 200);
}

/**
 * Rows: { day, active, new }. The client pings at most once per 24h, so
 * `active` for a day is systems active that day. Summing days would count a
 * daily machine seven times a week, so the weekly figure is the mean of the
 * seven complete UTC days before `now` (today is partial). A day with no row
 * is a gap, not a zero, so any missing day makes the mean null.
 */
export function buildEosDailyDocument(rows, now) {
  const days = rows.map(({ day, active, new: fresh }) => ({
    day,
    active,
    new: fresh,
  }));
  const byDay = new Map(days.map((d) => [d.day, d.active]));
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const lastWeek = Array.from({ length: 7 }, (_, i) =>
    byDay.get(
      new Date(today - (i + 1) * 86_400_000).toISOString().slice(0, 10),
    ),
  );
  return {
    generatedAt: now.toISOString(),
    method: "eos-phone-home-v1",
    unit: "systems active per UTC day (one ping per system per 24h)",
    days,
    sevenDayMeanActive: lastWeek.every((v) => typeof v === "number")
      ? Math.round(lastWeek.reduce((sum, v) => sum + v, 0) / 7)
      : null,
  };
}

export async function createEosDailyResponse(env) {
  const now = new Date();
  if (!env || !env.DB)
    return json({ unavailable: true, stateReason: "database unbound" }, 200);
  const since = new Date(now.getTime() - EOS_WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  try {
    await ensureTables(env.DB);
    const { results } = await env.DB.prepare(EOS_DAILY_SQL).bind(since).all();
    return json(buildEosDailyDocument(results || [], now), 200);
  } catch (err) {
    console.error("Failed to read eos-phone-home counts:", err);
    return json({ unavailable: true, stateReason: "query failed" }, 200);
  }
}
