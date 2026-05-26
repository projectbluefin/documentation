const test = require("node:test");
const assert = require("node:assert/strict");

const { fetchRepo } = require("./fetch-github-repos.js");

test("fetchRepo returns the repo name stars and forks on success", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      full_name: "projectbluefin/documentation",
      stargazers_count: 123,
      forks_count: 45,
    }),
  });

  try {
    assert.deepEqual(await fetchRepo("projectbluefin/documentation"), {
      full_name: "projectbluefin/documentation",
      stargazers_count: 123,
      forks_count: 45,
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test("fetchRepo returns null when GitHub responds with an error", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 404,
    statusText: "Not Found",
  });

  try {
    assert.equal(await fetchRepo("projectbluefin/missing"), null);
  } finally {
    global.fetch = originalFetch;
  }
});
