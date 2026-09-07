// Self-check for the knowledge parser, security filter, and tripwire.
// Run: node --test scripts/build-index.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseKnowledge, searchEntries, VULN_PATTERN } from "../src/knowledge.mjs";

// Mirrors the real export, including its quirks: a `## Problem` nested inside an
// entry body, and junk in the Tags line (`283)` is an issue number, not a tag).
const FIXTURE = `# Agent Knowledge

This file is auto-generated from the hive knowledge base.

## Patterns

### 10-theming.sh lacks regression tests for hardware branches

Writes desktop settings for Framework and Thelio hardware but had no tests.

- File: system_files/shared/usr/share/ublue-os/user-setup.hooks.d/10-theming.sh

Tags: testing, 283)

### bluefin#517: 04-install-kernel-akmods.sh has zero tests

## Problem

The most complex build script has no coverage.

Tags: testing, ci

### bluefin#530: critical CVE detected in testing image — P0 security

Blocks promotion until remediated.

Tags: security, testing
`;

test("parses entries and ignores `##` headings nested in a body", () => {
  const { entries } = parseKnowledge(FIXTURE);
  const titles = entries.map((e) => e.title);
  assert.equal(entries.length, 2);
  assert.ok(titles[1].startsWith("bluefin#517"));
  // The nested `## Problem` must stay body text, not split the entry.
  assert.match(entries[1].body, /## Problem/);
});

test("captures File: refs and strips junk tags", () => {
  const [first] = parseKnowledge(FIXTURE).entries;
  assert.deepEqual(first.files, [
    "system_files/shared/usr/share/ublue-os/user-setup.hooks.d/10-theming.sh",
  ]);
  // `283)` is upstream junk and must not survive as a tag.
  assert.deepEqual(first.tags, ["testing"]);
  assert.equal(first.category, "Patterns");
});

test("drops security-tagged entries from the published index", () => {
  const { entries, dropped } = parseKnowledge(FIXTURE);
  assert.equal(dropped, 1);
  assert.ok(!entries.some((e) => e.title.includes("CVE")));
  assert.ok(!entries.some((e) => e.tags.includes("security")));
});

test("tripwire flags vuln language that escaped the security tag", () => {
  const leaky = `# Agent Knowledge

## Patterns

### vulnerability-scan.yml: CVSS comparison is string not float — CVE 10.0 evades critical check

The gate can be bypassed.

Tags: ci
`;
  const { violations, entries } = parseKnowledge(leaky);
  assert.equal(violations.length, 1);
  // A tripwire hit is withheld, never published.
  assert.equal(entries.length, 0);
});

test("tripwire ignores ordinary entries", () => {
  const { violations } = parseKnowledge(FIXTURE);
  assert.deepEqual(violations, []);
});

test("VULN_PATTERN matches the real-world phrasings we found", () => {
  for (const s of ["CVE-2026-1234", "unpatched image", "evades critical check", "gate bypassed"]) {
    assert.match(s, VULN_PATTERN);
  }
  assert.doesNotMatch("adds BATS coverage for 03-packages.sh", VULN_PATTERN);
});

test("search ranks title matches above body matches and honours the cap", () => {
  const { entries } = parseKnowledge(FIXTURE);
  const hits = searchEntries(entries, "theming", 10);
  assert.equal(hits.length, 1);
  assert.match(hits[0].title, /10-theming/);
  assert.equal(searchEntries(entries, "testing", 1).length, 1);
  assert.deepEqual(searchEntries(entries, "   ", 10), []);
});
