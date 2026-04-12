/**
 * Unit tests for enrichFromSbom null-version fallback behavior.
 *
 * These tests use the logic from generate-card-images.mjs extracted as pure
 * functions. The same logic exists in FirehoseFeed.tsx — fix both files.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// Replicate the logic from generate-card-images.mjs / FirehoseFeed.tsx
// so we can unit-test it without importing ESM or TS files.

const CHIP_TO_SBOM = [
  { chipName: "kernel",   displayName: "Kernel",   field: "kernel" },
  { chipName: "gnome",    displayName: "Gnome",    field: "gnome" },
  { chipName: "mesa",     displayName: "Mesa",     field: "mesa" },
  { chipName: "podman",   displayName: "Podman",   field: "podman" },
  { chipName: "bootc",    displayName: "bootc",    field: "bootc" },
  { chipName: "systemd",  displayName: "systemd",  field: "systemd" },
  { chipName: "pipewire", displayName: "pipewire", field: "pipewire" },
  { chipName: "flatpak",  displayName: "flatpak",  field: "flatpak" },
];

/** Current (buggy) implementation — chip disappears when SBOM has null */
function enrichFromSbomBuggy(release, packages) {
  const sbomChipNames = new Set(CHIP_TO_SBOM.map(({ chipName }) => chipName));
  const nonSbomPackages = release.majorPackages.filter(
    (p) => !sbomChipNames.has(p.name.toLowerCase()),
  );
  const sbomPackages = [];
  for (const { chipName, displayName, field } of CHIP_TO_SBOM) {
    const version = packages[field];
    if (!version) continue; // BUG: drops chip when null; release notes fallback also excluded
    const fromNotes = release.majorPackages.find((p) => p.name.toLowerCase() === chipName);
    sbomPackages.push({ name: displayName, version, prevVersion: fromNotes?.prevVersion ?? null });
  }
  if (sbomPackages.length === 0) return release;
  return { ...release, majorPackages: [...sbomPackages, ...nonSbomPackages] };
}

/** Fixed implementation — falls back to release notes when SBOM has null */
function enrichFromSbomFixed(release, packages) {
  const sbomChipNames = new Set(CHIP_TO_SBOM.map(({ chipName }) => chipName));
  const nonSbomPackages = release.majorPackages.filter(
    (p) => !sbomChipNames.has(p.name.toLowerCase()),
  );
  const sbomPackages = [];
  for (const { chipName, displayName, field } of CHIP_TO_SBOM) {
    const sbomVersion = packages[field];
    const fromNotes = release.majorPackages.find((p) => p.name.toLowerCase() === chipName);
    const version = sbomVersion ?? fromNotes?.version ?? null;
    if (!version) continue; // neither SBOM nor release notes has this package
    sbomPackages.push({ name: displayName, version, prevVersion: fromNotes?.prevVersion ?? null });
  }
  if (sbomPackages.length === 0) return release;
  return { ...release, majorPackages: [...sbomPackages, ...nonSbomPackages] };
}

// Mock release with kernel + flatpak in release notes
const mockRelease = {
  tag: "stable-20260331",
  majorPackages: [
    { name: "Kernel", version: "6.17.0-200.fc41", prevVersion: null },
    { name: "Nvidia", version: "570.86", prevVersion: null },
    { name: "flatpak", version: "1.14.0", prevVersion: null },
  ],
};

// SBOM with kernel present but flatpak null
const partialSbomPackages = {
  kernel: "6.17.0-200.fc41.x86_64",
  gnome: "49.4-1.fc41",
  mesa: "25.0.3-1.fc41",
  podman: "5.5.0-1.fc41",
  bootc: "1.1.0-1.fc41",
  systemd: "257.2-1.fc41",
  pipewire: "1.2.0-1.fc41",
  flatpak: null,   // ← null: not found in SBOM RPM database
};

test("buggy: flatpak chip disappears when SBOM has null (documents the bug)", () => {
  const result = enrichFromSbomBuggy(mockRelease, partialSbomPackages);
  const flatpakChip = result.majorPackages.find((p) => p.name.toLowerCase() === "flatpak");
  // The buggy implementation drops flatpak: it's excluded from nonSbomPackages
  // (CHIP_TO_SBOM package) AND skipped from sbomPackages (null version).
  assert.equal(flatpakChip, undefined, "buggy implementation drops the flatpak chip when SBOM has null");
});

test("fixed: flatpak chip uses release notes fallback when SBOM has null", () => {
  const result = enrichFromSbomFixed(mockRelease, partialSbomPackages);
  const flatpakChip = result.majorPackages.find((p) => p.name.toLowerCase() === "flatpak");
  assert.ok(flatpakChip, "flatpak chip must be present with release notes fallback version");
  assert.equal(flatpakChip.version, "1.14.0", "fallback version must come from release notes");
});

test("fixed: SBOM version wins over release notes when both present", () => {
  const result = enrichFromSbomFixed(mockRelease, partialSbomPackages);
  const kernelChip = result.majorPackages.find((p) => p.name.toLowerCase() === "kernel");
  assert.ok(kernelChip, "kernel chip must be present");
  assert.equal(kernelChip.version, "6.17.0-200.fc41.x86_64", "SBOM version must win over release notes");
});

test("fixed: chip absent from both SBOM and release notes is still omitted", () => {
  const sbomWithNullGnome = { ...partialSbomPackages, gnome: null };
  const releaseWithoutGnome = {
    ...mockRelease,
    majorPackages: mockRelease.majorPackages.filter((p) => p.name.toLowerCase() !== "gnome"),
  };
  const result = enrichFromSbomFixed(releaseWithoutGnome, sbomWithNullGnome);
  const gnomeChip = result.majorPackages.find((p) => p.name.toLowerCase() === "gnome");
  assert.equal(gnomeChip, undefined, "gnome chip must be absent when neither SBOM nor notes has it");
});

test("fixed: non-SBOM chips (Nvidia) are preserved unchanged", () => {
  const result = enrichFromSbomFixed(mockRelease, partialSbomPackages);
  const nvidiaChip = result.majorPackages.find((p) => p.name.toLowerCase() === "nvidia");
  assert.ok(nvidiaChip, "Nvidia chip (non-SBOM) must be preserved");
  assert.equal(nvidiaChip.version, "570.86");
});
