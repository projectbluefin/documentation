const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSbomStatus,
  parseSbomStatus,
} = require("./check-sbom-staleness.js");

test("buildSbomStatus marks fresh SBOM data", () => {
  const status = buildSbomStatus({ generatedAt: "2026-04-01T00:00:00Z" }, Date.parse("2026-04-01T12:00:00Z"));

  assert.equal(status.level, "log");
  assert.equal(status.state, "fresh");
  assert.equal(status.ageHours.toFixed(1), "12.0");
  assert.match(status.message, /fresh/);
});

test("buildSbomStatus warns when SBOM data is stale or invalid", () => {
  const stale = buildSbomStatus({ generatedAt: "2026-04-01T00:00:00Z" }, Date.parse("2026-04-03T12:30:00Z"));
  assert.equal(stale.level, "warn");
  assert.equal(stale.state, "stale");
  assert.match(stale.message, /60\.5h old/);

  const invalid = buildSbomStatus({ generatedAt: "not-a-date" }, Date.parse("2026-04-01T12:00:00Z"));
  assert.equal(invalid.state, "invalid");
  assert.match(invalid.message, /no valid generatedAt/);
});

test("parseSbomStatus surfaces JSON parse failures", () => {
  const status = parseSbomStatus("{bad json}");

  assert.equal(status.level, "warn");
  assert.equal(status.state, "error");
  assert.match(status.message, /Could not read SBOM data/);
});
