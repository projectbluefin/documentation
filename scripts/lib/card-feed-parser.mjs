export function stripMd(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

export function splitMdRow(line) {
  return line
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((s) => s.trim());
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
    const hm = line.match(/^#{2,3}\s+(.*)/);
    const sm = line.match(/^<summary>([^<]+)<\/summary>/i);
    if (hm || sm) {
      if (heading !== null && rows.length > 0) sections.set(heading, rows);
      heading = stripMd(hm ? hm[1] : sm[1]);
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

export function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .trim();
}

export function parseHtmlTableRows(tableHtml) {
  const rows = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(tableHtml)) !== null) {
    const rowInner = rowMatch[1];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowInner)) !== null) {
      cells.push(stripHtml(cellMatch[1]));
    }
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  return rows;
}

export function extractSectionsHtml(content) {
  const sections = new Map();
  const sectionRe =
    /<h[23][^>]*>([\s\S]*?)<\/h[23]>\s*(<table[\s\S]*?<\/table>)/gi;
  let m;
  while ((m = sectionRe.exec(content)) !== null) {
    const heading = stripHtml(m[1]);
    sections.set(heading, parseHtmlTableRows(m[2]));
  }
  const detailsRe =
    /<details[^>]*>[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>[\s\S]*?(<table[\s\S]*?<\/table>)[\s\S]*?<\/details>/gi;
  while ((m = detailsRe.exec(content)) !== null) {
    const summary = stripHtml(m[1]);
    sections.set(summary, parseHtmlTableRows(m[2]));
  }
  return sections;
}

export function parseTwoColTableMd(rows) {
  const results = [];
  for (const cells of rows) {
    if (cells.length < 2) continue;
    const name = stripMd(cells[0]);
    if (!name || name === "Name" || name === "Component") continue;
    const raw = stripMd(cells[1]);
    if (raw === "Version") continue;
    const parts = raw.split(/\s*➡️?\s*/u).map((s) => s.trim());
    let prevVersion = null;
    let version = raw;
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      version = parts[parts.length - 1];
      prevVersion = parts[0];
    } else if (cells.length >= 3) {
      const changeRaw = stripMd(cells[2]);
      const changeParts = changeRaw
        .split(/\s*(?:→|➡️)\s*/u)
        .map((s) => s.trim());
      if (changeParts.length >= 2 && changeParts[0]) {
        prevVersion = changeParts[0];
      }
    }
    results.push({ name, version, prevVersion });
  }
  return results;
}

export const parseTwoColTable = parseTwoColTableMd;

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
  return rows.filter(
    (cells) => cells.length >= 2 && cells[0] && cells[0] !== "Hash",
  ).length;
}

