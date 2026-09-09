import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LABEL_COLORS,
  LABEL_CATEGORIES,
  getCategoryForLabel,
  getCategoryFromTitle,
  getCategoryFromRepository,
  getCategoryForItem,
  generateBadge,
} from "./lib/label-mapping.mjs";

function item({ labels, title, repository } = {}) {
  const content = {};
  if (labels) content.labels = { nodes: labels.map((name) => ({ name })) };
  if (title !== undefined) content.title = title;
  if (repository) content.repository = { nameWithOwner: repository };
  return { content };
}

test("every categorized label maps back to exactly one category", () => {
  const seen = new Map();
  for (const [category, labels] of Object.entries(LABEL_CATEGORIES)) {
    for (const label of labels) {
      assert.equal(
        seen.has(label),
        false,
        `${label} appears in both ${seen.get(label)} and ${category}`,
      );
      seen.set(label, category);
      assert.equal(getCategoryForLabel(label), category);
    }
  }
});

test("an unknown label falls back to Other", () => {
  assert.equal(getCategoryForLabel("area/does-not-exist"), "Other");
  assert.equal(getCategoryForLabel(""), "Other");
});

test("label colors are bare six-digit hex without a leading hash", () => {
  for (const [name, color] of Object.entries(LABEL_COLORS)) {
    assert.match(color, /^[0-9A-Fa-f]{6}$/, `${name} has color ${color}`);
  }
});

test("title patterns categorize titles that carry no usable label", () => {
  assert.equal(getCategoryFromTitle("Add French translation"), "Localization");
  assert.equal(getCategoryFromTitle("Update the README"), "Documentation");
  assert.equal(getCategoryFromTitle("Fix GNOME nautilus menu"), "Desktop");
  assert.equal(getCategoryFromTitle("Bump nvidia driver"), "Hardware");
  assert.equal(
    getCategoryFromTitle("Rework bootc build pipeline"),
    "Infrastructure",
  );
  assert.equal(getCategoryFromTitle("Ship vscode devcontainer"), "Development");
  assert.equal(getCategoryFromTitle("Pin a flatpak from flathub"), "Ecosystem");
  assert.equal(
    getCategoryFromTitle("Harden the polkit policy"),
    "System Services & Policies",
  );
});

test("title matching is case insensitive", () => {
  assert.equal(getCategoryFromTitle("TRANSLATE the docs"), "Localization");
  assert.equal(getCategoryFromTitle("nVidIa firmware"), "Hardware");
});

test("a title with no pattern match and an empty title return null", () => {
  assert.equal(getCategoryFromTitle("Bump dependency xyzzy to 1.2.3"), null);
  assert.equal(getCategoryFromTitle(""), null);
  assert.equal(getCategoryFromTitle(undefined), null);
  assert.equal(getCategoryFromTitle(null), null);
});

test("Localization wins over Documentation when a title matches both", () => {
  assert.equal(
    getCategoryFromTitle("Translate the docs to Czech"),
    "Localization",
  );
});

test("repository fallback maps known repos and rejects unknown ones", () => {
  assert.equal(
    getCategoryFromRepository("projectbluefin/documentation"),
    "Documentation",
  );
  assert.equal(getCategoryFromRepository("ublue-os/artwork"), "Desktop");
  assert.equal(
    getCategoryFromRepository("projectbluefin/finpilot"),
    "Development",
  );
  assert.equal(getCategoryFromRepository("projectbluefin/not-a-repo"), null);
  assert.equal(getCategoryFromRepository(""), null);
  assert.equal(getCategoryFromRepository(undefined), null);
});

test("a known label outranks the title and the repository", () => {
  const categorized = getCategoryForItem(
    item({
      labels: ["kind/documentation"],
      title: "Fix nvidia firmware",
      repository: "projectbluefin/finpilot",
    }),
  );
  assert.equal(categorized, "Documentation");
});

test("an unknown label falls through to the title stage", () => {
  const categorized = getCategoryForItem(
    item({
      labels: ["priority/high"],
      title: "Fix nvidia firmware",
      repository: "projectbluefin/finpilot",
    }),
  );
  assert.equal(categorized, "Hardware");
});

test("an unmatched title falls through to the repository stage", () => {
  const categorized = getCategoryForItem(
    item({
      labels: ["priority/high"],
      title: "Bump dependency xyzzy to 1.2.3",
      repository: "projectbluefin/finpilot",
    }),
  );
  assert.equal(categorized, "Development");
});

test("an item that matches no stage lands in Other", () => {
  assert.equal(
    getCategoryForItem(
      item({
        labels: ["priority/high"],
        title: "Bump dependency xyzzy to 1.2.3",
        repository: "someone/elsewhere",
      }),
    ),
    "Other",
  );
});

test("categorization survives missing content, labels, and nodes", () => {
  assert.equal(getCategoryForItem({}), "Other");
  assert.equal(getCategoryForItem({ content: {} }), "Other");
  assert.equal(getCategoryForItem({ content: { labels: {} } }), "Other");
  assert.equal(
    getCategoryForItem({
      content: { labels: { nodes: [] }, title: "Fix gnome shell" },
    }),
    "Desktop",
  );
});

test("a badge prefers the mapped color over the GitHub-supplied color", () => {
  const badge = generateBadge({
    name: "area/gnome",
    color: "000000",
    url: "https://github.com/projectbluefin/common/labels/area%2Fgnome",
  });
  assert.match(badge, /-28A745\?style=flat-square/);
  assert.equal(badge.includes("-000000?"), false);
});

test("an unmapped label falls back to the GitHub-supplied color", () => {
  const badge = generateBadge({
    name: "priority/high",
    color: "B60205",
    url: "https://example.com/l",
  });
  assert.match(badge, /-B60205\?style=flat-square/);
});

test("a label with no color at all produces no badge", () => {
  assert.equal(
    generateBadge({ name: "priority/high", url: "https://example.com/l" }),
    "",
  );
  assert.equal(
    generateBadge({
      name: "priority/high",
      color: "",
      url: "https://example.com/l",
    }),
    "",
  );
});

test("badge encoding applies the Shields.io escape rules", () => {
  const badge = generateBadge({
    name: "good first issue",
    color: undefined,
    url: "https://github.com/o/r/labels/good%20first%20issue",
  });
  assert.match(badge, /badge\/good_first_issue-7057FF/);

  const underscored = generateBadge({
    name: "needs_triage",
    color: "111111",
    url: "https://example.com/l",
  });
  assert.match(underscored, /badge\/needs__triage-111111/);
});

test("a badge encodes the slash in an area label and links the label url", () => {
  const url = "https://github.com/projectbluefin/common/labels/kind%2Fbug";
  const badge = generateBadge({ name: "kind/bug", color: "ignored", url });
  assert.equal(
    badge,
    `[![kind/bug](https://img.shields.io/badge/kind%2Fbug-E8590C?style=flat-square)](${encodeURIComponent(url)})`,
  );
});
