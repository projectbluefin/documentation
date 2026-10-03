import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareReadme, fetchReadme } from "./fetch-readmes.mjs";

const source = {
  repo: "projectbluefin/server",
  ref: "main",
  readmePath: "README.md",
};

test("imported links and images resolve upstream without rewriting code examples", async () => {
  const input =
    '[Guide](docs/guide.md#install)\n\n![Logo](./logo.svg)\n\n[Reference][guide]\n\n[guide]: docs/guide.md "Guide"\n\n`[Example](docs/example.md)`\n\n```md\n[Example](docs/example.md)\n```\n\n<picture><source srcset="https://example.com/logo.svg"><img src="https://example.com/logo.svg"></picture>\n';
  const result = await prepareReadme(input, source);
  assert.match(
    result,
    /\[Guide\]\(https:\/\/github.com\/projectbluefin\/server\/blob\/main\/docs\/guide.md#install\)/,
  );
  assert.match(
    result,
    /!\[Logo\]\(https:\/\/raw.githubusercontent.com\/projectbluefin\/server\/main\/logo.svg\)/,
  );
  assert.match(
    result,
    /\[guide\]: https:\/\/github.com\/projectbluefin\/server\/blob\/main\/docs\/guide.md/,
  );
  assert.match(result, /`\[Example\]\(docs\/example.md\)`/);
  assert.match(result, /```md\n\[Example\]\(docs\/example.md\)\n```/);
  assert.match(
    result,
    /<picture><source srcset="https:\/\/example.com\/logo.svg"><img src="https:\/\/example.com\/logo.svg"><\/picture>/,
  );
  const rootLink = await prepareReadme("[Guide](/docs/guide.md)", source);
  assert.match(
    rootLink,
    /https:\/\/github.com\/projectbluefin\/server\/blob\/main\/docs\/guide.md/,
  );
});

test("a failed refresh preserves the offline seed rather than publishing an empty README", async () => {
  const directory = await mkdtemp(join(tmpdir(), "readme-import-"));
  const output = join(directory, "server-readme.md");
  try {
    await writeFile(output, "# Last successful README\n");
    await fetchReadme(
      { ...source, output },
      async () => new Response("outage", { status: 503 }),
    );
    assert.equal(await readFile(output, "utf8"), "# Last successful README\n");
    await fetchReadme({ ...source, output }, async () => new Response(""));
    assert.equal(await readFile(output, "utf8"), "# Last successful README\n");
    await fetchReadme(
      { ...source, output },
      async () => new Response("# Current README\n\n[Guide](docs/guide.md)"),
    );
    const refreshed = await readFile(output, "utf8");
    assert.match(refreshed, /# Current README/);
    assert.match(
      refreshed,
      /https:\/\/github.com\/projectbluefin\/server\/blob\/main\/docs\/guide.md/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
