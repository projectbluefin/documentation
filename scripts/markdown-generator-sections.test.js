/**
 * Unit coverage for the report-section builders exported by
 * scripts/lib/markdown-generator.mjs that scripts/report-markdown.test.js
 * never imports:
 *
 *   - generateBuildHealthSection  (empty-data guard, MoM badge branches,
 *                                  100% Club fallback, most-active lookup miss)
 *   - generateBotDetailsList      (MDX brace escaping, missing author fallback,
 *                                  zero-width-space mention guard)
 *   - generateCategorySectionWithSubsections (ChillOps branches, label vs.
 *                                  smart-category matching, Dakota grouping and
 *                                  displayedUrls de-duplication in formatItemList)
 *
 * These builders render the published monthly report, so a regression shows up
 * on the site rather than in CI.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("./lib/markdown-generator.mjs");

function item({
  number = 1,
  title = "A change",
  author = "octocat",
  repo = "projectbluefin/bluefin",
  labels = null,
  typename = "PullRequest",
  url = `https://github.com/${repo}/pull/${number}`,
} = {}) {
  return {
    content: {
      __typename: typename,
      number,
      title,
      url,
      repository: { nameWithOwner: repo },
      author: author === null ? null : { login: author },
      ...(labels
        ? { labels: { nodes: labels.map((name) => ({ name })) } }
        : {}),
    },
  };
}

describe("generateBuildHealthSection", () => {
  const startDate = new Date("2026-10-01T00:00:00Z");
  const endDate = new Date("2026-10-31T00:00:00Z");

  it("returns an empty string when there are no metrics at all", async () => {
    const { generateBuildHealthSection } = await load();
    assert.equal(generateBuildHealthSection(null, startDate, endDate), "");
    assert.equal(generateBuildHealthSection(undefined, startDate, endDate), "");
  });

  it("returns an empty string when images is missing or empty", async () => {
    const { generateBuildHealthSection } = await load();
    assert.equal(generateBuildHealthSection({}, startDate, endDate), "");
    assert.equal(
      generateBuildHealthSection({ images: [] }, startDate, endDate),
      "",
    );
  });

  it("renders successes and failures derived from successRate and totalBuilds", async () => {
    const { generateBuildHealthSection } = await load();
    const md = generateBuildHealthSection(
      {
        images: [
          {
            name: "bluefin",
            successRate: 75,
            totalBuilds: 40,
            momChange: null,
          },
        ],
        stats: {
          totalBuilds: 40,
          mostActive: "bluefin",
          perfectImages: [],
          avgDuration: 600,
        },
      },
      startDate,
      endDate,
    );

    // 75% of 40 => 30 successes, 10 failures.
    assert.match(md, /\| `bluefin` \| 75% \| 30 \| 10 \|/);
    assert.match(md, /^---\n\n## Build Health/);
  });

  it("renders a null momChange as the baseline marker, not a 0% badge", async () => {
    const { generateBuildHealthSection } = await load();
    const md = generateBuildHealthSection(
      {
        images: [
          { name: "aurora", successRate: 90, totalBuilds: 10, momChange: null },
        ],
        stats: {
          totalBuilds: 10,
          mostActive: "aurora",
          perfectImages: [],
          avgDuration: 0,
        },
      },
      startDate,
      endDate,
    );

    assert.match(md, /_Baseline_/);
    assert.doesNotMatch(md, /img\.shields\.io/);
  });

  it("renders a positive momChange as a success badge and a negative one as critical", async () => {
    const { generateBuildHealthSection } = await load();
    const md = generateBuildHealthSection(
      {
        images: [
          { name: "up", successRate: 100, totalBuilds: 5, momChange: 4 },
          { name: "down", successRate: 50, totalBuilds: 5, momChange: -7 },
        ],
        stats: {
          totalBuilds: 10,
          mostActive: "up",
          perfectImages: ["up"],
          avgDuration: 0,
        },
      },
      startDate,
      endDate,
    );

    assert.match(
      md,
      /!\[\+4%\]\(https:\/\/img\.shields\.io\/badge\/%2B4%25-success/,
    );
    // shields.io needs a literal dash doubled, so -7 must render as "--7%25".
    assert.match(
      md,
      /!\[-7%\]\(https:\/\/img\.shields\.io\/badge\/--7%25-critical/,
    );
    assert.doesNotMatch(md, /badge\/-7%25/);
  });

  it("treats a zero momChange as the non-negative branch", async () => {
    const { generateBuildHealthSection } = await load();
    const md = generateBuildHealthSection(
      {
        images: [
          { name: "flat", successRate: 100, totalBuilds: 3, momChange: 0 },
        ],
        stats: {
          totalBuilds: 3,
          mostActive: "flat",
          perfectImages: ["flat"],
          avgDuration: 0,
        },
      },
      startDate,
      endDate,
    );

    assert.match(md, /%2B0%25-success/);
    assert.doesNotMatch(md, /_Baseline_/);
  });

  it("renders the 100% Club members, or _None_ when there are none", async () => {
    const { generateBuildHealthSection } = await load();
    const base = {
      images: [
        { name: "a", successRate: 100, totalBuilds: 2, momChange: null },
        { name: "b", successRate: 100, totalBuilds: 2, momChange: null },
      ],
      stats: {
        totalBuilds: 4,
        mostActive: "a",
        perfectImages: ["a", "b"],
        avgDuration: 0,
      },
    };

    const withClub = generateBuildHealthSection(base, startDate, endDate);
    assert.match(withClub, /\| 💯 \*\*100% Club\*\* \| `a`, `b` \|/);

    const withoutClub = generateBuildHealthSection(
      { ...base, stats: { ...base.stats, perfectImages: [] } },
      startDate,
      endDate,
    );
    assert.match(withoutClub, /\| 💯 \*\*100% Club\*\* \| _None_ \|/);
  });

  it("falls back to 0 builds when mostActive names an image not in the list", async () => {
    const { generateBuildHealthSection } = await load();
    const md = generateBuildHealthSection(
      {
        images: [
          {
            name: "bluefin",
            successRate: 100,
            totalBuilds: 9,
            momChange: null,
          },
        ],
        stats: {
          totalBuilds: 9,
          mostActive: "retired-image",
          perfectImages: [],
          avgDuration: 0,
        },
      },
      startDate,
      endDate,
    );

    assert.match(md, /\*\*Most Active\*\* \| `retired-image` \(0 builds\)/);
  });

  it("rounds the average build duration from seconds to whole minutes", async () => {
    const { generateBuildHealthSection } = await load();
    const md = generateBuildHealthSection(
      {
        images: [
          {
            name: "bluefin",
            successRate: 100,
            totalBuilds: 1,
            momChange: null,
          },
        ],
        stats: {
          totalBuilds: 1,
          mostActive: "bluefin",
          perfectImages: [],
          // 800 s is 13m20s — rounds to 13 minutes.
          avgDuration: 800,
        },
      },
      startDate,
      endDate,
    );

    assert.match(md, /\*\*Avg Build Time\*\* \| 13 minutes/);
  });
});

describe("generateBotDetailsList", () => {
  it("flattens items across every bot activity entry", async () => {
    const { generateBotDetailsList } = await load();
    const md = generateBotDetailsList([
      {
        repo: "projectbluefin/bluefin",
        bot: "renovate",
        items: [item({ number: 1 })],
      },
      {
        repo: "projectbluefin/common",
        bot: "dependabot",
        items: [
          item({ number: 2, repo: "projectbluefin/common" }),
          item({ number: 3, repo: "projectbluefin/common" }),
        ],
      },
    ]);

    assert.match(md, /projectbluefin\/bluefin#1/);
    assert.match(md, /projectbluefin\/common#2/);
    assert.match(md, /projectbluefin\/common#3/);
    assert.match(md, /^<details>/);
    assert.match(md, /<\/details>$/);
  });

  it("escapes curly braces so MDX does not read the title as JSX", async () => {
    const { generateBotDetailsList } = await load();
    const md = generateBotDetailsList([
      {
        repo: "projectbluefin/bluefin",
        bot: "renovate",
        items: [item({ title: "bump {pkg} to {version}" })],
      },
    ]);

    assert.match(md, /bump \\\{pkg\\\} to \\\{version\\\}/);
    assert.doesNotMatch(md, /bump \{pkg\}/);
  });

  it("falls back to 'unknown' when the author is missing", async () => {
    const { generateBotDetailsList } = await load();
    const md = generateBotDetailsList([
      {
        repo: "projectbluefin/bluefin",
        bot: "renovate",
        items: [item({ author: null })],
      },
    ]);

    assert.match(md, /\[@\u200Bunknown\]\(https:\/\/github\.com\/unknown\)/);
  });

  it("prefixes every mention with a zero-width space so GitHub does not notify", async () => {
    const { generateBotDetailsList } = await load();
    const md = generateBotDetailsList([
      {
        repo: "projectbluefin/bluefin",
        bot: "renovate",
        items: [item({ author: "mergeraptor" })],
      },
    ]);

    assert.ok(md.includes("[@\u200Bmergeraptor]"));
    assert.ok(!md.includes("[@mergeraptor]"));
  });

  it("renders an empty details block when no bot produced any item", async () => {
    const { generateBotDetailsList } = await load();
    const md = generateBotDetailsList([
      { repo: "projectbluefin/bluefin", bot: "renovate", items: [] },
    ]);

    assert.match(md, /^<details>/);
    assert.match(md, /View bot activity details/);
  });
});

describe("generateCategorySectionWithSubsections", () => {
  it("collapses to ChillOps when neither list has a matching item", async () => {
    const { generateCategorySectionWithSubsections } = await load();
    const section = generateCategorySectionWithSubsections(
      [],
      [],
      "🐛 Bug Fixes",
      ["bug"],
      new Set(),
    );

    assert.equal(section, "> Status: _ChillOps_");
  });

  it("keeps both subsections, marking the empty one ChillOps", async () => {
    const { generateCategorySectionWithSubsections } = await load();
    const displayedUrls = new Set();
    const section = generateCategorySectionWithSubsections(
      [item({ number: 10, title: "Fix the thing", labels: ["bug"] })],
      [],
      "🐛 Bug Fixes",
      ["bug"],
      displayedUrls,
    );

    assert.match(section, /#### Planned Work\n\n- Fix the thing by/);
    assert.match(section, /#### Opportunistic Work\n\n> Status: _ChillOps_/);
  });

  it("matches on labels regardless of the category emoji prefix", async () => {
    const { generateCategorySectionWithSubsections } = await load();
    const section = generateCategorySectionWithSubsections(
      [],
      [item({ number: 11, title: "Opportunistic fix", labels: ["bug"] })],
      "🐛 Bug Fixes",
      ["bug"],
      new Set(),
    );

    assert.match(section, /#### Planned Work\n\n> Status: _ChillOps_/);
    assert.match(section, /#### Opportunistic Work\n\n- Opportunistic fix by/);
  });

  it("records every rendered url in displayedUrls", async () => {
    const { generateCategorySectionWithSubsections } = await load();
    const displayedUrls = new Set();
    generateCategorySectionWithSubsections(
      [item({ number: 12, url: "https://example.test/12", labels: ["bug"] })],
      [],
      "🐛 Bug Fixes",
      ["bug"],
      displayedUrls,
    );

    assert.ok(displayedUrls.has("https://example.test/12"));
  });

  it("does not render an item whose url was already displayed", async () => {
    const { generateCategorySectionWithSubsections } = await load();
    const displayedUrls = new Set(["https://example.test/13"]);
    const section = generateCategorySectionWithSubsections(
      [
        item({
          number: 13,
          title: "Already shown",
          url: "https://example.test/13",
          labels: ["bug"],
        }),
      ],
      [],
      "🐛 Bug Fixes",
      ["bug"],
      displayedUrls,
    );

    assert.doesNotMatch(section, /Already shown/);
    assert.equal(section, "> Status: _ChillOps_");
  });

  it("groups dakota items under their own subheading, after the other items", async () => {
    const { generateCategorySectionWithSubsections } = await load();
    const section = generateCategorySectionWithSubsections(
      [
        item({ number: 20, title: "Bluefin fix", labels: ["bug"] }),
        item({
          number: 21,
          title: "Dakota fix",
          repo: "projectbluefin/dakota",
          labels: ["bug"],
        }),
      ],
      [],
      "🐛 Bug Fixes",
      ["bug"],
      new Set(),
    );

    assert.match(section, /##### Dakota \(GNOME OS Prototype\)/);
    assert.ok(
      section.indexOf("Bluefin fix") <
        section.indexOf("##### Dakota (GNOME OS Prototype)"),
      "non-Dakota items must be listed before the Dakota subheading",
    );
    assert.ok(
      section.indexOf("##### Dakota (GNOME OS Prototype)") <
        section.indexOf("Dakota fix"),
    );
  });

  it("omits the Dakota subheading entirely when no dakota item is present", async () => {
    const { generateCategorySectionWithSubsections } = await load();
    const section = generateCategorySectionWithSubsections(
      [item({ number: 22, title: "Only bluefin", labels: ["bug"] })],
      [],
      "🐛 Bug Fixes",
      ["bug"],
      new Set(),
    );

    assert.doesNotMatch(section, /##### Dakota/);
  });

  it("escapes curly braces in item titles", async () => {
    const { generateCategorySectionWithSubsections } = await load();
    const section = generateCategorySectionWithSubsections(
      [item({ number: 23, title: "handle {x}", labels: ["bug"] })],
      [],
      "🐛 Bug Fixes",
      ["bug"],
      new Set(),
    );

    assert.match(section, /handle \\\{x\\\}/);
  });

  it("falls back to 'unknown' for an item with no author", async () => {
    const { generateCategorySectionWithSubsections } = await load();
    const section = generateCategorySectionWithSubsections(
      [item({ number: 24, author: null, labels: ["bug"] })],
      [],
      "🐛 Bug Fixes",
      ["bug"],
      new Set(),
    );

    assert.match(section, /\[@\u200Bunknown\]/);
  });

  it("ignores an item whose labels match no category and that smart categorization rejects", async () => {
    const { generateCategorySectionWithSubsections } = await load();
    const section = generateCategorySectionWithSubsections(
      [item({ number: 25, title: "Unrelated", labels: ["wontfix"] })],
      [],
      "🐛 Bug Fixes",
      ["bug"],
      new Set(),
    );

    assert.doesNotMatch(section, /Unrelated/);
  });
});
