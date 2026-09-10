import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const STATIC_DIR = path.join(ROOT_DIR, "static");
const WALLPAPERS_DIR = path.join(STATIC_DIR, "img/wallpapers");
const TEMPLATE_PATH = path.join(__dirname, "social-cards/template.html");
const WORDMARK_PATH = path.join(
  STATIC_DIR,
  "img/bluefin-documentation-wordmark.svg",
);

/**
 * Curated allowlist of first-party Bluefin monthly rotation wallpapers.
 * 12 months (01 through 12), Day and Night pairs.
 * Docs social preview cards default to Night wallpapers matching website's Day calendar.
 */
export const BLUEFIN_MONTHLY_WALLPAPERS = [
  {
    file: "bluefin-01-day.webp",
    title: "Bluefin 01 - January (Day)",
    month: "January",
    monthIndex: 1,
    time: "Day",
    category: "monthly",
  },
  {
    file: "bluefin-01-night.webp",
    title: "Bluefin 01 - January (Night)",
    month: "January",
    monthIndex: 1,
    time: "Night",
    category: "monthly",
  },
  {
    file: "bluefin-02-day.webp",
    title: "Bluefin 02 - February (Day)",
    month: "February",
    monthIndex: 2,
    time: "Day",
    category: "monthly",
  },
  {
    file: "bluefin-02-night.webp",
    title: "Bluefin 02 - February (Night)",
    month: "February",
    monthIndex: 2,
    time: "Night",
    category: "monthly",
  },
  {
    file: "bluefin-03-day.webp",
    title: "Bluefin 03 - March (Day)",
    month: "March",
    monthIndex: 3,
    time: "Day",
    category: "monthly",
  },
  {
    file: "bluefin-03-night.webp",
    title: "Bluefin 03 - March (Night)",
    month: "March",
    monthIndex: 3,
    time: "Night",
    category: "monthly",
  },
  {
    file: "bluefin-04-day.webp",
    title: "Bluefin 04 - April (Day)",
    month: "April",
    monthIndex: 4,
    time: "Day",
    category: "monthly",
  },
  {
    file: "bluefin-04-night.webp",
    title: "Bluefin 04 - April (Night)",
    month: "April",
    monthIndex: 4,
    time: "Night",
    category: "monthly",
  },
  {
    file: "bluefin-05-day.webp",
    title: "Bluefin 05 - May (Day)",
    month: "May",
    monthIndex: 5,
    time: "Day",
    category: "monthly",
  },
  {
    file: "bluefin-05-night.webp",
    title: "Bluefin 05 - May (Night)",
    month: "May",
    monthIndex: 5,
    time: "Night",
    category: "monthly",
  },
  {
    file: "bluefin-06-day.webp",
    title: "Bluefin 06 - June (Day)",
    month: "June",
    monthIndex: 6,
    time: "Day",
    category: "monthly",
  },
  {
    file: "bluefin-06-night.webp",
    title: "Bluefin 06 - June (Night)",
    month: "June",
    monthIndex: 6,
    time: "Night",
    category: "monthly",
  },
  {
    file: "bluefin-07-day.webp",
    title: "Bluefin 07 - July (Day)",
    month: "July",
    monthIndex: 7,
    time: "Day",
    category: "monthly",
  },
  {
    file: "bluefin-07-night.webp",
    title: "Bluefin 07 - July (Night)",
    month: "July",
    monthIndex: 7,
    time: "Night",
    category: "monthly",
  },
  {
    file: "bluefin-08-day.webp",
    title: "Bluefin 08 - August (Day)",
    month: "August",
    monthIndex: 8,
    time: "Day",
    category: "monthly",
  },
  {
    file: "bluefin-08-night.webp",
    title: "Bluefin 08 - August (Night)",
    month: "August",
    monthIndex: 8,
    time: "Night",
    category: "monthly",
  },
  {
    file: "bluefin-09-day.webp",
    title: "Bluefin 09 - September (Day)",
    month: "September",
    monthIndex: 9,
    time: "Day",
    category: "monthly",
  },
  {
    file: "bluefin-09-night.webp",
    title: "Bluefin 09 - September (Night)",
    month: "September",
    monthIndex: 9,
    time: "Night",
    category: "monthly",
  },
  {
    file: "bluefin-10-day.webp",
    title: "Bluefin 10 - October (Day)",
    month: "October",
    monthIndex: 10,
    time: "Day",
    category: "monthly",
  },
  {
    file: "bluefin-10-night.webp",
    title: "Bluefin 10 - October (Night)",
    month: "October",
    monthIndex: 10,
    time: "Night",
    category: "monthly",
  },
  {
    file: "bluefin-11-day.webp",
    title: "Bluefin 11 - November (Day)",
    month: "November",
    monthIndex: 11,
    time: "Day",
    category: "monthly",
  },
  {
    file: "bluefin-11-night.webp",
    title: "Bluefin 11 - November (Night)",
    month: "November",
    monthIndex: 11,
    time: "Night",
    category: "monthly",
  },
  {
    file: "bluefin-12-day.webp",
    title: "Bluefin 12 - December (Day)",
    month: "December",
    monthIndex: 12,
    time: "Day",
    category: "monthly",
  },
  {
    file: "bluefin-12-night.webp",
    title: "Bluefin 12 - December (Night)",
    month: "December",
    monthIndex: 12,
    time: "Night",
    category: "monthly",
  },
];

