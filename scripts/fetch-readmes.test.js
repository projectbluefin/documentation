import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  prepareReadme,
  fetchReadme,
  isSafeUrl,
  sanitizeHtmlFragment,
} from "./fetch-readmes.mjs";

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

test("raw HTML from the upstream README keeps only allowlisted tags and attributes", async () => {
  const input = [
    '<p align="center">',
    '  <a href="docs/guide.md" target="_blank" style="display: block" onclick="steal()">',
    "    <picture>",
    '      <source media="(prefers-color-scheme: dark)" srcset="https://example.com/dark.png 1x, https://example.com/dark@2x.png 2x">',
    '      <img src="./logo.png" alt="Logo" width="800" onerror="alert(1)">',
    "    </picture>",
    "  </a>",
    "</p>",
    "",
    '<script>alert("docs")</script>',
    "",
    '<iframe src="https://evil.example/"></iframe>',
    "",
    "<style>body{display:none}</style>",
    "",
    '<a href="javascript:alert(1)">bad</a> <a href="https://example.com/?a=1&b=2&amp;c=3">query</a>',
    "",
    '<img src="data:text/html;base64,PHNjcmlwdD4=">',
    "",
    "<details open><summary>More &amp; more</summary>Text with &nbsp; and 1 < 2</details>",
    "",
    "<custom-element><b>kept text</b></custom-element>",
    "",
    "<!-- comment -->",
  ].join("\n");
  const result = await prepareReadme(input, source);
  assert.match(result, /<p align="center">/);
  assert.match(
    result,
    /<a href="https:\/\/github.com\/projectbluefin\/server\/blob\/main\/docs\/guide.md" target="_blank">/,
  );
  assert.match(result, /<picture>/);
  assert.match(
    result,
    /<source media="\(prefers-color-scheme: dark\)" srcset="https:\/\/example.com\/dark.png 1x, https:\/\/example.com\/dark@2x.png 2x">/,
  );
  assert.match(
    result,
    /<img src="https:\/\/raw.githubusercontent.com\/projectbluefin\/server\/main\/logo.png" alt="Logo" width="800">/,
  );
  assert.match(result, /<\/picture>\s*<\/a>\s*<\/p>/);
  assert.doesNotMatch(
    result,
    /style=|onclick|onerror|<script|alert\(|<iframe|evil\.example|<style|display:none/,
  );
  assert.doesNotMatch(result, /javascript|data:text/);
  assert.match(
    result,
    /<a>bad<\/a> <a href="https:\/\/example.com\/\?a=1&amp;b=2&amp;c=3">query<\/a>/,
  );
  assert.match(result, /<img>/);
  assert.match(
    result,
    /<details open=""><summary>More &amp; more<\/summary>Text with &nbsp; and 1 &lt; 2<\/details>/,
  );
  assert.match(result, /<b>kept text<\/b>/);
  assert.doesNotMatch(result, /custom-element|<!--/);
});

test("inline HTML split by Markdown keeps its opening and closing tags paired", async () => {
  const result = await prepareReadme(
    'Install via <a href="https://example.com/install">this link</a> or <kbd>Ctrl</kbd>+<kbd>C</kbd>, never <script>evil()</script>.',
    source,
  );
  assert.match(
    result,
    /Install via <a href="https:\/\/example.com\/install">this link<\/a> or <kbd>Ctrl<\/kbd>\+<kbd>C<\/kbd>, never evil\(\)\./,
  );
  assert.doesNotMatch(result, /<script|<\/script/);
});

test("Markdown links and images only keep http, https and mailto destinations", async () => {
  const result = await prepareReadme(
    "[a](javascript:alert(1)) [b](mailto:team@example.com) ![c](data:image/svg+xml;base64,PHN2Zz4=) [d](#anchor) [e](https://example.com) [f][ref]\n\n[ref]: vbscript:msgbox",
    source,
  );
  assert.match(result, /\[a\]\(#\)/);
  assert.match(result, /\[b\]\(mailto:team@example.com\)/);
  assert.match(result, /!\[c\]\(#\)/);
  assert.match(result, /\[d\]\(#anchor\)/);
  assert.match(result, /\[e\]\(https:\/\/example.com\)/);
  assert.match(result, /\[ref\]: #/);
  assert.doesNotMatch(result, /javascript:|vbscript:|data:/);
});

test("URL checks see through entity, whitespace and case tricks", () => {
  for (const url of [
    "https://example.com/?a=1&b=2",
    "mailto:team@example.com",
    "docs/guide.md",
    "/absolute/path",
    "#anchor",
    "//cdn.example.com/x.png",
    "",
  ]) {
    assert.equal(isSafeUrl(url), true, url);
  }
  for (const url of [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    " java\tscript:alert(1)",
    "java&#115;cript:alert(1)",
    "java&#x73;cript:alert(1)",
    "java&#115cript:alert(1)",
    "javascript&colon;alert(1)",
    "&#106;avascript:alert(1)",
    "vbscript:msgbox",
    "data:text/html,<script>",
    "ftp://example.com/x",
    "https&unknownentity;://example.com",
  ]) {
    assert.equal(isSafeUrl(url), false, url);
  }
  assert.equal(
    sanitizeHtmlFragment('<a href="java&#115;cript:x" title="a&quot;b">'),
    '<a title="a&quot;b">',
  );
  assert.equal(
    sanitizeHtmlFragment(
      '<img srcset="x.png 1x, javascript:alert(1) 2x"><IMG SRC=x ONERROR=alert(1)>',
    ),
    '<img><img src="x">',
  );
  assert.equal(
    sanitizeHtmlFragment('<p title="x>y"><p title="x" <b>'),
    '<p title="x&gt;y">&lt;p title="x" <b>',
  );
  assert.equal(
    sanitizeHtmlFragment("<script>a</script><script>b<script>c</script>"),
    "",
  );
});
