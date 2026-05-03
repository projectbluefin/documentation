export interface ArtworkManifest {
  generatedAt: string;
  projects: {
    bluefin: ProjectData;
    bazzite: ProjectData;
    aurora: ProjectData;
  };
}

export interface ProjectData {
  label: string;
  sourceUrl: string;
  collections: WallpaperCollection[];
}

export interface WallpaperCollection {
  id: string;
  title: string;
  description: string;
  license: string;
  releaseUrl: string | null;
  hasDayNight: boolean;
  brewCask: string | null;
  wallpapers: Wallpaper[];
}

export interface Wallpaper {
  id: string;
  title: string | null;
  author: string | null;
  authorLicense: string | null;
  coAuthor?: string | null;
  coAuthorLink?: string | null;
  previewUrl: string | null;
  previewNightUrl: string | null;
  dayUrl: string | null;
  nightUrl: string | null;
  jxlUrl: string | null;
  primaryFormat: "png" | "jpg" | "svg" | "jxl" | null;
  hasLightbox: boolean;
}

export type Project = "bluefin" | "bazzite" | "aurora";
export type DayNightMode = "day" | "night";