/**
 * Curated allowlist of first-party Bluefin extra wallpapers.
 * Official Wolves story illustrations.
 * Strict invariant: Aurora artwork and xe_* assets are permanently excluded.
 */
export const BLUEFIN_EXTRA_WALLPAPERS = [
  {
    file: "wolves/wolves/bluefin-chicken.webp",
    title: "Bluefin Extra - Chicken by Andy Frazer and Jacob Schnurr",
    category: "extra",
  },
  {
    file: "wolves/wolves/bluefin-duality-day.webp",
    title:
      "Bluefin Extra - Duality (Day) by Dr. Natalia Jagielska and Delphic Melody",
    category: "extra",
  },
  {
    file: "wolves/wolves/bluefin-duality-night.webp",
    title:
      "Bluefin Extra - Duality (Night) by Dr. Natalia Jagielska and Delphic Melody",
    category: "extra",
  },
  {
    file: "wolves/wolves/bluefin-dusk-day.webp",
    title: "Bluefin Extra - Dusk (Day) by Andy Frazer and Jacob Schnurr",
    category: "extra",
  },
  {
    file: "wolves/wolves/bluefin-dusk-night.webp",
    title: "Bluefin Extra - Dusk (Night) by Andy Frazer and Jacob Schnurr",
    category: "extra",
  },
  {
    file: "wolves/wolves/bluefin-eyes.webp",
    title: "Bluefin Extra - Eyes by Dr. Natalia Jagielska and Delphic Melody",
    category: "extra",
  },
  {
    file: "wolves/wolves/bluefin-huntress.webp",
    title: "Bluefin Extra - Huntress by Andy Frazer and Jacob Schnurr",
    category: "extra",
  },
  {
    file: "wolves/wolves/bluefin-lazy-days.webp",
    title: "Bluefin Extra - Lazy Days by Jay Balamurugan",
    category: "extra",
  },
  {
    file: "wolves/wolves/bluefin-prey-day.webp",
    title:
      "Bluefin Extra - Prey (Day) by Dr. Natalia Jagielska and Delphic Melody",
    category: "extra",
  },
  {
    file: "wolves/wolves/bluefin-prey-night.webp",
    title:
      "Bluefin Extra - Prey (Night) by Dr. Natalia Jagielska and Delphic Melody",
    category: "extra",
  },
  {
    file: "wolves/wolves/bluefin-tenacious-day.webp",
    title:
      "Bluefin Extra - Tenacious Pterosaur (Day) by Dr. Natalia Jagielska and Delphic Melody",
    category: "extra",
  },
  {
    file: "wolves/wolves/bluefin-tenacious-night.webp",
    title:
      "Bluefin Extra - Tenacious Pterosaur (Night) by Dr. Natalia Jagielska and Delphic Melody",
    category: "extra",
  },
];

/**
 * Returns the verified wallpaper pool, ensuring no Aurora or Xe assets exist.
 */
export function getAllowedWallpapers() {
  const all = [...BLUEFIN_MONTHLY_WALLPAPERS, ...BLUEFIN_EXTRA_WALLPAPERS];
  const excludedPattern = /aurora|xe_/i;
  return all.filter((item) => !excludedPattern.test(item.file));
}

/**
 * Calculates day of the year (1-366) in UTC.
 */
