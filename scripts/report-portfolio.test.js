import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REPORT_PORTFOLIO,
  findPortfolioEntry,
} from "./lib/report-portfolio.mjs";
import { MONITORED_REPOS } from "./lib/monitored-repos.mjs";

test("the portfolio separates stable, experimental, and ecosystem sources", () => {
  assert.equal(findPortfolioEntry("projectbluefin/bluefin").tier, "stable");
  assert.equal(findPortfolioEntry("projectbluefin/utah").tier, "experimental");
  assert.equal(findPortfolioEntry("ublue-os/artwork").tier, "ecosystem");
  assert.equal(findPortfolioEntry("projectbluefin/not-configured"), null);
  assert.ok(REPORT_PORTFOLIO.every((entry) => entry.signals.length > 0));
  assert.ok(
    REPORT_PORTFOLIO.filter((entry) =>
      entry.repository.startsWith("ublue-os/"),
    ).every((entry) => entry.tier === "ecosystem"),
  );
});

test("the stable portfolio retains every previously monitored Project Bluefin repository", () => {
  for (const repository of [
    "projectbluefin/common",
    "projectbluefin/documentation",
    "projectbluefin/branding",
    "projectbluefin/iso",
    "projectbluefin/finpilot",
  ]) {
    const entry = findPortfolioEntry(repository);
    assert.equal(entry.tier, "stable");
    assert.ok(entry.signals.includes("activity"));
  }
});

test("ecosystem Homebrew taps retain promotion monitoring without activity", () => {
  for (const repository of [
    "ublue-os/homebrew-tap",
    "ublue-os/homebrew-experimental-tap",
  ]) {
    const entry = findPortfolioEntry(repository);
    assert.equal(entry.tier, "ecosystem");
    assert.deepEqual(entry.signals, ["tap-promotions"]);
  }
});

test("MONITORED_REPOS excludes external ublue activity", () => {
  for (const repository of [
    "projectbluefin/common",
    "projectbluefin/documentation",
    "projectbluefin/branding",
    "projectbluefin/iso",
    "projectbluefin/finpilot",
  ]) {
    assert.ok(MONITORED_REPOS.includes(repository), repository);
  }
  assert.ok(
    MONITORED_REPOS.every((repository) =>
      repository.startsWith("projectbluefin/"),
    ),
  );
  assert.equal(MONITORED_REPOS.includes("ublue-os/artwork"), false);
  assert.equal(MONITORED_REPOS.includes("ublue-os/homebrew-tap"), false);
  assert.equal(
    MONITORED_REPOS.includes("ublue-os/homebrew-experimental-tap"),
    false,
  );
});
