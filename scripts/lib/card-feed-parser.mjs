export function stripMd(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

export function splitMdRow(line) {
  return line.replace(/^\||\|$/g, "").split("|").map((s) => s.trim());
}

export function isMdSeparatorRow(cells) {
  return cells.every((c) => /^:?-+:?$/.test(c));
}

export function extractSectionsMd(content) {
  const sections = new Map();
  const lines = content.split(/\r?\n/);
  let heading = null;
  let rows = [];

  for (const line of lines) {
    const hm = line.match(/^###\s+(.*)/);
    if (hm) {
      if (heading !== null && rows.length > 0) sections.set(heading, rows);
      heading = stripMd(hm[1]);
      rows = [];
      continue;
    }
    if (heading !== null && line.startsWith("|")) {
      const cells = splitMdRow(line);
      if (!isMdSeparatorRow(cells)) rows.push(cells);
    }
  }
  if (heading !== null && rows.length > 0) sections.set(heading, rows);
  return sections;
}

export function parseTwoColTableMd(rows) {
  const results = [];
  for (const cells of rows) {
    if (cells.length < 2) continue;
    const name = stripMd(cells[0]);
    if (!name || name === "Name") continue;
    const raw = stripMd(cells[1]);
    const parts = raw.split(/\s*➡️?\s*/u).map((s) => s.trim());
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      results.push({ name, version: parts[parts.length - 1], prevVersion: parts[0] });
    } else {
      results.push({ name, version: raw, prevVersion: null });
    }
  }
  return results;
}

export function parseDiffRows(rows) {
  let added = 0;
  let changed = 0;
  let removed = 0;
  for (const cells of rows) {
    if (cells.length < 2) continue;
    const indicator = cells[0].trim();
    if (indicator.includes("✨") || indicator === "+") added++;
    else if (indicator.includes("🔄") || indicator === "~") changed++;
    else if (indicator.includes("❌") || indicator === "-") removed++;
  }
  return { added, changed, removed };
}

export function parseCommitRows(rows) {
  return rows.filter((cells) => cells.length >= 2 && cells[0] && cells[0] !== "Hash").length;
}

export function parseFeedItem(item, streamHint) {
  const content = item.content ?? "";
  const isMarkdown = /^\|[\s|:-]*---[\s|:-]*\|/m.test(content);
  if (!isMarkdown) return null;

  const sections = extractSectionsMd(content);
  const majorPackages = parseTwoColTableMd(sections.get("Major packages") ?? []);
  const dxPackages = parseTwoColTableMd(sections.get("Major DX packages") ?? []);
  const gdxPackages = parseTwoColTableMd(sections.get("Major GDX packages") ?? []);
  if (majorPackages.length === 0) return null;

  const diffStats = parseDiffRows(sections.get("All Images") ?? []);
  const commitCount = parseCommitRows(sections.get("Commits") ?? []);

  const fedoraMatch = item.title.match(/\(F(\d+)\./);
  const fedoraVersion = fedoraMatch ? fedoraMatch[1] : null;
  const centosMatch = item.title.match(/\(([a-z0-9]+s),\s*#/i);
  const centosVersion = centosMatch ? centosMatch[1] : null;

  const prefixMatch = item.title.match(/^([a-z]+-[\d.]+)/i);
  let tag = prefixMatch ? prefixMatch[1].toLowerCase() : streamHint;
  tag = tag.replace(/^lts\.(\d{8})$/, "lts-$1");

  const dateMs = new Date(item.pubDate).getTime();

  return {
    stream: streamHint,
    tag,
    fedoraVersion,
    centosVersion,
    majorPackages,
    dxPackages,
    gdxPackages,
    diffStats,
    commitCount,
    dateMs: Number.isNaN(dateMs) ? 0 : dateMs,
    link: item.link,
  };
}

export const CHIP_TO_SBOM = [
  { chipName: "kernel", displayName: "Kernel", field: "kernel" },
  { chipName: "gnome", displayName: "Gnome", field: "gnome" },
  { chipName: "mesa", displayName: "Mesa", field: "mesa" },
  { chipName: "podman", displayName: "Podman", field: "podman" },
  { chipName: "bootc", displayName: "bootc", field: "bootc" },
  { chipName: "systemd", displayName: "systemd", field: "systemd" },
  { chipName: "pipewire", displayName: "pipewire", field: "pipewire" },
  { chipName: "flatpak", displayName: "flatpak", field: "flatpak" },
];

export function sbomKeyForRelease(tag, stream) {
  const dateMatch = tag.match(/(\d{8})/);
  if (!dateMatch) return null;
  const date = dateMatch[1];
  if (stream === "lts") return { streamId: "bluefin-lts", cacheKey: `lts-${date}` };
  if (stream === "stable-daily") return { streamId: "bluefin-stable-daily", cacheKey: `stable-daily-${date}` };
  if (stream === "stable") return { streamId: "bluefin-stable", cacheKey: `stable-${date}` };
  return null;
}

export function enrichFromSbom(release, stream, sbomCache) {
  if (!sbomCache) return release;
  const key = sbomKeyForRelease(release.tag, stream);
  if (!key) return release;

  const packages = sbomCache?.streams?.[key.streamId]?.releases?.[key.cacheKey]?.packageVersions;
  if (!packages) return release;

  const sbomChipNames = new Set(CHIP_TO_SBOM.map(({ chipName }) => chipName));
  const nonSbomPackages = release.majorPackages.filter(
    (p) => !sbomChipNames.has(p.name.toLowerCase()),
  );
  const sbomPackages = [];

  for (const { chipName, displayName, field } of CHIP_TO_SBOM) {
    const sbomVersion = packages[field];
    const fromNotes = release.majorPackages.find((p) => p.name.toLowerCase() === chipName);
    const version = sbomVersion ?? fromNotes?.version ?? null;
    if (!version) continue;
    sbomPackages.push({
      name: displayName,
      version,
      prevVersion: fromNotes?.prevVersion ?? null,
    });
  }

  if (sbomPackages.length === 0) return release;
  return { ...release, majorPackages: [...sbomPackages, ...nonSbomPackages] };
}
