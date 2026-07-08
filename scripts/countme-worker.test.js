const test = require("node:test");
const assert = require("node:assert/strict");
let mapRequestPath;
let createPendingProjectbluefinSvg;

test.before(async () => {
  const mod = await import("../workers/countme-proxy/index.mjs");
  mapRequestPath = mod.mapRequestPath;
  createPendingProjectbluefinSvg = mod.createPendingProjectbluefinSvg;
});

test("maps legacy Bluefin source route to ublue-os countme artifact", () => {
  const mapped = mapRequestPath("/sources/ublue-os/bluefin/growth.svg");
  assert.equal(
    mapped,
    "https://raw.githubusercontent.com/ublue-os/countme/main/growth_bluefins.svg",
  );
});

test("maps projectbluefin source route to projectbluefin countme artifact", () => {
  const mapped = mapRequestPath("/sources/projectbluefin/bluefin/growth.svg");
  assert.equal(
    mapped,
    "https://raw.githubusercontent.com/projectbluefin/countme/main/growth_bluefins.svg",
  );
});

test("maps Bluefin badge endpoints", () => {
  assert.equal(
    mapRequestPath("/badge-endpoints/bluefin.json"),
    "https://raw.githubusercontent.com/ublue-os/countme/main/badge-endpoints/bluefin.json",
  );
  assert.equal(
    mapRequestPath("/badge-endpoints/bluefin-lts.json"),
    "https://raw.githubusercontent.com/ublue-os/countme/main/badge-endpoints/bluefin-lts.json",
  );
});

test("returns null for unknown route", () => {
  assert.equal(mapRequestPath("/nope"), null);
});

test("renders pending projectbluefin svg message", () => {
  const svg = createPendingProjectbluefinSvg();
  assert.match(svg, /projectbluefin\/bluefin countme chart pending/i);
  assert.match(svg, /<svg/i);
});
