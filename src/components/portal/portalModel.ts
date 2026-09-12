import React from "react";

export const PORTAL_BREAKPOINT_PX = 956;
export const MOBILE_LAYER_SRC = "/img/portal/mobile-parallax.webp";
export const TRANSITION_SRC = "/img/portal/layer-transition.webp";

export const PORTAL_CHARACTER_IMAGES = [
  "/img/characters/bluefin-small.webp",
  "/img/portal/characters/bluefin.webp",
  "/img/portal/characters/karl.webp",
  "/img/portal/characters/nest.webp",
] as const;

export const CHARACTER_IMAGES = PORTAL_CHARACTER_IMAGES;

export type PortalDrift = "left" | "right";

export type PortalLayer = {
  key: string;
  src: string;
  top: number;
  rate: number;
  drift?: PortalDrift;
  priority?: boolean;
};

export interface DeveloperBenefit {
  text: string;
  icon: string;
  alt: string;
}

export const DEVELOPER_BENEFITS: readonly DeveloperBenefit[] = [
  {
    text: "Visual Studio Code with devcontainers",
    icon: "/brands/vscode.svg",
    alt: "Visual Studio Code logo",
  },
  {
    text: "Work with your favorite Linux distributions with a container-focused terminal",
    icon: "/brands/ptyxis.svg",
    alt: "Ptyxis logo",
  },
  {
    text: "Designed for cloud native development with the CNCF's best tools, including Kubernetes",
    icon: "/brands/kubernetes.svg",
    alt: "Kubernetes logo",
  },
  {
    text: "Homebrew on-tap by default, same tools as your Mac",
    icon: "/brands/homebrew.svg",
    alt: "Homebrew logo",
  },
  {
    text: "Podman Desktop for graphical container management",
    icon: "/brands/podman-desktop.svg",
    alt: "Podman Desktop logo",
  },
  {
    text: "JetBrains IDEs one command away",
    icon: "/brands/jetbrains-icon.png",
    alt: "JetBrains logo",
  },
];

const evening = (file: string): string => `/img/portal/evening/${file}`;
const clouds = evening("BlueFinSite_2_Clouds-min.webp");

export const PORTAL_LAYERS: readonly PortalLayer[] = [
  {
    key: "sky",
    src: evening("BlueFinSite_1_Sky-min.webp"),
    top: 0,
    rate: 0,
    priority: true,
  },
  { key: "clouds-right", src: clouds, top: -60, rate: 0, drift: "right" },
  {
    key: "sun",
    src: evening("BlueFinSite_2_Sun-min.webp"),
    top: -90,
    rate: 0.05,
  },
  { key: "clouds-left", src: clouds, top: 0, rate: 0, drift: "left" },
  {
    key: "mountains",
    src: evening("BlueFinSite_4_Mountains-min.webp"),
    top: 0,
    rate: 0,
  },
  {
    key: "fog-a",
    src: evening("BlueFinSite_5_FogA-min.webp"),
    top: 0,
    rate: 0,
  },
  {
    key: "background-a",
    src: evening("BlueFinSite_6_BackgroundA-min.webp"),
    top: 165,
    rate: 0,
  },
  {
    key: "fog-b",
    src: evening("BlueFinSite_7_FogB-min.webp"),
    top: 200,
    rate: 0,
  },
  {
    key: "background-b",
    src: evening("BlueFinSite_8_BackgroundB-min.webp"),
    top: 175,
    rate: -0.01,
  },
  {
    key: "midground-a",
    src: evening("BlueFinSite_9_MidGroundA-min.webp"),
    top: 210,
    rate: -0.03,
  },
  {
    key: "midground-b",
    src: evening("BlueFinSite_10_MidgroundB-min.webp"),
    top: 250,
    rate: -0.05,
  },
  {
    key: "midground-c",
    src: evening("BlueFinSite_11_MidGroundC-min.webp"),
    top: 300,
    rate: -0.07,
  },
  {
    key: "foreground-a",
    src: evening("BlueFinSite_12_ForeGroundA-min.webp"),
    top: 320,
    rate: -0.09,
  },
  {
    key: "foreground-b",
    src: evening("BlueFinSite_13_ForegroundB-min.webp"),
    top: 340,
    rate: -0.11,
  },
  {
    key: "foreground-c",
    src: evening("BlueFinSite_14_ForegroundC-min.webp"),
    top: 360,
    rate: -0.13,
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export function overlayOpacity(
  scrollY: number,
  viewportHeight: number,
): number {
  return clamp((scrollY - viewportHeight * 0.25) / 650, 0, 1);
}

export function layerTransform(scrollY: number, rate: number): string {
  return `translate3d(0, ${scrollY * rate}px, 0)`;
}

export function isParallaxVisible(scrollY: number, sceneEnd: number): boolean {
  return scrollY <= sceneEnd;
}

export const HERO_RAPTOR_VARIANTS: readonly string[] = [
  "/img/portal/characters/header/achillobator.webp",
  "/img/portal/characters/header/angry.webp",
  "/img/portal/characters/header/bluefin-small.webp",
  "/img/portal/characters/header/dakota.webp",
  "/img/portal/characters/header/dolly.webp",
  "/img/portal/characters/header/intrigued.webp",
  "/img/portal/characters/header/karl.webp",
  "/img/portal/characters/header/katharina.webp",
  "/img/portal/characters/header/leaping.webp",
  "/img/portal/characters/header/marcoventator-tai.webp",
  "/img/portal/characters/header/roaring.webp",
  "/img/portal/characters/header/utah.webp",
];

export const HOLIDAY_RAPTOR_SRC =
  "/img/portal/characters/header/Holidaysaurus.webp";
export const PRIDE_RAPTOR_SRC = "/img/portal/characters/header/pride.webp";
export const DEFAULT_HERO_RAPTOR_SRC =
  "/img/portal/characters/header/bluefin-small.webp";

export function resolveHeroRaptor(
  date: Date = new Date(),
  random: () => number = Math.random,
): string {
  const month = date.getMonth();
  if (month === 11) {
    return HOLIDAY_RAPTOR_SRC;
  }
  if (month === 5) {
    return PRIDE_RAPTOR_SRC;
  }
  const index = Math.floor(random() * HERO_RAPTOR_VARIANTS.length);
  return HERO_RAPTOR_VARIANTS[index] ?? DEFAULT_HERO_RAPTOR_SRC;
}

export function useHeroRaptor(
  initialSrc: string = DEFAULT_HERO_RAPTOR_SRC,
  resolve: () => string = () => resolveHeroRaptor(),
): string {
  const [heroSrc, setHeroSrc] = React.useState<string>(initialSrc);

  React.useEffect(() => {
    setHeroSrc(resolve());
  }, [resolve]);

  return heroSrc;
}
