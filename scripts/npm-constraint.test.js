import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// renovate.json's constraints.npm sets the npm version Renovate writes
// lock files with. It must match the npm CI runs, which is the one bundled
// with Node, so a Node major can move it. Renovate doesn't offer updates
// to the pin, so this fails the Node major PR until someone raises it.
test("renovate.json constraints.npm matches the npm running the tests", (t) => {
  const agent = process.env.npm_config_user_agent ?? "";
  const running = agent.match(/\bnpm\/(\d+)\.\d+\.\d+/);
  if (!running) {
    t.skip("not run through npm");
    return;
  }

  const config = JSON.parse(
    readFileSync(new URL("../renovate.json", import.meta.url), "utf8"),
  );
  const pin = config.constraints?.npm ?? "";
  const pinMajor = pin.match(/\d+/)?.[0];

  assert.equal(
    pinMajor,
    running[1],
    `renovate.json has constraints.npm "${pin}", but the tests run npm ${running[0].slice(4)}. ` +
      `Set constraints.npm to "^${running[0].slice(4)}" in this pull request.`,
  );
});
