import test from "node:test";
import assert from "node:assert/strict";

import {
  LABEL_COLORS,
  LABEL_CATEGORIES,
  getCategoryForLabel,
  getCategoryFromTitle,
  getCategoryFromRepository,
  getCategoryForItem,
  generateBadge,
} from "./label-mapping.mjs";

// --- getCategoryForLabel ---

test("getCategoryForLabel returns Desktop for area/gnome", () => {
  assert.equal(getCategoryForLabel("area/gnome"), "Desktop");
});

test("getCategoryForLabel returns Desktop for area/aurora", () => {
  assert.equal(getCategoryForLabel("area/aurora"), "Desktop");
});

test("getCategoryForLabel returns Desktop for area/bling", () => {
  assert.equal(getCategoryForLabel("area/bling"), "Desktop");
});

test("getCategoryForLabel returns Development for area/dx", () => {
  assert.equal(getCategoryForLabel("area/dx"), "Development");
});

test("getCategoryForLabel returns Ecosystem for area/brew", () => {
  assert.equal(getCategoryForLabel("area/brew"), "Ecosystem");
});

test("getCategoryForLabel returns Ecosystem for area/flatpak", () => {
  assert.equal(getCategoryForLabel("area/flatpak"), "Ecosystem");
});

test("getCategoryForLabel returns Hardware for area/nvidia", () => {
  assert.equal(getCategoryForLabel("area/nvidia"), "Hardware");
});

test("getCategoryForLabel returns Hardware for aarch64", () => {
  assert.equal(getCategoryForLabel("aarch64"), "Hardware");
});

test("getCategoryForLabel returns Infrastructure for area/iso", () => {
  assert.equal(getCategoryForLabel("area/iso"), "Infrastructure");
});

test("getCategoryForLabel returns Automation for kind/github-action", () => {
  assert.equal(getCategoryForLabel("kind/github-action"), "Automation");
});

test("getCategoryForLabel returns Localization for kind/translation", () => {
  assert.equal(getCategoryForLabel("kind/translation"), "Localization");
});

test("getCategoryForLabel returns Other for unknown labels", () => {
  assert.equal(getCategoryForLabel("unknown-label"), "Other");
  assert.equal(getCategoryForLabel(""), "Other");
});

// --- getCategoryFromTitle ---

test("getCategoryFromTitle matches Localization patterns", () => {
  assert.equal(getCategoryFromTitle("Add French translation"), "Localization");
  assert.equal(getCategoryFromTitle("i18n support"), "Localization");
  assert.equal(getCategoryFromTitle("l10n: update Czech strings"), "Localization");
});

test("getCategoryFromTitle matches Documentation patterns", () => {
  assert.equal(getCategoryFromTitle("Update the docs"), "Documentation");
  assert.equal(getCategoryFromTitle("Fix README typo"), "Documentation");
  assert.equal(getCategoryFromTitle("New installation guide"), "Documentation");
});

test("getCategoryFromTitle matches Desktop patterns", () => {
  assert.equal(getCategoryFromTitle("Fix GNOME extension crash"), "Desktop");
  assert.equal(getCategoryFromTitle("Aurora theme update"), "Desktop");
  assert.equal(getCategoryFromTitle("Starship prompt config"), "Desktop");
  assert.equal(getCategoryFromTitle("Ghostty terminal settings"), "Desktop");
  assert.equal(getCategoryFromTitle("New wallpaper pack"), "Desktop");
  assert.equal(getCategoryFromTitle("Update fonts"), "Desktop");
});

test("getCategoryFromTitle matches Hardware patterns", () => {
  assert.equal(getCategoryFromTitle("Kernel 6.8 update"), "Hardware");
  assert.equal(getCategoryFromTitle("Nvidia driver fix"), "Hardware");
  assert.equal(getCategoryFromTitle("Add GPU acceleration"), "Hardware");
  assert.equal(getCategoryFromTitle("Firmware update for fwupd"), "Hardware");
});

test("getCategoryFromTitle matches Infrastructure patterns", () => {
  assert.equal(getCategoryFromTitle("Fix ISO build"), "Infrastructure");
  assert.equal(getCategoryFromTitle("CI pipeline improvements"), "Infrastructure");
  assert.equal(getCategoryFromTitle("Update justfile"), "Infrastructure");
  assert.equal(getCategoryFromTitle("OCI image tagging"), "Infrastructure");
  assert.equal(getCategoryFromTitle("bootc integration"), "Infrastructure");
});

test("getCategoryFromTitle matches Development patterns", () => {
  assert.equal(getCategoryFromTitle("VSCode settings"), "Development");
  assert.equal(getCategoryFromTitle("Docker dev container"), "Development");
  assert.equal(getCategoryFromTitle("QEMU VM setup"), "Development");
});

test("getCategoryFromTitle matches Ecosystem patterns", () => {
  assert.equal(getCategoryFromTitle("Flatpak permissions"), "Ecosystem");
  assert.equal(getCategoryFromTitle("Homebrew tap update"), "Ecosystem");
  assert.equal(getCategoryFromTitle("Distrobox setup"), "Ecosystem");
});

test("getCategoryFromTitle matches System Services patterns", () => {
  assert.equal(getCategoryFromTitle("systemd unit fix"), "System Services & Policies");
  assert.equal(getCategoryFromTitle("Tailscale integration"), "System Services & Policies");
  assert.equal(getCategoryFromTitle("SELinux policy update"), "System Services & Policies");
});