export function parseFeedItem(item, streamHint) {
  const content = item.content ?? "";
  const isMarkdown = /^\|[\s|:-]*---[\s|:-]*\|/m.test(content);
  const isHtml = /<table/i.test(content);
  if (!isMarkdown && !isHtml) return null;

  const sections = isMarkdown
    ? extractSectionsMd(content)
    : extractSectionsHtml(content);

  const majorPackages = parseTwoColTableMd(
    sections.get("Major packages") ?? sections.get("Key components") ?? [],
  );
  const dxPackages = parseTwoColTableMd(
    sections.get("Major DX packages") ?? [],
  );
  if (majorPackages.length === 0) return null;

  let diffStats = parseDiffRows(sections.get("All Images") ?? []);
  if (
    diffStats.added === 0 &&
    diffStats.changed === 0 &&
    diffStats.removed === 0
  ) {
    for (const [heading, rows] of sections.entries()) {
      if (/updated/i.test(heading)) {
        diffStats.changed += rows.filter(
          (r) => r.length >= 3 && r[0] !== "Package",
        ).length;
      } else if (/added/i.test(heading)) {
        diffStats.added += rows.filter(
          (r) => r.length >= 2 && r[0] !== "Package",
        ).length;
      } else if (/removed/i.test(heading)) {
        diffStats.removed += rows.filter(
          (r) => r.length >= 2 && r[0] !== "Package",
        ).length;
      }
    }
  }
  const commitCount = parseCommitRows(sections.get("Commits") ?? []);

  const fedoraMatch = item.title.match(/\(F(\d+)\./);
  const fedoraVersion = fedoraMatch ? fedoraMatch[1] : null;

  const prefixMatch = item.title.match(/^([a-z]+[-.][\d.]+)/i);
  let tag = prefixMatch ? prefixMatch[1].toLowerCase() : streamHint;
  tag = tag.replace(/^latest-(\d{8})$/, "stable-daily-$1");

  const dateMs = new Date(item.pubDate).getTime();

  return {
    stream: streamHint,
    tag,
    fedoraVersion,
    majorPackages,
    dxPackages,
    diffStats,
    commitCount,
    dateMs: Number.isNaN(dateMs) ? 0 : dateMs,
    link: item.link,
  };
}

export function extractFullDiffFromSections(sections) {
  const fullDiff = [];
  for (const heading of [
    "All Images",
    "Base Images",
    "Dev Experience Images",
  ]) {
    const rows = sections.get(heading);
    if (rows) {
      for (const row of rows) {
        if (row.length < 4 || row[1] === "Name") continue;
        const emoji = row[0].trim();
        let indicator = "changed";
        if (emoji.includes("✨") || emoji === "+") indicator = "added";
        else if (emoji.includes("❌") || emoji === "-") indicator = "removed";
        fullDiff.push({
          indicator,
          name: stripMd(row[1]),
          prevVersion: stripMd(row[2]) || null,
          newVersion: stripMd(row[3]) || null,
        });
      }
    }
  }
  for (const [heading, rows] of sections.entries()) {
    if (/updated/i.test(heading)) {
      for (const row of rows) {
        if (row.length < 3 || row[0] === "Package") continue;
        fullDiff.push({
          indicator: "changed",
          name: stripMd(row[0]),
          prevVersion: stripMd(row[1]) || null,
          newVersion: stripMd(row[2]) || null,
        });
      }
    } else if (/added/i.test(heading)) {
      for (const row of rows) {
        if (row.length < 2 || row[0] === "Package") continue;
        fullDiff.push({
          indicator: "added",
          name: stripMd(row[0]),
          prevVersion: null,
          newVersion: stripMd(row[1]) || null,
        });
      }
    } else if (/removed/i.test(heading)) {
      for (const row of rows) {
        if (row.length < 2 || row[0] === "Package") continue;
        fullDiff.push({
          indicator: "removed",
          name: stripMd(row[0]),
          prevVersion: stripMd(row[1]) || null,
          newVersion: null,
        });
      }
    }
  }
  return fullDiff;
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
  if (stream === "stable-daily")
    return {
      streamId: "bluefin-stable-daily",
      cacheKey: `stable-daily-${date}`,
    };
  if (stream === "stable")
    return { streamId: "bluefin-stable", cacheKey: `stable-${date}` };
  if (stream === "dakota")
    return { streamId: "dakota-stable", cacheKey: `stable-${date}` };
  return null;
}

export const DAKOTA_LINK = "https://github.com/projectbluefin/dakota";

/**
 * Build the Dakota release card data from release notes feed or SBOM cache.
 *
 * Mirrors getDakotaOsEvent() in src/components/FirehoseFeed.tsx.
 */
export function buildDakotaRelease(sbomCache, feedItem = null) {
  if (feedItem) {
    const parsed = parseFeedItem(feedItem, "dakota");
    if (parsed) {
      const content = feedItem.content ?? "";
      const isMarkdown = /^\|[\s|:-]*---[\s|:-]*\|/m.test(content);
      const sections = isMarkdown
        ? extractSectionsMd(content)
        : extractSectionsHtml(content);
      const fullDiff = extractFullDiffFromSections(sections);
      const enriched = enrichFromSbom(
        { ...parsed, fullDiff },
        "dakota",
        sbomCache,
      );
      const nvidiaReleases =
        sbomCache?.streams?.["dakota-nvidia-stable"]?.releases ?? {};
      const dateMatch = enriched.tag.match(/(\d{8})/);
      const date = dateMatch ? dateMatch[1] : null;
      const nvidiaVersion =
        (date && nvidiaReleases[`stable-${date}`]?.packageVersions?.nvidia) ||
        null;
      const hasNvidia = enriched.majorPackages.some(
        (p) => p.name.toLowerCase() === "nvidia",
      );
      if (nvidiaVersion && !hasNvidia) {
        enriched.majorPackages.push({
          name: "Nvidia",
          version: nvidiaVersion,
          prevVersion: null,
        });
      }
      return enriched;
    }
  }

  const releases = sbomCache?.streams?.["dakota-stable"]?.releases;
  if (!releases) return null;

  let latest = null;
  for (const [cacheKey, releaseData] of Object.entries(releases)) {
    const packages = releaseData?.packageVersions;
    if (!packages) continue;
    const dateMatch = cacheKey.match(/(\d{8})/);
    if (!dateMatch) continue;
    const date = dateMatch[1];
    const dateMs = Date.parse(
      `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00Z`,
    );
    if (Number.isNaN(dateMs)) continue;

    const majorPackages = [];
    for (const { displayName, field } of CHIP_TO_SBOM) {
      const version = packages[field];
      if (!version) continue;
      majorPackages.push({ name: displayName, version, prevVersion: null });
    }
    if (majorPackages.length === 0) continue;

    if (!latest || dateMs > latest.dateMs) {
      latest = { cacheKey, date, dateMs, majorPackages, packages };
    }
  }

  if (!latest) return null;

  // Overlay Nvidia strictly from the companion stream for the same release date
  const nvidiaReleases =
    sbomCache?.streams?.["dakota-nvidia-stable"]?.releases ?? {};
  const nvidiaVersion =
    nvidiaReleases[`stable-${latest.date}`]?.packageVersions?.nvidia ?? null;

  const majorPackages = nvidiaVersion
    ? [
        ...latest.majorPackages,
        { name: "Nvidia", version: nvidiaVersion, prevVersion: null },
      ]
    : latest.majorPackages;

  return {
    stream: "dakota",
    tag: latest.cacheKey,
    fedoraVersion: latest.packages.fedora
      ? String(latest.packages.fedora).replace(/^F/, "")
      : null,
    majorPackages,
    dxPackages: [],
    diffStats: { added: 0, changed: 0, removed: 0 },
    commitCount: 0,
    dateMs: latest.dateMs,
    link: DAKOTA_LINK,
  };
}

export function enrichFromSbom(release, stream, sbomCache) {
  if (!sbomCache) return release;
  const key = sbomKeyForRelease(release.tag, stream);
  if (!key) return release;

  const packages =
    sbomCache?.streams?.[key.streamId]?.releases?.[key.cacheKey]
      ?.packageVersions;
  if (!packages) return release;

  const sbomChipNames = new Set(CHIP_TO_SBOM.map(({ chipName }) => chipName));
  const nonSbomPackages = release.majorPackages.filter(
    (p) => !sbomChipNames.has(p.name.toLowerCase()),
  );
  const sbomPackages = [];

  for (const { chipName, displayName, field } of CHIP_TO_SBOM) {
    const sbomVersion = packages[field];
    const fromNotes = release.majorPackages.find(
      (p) => p.name.toLowerCase() === chipName,
    );
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
