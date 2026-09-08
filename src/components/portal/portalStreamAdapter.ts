export interface StreamVersionDetails {
  base?: string;
  gnome?: string;
  kernel?: string;
  hweKernel?: string;
  mesa?: string;
  nvidia?: string;
}

export interface StreamDefinition {
  id: "stable" | "lts";
  title: string;
  subtitle: string;
  description: string;
  image: string;
  supportedArch: ("x86" | "arm")[];
  recommended: boolean;
  available: boolean;
  unavailableReason?: string;
  versions?: StreamVersionDetails;
}

export interface ProductVersionRow {
  label: string;
  value: string;
}

export interface ProductEcosystemCardData {
  id: string;
  title: string;
  description?: string;
  href: string;
  image: string;
  isCenter?: boolean;
  versionRows: ProductVersionRow[];
}

export interface WolvesCampaignCardData {
  title: string;
  description?: string;
  href: string;
  image: string;
}

export interface ChooserCatalog {
  streams: {
    stable: StreamDefinition;
    lts: StreamDefinition;
  };
  ecosystem: ProductEcosystemCardData[];
  wolvesCampaign: WolvesCampaignCardData;
}

const PACKAGE_LABELS: Record<string, string> = {
  kernel: "Kernel",
  gnome: "GNOME",
  mesa: "Mesa",
  systemd: "systemd",
  pipewire: "PipeWire",
  bootc: "bootc",
  nvidia: "NVidia Driver",
};

const DAKOTA_KEYS = [
  "kernel",
  "systemd",
  "bootc",
  "mesa",
  "nvidia",
  "gnome",
  "pipewire",
];

interface RawImageStream {
  tag?: string;
  versions?: Record<string, string | null>;
}

interface RawProduct {
  id?: string;
  package?: string;
  streams?: RawImageStream[];
}

interface RawDriverLatest {
  versions?: Record<string, string | null>;
}

interface RawDriverStream {
  id?: string;
  latest?: RawDriverLatest;
}

function findProduct(raw: unknown, id: string): RawProduct | undefined {
  if (!raw || typeof raw !== "object" || !("products" in raw)) return undefined;
  const products = (raw as { products: unknown[] }).products;
  if (!Array.isArray(products)) return undefined;
  return products.find(
    (p): p is RawProduct =>
      typeof p === "object" && p !== null && (p as RawProduct).id === id,
  );
}

function findDriverStream(
  raw: unknown,
  id: string,
): RawDriverStream | undefined {
  if (!raw || typeof raw !== "object" || !("streams" in raw)) return undefined;
  const streams = (raw as { streams: unknown[] }).streams;
  if (!Array.isArray(streams)) return undefined;
  return streams.find(
    (s): s is RawDriverStream =>
      typeof s === "object" && s !== null && (s as RawDriverStream).id === id,
  );
}

function extractVersionDetails(
  product?: RawProduct,
  driverStream?: RawDriverStream,
): StreamVersionDetails | undefined {
  const imageVersions = product?.streams?.[0]?.versions;
  const driverVersions = driverStream?.latest?.versions;

  if (!imageVersions && !driverVersions) {
    return undefined;
  }

  const details: StreamVersionDetails = {};

  const gnome = driverVersions?.gnome ?? imageVersions?.gnome;
  if (gnome) details.gnome = gnome;

  const kernel = driverVersions?.kernel ?? imageVersions?.kernel;
  if (kernel) details.kernel = kernel;

  const hweKernel = driverVersions?.hweKernel;
  if (hweKernel) details.hweKernel = hweKernel;

  const mesa = driverVersions?.mesa ?? imageVersions?.mesa;
  if (mesa) details.mesa = mesa;

  const nvidia = driverVersions?.nvidia ?? imageVersions?.nvidia;
  if (nvidia) details.nvidia = nvidia;

  const fedora = imageVersions?.fedora;
  if (fedora) {
    details.base = `Fedora ${fedora.replace(/^F/, "")}`;
  }

  return Object.keys(details).length > 0 ? details : undefined;
}

function extractDakotaRows(
  product?: RawProduct,
  driverStream?: RawDriverStream,
): ProductVersionRow[] {
  const imageVersions = product?.streams?.[0]?.versions ?? {};
  const driverVersions = driverStream?.latest?.versions ?? {};
  const combined = { ...imageVersions, ...driverVersions };

  return DAKOTA_KEYS.filter((key) => combined[key]).map((key) => ({
    label: PACKAGE_LABELS[key] ?? key,
    value: String(combined[key]),
  }));
}

export function adaptStreams(
  imagesRaw: unknown,
  driverVersionsRaw: unknown,
): ChooserCatalog {
  const stableProduct = findProduct(imagesRaw, "projectbluefin-bluefin");
  const stableDriver = findDriverStream(driverVersionsRaw, "bluefin-stable");
  const stableVersions = extractVersionDetails(stableProduct, stableDriver);
  const stableAvailable = !!stableVersions;

  const ltsProduct = findProduct(imagesRaw, "projectbluefin-bluefin-lts");
  const ltsDriver = findDriverStream(driverVersionsRaw, "bluefin-lts");
  const ltsVersions = extractVersionDetails(ltsProduct, ltsDriver);
  const ltsAvailable = !!ltsVersions;

  const dakotaProduct = findProduct(imagesRaw, "projectbluefin-dakota");
  const dakotaDriver = findDriverStream(driverVersionsRaw, "dakota-latest");
  const dakotaRows = extractDakotaRows(dakotaProduct, dakotaDriver);

  return {
    streams: {
      stable: {
        id: "stable",
        title: "Bluefin",
        subtitle: "For Everyone",
        description:
          "A modern desktop at the leading edge. Pick this if you're not sure.",
        image: "/img/portal/characters/leaping.webp",
        supportedArch: ["x86"],
        recommended: true,
        available: stableAvailable,
        unavailableReason: stableAvailable ? undefined : "Will return",
        versions: stableVersions,
      },
      lts: {
        id: "lts",
        title: "Bluefin LTS",
        subtitle: "For professionals and AI/ML engineers",
        description:
          "A long term support experience on an enterprise-grade foundation.",
        image: "/img/portal/characters/achillobator.webp",
        supportedArch: ["x86", "arm"],
        recommended: false,
        available: ltsAvailable,
        unavailableReason: ltsAvailable ? undefined : "Will return",
        versions: ltsVersions,
      },
    },
    ecosystem: [
      {
        id: "dakota",
        title: "Dakota",
        description: "The Final Form. Bluefin Perfected.",
        href: "/dakota",
        image: "/img/portal/characters/dakota.webp",
        versionRows: dakotaRows,
      },
      {
        id: "server",
        title: "Bluefin Server",
        description: "The world's premier FSDK server operating system.",
        href: "/server",
        image: "/img/portal/characters/alamosaurus.webp",
        isCenter: true,
        versionRows: [],
      },
      {
        id: "utah",
        title: "Utah",
        description: "",
        href: "/utah",
        image: "/img/portal/characters/utah.webp",
        versionRows: [],
      },
    ],
    wolvesCampaign: {
      title: "Seven Days to the Wolves",
      description: undefined,
      href: "https://projectbluefin.io/wolves/",
      image: "/img/portal/wolves/Always%20There.webp",
    },
  };
}
