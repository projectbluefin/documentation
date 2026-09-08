const test = require("node:test");
const assert = require("node:assert/strict");
let mapRequestPath;
let createPendingProjectbluefinSvg;
let fetchHandler;

test.before(async () => {
  const routes = await import("../workers/countme-proxy/routes.mjs");
  const mod = await import("../workers/countme-proxy/index.mjs");
  mapRequestPath = routes.mapRequestPath;
  createPendingProjectbluefinSvg = routes.createPendingProjectbluefinSvg;
  fetchHandler = mod.default.fetch;
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

test("maps root-host chart aliases to projectbluefin countme artifact", () => {
  assert.equal(
    mapRequestPath("/"),
    "https://raw.githubusercontent.com/projectbluefin/countme/main/growth_bluefins.svg",
  );
  assert.equal(
    mapRequestPath("/growth.svg"),
    "https://raw.githubusercontent.com/projectbluefin/countme/main/growth_bluefins.svg",
  );
  assert.equal(
    mapRequestPath("/bluefin/growth.svg"),
    "https://raw.githubusercontent.com/projectbluefin/countme/main/growth_bluefins.svg",
  );
  assert.equal(
    mapRequestPath("/bluefin-lts/growth.svg"),
    "https://raw.githubusercontent.com/projectbluefin/countme/main/growth_bluefins.svg",
  );
  assert.equal(
    mapRequestPath("/dakota/growth.svg"),
    "https://raw.githubusercontent.com/projectbluefin/countme/main/growth_bluefins.svg",
  );
  assert.equal(
    mapRequestPath("/utah/growth.svg"),
    "https://raw.githubusercontent.com/projectbluefin/countme/main/growth_bluefins.svg",
  );
});

test("maps Bluefin, Dakota, and Utah badge endpoints", () => {
  assert.equal(
    mapRequestPath("/badge-endpoints/bluefin.json"),
    "https://raw.githubusercontent.com/ublue-os/countme/main/badge-endpoints/bluefin.json",
  );
  assert.equal(
    mapRequestPath("/badge-endpoints/bluefin-lts.json"),
    "https://raw.githubusercontent.com/ublue-os/countme/main/badge-endpoints/bluefin-lts.json",
  );
  assert.equal(
    mapRequestPath("/badge-endpoints/dakota.json"),
    "https://raw.githubusercontent.com/projectbluefin/countme/main/badge-endpoints/dakota.json",
  );
  assert.equal(
    mapRequestPath("/badge-endpoints/utah.json"),
    "https://raw.githubusercontent.com/projectbluefin/countme/main/badge-endpoints/utah.json",
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

test("accepts metalink pings from Dakota countme clients", async () => {
  const request = new Request(
    "https://countme.projectbluefin.io/metalink?repo=dakota&tag=latest&flavor=default&arch=x86_64&countme=3",
  );

  const response = await fetchHandler(request);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get("content-type"),
    "text/plain;charset=UTF-8",
  );
  assert.match(
    await response.text(),
    /countme accepted for repo=dakota tag=latest flavor=default arch=x86_64 countme=3/i,
  );
});

test("accepts metalink pings from Bluefin countme clients", async () => {
  const request = new Request(
    "https://countme.projectbluefin.io/metalink?repo=bluefin&tag=stable&flavor=main&arch=x86_64&countme=2",
  );

  const response = await fetchHandler(request);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get("content-type"),
    "text/plain;charset=UTF-8",
  );
  assert.match(
    await response.text(),
    /countme accepted for repo=bluefin tag=stable flavor=main arch=x86_64 countme=2/i,
  );
});

test("accepts metalink pings from Bluefin LTS countme clients", async () => {
  const request = new Request(
    "https://countme.projectbluefin.io/metalink?repo=bluefin-lts&tag=stable&flavor=main&arch=x86_64&countme=4",
  );

  const response = await fetchHandler(request);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get("content-type"),
    "text/plain;charset=UTF-8",
  );
  assert.match(
    await response.text(),
    /countme accepted for repo=bluefin-lts tag=stable flavor=main arch=x86_64 countme=4/i,
  );
});

test("accepts metalink pings from Utah countme clients", async () => {
  const request = new Request(
    "https://countme.projectbluefin.io/metalink?repo=utah&tag=testing&flavor=default&arch=x86_64&countme=1",
  );

  const response = await fetchHandler(request);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get("content-type"),
    "text/plain;charset=UTF-8",
  );
  assert.match(
    await response.text(),
    /countme accepted for repo=utah tag=testing flavor=default arch=x86_64 countme=1/i,
  );
});

test("renders pending projectbluefin svg message with specific variant", () => {
  const dakotaSvg = createPendingProjectbluefinSvg("dakota");
  assert.match(dakotaSvg, /projectbluefin\/dakota countme chart pending/i);
  assert.match(dakotaSvg, /Dakota countme\.projectbluefin\.io configured/i);

  const utahSvg = createPendingProjectbluefinSvg("utah");
  assert.match(utahSvg, /projectbluefin\/utah countme chart pending/i);
  assert.match(utahSvg, /Utah countme\.projectbluefin\.io configured/i);
});
