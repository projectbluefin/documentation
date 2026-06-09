/**
 * Unit tests for scripts/lib/markdown-generator.mjs
 *
 * Covers: generateReportMarkdown (frontmatter, summary, structure),
 * generateCategorySectionWithSubsections, generateCategorySection,
 * generateBotActivityTable, generateBotDetailsList, generateBuildHealthSection.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  generateReportMarkdown,
  generateCategorySectionWithSubsections,
  generateCategorySection,
  generateBotActivityTable,
  generateBotDetailsList,
  generateBuildHealthSection,
} from "./markdown-generator.mjs";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeItem({ title, number, url, author, labels = [], repo = "projectbluefin/bluefin", typename = "PullRequest" }) {
  return {
    content: {
      __typename: typename,
      title,
      number,
      url: url || `https://github.com/${repo}/pull/${number}`,
      author: { login: author },
      repository: { nameWithOwner: repo },
      labels: { nodes: labels.map((name) => ({ name, url: `https://github.com/${repo}/labels/${name}` })) },
    },
  };
}

const startDate = new Date("2026-05-01T00:00:00Z");
const endDate = new Date("2026-05-31T23:59:59Z");

// ---------------------------------------------------------------------------
// generateReportMarkdown
// ---------------------------------------------------------------------------

describe("generateReportMarkdown", () => {
  it("produces valid frontmatter with correct month title and slug", () => {
    const result = generateReportMarkdown([], [], [], [], [], startDate, endDate);

    assert.match(result, /^---\n/);
    assert.match(result, /title: "Megalosaurus May 2026"/);
    assert.match(result, /slug: \/2026\/05/);
    assert.match(result, /tags: \[monthly-report, project-activity\]/);
    assert.match(result, /import GitHubProfileCard/);
  });

  it("includes summary table with item counts", () => {
    const planned = [
      makeItem({ title: "Fix GNOME", number: 1, author: "dev1", labels: ["area/gnome"] }),
    ];
    const opportunistic = [
      makeItem({ title: "Update docs", number: 2, author: "dev2", labels: ["kind/documentation"] }),
    ];

    const result = generateReportMarkdown(planned, opportunistic, ["dev1", "dev2"], ["dev2"], [], startDate, endDate);

    assert.match(result, /\*\*Total Items\*\* \| 2 \(1 planned, 1 opportunistic\)/);
    assert.match(result, /\*\*Contributors\*\* \| 2 total, 1 new/);
  });

  it("shows 0% automation when no bot activity", () => {
    const result = generateReportMarkdown([], [], [], [], [], startDate, endDate);

    assert.match(result, /0\.0%/);
  });

  it("calculates correct automation percentage", () => {
    const planned = [
      makeItem({ title: "Human PR", number: 1, author: "dev1", labels: ["area/gnome"] }),
    ];
    const botActivity = [
      { repo: "projectbluefin/bluefin", bot: "renovate", count: 3, items: [] },
    ];

    const result = generateReportMarkdown(planned, [], ["dev1"], [], botActivity, startDate, endDate);

    // 3 bot PRs out of 4 total (1 human + 3 bot) = 75.0%
    assert.match(result, /75\.0%/);
  });

  it("uses January dinosaur title for month index 0", () => {
    const jan = new Date("2026-01-01T00:00:00Z");
    const janEnd = new Date("2026-01-31T23:59:59Z");
    const result = generateReportMarkdown([], [], [], [], [], jan, janEnd);

    assert.match(result, /Jurassic January 2026/);
  });
});

// ---------------------------------------------------------------------------
// generateCategorySectionWithSubsections
// ---------------------------------------------------------------------------

describe("generateCategorySectionWithSubsections", () => {
  it("returns ChillOps when both planned and opportunistic are empty", () => {
    const result = generateCategorySectionWithSubsections([], [], "Desktop", ["area/gnome"], new Set());

    assert.match(result, /ChillOps/);
  });

  it("separates planned and opportunistic work", () => {
    const planned = [
      makeItem({ title: "Planned fix", number: 10, author: "dev1", labels: ["area/gnome"] }),
    ];
    const opportunistic = [
      makeItem({ title: "Opportunistic fix", number: 11, author: "dev2", labels: ["area/gnome"] }),
    ];
    const displayed = new Set();

    const result = generateCategorySectionWithSubsections(planned, opportunistic, "Desktop", ["area/gnome"], displayed);

    assert.match(result, /#### Planned Work/);
    assert.match(result, /#### Opportunistic Work/);
    assert.match(result, /Planned fix/);
    assert.match(result, /Opportunistic fix/);
  });

  it("shows ChillOps for empty planned subsection", () => {
    const opportunistic = [
      makeItem({ title: "Opp fix", number: 11, author: "dev2", labels: ["area/gnome"] }),
    ];

    const result = generateCategorySectionWithSubsections([], opportunistic, "Desktop", ["area/gnome"], new Set());

    assert.match(result, /#### Planned Work\n\n> Status: _ChillOps_/);
    assert.match(result, /Opp fix/);
  });

  it("skips items already in displayedUrls", () => {
    const item = makeItem({ title: "Already shown", number: 5, author: "dev1", labels: ["area/gnome"] });
    const displayed = new Set([item.content.url]);

    const result = generateCategorySectionWithSubsections([item], [], "Desktop", ["area/gnome"], displayed);

    // Both empty → ChillOps
    assert.match(result, /ChillOps/);
  });
});

// ---------------------------------------------------------------------------
// generateCategorySection
// ---------------------------------------------------------------------------

describe("generateCategorySection", () => {
  it("returns ChillOps when no items match category labels", () => {
    const items = [
      makeItem({ title: "Unrelated", number: 1, author: "dev1", labels: ["kind/bug"] }),
    ];

    const result = generateCategorySection(items, "Desktop", ["area/gnome", "area/aurora"]);

    assert.match(result, /ChillOps/);
  });

  it("formats matching items in Hyperlight style", () => {
    const items = [
      makeItem({ title: "Add Ghostty support", number: 42, author: "dev1", labels: ["area/bling"], repo: "ublue-os/bluefin" }),
    ];

    const result = generateCategorySection(items, "Desktop", ["area/gnome", "area/aurora", "area/bling"]);

    assert.match(result, /Add Ghostty support/);
    assert.match(result, /@\u200Bdev1/); // zero-width space
    assert.match(result, /\[#42\]/);
  });

  it("escapes curly braces in titles for MDX safety", () => {
    const items = [
      makeItem({ title: "Update {config} values", number: 7, author: "dev1", labels: ["area/gnome"] }),
    ];

    const result = generateCategorySection(items, "Desktop", ["area/gnome"]);

    assert.match(result, /Update \\\{config\\\} values/);
  });
});

// ---------------------------------------------------------------------------
// generateBotActivityTable
// ---------------------------------------------------------------------------

describe("generateBotActivityTable", () => {
  it("generates a markdown table with repository aggregation", () => {
    const botActivity = [
      { repo: "ublue-os/bluefin", bot: "renovate", count: 5, items: [] },
      { repo: "ublue-os/bluefin", bot: "dependabot", count: 3, items: [] },
      { repo: "projectbluefin/documentation", bot: "renovate", count: 2, items: [] },
    ];
    const totalPRs = 20;

    const result = generateBotActivityTable(botActivity, totalPRs);

    assert.match(result, /Repository \| Bot PRs \| % of Total/);
    // bluefin: 5+3 = 8, 40.0%
    assert.match(result, /bluefin \| 8 \| 40\.0%/);
    // documentation: 2, 10.0%
    assert.match(result, /documentation \| 2 \| 10\.0%/);
  });

  it("sorts repos by count descending", () => {
    const botActivity = [
      { repo: "projectbluefin/documentation", bot: "renovate", count: 1, items: [] },
      { repo: "ublue-os/bluefin", bot: "renovate", count: 10, items: [] },
    ];

    const result = generateBotActivityTable(botActivity, 20);
    const lines = result.split("\n");

    // Header is lines 0-1, first data row should be bluefin (10 > 1)
    const firstDataRow = lines[2];
    assert.match(firstDataRow, /bluefin/);
  });
});

// ---------------------------------------------------------------------------
// generateBotDetailsList
// ---------------------------------------------------------------------------

describe("generateBotDetailsList", () => {
  it("generates collapsible details with item list", () => {
    const botActivity = [
      {
        repo: "ublue-os/bluefin",
        bot: "renovate",
        count: 1,
        items: [
          makeItem({ title: "chore(deps): update node", number: 100, author: "renovate[bot]", repo: "ublue-os/bluefin" }),
        ],
      },
    ];

    const result = generateBotDetailsList(botActivity);

    assert.match(result, /<details>/);
    assert.match(result, /<summary>View bot activity details<\/summary>/);
    assert.match(result, /chore\(deps\): update node/);
    assert.match(result, /renovate\[bot\]/);
    assert.match(result, /<\/details>/);
  });

  it("escapes curly braces in bot PR titles", () => {
    const botActivity = [
      {
        repo: "ublue-os/bluefin",
        bot: "renovate",
        count: 1,
        items: [
          makeItem({ title: "update {proxy} config", number: 200, author: "renovate[bot]", repo: "ublue-os/bluefin" }),
        ],
      },
    ];

    const result = generateBotDetailsList(botActivity);

    assert.match(result, /update \\\{proxy\\\} config/);
  });
});

// ---------------------------------------------------------------------------
// generateBuildHealthSection
// ---------------------------------------------------------------------------

describe("generateBuildHealthSection", () => {
  it("returns empty string when buildMetrics is null", () => {
    const result = generateBuildHealthSection(null, startDate, endDate);

    assert.equal(result, "");
  });

  it("returns empty string when images array is empty", () => {
    const result = generateBuildHealthSection({ images: [], stats: {} }, startDate, endDate);

    assert.equal(result, "");
  });

  it("generates table with success rate data", () => {
    const buildMetrics = {
      images: [
        { name: "bluefin", successRate: 95.0, totalBuilds: 20, momChange: 2.5 },
      ],
      stats: { avgDuration: 1800, totalBuilds: 20, perfectImages: ["bluefin-dx"] },
    };

    const result = generateBuildHealthSection(buildMetrics, startDate, endDate);

    assert.match(result, /Image \| Success Rate/);
    assert.match(result, /bluefin/);
  });
});
