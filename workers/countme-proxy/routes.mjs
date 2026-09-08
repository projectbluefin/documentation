export const LEGACY_BLUEFIN_CHART_URL =
  "https://raw.githubusercontent.com/ublue-os/countme/main/growth_bluefins.svg";
export const PROJECTBLUEFIN_CHART_URL =
  "https://raw.githubusercontent.com/projectbluefin/countme/main/growth_bluefins.svg";

export const ROUTES = {
  "/": PROJECTBLUEFIN_CHART_URL,
  "/growth.svg": PROJECTBLUEFIN_CHART_URL,
  "/growth_bluefins.svg": LEGACY_BLUEFIN_CHART_URL,
  "/sources/ublue-os/bluefin/growth.svg": LEGACY_BLUEFIN_CHART_URL,
  "/sources/projectbluefin/bluefin/growth.svg": PROJECTBLUEFIN_CHART_URL,
  "/bluefin/growth.svg": PROJECTBLUEFIN_CHART_URL,
  "/bluefin-lts/growth.svg": PROJECTBLUEFIN_CHART_URL,
  "/dakota/growth.svg": PROJECTBLUEFIN_CHART_URL,
  "/utah/growth.svg": PROJECTBLUEFIN_CHART_URL,
  "/badge-endpoints/bluefin.json":
    "https://raw.githubusercontent.com/ublue-os/countme/main/badge-endpoints/bluefin.json",
  "/badge-endpoints/bluefin-lts.json":
    "https://raw.githubusercontent.com/ublue-os/countme/main/badge-endpoints/bluefin-lts.json",
  "/badge-endpoints/dakota.json":
    "https://raw.githubusercontent.com/projectbluefin/countme/main/badge-endpoints/dakota.json",
  "/badge-endpoints/utah.json":
    "https://raw.githubusercontent.com/projectbluefin/countme/main/badge-endpoints/utah.json",
};

export function normalizePathname(pathname) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function mapRequestPath(pathname) {
  return ROUTES[normalizePathname(pathname)] || null;
}

export function createPendingProjectbluefinSvg(variant = "bluefin") {
  const displayVariant =
    variant === "dakota"
      ? "Dakota"
      : variant === "utah"
        ? "Utah"
        : variant === "bluefin-lts"
          ? "Bluefin LTS"
          : "Bluefin";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-label="projectbluefin ${variant} countme pending">
  <rect width="1280" height="720" fill="#0d1117"/>
  <rect x="30" y="30" width="1220" height="660" rx="12" fill="#161b22" stroke="#30363d" stroke-width="2"/>
  <text x="70" y="140" fill="#c9d1d9" font-size="40" font-family="Inter, Segoe UI, Arial, sans-serif">projectbluefin/${variant} countme chart pending</text>
  <text x="70" y="210" fill="#8b949e" font-size="28" font-family="Inter, Segoe UI, Arial, sans-serif">${displayVariant} countme.projectbluefin.io configured, waiting for projectbluefin/countme artifacts</text>
  <line x1="70" y1="560" x2="1210" y2="360" stroke="#58a6ff" stroke-width="4" stroke-dasharray="12 10" opacity="0.75"/>
  <text x="70" y="620" fill="#8b949e" font-size="24" font-family="Inter, Segoe UI, Arial, sans-serif">Legacy data available at /sources/ublue-os/bluefin/growth.svg</text>
</svg>`;
}

export function isProjectBluefinPrimary(pathname) {
  const normalized = normalizePathname(pathname);
  return [
    "/",
    "/growth.svg",
    "/sources/projectbluefin/bluefin/growth.svg",
    "/bluefin/growth.svg",
    "/bluefin-lts/growth.svg",
    "/dakota/growth.svg",
    "/utah/growth.svg",
  ].includes(normalized);
}

export function resolveChartTarget(pathname) {
  const normalized = normalizePathname(pathname);

  if (
    normalized === "/" ||
    normalized === "/growth.svg" ||
    normalized.endsWith("/growth.svg")
  ) {
    return PROJECTBLUEFIN_CHART_URL;
  }

  return mapRequestPath(normalized);
}
