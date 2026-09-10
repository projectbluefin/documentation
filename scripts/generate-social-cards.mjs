import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const STATIC_DIR = join(ROOT_DIR, "static");
const WALLPAPERS_DIR = join(STATIC_DIR, "img/wallpapers");
const WORDMARK_PATH = join(STATIC_DIR, "img/bluefin-wordmark.svg");
const FONTSOURCE_DIR = join(ROOT_DIR, "node_modules/@fontsource/inter/files");

/**
 * 12 calendar months (01 through 12).
 * Project Bluefin Docs uses the official Night wallpaper variants for monthly rotation.
 */
export const BLUEFIN_MONTHLY_NIGHT_WALLPAPERS = [
  {
    file: "bluefin-01-night.webp",
    monthIndex: 1,
    monthName: "January",
    time: "Night",
  },
  {
    file: "bluefin-02-night.webp",
    monthIndex: 2,
    monthName: "February",
    time: "Night",
  },
  {
    file: "bluefin-03-night.webp",
    monthIndex: 3,
    monthName: "March",
    time: "Night",
  },
  {
    file: "bluefin-04-night.webp",
    monthIndex: 4,
    monthName: "April",
    time: "Night",
  },
  {
    file: "bluefin-05-night.webp",
    monthIndex: 5,
    monthName: "May",
    time: "Night",
  },
  {
    file: "bluefin-06-night.webp",
    monthIndex: 6,
    monthName: "June",
    time: "Night",
  },
  {
    file: "bluefin-07-night.webp",
    monthIndex: 7,
    monthName: "July",
    time: "Night",
  },
  {
    file: "bluefin-08-night.webp",
    monthIndex: 8,
    monthName: "August",
    time: "Night",
  },
  {
    file: "bluefin-09-night.webp",
    monthIndex: 9,
    monthName: "September",
    time: "Night",
  },
  {
    file: "bluefin-10-night.webp",
    monthIndex: 10,
    monthName: "October",
    time: "Night",
  },
  {
    file: "bluefin-11-night.webp",
    monthIndex: 11,
    monthName: "November",
    time: "Night",
  },
  {
    file: "bluefin-12-night.webp",
    monthIndex: 12,
    monthName: "December",
    time: "Night",
  },
];

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

/**
 * Convert a WebP file to PNG buffer for Satori decoding.
 * Returns null if no external image conversion utility is installed.
 */
export function webpToPngBuffer(webpPath) {
  try {
    return execFileSync("dwebp", [webpPath, "-o", "-"], {
      maxBuffer: 50 * 1024 * 1024,
      stdio: ["pipe", "pipe", "ignore"],
    });
  } catch {
    try {
      return execFileSync(
        "ffmpeg",
        [
          "-v",
          "error",
          "-i",
          webpPath,
          "-f",
          "image2pipe",
          "-vcodec",
          "png",
          "-",
        ],
        { maxBuffer: 50 * 1024 * 1024, stdio: ["pipe", "pipe", "ignore"] },
      );
    } catch {
      return null;
    }
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
} = {}) {
  const wallpaperPath = join(WALLPAPERS_DIR, wallpaper.file);
  if (!existsSync(wallpaperPath)) {
    throw new Error(`Wallpaper file not found: ${wallpaperPath}`);
  }

  const pngBuf = webpToPngBuffer(wallpaperPath);
  if (!pngBuf) {
    console.warn(
      "Neither dwebp nor ffmpeg is installed — preserving existing social preview card.",
    );
    return { png: outputPathPng, webp: outputPathWebp, skipped: true };
  }
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
    mkdirSync(dirname(outputPathWebp), { recursive: true });
    try {
      const webpBuf = execFileSync(
        "cwebp",
        ["-q", "90", "-o", "-", "--", "-"],
        {
          input: renderedPng,
          maxBuffer: 50 * 1024 * 1024,
          stdio: ["pipe", "pipe", "ignore"],
        },
      );
      writeFileSync(outputPathWebp, webpBuf);
    } catch {
      writeFileSync(outputPathWebp, renderedPng);
    }
  }

  return { png: outputPathPng, webp: outputPathWebp };
}

// CLI execution
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const monthArgIdx = args.indexOf("--month");
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
  const result = await generateSocialCard({ wallpaper: selected });
  console.log(`✓ Generated ${result.png}`);
  if (result.webp) {
    console.log(`✓ Generated ${result.webp}`);
  }
}
