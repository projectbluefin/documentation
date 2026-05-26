const test = require("node:test");
const assert = require("node:assert/strict");

const {
  discoverUsernames,
  fetchProfile,
} = require("./fetch-github-profiles.js");

test("discoverUsernames returns unique GitHub usernames from repo sources", () => {
  const usernames = discoverUsernames();

  assert.ok(usernames.includes("castrojo"));
  assert.ok(usernames.includes("ahmedadan"));
  assert.equal(new Set(usernames).size, usernames.length);
});

test("fetchProfile maps GitHub user payloads to profile cards", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      login: "demo",
      name: "Demo User",
      avatar_url: "https://example.com/avatar.png",
      bio: "Bluefin contributor",
      html_url: "https://github.com/demo",
      public_repos: 7,
      followers: 42,
      company: "Project Bluefin",
    }),
  });

  try {
    const profile = await fetchProfile("demo");
    assert.deepEqual(profile, {
      login: "demo",
      name: "Demo User",
      avatar_url: "https://example.com/avatar.png",
      bio: "Bluefin contributor",
      html_url: "https://github.com/demo",
      public_repos: 7,
      followers: 42,
      company: "Project Bluefin",
      sponsorable: false,
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test("fetchProfile returns null when the API response is not ok", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 403,
    statusText: "Forbidden",
  });

  try {
    assert.equal(await fetchProfile("demo"), null);
  } finally {
    global.fetch = originalFetch;
  }
});
