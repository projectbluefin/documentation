import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, extname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const STATIC_DIR = join(ROOT_DIR, "static");
const WORDMARK_PATH = join(STATIC_DIR, "img/bluefin-wordmark.svg");
const FONTSOURCE_DIR = join(ROOT_DIR, "node_modules/@fontsource/inter/files");

/**
 * 12 calendar months (01 through 12).
 * Project Bluefin Docs uses the official Night wallpaper variants for monthly rotation.
 */
export const BLUEFIN_MONTHLY_NIGHT_WALLPAPERS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((monthName, index) => {
  const month = String(index + 1).padStart(2, "0");
  const format = index === 10 ? "svg" : "jxl";
  return {
    file: `wallpapers/${month}-bluefin/${month}-bluefin-night.${format}`,
    monthIndex: index + 1,
    monthName,
    time: "Night",
  };
});

/**
 * Select the night wallpaper matching the calendar month (1-12 UTC).
 */
export function selectMonthlyWallpaper(
  pool = BLUEFIN_MONTHLY_NIGHT_WALLPAPERS,
  date = new Date(),
) {
  const monthIdx = date.getUTCMonth() + 1;
  const match = pool.find((w) => w.monthIndex === monthIdx);
  return match || pool[0];
}

/** Decode upstream PNG, SVG (November), or JPEG XL to PNG for Satori. */
export function wallpaperToPngBuffer(bytes, file) {
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return bytes;
  }
  if (extname(file) === ".svg") {
    return new Resvg(bytes, { fitTo: { mode: "width", value: 2400 } })
      .render()
      .asPng();
  }
  if (extname(file) !== ".jxl") {
    throw new Error(`Unsupported wallpaper format: ${file}`);
  }
  const directory = mkdtempSync(join(tmpdir(), "bluefin-wallpaper-"));
  try {
    const input = join(directory, "wallpaper.jxl");
    const output = join(directory, "wallpaper.png");
    writeFileSync(input, bytes);
    execFileSync("djxl", [input, output], { stdio: "pipe" });
    return readFileSync(output);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Always fetch main; the six-hour Pages schedule picks up upstream edits. */
export async function fetchWallpaper(wallpaper, fetchImpl = fetch) {
  const url = `https://raw.githubusercontent.com/projectbluefin/artwork/main/${wallpaper.file}`;
  const response = await fetchImpl(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch wallpaper ${url}: HTTP ${response.status}`,
    );
  }
  return wallpaperToPngBuffer(
    Buffer.from(await response.arrayBuffer()),
    wallpaper.file,
  );
}

/**
 * Shown when the rendered card cannot be re-encoded to WebP.
 */
export const MISSING_ENCODER_MESSAGE =
  "cwebp is not installed, so the WebP copy of the social preview card cannot be written";

/**
 * Encode a rendered PNG buffer as WebP.
 * Returns null when cwebp is unavailable so the caller can decide whether a
 * missing WebP copy is fatal — never write PNG bytes to a `.webp` path.
 */
export function pngToWebpBuffer(pngBuffer, quality = 90) {
  try {
    return execFileSync(
      "cwebp",
      ["-q", String(quality), "-o", "-", "--", "-"],
      {
        input: pngBuffer,
        maxBuffer: 50 * 1024 * 1024,
        stdio: ["pipe", "pipe", "ignore"],
      },
    );
  } catch {
    return null;
  }
}

/**
 * Generate vector paths for "Documentation" text using Inter Bold.
 */
export async function generateDocumentationPathsSvg(fontBoldBuffer) {
  const textSvg = await satori(
    {
      type: "span",
      props: {
        style: {
          display: "flex",
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: "48px",
          color: "#ffffff",
          letterSpacing: "-0.02em",
        },
        children: "Documentation",
      },
    },
    {
      width: 400,
      height: 100,
      fonts: [
        { name: "Inter", data: fontBoldBuffer, weight: 700, style: "normal" },
      ],
    },
  );

  const pathMatches = textSvg.match(/<path[^>]+>/g) || [];
  return pathMatches.filter((p) => p.includes('fill="#ffffff"')).join("");
}

/**
 * Build a unified SVG lockup where "bluefin" wordmark and "Documentation" text
 * share the identical coordinate system and baseline (y = 28.274 in wordmark viewBox).
 */
export async function buildUnifiedLockupSvg(rawWordmarkSvg, fontBoldBuffer) {
  const innerWordmarkPaths = rawWordmarkSvg
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>/, "");
  const docPath = await generateDocumentationPathsSvg(fontBoldBuffer);

  const scale = 0.36;
  const ty = 28.274 - 47.0 * scale;
  const tx = 104;
  const docPathsGroup = `<g transform="translate(${tx}, ${ty}) scale(${scale})">${docPath}</g>`;
  const totalWidth = tx + 348 * scale + 6;

  const filterDef = `<defs>
    <filter id="brand-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0.6" stdDeviation="0.8" flood-color="rgba(0, 0, 0, 0.95)" />
      <feDropShadow dx="0" dy="1.2" stdDeviation="3" flood-color="rgba(0, 0, 0, 0.85)" />
      <feDropShadow dx="0" dy="2.5" stdDeviation="6" flood-color="rgba(0, 0, 0, 0.75)" />
    </filter>
  </defs>`;

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="165" viewBox="0 0 ${totalWidth} 43.183">
    ${filterDef}
    <g filter="url(#brand-shadow)">
      ${innerWordmarkPaths}
      ${docPathsGroup}
    </g>
  </svg>`,
    width: Math.round((155 * totalWidth) / 43.183),
    height: 155,
  };
}

/**
 * Generate a 2400x1260 social preview image (PNG and WebP) using Satori and Resvg.
 */
export async function generateSocialCard({
  wallpaper,
  outputPathPng = join(STATIC_DIR, "img/meta.png"),
  outputPathWebp = join(STATIC_DIR, "img/meta.webp"),
  strict = false,
  loadWallpaper = fetchWallpaper,
  encodeWebp = pngToWebpBuffer,
} = {}) {
  const pngBuf = await loadWallpaper(wallpaper);
  const dataUrl = `data:image/png;base64,${pngBuf.toString("base64")}`;
  const rawWordmark = readFileSync(WORDMARK_PATH, "utf8");
  const fontBoldBuffer = readFileSync(
    join(FONTSOURCE_DIR, "inter-latin-700-normal.woff"),
  );

  const {
    svg: lockupSvg,
    width: lockupWidth,
    height: lockupHeight,
  } = await buildUnifiedLockupSvg(rawWordmark, fontBoldBuffer);
  const lockupDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(lockupSvg)}`;

  const element = {
    type: "div",
    props: {
      style: {
        width: "1200px",
        height: "630px",
        display: "flex",
        position: "relative",
        backgroundColor: "#080c14",
      },
      children: [
        {
          type: "img",
          props: {
            src: dataUrl,
            width: 1200,
            height: 630,
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: "1200px",
              height: "630px",
              objectFit: "cover",
            },
          },
        },
        {
          type: "img",
          props: {
            src: lockupDataUrl,
            width: lockupWidth,
            height: lockupHeight,
            style: {
              position: "absolute",
              bottom: "56px",
              left: "64px",
              width: `${lockupWidth}px`,
              height: `${lockupHeight}px`,
            },
          },
        },
      ],
    },
  };

  const satoriSvg = await satori(element, { width: 1200, height: 630 });
  const resvg = new Resvg(satoriSvg, { fitTo: { mode: "width", value: 2400 } });
  const renderedPng = resvg.render().asPng();

  mkdirSync(dirname(outputPathPng), { recursive: true });
  writeFileSync(outputPathPng, renderedPng);

  if (outputPathWebp) {
    const webpBuf = encodeWebp(renderedPng);
    if (webpBuf) {
      mkdirSync(dirname(outputPathWebp), { recursive: true });
      writeFileSync(outputPathWebp, webpBuf);
    } else if (strict) {
      throw new Error(MISSING_ENCODER_MESSAGE);
    } else {
      console.warn(
        `${MISSING_ENCODER_MESSAGE} — leaving the existing ${outputPathWebp} untouched.`,
      );
      return { png: outputPathPng, webp: null };
    }
  }

  return { png: outputPathPng, webp: outputPathWebp };
}

// CLI execution
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const monthArgIdx = args.indexOf("--month");
  // CI passes --strict so a missing converter fails the run loudly instead of
  // silently shipping last month's card.
  const strict = args.includes("--strict");
  let selected = null;

  if (monthArgIdx !== -1 && args[monthArgIdx + 1]) {
    const month = parseInt(args[monthArgIdx + 1], 10);
    selected = BLUEFIN_MONTHLY_NIGHT_WALLPAPERS.find(
      (w) => w.monthIndex === month,
    );
    if (!selected) {
      console.error(`Invalid month: ${args[monthArgIdx + 1]}`);
      process.exit(1);
    }
  } else {
    selected = selectMonthlyWallpaper();
  }

  console.log(
    `Generating social preview card using ${selected.file} (${selected.monthName} Night)...`,
  );

  let result;
  try {
    result = await generateSocialCard({ wallpaper: selected, strict });
  } catch (err) {
    console.error(`✗ ${err.message}`);
    console.error(
      "Install JPEG XL and WebP tools (`sudo apt-get install -y libjxl-tools webp`) and re-run.",
    );
    process.exit(1);
  }

  console.log(`✓ Generated ${result.png}`);
  if (result.webp) {
    console.log(`✓ Generated ${result.webp}`);
  }
}