test("getCategoryFromTitle returns null for no match", () => {
  assert.equal(getCategoryFromTitle("Random title"), null);
  assert.equal(getCategoryFromTitle(""), null);
  assert.equal(getCategoryFromTitle(null), null);
  assert.equal(getCategoryFromTitle(undefined), null);
});

// --- getCategoryFromRepository ---

test("getCategoryFromRepository maps known repos", () => {
  assert.equal(getCategoryFromRepository("projectbluefin/documentation"), "Documentation");
  assert.equal(getCategoryFromRepository("projectbluefin/branding"), "Desktop");
  assert.equal(getCategoryFromRepository("projectbluefin/iso"), "Infrastructure");
  assert.equal(getCategoryFromRepository("ublue-os/bluefin"), "Infrastructure");
  assert.equal(getCategoryFromRepository("ublue-os/homebrew-tap"), "Ecosystem");
  assert.equal(getCategoryFromRepository("projectbluefin/finpilot"), "Development");
});

test("getCategoryFromRepository returns null for unknown repos", () => {
  assert.equal(getCategoryFromRepository("unknown/repo"), null);
  assert.equal(getCategoryFromRepository(""), null);
  assert.equal(getCategoryFromRepository(null), null);
  assert.equal(getCategoryFromRepository(undefined), null);
});

// --- getCategoryForItem ---

test("getCategoryForItem uses labels first (stage 1)", () => {
  const item = {
    content: {
      labels: { nodes: [{ name: "area/gnome" }] },
      title: "Kernel update",  // would match Hardware if labels missed
      repository: { nameWithOwner: "projectbluefin/iso" },  // would match Infrastructure
    },
  };
  assert.equal(getCategoryForItem(item), "Desktop");
});

test("getCategoryForItem falls back to title (stage 2)", () => {
  const item = {
    content: {
      labels: { nodes: [{ name: "random-label" }] },
      title: "Fix Nvidia driver crash",
      repository: { nameWithOwner: "projectbluefin/documentation" },
    },
  };
  assert.equal(getCategoryForItem(item), "Hardware");
});

test("getCategoryForItem falls back to repository (stage 3)", () => {
  const item = {
    content: {
      labels: { nodes: [{ name: "random-label" }] },
      title: "Random title",
      repository: { nameWithOwner: "projectbluefin/branding" },
    },
  };
  assert.equal(getCategoryForItem(item), "Desktop");
});

test("getCategoryForItem returns Other when nothing matches (stage 4)", () => {
  const item = {
    content: {
      labels: { nodes: [] },
      title: "Random title",
      repository: { nameWithOwner: "unknown/repo" },
    },
  };
  assert.equal(getCategoryForItem(item), "Other");
});

test("getCategoryForItem handles missing content gracefully", () => {
  assert.equal(getCategoryForItem({}), "Other");
  assert.equal(getCategoryForItem({ content: {} }), "Other");
  assert.equal(getCategoryForItem({ content: { labels: null } }), "Other");
});

test("getCategoryForItem handles missing labels.nodes", () => {
  const item = {
    content: {
      title: "Flatpak update",
    },
  };
  assert.equal(getCategoryForItem(item), "Ecosystem");
});

// --- generateBadge ---

test("generateBadge generates correct shields.io markdown for known labels", () => {
  const badge = generateBadge({ name: "area/gnome", color: "28A745", url: "https://github.com/labels/area%2Fgnome" });
  assert.match(badge, /img\.shields\.io\/badge/);
  assert.match(badge, /28A745/);
  assert.match(badge, /\[area\/gnome\]/);
});

test("generateBadge uses LABEL_COLORS mapping over provided color", () => {
  const badge = generateBadge({ name: "area/gnome", color: "FF0000", url: "https://example.com" });
  // Should use the mapped color 28A745, not the provided FF0000
  assert.match(badge, /28A745/);
});

test("generateBadge falls back to provided color when not in LABEL_COLORS", () => {
  const badge = generateBadge({ name: "custom-label", color: "AABBCC", url: "https://example.com" });
  assert.match(badge, /AABBCC/);
});

test("generateBadge returns empty string when no color available", () => {
  const badge = generateBadge({ name: "no-color-label", url: "https://example.com" });
  assert.equal(badge, "");
});

test("generateBadge encodes label name for shields.io URL", () => {
  const badge = generateBadge({ name: "good first issue", color: "7057FF", url: "https://example.com" });
  // Spaces become underscores in shields.io encoding
  assert.match(badge, /good_first_issue/);
});

// --- Data integrity ---

test("LABEL_COLORS values are 6-char hex strings", () => {
  for (const [name, color] of Object.entries(LABEL_COLORS)) {
    assert.match(color, /^[0-9A-Fa-f]{6}$/, `${name} has invalid color: ${color}`);
  }
});

test("LABEL_CATEGORIES references only labels that exist in LABEL_COLORS", () => {
  const colorKeys = new Set(Object.keys(LABEL_COLORS));
  for (const [category, labels] of Object.entries(LABEL_CATEGORIES)) {
    for (const label of labels) {
      assert.ok(colorKeys.has(label), `${category} references unknown label: ${label}`);
    }
  }
});
