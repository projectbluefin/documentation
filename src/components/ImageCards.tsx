import React from "react";
import Link from "@docusaurus/Link";
import Heading from "@theme/Heading";
import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";
import CodeBlock from "@theme/CodeBlock";
import staticImagesData from "@site/static/data/images.json";
import styles from "./ImageCards.module.css";

// Same column order on every card so versions line up for comparison.
const COMPONENTS = [
  ["gnome", "GNOME"],
  ["kernel", "Linux"],
  ["mesa", "Mesa"],
  ["systemd", "systemd"],
  ["bootc", "bootc"],
  ["podman", "Podman"],
] as const;

const ARCH_LOGO: Record<string, { src: string; alt: string }> = {
  amd: { src: "/img/gpu/amd.svg", alt: "AMD" },
  intel: { src: "/img/gpu/intel.svg", alt: "Intel" },
  nvidia: { src: "/img/gpu/nvidia.svg", alt: "NVIDIA" },
  arm: { src: "/img/gpu/arm.svg", alt: "ARM" },
};

type Versions = Partial<Record<(typeof COMPONENTS)[number][0], string | null>>;

interface StreamInfo {
  tag: string;
  command?: string | null;
  versions?: Versions | null;
}

type Source = "live" | "cache" | "unavailable";

interface Product {
  id: string;
  name: string;
  summary?: string;
  supportedArches?: string[] | null;
  downloads?: { display: string; source: Source } | null;
  packagePageUrl?: string;
  isoSectionLink?: string | null;
  streams: StreamInfo[];
  metadata?: {
    digest?: string | null;
    digestShort?: string | null;
    digestLink?: string | null;
    labels?: { ostreeCommit?: string | null } | null;
  } | null;
  metadataSource?: Source;
  versions?: { release?: { url?: string | null } | null } | null;
  security?: {
    cosignKeyUrl?: string | null;
    verifyCommand?: string | null;
    attestCommand?: string | null;
    hasAttestation?: boolean | null;
    sbomCommand?: string | null;
  } | null;
  lastPublishedAt?: string | null;
}

interface Catalog {
  generatedAt?: string;
  products: Product[];
  unavailable?: boolean;
  stateReason?: string;
}

interface Card {
  title: string;
  href: string;
  product?: string;
  art: string;
  alt: string;
  subheader: string;
  body: string;
  note?: string;
}

const IMAGES: Record<"preferred" | "other", Card[]> = {
  // Preferred defaults, shown above the divider on /images.
  preferred: [
    {
      title: "Bluefin",
      href: "/dakota",
      product: "projectbluefin-dakota",
      art: "/img/portal/characters/dakota.webp",
      alt: "Dakotaraptor",
      subheader: "The Final Form",
      body: "The next generation Linux workstation, designed for reliability, performance, and sustainability.",
      note: "Bluefin is a separate image track. Rebasing between Bluefin and Bluefin Classic is not supported.",
    },
    {
      title: "Bluefin Server",
      href: "/server",
      art: "/img/portal/characters/alamosaurus.webp",
      alt: "Alamosaurus",
      subheader: "The world's premier FSDK server operating system",
      body: "Brings the power of Kubernetes to your homelab in an easy to use web interface.",
    },
  ],
  other: [
    {
      title: "Bluefin Classic",
      // No /classic doc yet; onBrokenLinks: "throw" would fail the build.
      href: "https://github.com/ublue-os/bluefin",
      product: "ublue-bluefin",
      art: "/img/portal/characters/bluefin.webp",
      alt: "Deinonychus",
      subheader: "Fedora Silverblue for Ubuntu expatriates",
      body: "First generation Bluefin built on Fedora.",
    },
    {
      title: "Utahraptor",
      href: "/utah",
      product: "projectbluefin-utah",
      art: "/img/portal/characters/utah.webp",
      alt: "Utahraptor",
      subheader: "Bluefin built on Fedora Hummingbird",
      body: "Latest generation Bluefin built on Fedora Hummingbird.",
    },
    {
      title: "Bluefin LTS",
      href: "/lts",
      art: "/img/portal/characters/achillobator.webp",
      alt: "Achillobator",
      subheader: "Enterprise Grade Cadence",
      body: "Bluefin LTS provides long-term support for low churn environments.",
    },
  ],
};

