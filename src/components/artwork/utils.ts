import type { DayNightMode, Wallpaper } from "./types";

export function displayTitle(title: string | null): string {
  return title ?? "[ Redacted ]";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function cardLabel(collectionId: string, wallpaperId: string, title: string | null): string {
  if (collectionId === "bluefin-monthly") {
    const match = wallpaperId.match(/^bluefin-(\d{2})$/);
    if (match) {
      const month = parseInt(match[1], 10);
      if (month >= 1 && month <= 12) {
        const titlePart = title ?? "[ Redacted ]";
        return `${MONTH_NAMES[month - 1]} - ${titlePart}`;
      }
    }
  }
  return displayTitle(title);
}

export function getPreferredImageUrl(wallpaper: Wallpaper, mode: DayNightMode): string | null {
  if (mode === "night" && wallpaper.previewNightUrl) {
    return wallpaper.previewNightUrl;
  }
  if (wallpaper.previewUrl) {
    return wallpaper.previewUrl;
  }
  if (mode === "night") {
    return wallpaper.nightUrl ?? wallpaper.dayUrl;
  }
  return wallpaper.dayUrl ?? wallpaper.nightUrl;
}

export function getFullResolutionUrl(wallpaper: Wallpaper, mode: DayNightMode): string | null {
  if (mode === "night" && wallpaper.nightUrl) {
    return wallpaper.nightUrl;
  }
  return wallpaper.dayUrl ?? wallpaper.nightUrl;
}