export function getDayOfYear(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = Number(date) - Number(start);
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Selects a wallpaper rotated deterministically by day-of-year across the pool.
 */
export function selectRotatingWallpaper(
  pool = getAllowedWallpapers(),
  date = new Date(),
) {
  if (!pool.length) {
    throw new Error("Wallpaper pool is empty");
  }
  const day = getDayOfYear(date);
  return pool[day % pool.length];
}

/**
 * Selects a wallpaper matching the calendar month.
 * Per specification: The website uses the day calendar and the docs use the matching nightly calendar.
 */
export function selectMonthlyWallpaper(
  pool = getAllowedWallpapers(),
  date = new Date(),
  preferredTime = "Night",
) {
  const monthIdx = date.getUTCMonth() + 1;
  const monthItems = pool.filter((w) => w.monthIndex === monthIdx);
  if (!monthItems.length) {
    return pool[0];
  }
  const matchedTime = monthItems.find((w) => w.time === preferredTime);
  return matchedTime || monthItems[0];
}

/**
 * Selects a random wallpaper from the allowed pool.
 */
export function selectRandomWallpaper(
  pool = getAllowedWallpapers(),
  randomFn = Math.random,
) {
  if (!pool.length) {
    throw new Error("Wallpaper pool is empty");
  }
  const index = Math.floor(randomFn() * pool.length);
  return pool[index];
}

/**
 * Converts a PNG image to WebP using cwebp or Python PIL fallback.
 */
export function convertPngToWebp(pngPath, webpPath, quality = 90) {
  try {
    execFileSync("cwebp", ["-q", String(quality), pngPath, "-o", webpPath], {
      stdio: "pipe",
    });
    return true;
  } catch {
    try {
      execFileSync(
        "python3",
        [
          "-c",
          `from PIL import Image; Image.open('${pngPath}').save('${webpPath}', 'WEBP', quality=${quality})`,
        ],
        { stdio: "pipe" },
      );
      return true;
    } catch (err) {
      console.warn("WebP conversion failed, keeping PNG:", err.message);
      fs.copyFileSync(pngPath, webpPath);
      return false;
    }
  }
}

/**
 * Generates an Open Graph social card image for a specific wallpaper.
 */
export async function generateSocialCard({
  wallpaper,
  outputPath = path.join(STATIC_DIR, "img/meta.png"),
  deviceScaleFactor = 2,
  browser = null,
}) {
  const prebuiltPath = path.join(
    STATIC_DIR,
    "cards",
    path.basename(wallpaper.file),
  );
  const shouldCloseBrowser = !browser;
  let activeBrowser = browser;

  if (!activeBrowser) {
    try {
      const { chromium } = await import("playwright");
      activeBrowser = await chromium.launch({ headless: true });
    } catch (err) {
      if (fs.existsSync(prebuiltPath)) {
        console.warn(
          `Playwright browser unavailable (${err.message.split("\n")[0]}); using pre-rendered card: ${prebuiltPath}`,
        );
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.copyFileSync(prebuiltPath, outputPath);
        return outputPath;
      }
      throw err;
    }
  }

  try {
    const wallpaperPath = path.join(WALLPAPERS_DIR, wallpaper.file);
    if (!fs.existsSync(wallpaperPath)) {
      throw new Error(`Wallpaper file not found: ${wallpaperPath}`);
    }

    const wallpaperBase64 = fs.readFileSync(wallpaperPath).toString("base64");
    const wallpaperDataUrl = `data:image/webp;base64,${wallpaperBase64}`;
    const wordmarkSvg = fs.readFileSync(WORDMARK_PATH, "utf8");

    let templateHtml = fs.readFileSync(TEMPLATE_PATH, "utf8");
    templateHtml = templateHtml
      .replace(
        '<div class="background" id="bg"></div>',
        `<div class="background" id="bg" style="background-image: url('${wallpaperDataUrl}')"></div>`,
      )
      .replace(
        '<div class="wordmark-wrap" id="wordmark"></div>',
        `<div class="wordmark-wrap" id="wordmark">${wordmarkSvg}</div>`,
      );

    const page = await activeBrowser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor,
    });

    await page.setContent(templateHtml, { waitUntil: "networkidle" });

    const tempPngPath = path.join(ROOT_DIR, ".tmp-social-card.png");
    await page.screenshot({ path: tempPngPath, type: "png" });
    await page.close();

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    if (outputPath.endsWith(".webp")) {
      convertPngToWebp(tempPngPath, outputPath, 90);
      try {
        fs.unlinkSync(tempPngPath);
      } catch {}
    } else {
      fs.copyFileSync(tempPngPath, outputPath);
      try {
        fs.unlinkSync(tempPngPath);
      } catch {}
    }

    return outputPath;
  } finally {
    if (shouldCloseBrowser && activeBrowser) {
      await activeBrowser.close();
    }
  }
}