// Stable stream when published, otherwise the image's only stream.
function compareStream(product?: Product) {
  const streams = product?.streams ?? [];
  const stream = streams.find((s) => s.tag === "stable") ?? streams[0];
  if (!stream?.versions) return null;
  return COMPONENTS.some(([key]) => stream.versions?.[key]) ? stream : null;
}

// Compares only the streams the cards display, so every column has a winner.
function newestPerComponent(products: Product[]) {
  const newest: Versions = {};
  for (const stream of products.map(compareStream)) {
    for (const [key] of COMPONENTS) {
      const value = stream?.versions?.[key];
      const best = newest[key];
      if (
        value &&
        (!best || value.localeCompare(best, undefined, { numeric: true }) > 0)
      ) {
        newest[key] = value;
      }
    }
  }
  return newest;
}

// One request shared by both card groups on the page.
let liveCatalog: Promise<Catalog> | undefined;
function fetchLiveCatalog() {
  liveCatalog ??= fetch("/data/images.json").then((response) => {
    if (!response.ok) {
      throw new Error(`request failed with status ${response.status}`);
    }
    return response.json();
  });
  return liveCatalog;
}

function sourceClass(source: Source) {
  if (source === "cache") return `${styles.statChip} ${styles.chipCache}`;
  if (source === "unavailable")
    return `${styles.statChip} ${styles.chipUnavailable}`;
  return styles.statChip;
}

