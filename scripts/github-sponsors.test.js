import { test } from "node:test";
import assert from "node:assert/strict";

import { GITHUB_SPONSORS, getSponsorUrl } from "./lib/github-sponsors.mjs";

test("getSponsorUrl builds the sponsors URL for a listed contributor", () => {
  assert.equal(
    getSponsorUrl("castrojo"),
    "https://github.com/sponsors/castrojo",
  );
});

test("getSponsorUrl returns null for an unlisted contributor", () => {
  assert.equal(getSponsorUrl("not-a-sponsor"), null);
});

test("getSponsorUrl is an exact, case-sensitive match", () => {
  // A case-insensitive match would render a sponsor button that 404s, since
  // the URL is built from the caller's spelling, not the list entry.
  assert.equal(getSponsorUrl("CastroJo"), null);
  assert.equal(getSponsorUrl("castrojo "), null);
});

test("getSponsorUrl tolerates empty and absent usernames", () => {
  assert.equal(getSponsorUrl(""), null);
  assert.equal(getSponsorUrl(undefined), null);
  assert.equal(getSponsorUrl(null), null);
});

test("getSponsorUrl does not inherit Set.prototype or Object.prototype keys", () => {
  for (const key of ["has", "add", "size", "toString", "constructor"]) {
    assert.equal(getSponsorUrl(key), null, `${key} must not be a sponsor`);
  }
});

test("every listed sponsor produces a URL", () => {
  for (const username of GITHUB_SPONSORS) {
    assert.equal(
      getSponsorUrl(username),
      `https://github.com/sponsors/${username}`,
    );
  }
});

test("the sponsor list holds plain, URL-safe GitHub usernames", () => {
  for (const username of GITHUB_SPONSORS) {
    assert.equal(typeof username, "string");
    assert.match(
      username,
      /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/,
      `${username} is not a valid GitHub username`,
    );
    assert.equal(encodeURIComponent(username), username);
  }
});

test("the sponsor list is a Set, so a duplicated entry cannot double-render", () => {
  assert.ok(GITHUB_SPONSORS instanceof Set);
});
