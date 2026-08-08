import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyFamily,
  freshnessState,
  pickStreams,
  buildPackage,
  buildPayload,
} from "./fetch-ghcr-packages.js";

function version(tags, createdAt = "2026-08-01T10:00:00Z") {
  return {
    id: 1,
    name: "sha256:abc",
    created_at: createdAt,
    updated_at: createdAt,
    metadata: { container: { tags } },
  };
}

// ── classifyFamily ──────────────────────────────────────────────────────

test("classifyFamily: os images", () => {
  assert.equal(classifyFamily("bluefin"), "os");
  assert.equal(classifyFamily("bluefin-lts-hwe-nvidia"), "os");
  assert.equal(classifyFamily("dakota"), "os");
  assert.equal(classifyFamily("dakota-nvidia"), "os");
});

test("classifyFamily: userspace", () => {
  assert.equal(classifyFamily("base-aarch64"), "userspace");
  assert.equal(classifyFamily("brew"), "userspace");
  assert.equal(classifyFamily("static-x86_64"), "userspace");
  assert.equal(classifyFamily("skopeo-aarch64"), "userspace");
  assert.equal(classifyFamily("lab-runner-aarch64"), "userspace");
});

test("classifyFamily: toolbox", () => {
  assert.equal(classifyFamily("bluefin-toolbox"), "toolbox");
  assert.equal(classifyFamily("ubuntu-toolbox"), "toolbox");
});

test("classifyFamily: tooling", () => {
  assert.equal(classifyFamily("testsuite/desktop-screenshot"), "tooling");
  assert.equal(classifyFamily("common"), "tooling");
  assert.equal(classifyFamily("finpilot"), "tooling");
  assert.equal(classifyFamily("knuckle/knuckle-linux-amd64"), "tooling");
});

test("classifyFamily: internal checked before os", () => {
  assert.equal(classifyFamily("bluefin-cache"), "internal");
  assert.equal(classifyFamily("bluefin-pr"), "internal");
  // Explicit: bluefin-cache must NOT be os
  assert.notEqual(classifyFamily("bluefin-cache"), "os");
});

// ── freshnessState ──────────────────────────────────────────────────────

test("freshnessState: stable recent at 10 days", () => {
  const r = freshnessState("stable", 10);
  assert.equal(r.state, "recent");
});

test("freshnessState: stable stale at 20 days", () => {
  const r = freshnessState("stable", 20);
  assert.equal(r.state, "stale");
  assert.ok(r.stateReason.length > 0);
});

test("freshnessState: testing stale at 10 days", () => {
  const r = freshnessState("testing", 10);
  assert.equal(r.state, "stale");
});

test("freshnessState: testing fresh at 2 days", () => {
  const r = freshnessState("testing", 2);
  assert.equal(r.state, "fresh");
});

test("freshnessState: null ageDays is awaiting, not stale", () => {
  const r = freshnessState("stable", null);
  assert.equal(r.state, "awaiting");
  assert.ok(r.stateReason.length > 0);
  assert.ok(
    !r.stateReason.toLowerCase().includes("stale"),
    'awaiting reason must not contain "stale"',
  );
});

// ── pickStreams ──────────────────────────────────────────────────────────

test("pickStreams keeps stable and gts, collapses stable-YYYYMMDD into stable", () => {
  const now = Date.parse("2026-08-07T00:00:00Z");
  const versions = [
    version(["stable-20260720"], "2026-07-20T10:00:00Z"),
    version(["stable-20260715"], "2026-07-15T10:00:00Z"),
    version(["gts"], "2026-08-01T10:00:00Z"),
  ];
  const streams = pickStreams(versions, now);
  const tags = streams.map((s) => s.tag);
  assert.ok(tags.includes("stable"));
  assert.ok(tags.includes("gts"));
  // stable entry should use the newer date (20260720)
  const stable = streams.find((s) => s.tag === "stable");
  assert.ok(stable.publishedAt.startsWith("2026-07-20"));
});

test("pickStreams ignores cosign artefacts and untagged versions", () => {
  const versions = [
    version(["sha256-abc.sig"]),
    version(["sha256-abc.att"]),
    version(["sha256-def.sbom"]),
    {
      id: 2,
      name: "sha256:xyz",
      created_at: "2026-08-01T00:00:00Z",
      metadata: { container: { tags: [] } },
    },
  ];
  const streams = pickStreams(versions);
  assert.deepEqual(streams, []);
});

test("pickStreams returns newest version for a tag when several carry it", () => {
  const now = Date.parse("2026-08-07T00:00:00Z");
  const versions = [
    version(["testing"], "2026-08-05T10:00:00Z"),
    version(["testing"], "2026-08-06T12:00:00Z"),
    version(["testing"], "2026-08-04T08:00:00Z"),
  ];
  const streams = pickStreams(versions, now);
  assert.equal(streams.length, 1);
  assert.equal(streams[0].tag, "testing");
  assert.ok(streams[0].publishedAt.startsWith("2026-08-06"));
});

// ── buildPackage ────────────────────────────────────────────────────────

test("buildPackage assembles name, family, streams, versionCount", () => {
  const pkg = { name: "bluefin" };
  const versions = [
    version(["stable"], "2026-07-20T15:47:00Z"),
    version(["testing"], "2026-08-06T02:00:00Z"),
  ];
  const now = Date.parse("2026-08-07T00:00:00Z");
  const result = buildPackage(pkg, versions, now);
  assert.equal(result.name, "bluefin");
  assert.equal(result.family, "os");
  assert.equal(result.versionCount, 2);
  assert.ok(result.streams.length >= 2);
});

// ── buildPayload ────────────────────────────────────────────────────────

test("buildPayload computes familyCounts and top-level shape", () => {
  const packages = [
    { name: "bluefin", family: "os", streams: [], versionCount: 10 },
    { name: "dakota", family: "os", streams: [], versionCount: 5 },
    { name: "brew", family: "userspace", streams: [], versionCount: 3 },
  ];
  const payload = buildPayload(packages, {
    generatedAt: "2026-08-07T00:00:00Z",
    orgs: ["projectbluefin"],
  });
  assert.equal(payload.generatedAt, "2026-08-07T00:00:00Z");
  assert.deepEqual(payload.orgs, ["projectbluefin"]);
  assert.equal(payload.packages.length, 3);
  assert.deepEqual(payload.familyCounts, { os: 2, userspace: 1 });
  assert.equal(payload.unavailable, false);
  assert.equal(payload.stateReason, null);
});

test("buildPayload unavailable mode", () => {
  const payload = buildPayload([], {
    unavailable: true,
    stateReason: "no token",
  });
  assert.equal(payload.unavailable, true);
  assert.equal(payload.stateReason, "no token");
  assert.deepEqual(payload.packages, []);
});