function assetsLink(url?: string | null) {
  if (!url) return null;
  return url.endsWith("#assets") ? url : `${url}#assets`;
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ArchBadges({ arches }: { arches: string[] }) {
  return (
    <div className={styles.archBadges}>
      {arches.map((arch) => {
        const logo = ARCH_LOGO[arch];
        if (!logo) return null;
        return (
          <span key={arch} className={styles.archBadge} title={logo.alt}>
            <img
              src={logo.src}
              alt={logo.alt}
              className={styles.archBadgeLogo}
            />
            <span>{logo.alt}</span>
          </span>
        );
      })}
    </div>
  );
}

function ComparePills({
  stream,
  newest,
}: {
  stream: StreamInfo;
  newest: Versions;
}) {
  return (
    <ul className={styles.pills} aria-label="Component versions">
      {COMPONENTS.map(([key, label]) => {
        const value = stream.versions?.[key];
        const isNewest = !!value && value === newest[key];
        return (
          <li
            key={key}
            className={`${styles.pill} ${isNewest ? styles.pillNewest : ""} ${
              value ? "" : styles.pillEmpty
            }`}
            title={isNewest ? "Newest across Bluefin images" : ""}
          >
            <span className={styles.pillLabel}>{label}</span>
            <span className={styles.pillValue}>
              {value ?? "—"}
              {isNewest && <span className={styles.srOnly}> (newest)</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ProductDetails({
  product,
  generatedAt,
  note,
}: {
  product: Product;
  generatedAt?: string;
  note?: string;
}) {
  const digestShort = product.metadata?.digestShort || "Unavailable";
  const digestFull = product.metadata?.digest || null;
  const digestLink = product.metadata?.digestLink;
  const ostreeShort = product.metadata?.labels?.ostreeCommit?.slice(0, 12);
  const releaseUrl = assetsLink(product.versions?.release?.url);
  const hasPublishedImage = product.streams.some((entry) =>
    Boolean(entry.command),
  );

  return (
    <div className={styles.details}>
      <section className={styles.linkRow}>
        {product.packagePageUrl && (
          <Link
            to={product.packagePageUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Package Page
          </Link>
        )}
        {product.isoSectionLink && (
          <>
            <span>·</span>
            <Link to={product.isoSectionLink}>Download ISO</Link>
          </>
        )}
        {releaseUrl && (
          <>
            <span>·</span>
            <Link to={releaseUrl} target="_blank" rel="noopener noreferrer">
              Release Assets
            </Link>
          </>
        )}
        <span>·</span>
        {digestLink ? (
          <Link
            to={digestLink}
            target="_blank"
            rel="noopener noreferrer"
            title={digestFull || digestShort}
          >
            Digest {digestShort}
          </Link>
        ) : (
          <span>Digest {digestShort}</span>
        )}
        {ostreeShort && (
          <>
            <span>·</span>
            <span>OSTree {ostreeShort}</span>
          </>
        )}
      </section>

      {product.summary && <p className={styles.summary}>{product.summary}</p>}

      <div className={styles.statsRow}>
        {product.downloads && (
          <>
            <span className={styles.statChip}>
              <strong>Pulls:</strong> {product.downloads.display}
            </span>
            <span className={sourceClass(product.downloads.source)}>
              Downloads: {product.downloads.source}
            </span>
          </>
        )}
        {product.metadataSource && product.metadataSource !== "live" && (
          <span className={sourceClass(product.metadataSource)}>
            Metadata: {product.metadataSource}
          </span>
        )}
      </div>

      <p className={styles.validationMeta}>
        Last validated: <strong>{formatDate(generatedAt)}</strong> · Last
        published: <strong>{formatDate(product.lastPublishedAt)}</strong>
      </p>

      {note && (
        <div className="alert alert--info" role="note">
          {note}
        </div>
      )}

      <section
        className={`${styles.section} ${styles.focusSection} ${styles.securitySection}`}
      >
        <Heading as="h4" className={styles.sectionTitle}>
          Signing and SBOM
        </Heading>
        <p className={styles.securityText}>
          {product.security?.cosignKeyUrl ? (
            <>
              Key: <code>{product.security.cosignKeyUrl}</code>
            </>
          ) : (
            "No published cosign key URL in this catalog."
          )}
        </p>

        <Tabs
          groupId={`security-${product.id}`}
          values={[
            { label: "Verify Signature", value: "verify-signature" },
            { label: "Verify Provenance", value: "verify-provenance" },
            { label: "Inspect SBOM", value: "generate-sbom" },
          ]}
        >
          <TabItem value="verify-signature">
            <p className={styles.tabCopy}>
              Signature verification confirms this image was signed by the
              expected maintainers and helps detect tampering before deployment.{" "}
              <Link
                to="https://docs.sigstore.dev/cosign/verifying/verify/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more
              </Link>
              .
            </p>
            {product.security?.verifyCommand ? (
              <>
                <CodeBlock language="bash">
                  {product.security.verifyCommand}
                </CodeBlock>
                {product.security.cosignKeyUrl && (
                  <p className={styles.tabCopy}>
                    Note: key-based signature verification of legacy{" "}
                    <code>.sig</code> tags requires cosign v2.x (cosign v3+
                    defaults to OCI 1.1 referrers). Use the{" "}
                    <strong>Verify Provenance</strong> tab for keyless OIDC
                    verification on cosign v3+.
                  </p>
                )}
              </>
            ) : (
              <p className={styles.emptyText}>
                {hasPublishedImage
                  ? "Verification command unavailable."
                  : "Awaiting initial release: verification commands will be available once the image is published."}
              </p>
            )}
          </TabItem>
          <TabItem value="verify-provenance">
            <p className={styles.tabCopy}>
              Provenance attestation lets you validate how the image was built
              in CI so you can make trust decisions from evidence.{" "}
              <Link
                to="https://slsa.dev/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more
              </Link>
              .
            </p>
            {product.security?.attestCommand ? (
              <CodeBlock language="bash">
                {product.security.attestCommand}
              </CodeBlock>
            ) : (
              <p className={styles.emptyText}>
                {hasPublishedImage
                  ? "Attestation verification command unavailable."
                  : "Awaiting initial release: attestation verification will be available once the image is published."}
              </p>
            )}
            {product.security?.attestCommand &&
              product.security.hasAttestation === false && (
                <p className={styles.tabCopy}>
                  Note: attestations are not yet published for this image. The
                  command is provided for when they are.
                </p>
              )}
          </TabItem>
          <TabItem value="generate-sbom">
            <p className={styles.tabCopy}>
              When present, SBOMs are published alongside images as OCI
              referrers. Use oras to inspect attached artifacts and pull the
              SBOM for audits, policy checks, and vulnerability triage.{" "}
              <Link
                to="https://oras.land/docs/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more
              </Link>
              .
            </p>
            {product.security?.sbomCommand ? (
              <CodeBlock language="bash">
                {product.security.sbomCommand}
              </CodeBlock>
            ) : (
              <p className={styles.emptyText}>
                {hasPublishedImage
                  ? "SBOM inspection command unavailable."
                  : "Awaiting initial release: SBOM inspection will be available once the image is published."}
              </p>
            )}
          </TabItem>
        </Tabs>
      </section>
    </div>
  );
}

export default function ImageCards({
  group,
  initialCatalog,
}: {
  group: keyof typeof IMAGES;
  initialCatalog?: Catalog;
}): React.JSX.Element {
  const [catalog, setCatalog] = React.useState<Catalog>(
    initialCatalog ?? (staticImagesData as unknown as Catalog),
  );

  React.useEffect(() => {
    if (initialCatalog) return;
    let mounted = true;
    // Live data wins; on failure keep the build-time copy unless it is empty.
    fetchLiveCatalog()
      .then((data) => {
        if (!mounted) return;
        if (Array.isArray(data?.products)) {
          setCatalog(data);
          return;
        }
        setCatalog((current) =>
          current.products?.length
            ? current
            : {
                products: [],
                unavailable: true,
                stateReason: "Image catalog response was invalid.",
              },
        );
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setCatalog((current) =>
          current.products?.length
            ? current
            : {
                products: [],
                unavailable: true,
                stateReason:
                  error instanceof Error
                    ? `Image catalog request failed: ${error.message}`
                    : "Image catalog request failed.",
              },
        );
      });
    return () => {
      mounted = false;
    };
  }, [initialCatalog]);

  const products = Array.isArray(catalog.products) ? catalog.products : [];
  const newest = newestPerComponent(products);

  return (
    <div className={styles.list}>
      {catalog.unavailable && (
        <div className="alert alert--warning" role="status">
          <Heading as="h3">Image catalog unavailable</Heading>
          <p>
            {catalog.stateReason ||
              "Image catalog data is currently unavailable."}
          </p>
        </div>
      )}
      {IMAGES[group].map((image) => {
        const product = products.find((p) => p.id === image.product);
        const stream = compareStream(product);
        return (
          <article key={image.href} className={styles.card}>
            <div className={styles.cardTop}>
              <img src={image.art} alt={image.alt} className={styles.dino} />
              <div className={styles.text}>
                <Heading as="h3" className={styles.title}>
                  <Link to={image.href}>{image.title}</Link>
                  {stream && <span className={styles.tag}>{stream.tag}</span>}
                </Heading>
                {product?.supportedArches?.length ? (
                  <ArchBadges arches={product.supportedArches} />
                ) : null}
                <p className={styles.subheader}>{image.subheader}</p>
                <p className={styles.body}>{image.body}</p>
                {stream && <ComparePills stream={stream} newest={newest} />}
              </div>
            </div>
            {product && (
              <ProductDetails
                product={product}
                generatedAt={catalog.generatedAt}
                note={image.note}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}
