export interface BrandLink {
  readonly imageUrl: string;
  readonly projectUrl?: string;
  readonly altText: string;
}

export const VIDEO_METADATA = {
  title: "Bluefin Introduction",
  embedUrl: "https://www.youtube.com/embed/Nz-yyDwTfRM?autoplay=1",
  posterUrl: "https://img.youtube.com/vi/Nz-yyDwTfRM/hqdefault.jpg",
  posterAlt: "Bluefin Linux introduction",
} as const;

export const BAZAAR_METADATA = {
  tag: "Run your favorite",
  title: "Applications",
  flathubUrl: "https://flathub.org/",
  flathubLabel: "View apps on Flathub",
  screenshotSrc: "/img/bazaar.png",
  screenshotAlt: "Screenshot of Bluefin's Flatpak Store, Bazaar",
  iconSrc: "/img/bazaar.svg",
  iconAlt: "Bazaar's Icon",
} as const;

export const COMMUNITY_METADATA = {
  tag: "Our",
  title: "Community",
  docsCard: {
    title: "Documentation",
    description:
      "Looking for support? View our documentation site for up-to-date guides on installation, general use, and troubleshooting.",
    iconSrc: "/icons/docs.svg",
    iconAlt: "Bluefin Documentation",
    docsUrl: "https://docs.projectbluefin.io",
    discordUrl: "https://discord.gg/WYCpGEM4sM",
    discussionsUrl: "https://github.com/ublue-os/bluefin/discussions",
  },
} as const;

export const ALUMNI_COMPANIES: readonly BrandLink[] = [
  {
    imageUrl: "/brands/alumni/anchore.svg",
    projectUrl: "https://anchore.com/",
    altText: "Anchore",
  },
  {
    imageUrl: "/brands/alumni/aws.svg",
    projectUrl: "https://aws.amazon.com/",
    altText: "Amazon Web Services (AWS)",
  },
  {
    imageUrl: "/brands/alumni/canonical.svg",
    projectUrl: "https://canonical.com/",
    altText: "Canonical",
  },
  {
    imageUrl: "/brands/alumni/chainguard.webp",
    projectUrl: "https://www.chainguard.dev/",
    altText: "Chainguard",
  },
  {
    imageUrl: "/brands/alumni/cncf.svg",
    projectUrl: "https://www.cncf.io/",
    altText: "Cloud Native Computing Foundation (CNCF)",
  },
  {
    imageUrl: "/brands/alumni/intel.svg",
    projectUrl: "https://www.intel.com/",
    altText: "Intel",
  },
  {
    imageUrl: "/brands/alumni/microsoft.svg",
    projectUrl: "https://www.microsoft.com/",
    altText: "Microsoft",
  },
  {
    imageUrl: "/brands/alumni/redhat.svg",
    projectUrl: "https://www.redhat.com/",
    altText: "Red Hat",
  },
  {
    imageUrl: "/brands/alumni/vmware.svg",
    projectUrl: "https://www.vmware.com/",
    altText: "VMware",
  },
] as const;

export const SPONSORS: readonly BrandLink[] = [
  {
    imageUrl: "/brands/sponsors/cloudflare.svg",
    projectUrl: "https://www.cloudflare.com/",
    altText: "Cloudflare",
  },
] as const;

export const POWERED_BY_BRANDS: readonly BrandLink[] = [
  {
    imageUrl: "/brands/bootc.svg",
    projectUrl: "https://bootc-dev.github.io/",
    altText: "bootc",
  },
  {
    imageUrl: "/brands/podman.svg",
    projectUrl: "https://podman.io/",
    altText: "Podman",
  },
  {
    imageUrl: "/brands/docker.svg",
    projectUrl: "https://www.docker.com/",
    altText: "Docker",
  },
] as const;

export const UNIVERSAL_BLUE_BRAND: BrandLink = {
  imageUrl: "/brands/universal-blue.svg",
  projectUrl: "https://universal-blue.org",
  altText: "Universal Blue Logo",
} as const;

export function getCopyrightText(
  year: number = new Date().getUTCFullYear(),
): string {
  return `Copyright ${year} © Project Bluefin and Universal Blue`;
}
