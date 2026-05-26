import { basename, extname } from "path";

export function getTreePaths(tree) {
  return new Set(tree.filter((entry) => entry.type === "blob").map((entry) => entry.path));
}

export function getSubdirNames(tree, prefix) {
  const dirs = new Set();
  for (const entry of tree) {
    if (!entry.path.startsWith(prefix + "/")) continue;
    const rest = entry.path.slice(prefix.length + 1);
    const firstSegment = rest.split("/")[0];
    if (firstSegment) dirs.add(firstSegment);
  }
  return dirs;
}

function pickPreferredPath(paths, extensions) {
  return paths.find((candidate) =>
    extensions.some((extension) => candidate.toLowerCase().endsWith(extension)),
  );
}

export function findBluefinExtraDirectoryCandidates(tree, existingIds) {
  const SKIP_DIRS = new Set(["bluefin", "aurora", "bazzite", "bluefin-wallpapers-extra"]);
  const treePaths = [...getTreePaths(tree)];
  const candidates = [];

  for (const dirName of getSubdirNames(tree, "wallpapers")) {
    if (SKIP_DIRS.has(dirName) || existingIds.has(dirName)) continue;

    const dirFiles = treePaths.filter((path) => path.startsWith(`wallpapers/${dirName}/`));
    const srcPath =
      pickPreferredPath(dirFiles, [".jxl"]) ||
      pickPreferredPath(dirFiles, [".png"]) ||
      pickPreferredPath(dirFiles, [".jpg", ".jpeg"]) ||
      pickPreferredPath(dirFiles, [".svg"]);

    if (!srcPath) continue;

    candidates.push({
      id: dirName,
      outputName: `bluefin-${dirName}`,
      srcPath,
      ext: extname(srcPath).toLowerCase(),
    });
  }

  return candidates;
}

export function findBluefinExtraJxlCandidates(tree, existingIds) {
  const MONTHLY_JXL_RE = /^wallpapers\/bluefin\/images\/\d{2}-bluefin-(day|night)\.jxl$/i;
  const candidates = [];

  for (const path of getTreePaths(tree)) {
    if (!path.startsWith("wallpapers/bluefin/images/") || !path.endsWith(".jxl") || MONTHLY_JXL_RE.test(path)) {
      continue;
    }

    const id = basename(path, ".jxl");
    if (existingIds.has(id)) continue;

    candidates.push({
      id,
      jxlPath: path,
      outputName: `bluefin-${id}`,
    });
  }

  return candidates;
}

export function findBazziteCandidates(tree, existingIds, existingFilenames = new Set()) {
  const files = [...getTreePaths(tree)].filter((path) =>
    path.startsWith("wallpapers/bazzite/images/") && /\.(jpg|jpeg|png|jxl)$/i.test(path),
  );

  const byBase = new Map();
  for (const path of files) {
    const extension = extname(path).toLowerCase().slice(1);
    const base = basename(path, extname(path));
    if (!byBase.has(base)) byBase.set(base, {});
    byBase.get(base)[extension] = path;
  }

  const candidates = [];
  for (const [base, variants] of byBase) {
    const slug = base.toLowerCase().replace(/[\s_]+/g, "-");
    const id = `bazzite-${slug}`;

    if (existingIds.has(id)) continue;
    const alreadyCovered = [...Object.values(variants)].some((path) =>
      existingFilenames.has(basename(path).toLowerCase()),
    );
    if (alreadyCovered) continue;

    const primaryExt = variants.png
      ? "png"
      : variants.jpg
        ? "jpg"
        : variants.jpeg
          ? "jpg"
          : "jxl";
    const primaryPath = variants[primaryExt] ?? variants.jpeg ?? Object.values(variants)[0];

    candidates.push({
      id,
      base,
      outputName: id,
      primaryExt,
      primaryPath,
      jxlPath: variants.jxl ?? null,
    });
  }

  return candidates;
}
