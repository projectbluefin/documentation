#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { inflateSync } from "zlib";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { H, renderCard, W } from "./lib/card-template.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const TIMEZONE_ISO_8601 =
  /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

function fail(message) {
  throw new Error(`Invalid release card context: ${message}`);
}

function requiredString(value, path) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${path} must be a non-empty string`);
  }
  return value.trim();
}

function sha256(value, path) {
  const digest = requiredString(value, path);
  if (!/^sha256:[a-f0-9]{64}$/i.test(digest)) {
    fail(`${path} must be a sha256 digest`);
  }
  return digest;
}

function nonNegativeInteger(value, path) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(`${path} must be a non-negative integer`);
  }
  return value;
}

function validatePublishedAt(value) {
  const timestamp = requiredString(value, "published_at");
  const match = TIMEZONE_ISO_8601.exec(timestamp);
  if (!match) {
    fail("published_at must be a timezone-qualified ISO-8601 timestamp");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) {
    fail("published_at must be a valid calendar date");
  }
  return timestamp;
}

export function validateReleaseContext(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("must be a JSON object");
  }

  const product = requiredString(input.product, "product");
  if (!["bluefin", "dakota"].includes(product)) {
    fail("product must be bluefin or dakota");
  }

  const publishedAt = validatePublishedAt(input.published_at);

  if (
    !Array.isArray(input.components) ||
    input.components.length === 0 ||
    input.components.length > 12
  ) {
    fail("components must contain between one and twelve components");
  }
  if (!Array.isArray(input.variants) || input.variants.length === 0) {
    fail("variants must contain at least one variant");
  }
  if (!input.change_counts || typeof input.change_counts !== "object") {
    fail("change_counts must be an object");
  }

  const labels = new Set();
  const components = input.components.map((component, index) => {
    if (
      !component ||
      typeof component !== "object" ||
      Array.isArray(component)
    ) {
      fail(`components[${index}] must be an object`);
    }
    const label = requiredString(component.label, `components[${index}].label`);
    if (labels.has(label.toLowerCase())) {
      fail(`components[${index}].label must be unique`);
    }
    labels.add(label.toLowerCase());

    const previousVersion = component.previous_version;
    if (
      previousVersion !== null &&
      previousVersion !== undefined &&
      typeof previousVersion !== "string"
    ) {
      fail(`components[${index}].previous_version must be a string or null`);
    }

    return {
      label,
      version: requiredString(
        component.version,
        `components[${index}].version`,
      ),
      previous_version: previousVersion?.trim() || null,
    };
  });

  const variants = input.variants.map((variant, index) => {
    if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
      fail(`variants[${index}] must be an object`);
    }
    return {
      name: requiredString(variant.name, `variants[${index}].name`),
      digest: sha256(variant.digest, `variants[${index}].digest`),
    };
  });

  return {
    product,
    project_name: requiredString(input.project_name, "project_name"),
    tag: requiredString(input.tag, "tag"),
    published_at: publishedAt,
    primary_image: requiredString(input.primary_image, "primary_image"),
    primary_digest: sha256(input.primary_digest, "primary_digest"),
    badge_label: requiredString(input.badge_label, "badge_label"),
    components,
    change_counts: {
      updated: nonNegativeInteger(
        input.change_counts.updated,
        "change_counts.updated",
      ),
      added: nonNegativeInteger(
        input.change_counts.added,
        "change_counts.added",
      ),
      removed: nonNegativeInteger(
        input.change_counts.removed,
        "change_counts.removed",
      ),
    },
    variants,
  };
}

function loadAssets(root, product) {
  const fontDirectory = join(root, "node_modules/@fontsource/inter/files");
  const mascot = product === "dakota" ? "dakotaraptor" : "bluefin-small";
  const mascotBuffer = readFileSync(
    join(root, "static/img/characters", `${mascot}.png`),
  );

  return {
    fonts: [
      {
        name: "Inter",
        data: readFileSync(join(fontDirectory, "inter-latin-400-normal.woff")),
        weight: 400,
        style: "normal",
      },
      {
        name: "Inter",
        data: readFileSync(join(fontDirectory, "inter-latin-700-normal.woff")),
        weight: 700,
        style: "normal",
      },
    ],
    mascotDataUri: `data:image/png;base64,${mascotBuffer.toString("base64")}`,
  };
}

function templateRelease(context) {
  return {
    tag: context.tag,
    fedoraVersion: null,
    centosVersion: null,
    majorPackages: context.components.map((component) => ({
      name: component.label,
      version: component.version,
      prevVersion: component.previous_version,
    })),
    dxPackages: [],
    gdxPackages: [],
    diffStats: {
      changed: context.change_counts.updated,
      added: context.change_counts.added,
      removed: context.change_counts.removed,
    },
    commitCount: 0,
  };
}

function cardElement(context, theme, root) {
  const { fonts, mascotDataUri } = loadAssets(root, context.product);
  const stream = context.product === "dakota" ? "dakota" : "stable";
  return {
    element: renderCard(
      templateRelease(context),
      stream,
      Date.parse(context.published_at),
      theme,
      mascotDataUri,
      context.project_name,
      context.components.map((component) => component.label),
    ),
    fonts,
  };
}

export function createReleaseCardElement(input, theme, { root = ROOT } = {}) {
  const context = validateReleaseContext(input);
  return cardElement(context, theme, root).element;
}

async function renderTheme(context, theme, root) {
  const { element, fonts } = cardElement(context, theme, root);
  const svg = await satori(element, { width: W, height: H, fonts });
  const rendered = new Resvg(svg, {
    fitTo: { mode: "width", value: W * 2 },
  }).render();

  return {
    png: rendered.asPng(),
    width: rendered.width,
    height: rendered.height,
  };
}

function decodePng(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < PNG_SIGNATURE.length + 25) {
    throw new Error("PNG is truncated");
  }
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error("PNG signature is invalid");
  }

  let offset = PNG_SIGNATURE.length;
  let header;
  const idat = [];
  let sawEnd = false;
  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) throw new Error("PNG chunk is truncated");
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length)
      throw new Error("PNG chunk payload is truncated");
    const data = buffer.subarray(dataStart, dataEnd);
    if (type === "IHDR") {
      if (header || length !== 13) throw new Error("PNG header is invalid");
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      sawEnd = true;
      break;
    }
    offset = dataEnd + 4;
  }

  if (!header || !sawEnd || idat.length === 0)
    throw new Error("PNG is missing required chunks");
  if (
    header.width === 0 ||
    header.height === 0 ||
    header.bitDepth !== 8 ||
    ![2, 6].includes(header.colorType) ||
    header.compression !== 0 ||
    header.filter !== 0 ||
    header.interlace !== 0
  ) {
    throw new Error("PNG uses an unsupported encoding");
  }

  const bytesPerPixel = header.colorType === 6 ? 4 : 3;
  const stride = header.width * bytesPerPixel;
  const decoded = inflateSync(Buffer.concat(idat));
  if (decoded.length !== (stride + 1) * header.height) {
    throw new Error("PNG pixel data has an unexpected length");
  }

  const pixels = Buffer.alloc(stride * header.height);
  let sourceOffset = 0;
  for (let y = 0; y < header.height; y++) {
    const filter = decoded[sourceOffset++];
    const rowOffset = y * stride;
    const previousRowOffset = (y - 1) * stride;
    for (let x = 0; x < stride; x++) {
      const source = decoded[sourceOffset++];
      const left =
        x >= bytesPerPixel ? pixels[rowOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[previousRowOffset + x] : 0;
      const upLeft =
        y > 0 && x >= bytesPerPixel
          ? pixels[previousRowOffset + x - bytesPerPixel]
          : 0;
      let value;
      if (filter === 0) value = source;
      else if (filter === 1) value = source + left;
      else if (filter === 2) value = source + up;
      else if (filter === 3) value = source + Math.floor((left + up) / 2);
      else if (filter === 4) {
        const prediction = left + up - upLeft;
        const pa = Math.abs(prediction - left);
        const pb = Math.abs(prediction - up);
        const pc = Math.abs(prediction - upLeft);
        value = source + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
      } else {
        throw new Error("PNG uses an unsupported row filter");
      }
      pixels[rowOffset + x] = value & 0xff;
    }
  }

  return { ...header, pixels, bytesPerPixel };
}

export function validatePngBuffer(buffer) {
  const decoded = decodePng(buffer);
  if (decoded.width < W || decoded.height < H) {
    throw new Error(
      `PNG dimensions ${decoded.width}x${decoded.height} are smaller than ${W}x${H}`,
    );
  }
  if (buffer.length <= 68) {
    throw new Error("PNG is too small to be a release card");
  }
  let nonTransparentPixels = 0;
  if (decoded.colorType === 2) {
    nonTransparentPixels = decoded.width * decoded.height;
  } else {
    for (
      let index = 3;
      index < decoded.pixels.length;
      index += decoded.bytesPerPixel
    ) {
      if (decoded.pixels[index] !== 0) nonTransparentPixels++;
    }
  }
  if (nonTransparentPixels === 0) {
    throw new Error("PNG is fully transparent");
  }
  return { width: decoded.width, height: decoded.height, nonTransparentPixels };
}

export async function renderReleaseCards(
  input,
  outputDir,
  { root = ROOT } = {},
) {
  const context = validateReleaseContext(input);
  const resolvedOutputDir = resolve(outputDir);
  const lightPath = join(resolvedOutputDir, "release-card.png");
  const darkPath = join(resolvedOutputDir, "release-card-dark.png");

  mkdirSync(resolvedOutputDir, { recursive: true });
  const light = await renderTheme(context, "light", root);
  const dark = await renderTheme(context, "dark", root);
  validatePngBuffer(light.png);
  validatePngBuffer(dark.png);
  writeFileSync(lightPath, light.png);
  writeFileSync(darkPath, dark.png);

  return { lightPath, darkPath, width: light.width, height: light.height };
}

function parseArguments(args) {
  if (args.length !== 4)
    throw new Error(
      "Usage: render-release-card.mjs --context <file> --output-dir <directory>",
    );
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (
      !["--context", "--output-dir"].includes(option) ||
      !value ||
      values.has(option)
    ) {
      throw new Error(
        "Usage: render-release-card.mjs --context <file> --output-dir <directory>",
      );
    }
    values.set(option, value);
  }
  return {
    contextPath: values.get("--context"),
    outputDir: values.get("--output-dir"),
  };
}

async function main() {
  const { contextPath, outputDir } = parseArguments(process.argv.slice(2));
  let context;
  try {
    context = JSON.parse(readFileSync(contextPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Unable to read release context ${contextPath}: ${error.message}`,
    );
  }
  const result = await renderReleaseCards(context, outputDir);
  console.log(
    `Rendered ${result.lightPath} and ${result.darkPath} (${result.width}x${result.height})`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  });
}
