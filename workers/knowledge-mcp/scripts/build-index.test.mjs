// Self-check for the knowledge parser, security filter, and tripwire.
// Run: node --test scripts/build-index.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseKnowledge,
  searchEntries,
  conventionsFor,
  normalizeRepo,
  parseCitation,
  mentionedRepos,
  VULN_PATTERN,
} from "../src/knowledge.mjs";

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

// --- citations, repo filter, conventions -----------------------------------

const CITED = `# Agent Knowledge

## Patterns

### utah-packages#46: rebuild-rpms.yml downloads cosign unverified

The workflow fetches the release binary without checking it.

Tags: ci

### actions#432: consumer-validation.yml missing top-level permissions

Also seen in projectbluefin/dakota-iso.

Tags: ci, conventions

### hive App token lacks the workflows permission

No citation in this title at all.

Tags: conventions
`;

test("derives repo, number and url from a `<repo>#<n>` title prefix", () => {
  const [first] = parseKnowledge(CITED).entries;
  assert.equal(first.repo, "utah-packages");
  assert.equal(first.number, 46);
  assert.equal(
    first.url,
    "https://github.com/projectbluefin/utah-packages/issues/46",
  );
});

test("leaves citation fields off an entry whose title carries none", () => {
  const uncited = parseKnowledge(CITED).entries.find((e) =>
    e.title.startsWith("hive App token"),
  );
  assert.equal(uncited.repo, undefined);
  assert.equal(uncited.number, undefined);
  assert.equal(uncited.url, undefined);
});

test("parseCitation anchors on the title prefix, not any later `#n`", () => {
  assert.equal(parseCitation("bluefin#517: kernel akmods")?.number, 517);
  assert.equal(parseCitation("projectbluefin/server#80 login hardening")?.repo, "server");
  // A trailing reference is not the entry's own citation.
  assert.equal(parseCitation("promotion gate is unenforced (see common#892)"), null);
  assert.equal(parseCitation(""), null);
});

test("mentionedRepos picks up org-qualified and bare citations", () => {
  const repos = mentionedRepos(
    "fails in projectbluefin/dakota-iso, tracked as actions#432",
    null,
  );
  assert.ok(repos.includes("dakota-iso"));
  assert.ok(repos.includes("actions"));
});
test("mentionedRepos picks up title-only repo prefix with colon", () => {
  const repos = mentionedRepos(
    "actions: Consumer Validation failing on PR branches\nsome body text without mention",
    null,
    "actions: Consumer Validation failing on PR branches",
  );
  assert.ok(repos.includes("actions"));
});


test("normalizeRepo accepts both spellings and rejects junk", () => {
  assert.equal(normalizeRepo("projectbluefin/actions"), "actions");
  assert.equal(normalizeRepo("Utah-Packages"), "utah-packages");
  assert.equal(normalizeRepo("../../etc/passwd"), null);
  assert.equal(normalizeRepo(undefined), null);
});

test("search honours the repo filter, including a body-only mention", () => {
  const { entries } = parseKnowledge(CITED);
  assert.equal(searchEntries(entries, "permissions", 10, { repo: "actions" }).length, 1);
  // dakota-iso is named only in the body, and still filters.
  assert.equal(
    searchEntries(entries, "permissions", 10, { repo: "projectbluefin/dakota-iso" }).length,
    1,
  );
  assert.deepEqual(searchEntries(entries, "permissions", 10, { repo: "server" }), []);
  // No repo argument keeps the unfiltered behaviour.
  assert.equal(searchEntries(entries, "permissions", 10).length, 1);
});

test("conventionsFor returns only conventions-tagged entries for that repo", () => {
  const { entries } = parseKnowledge(CITED);
  const hits = conventionsFor(entries, "actions", 10);
  assert.equal(hits.length, 1);
  assert.ok(hits[0].title.startsWith("actions#432"));
  // cosign entry mentions utah-packages but is not tagged `conventions`.
  assert.deepEqual(conventionsFor(entries, "utah-packages", 10), []);
  assert.deepEqual(conventionsFor(entries, "not a repo", 10), []);
});