// CLI execution
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  const args = process.argv.slice(2);
  const pool = getAllowedWallpapers();

  if (args.includes("--list")) {
    console.info(`Allowed Bluefin Wallpaper Pool (${pool.length} items):`);
    console.info("\n-- Monthly Wallpapers (24 items):");
    for (const item of pool.filter((w) => w.category === "monthly")) {
      console.info(` - ${item.file}: ${item.title}`);
    }
    console.info("\n-- Extra Wallpapers (12 items):");
    for (const item of pool.filter((w) => w.category === "extra")) {
      console.info(` - ${item.file}: ${item.title}`);
    }
    process.exit(0);
  }

  const wallpaperArgIdx = args.indexOf("--wallpaper");
  const monthArgIdx = args.indexOf("--month");
  const modeArgIdx = args.indexOf("--mode");
  const mode = modeArgIdx !== -1 ? args[modeArgIdx + 1] : "monthly";

  let selectedWallpaper = null;

  if (wallpaperArgIdx !== -1 && args[wallpaperArgIdx + 1]) {
    const targetFile = args[wallpaperArgIdx + 1];
    selectedWallpaper = pool.find(
      (w) => w.file === targetFile || path.basename(w.file) === targetFile,
    );
    if (!selectedWallpaper) {
      console.error(`Error: Wallpaper "${targetFile}" not in allowed pool`);
      process.exit(1);
    }
  } else if (monthArgIdx !== -1 && args[monthArgIdx + 1]) {
    const targetMonth = Number.parseInt(args[monthArgIdx + 1], 10);
    const monthItems = pool.filter((w) => w.monthIndex === targetMonth);
    if (!monthItems.length) {
      console.error(
        `Error: Invalid month index "${args[monthArgIdx + 1]}" (expected 1-12)`,
      );
      process.exit(1);
    }
    selectedWallpaper =
      monthItems.find((w) => w.time === "Night") || monthItems[0];
  } else if (mode === "daily") {
    selectedWallpaper = selectRotatingWallpaper(pool);
  } else if (mode === "random") {
    selectedWallpaper = selectRandomWallpaper(pool);
  } else {
    // Default: monthly rotation using the matching Night calendar
    selectedWallpaper = selectMonthlyWallpaper(pool, new Date(), "Night");
  }

  if (args.includes("--all")) {
    const outDir = path.join(STATIC_DIR, "cards");
    fs.mkdirSync(outDir, { recursive: true });
    console.info(
      `Generating cards for all ${pool.length} wallpapers into static/cards/...`,
    );

    import("playwright").then(async ({ chromium }) => {
      const browser = await chromium.launch({ headless: true });
      try {
        for (const item of pool) {
          const outName = path.basename(item.file);
          const outPath = path.join(outDir, outName);
          await generateSocialCard({
            wallpaper: item,
            outputPath: outPath,
            browser,
          });
          console.info(`  ✓ ${outName}`);
        }
        await generateSocialCard({
          wallpaper: selectedWallpaper,
          outputPath: path.join(STATIC_DIR, "img/meta.png"),
          browser,
        });
        console.info(
          `Selected ${selectedWallpaper.file} for static/img/meta.png (${selectedWallpaper.title})`,
        );
      } finally {
        await browser.close();
      }
    });
  } else {
    const outPath = path.join(STATIC_DIR, "img/meta.png");
    const prebuiltPath = path.join(
      STATIC_DIR,
      "cards",
      path.basename(selectedWallpaper.file),
    );

    if (fs.existsSync(prebuiltPath)) {
      console.info(
        `Selecting pre-rendered card ${path.basename(selectedWallpaper.file)} -> ${outPath}...`,
      );
      fs.copyFileSync(prebuiltPath, outPath);
      console.info(
        `Successfully updated ${outPath} (${selectedWallpaper.title})`,
      );
    } else {
      console.info(
        `Generating social preview card with ${selectedWallpaper.title} -> ${outPath}...`,
      );
      generateSocialCard({ wallpaper: selectedWallpaper, outputPath: outPath })
        .then(() => {
          console.info(
            `Successfully generated ${outPath} (${selectedWallpaper.title})`,
          );
        })
        .catch((err) => {
          console.error(`Generation error: ${err.message}`);
          process.exit(1);
        });
    }
  }
}
