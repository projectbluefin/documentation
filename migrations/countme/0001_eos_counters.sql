-- eos-phone-home counters (workers/countme-proxy/eos.mjs).
-- Per-day aggregates only: no per-system rows, no IPs, no hardware fields.
CREATE TABLE IF NOT EXISTS eos_activations (
  day     TEXT    NOT NULL,  -- UTC YYYY-MM-DD
  image   TEXT    NOT NULL,
  release TEXT    NOT NULL,
  n       INTEGER NOT NULL,
  PRIMARY KEY (day, image, release)
);

CREATE TABLE IF NOT EXISTS eos_pings (
  day     TEXT    NOT NULL,  -- UTC YYYY-MM-DD
  image   TEXT    NOT NULL,
  release TEXT    NOT NULL,
  n       INTEGER NOT NULL,  -- pings that day = systems active that day
  first   INTEGER NOT NULL,  -- pings with count == 0 (a system's first ping)
  PRIMARY KEY (day, image, release)
);
