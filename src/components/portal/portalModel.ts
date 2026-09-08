export const PORTAL_BREAKPOINT_PX = 956;
export const MOBILE_LAYER_SRC = "/img/portal/mobile-parallax.webp";
export const TRANSITION_SRC = "/img/portal/layer-transition.webp";

export type PortalDrift = "left" | "right";

export type PortalLayer = {
  key: string;
  src: string;
  top: number;
  rate: number;
  drift?: PortalDrift;
  priority?: boolean;
};

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

export function isParallaxVisible(
  scrollY: number,
  sceneHeight: number,
): boolean {
  return scrollY <= sceneHeight;
}
