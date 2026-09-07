import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REPORT_PORTFOLIO,
  findPortfolioEntry,
} from "./lib/report-portfolio.mjs";

test("the portfolio separates stable, experimental, and ecosystem sources", () => {
  assert.equal(findPortfolioEntry("projectbluefin/bluefin").tier, "stable");
  assert.equal(findPortfolioEntry("projectbluefin/utah").tier, "experimental");
  assert.equal(findPortfolioEntry("ublue-os/artwork").tier, "ecosystem");
  assert.ok(REPORT_PORTFOLIO.every((entry) => entry.signals.length > 0));
});
