import React from "react";
import Link from "@docusaurus/Link";
import Heading from "@theme/Heading";
import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";
import CodeBlock from "@theme/CodeBlock";
import styles from "./ImagesCatalog.module.css";

const ARCH_LOGO: Record<string, { src: string; alt: string }> = {
  amd: { src: "/img/gpu/amd.svg", alt: "AMD" },
  intel: { src: "/img/gpu/intel.svg", alt: "Intel" },
  nvidia: { src: "/img/gpu/nvidia.svg", alt: "NVIDIA" },
  arm: { src: "/img/gpu/arm.svg", alt: "ARM" },
};

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

interface StreamInfo {
  label: string;
  tag: string;
  command: string;
  nvidiaCommand?: string | null;
  versions?: {
    gnome?: string | null;
    kernel?: string | null;
    nvidia?: string | null;
    fedora?: string | null;
    flatpak?: string | null;
    mesa?: string | null;
    podman?: string | null;
  } | null;
}

interface Product {
  id: string;
  name: string;
  org: string;
  summary: string;
  artwork: "bluefin" | "achillobator" | "dakotaraptor";
  supportedArches?: string[] | null;
  downloads?: {
    display: string;
    source: "live" | "cache" | "unavailable";
  } | null;
  packagePageUrl: string;
  isoSectionLink?: string | null;
  streams: StreamInfo[];
  testingStreams: StreamInfo[];
  metadata: {
    digest?: string | null;
    digestShort?: string | null;
    digestLink?: string | null;
    labels?: {
      ostreeCommit?: string | null;
    } | null;
  } | null;
  metadataSource: "live" | "cache" | "unavailable";
  versions?: {
    gnome?: string | null;
    kernel?: string | null;
    nvidia?: string | null;
    flatpak?: string | null;
    mesa?: string | null;
    podman?: string | null;
    release?: {
      url?: string | null;
    } | null;
  } | null;
  security?: {
    cosignKeyUrl?: string | null;
    verifyCommand?: string | null;
    attestCommand?: string | null;
    hasAttestation?: boolean | null;
    sbomCommand?: string | null;
  } | null;
  lastPublishedAt?: string | null;
}

interface ImagesCatalog {
  generatedAt?: string;
  products: Product[];
  unavailable?: boolean;
  stateReason?: string;
}

function sourceText(source: "live" | "cache" | "unavailable", kind: string) {
  if (source === "live") return `${kind}: live`;
  if (source === "cache") return `${kind}: cache`;
  return `${kind}: unavailable`;
}

function sourceClass(source: "live" | "cache" | "unavailable") {
  if (source === "cache") return `${styles.statChip} ${styles.chipCache}`;
  if (source === "unavailable")
    return `${styles.statChip} ${styles.chipUnavailable}`;
  return styles.statChip;
}

export function StreamVersionPills({
  versions,
  showNvidia,
}: {
  versions?: StreamInfo["versions"];
  showNvidia: boolean;
}) {
  return (
    <div className={styles.streamVersionPills}>
      <span className={styles.versionPill}>
        <strong>GNOME</strong> {versions?.gnome || "Unknown"}
      </span>
      <span className={styles.versionPill}>
        <strong>Linux</strong> {versions?.kernel || "Unknown"}
      </span>
      {(showNvidia || versions?.nvidia) && (
        <span className={styles.versionPill}>
          <img
            src="/img/gpu/nvidia.svg"
            alt="NVIDIA"
            className={styles.pillLogo}
          />
          <strong>NVIDIA</strong> {versions?.nvidia || "Unknown"}
        </span>
      )}
      {versions?.flatpak && (
        <span className={styles.versionPill}>
          <strong>Flatpak</strong> {versions.flatpak}
        </span>
      )}
      {versions?.mesa && (
        <span className={styles.versionPill}>
          <strong>Mesa</strong> {versions.mesa}
        </span>
      )}
      {versions?.podman && (
        <span className={styles.versionPill}>
          <strong>Podman</strong> {versions.podman}
        </span>
      )}
    </div>
  );
}

function StreamList({
  streams,
  preferNvidia,
}: {
  streams: StreamInfo[];
  preferNvidia: boolean;
}) {
  if (!streams.length) {
    return <p className={styles.emptyText}>No active tags.</p>;
  }

  return (
    <ul className={styles.streamList}>
      {streams.map((entry) => (
        <li key={`${entry.tag}-${entry.command}`}>
          <span className={styles.streamTag}>{entry.label}</span>
          <StreamVersionPills
            versions={entry.versions}
            showNvidia={preferNvidia}
          />
          {preferNvidia ? (
            entry.nvidiaCommand ? (
              <CodeBlock language="bash">{entry.nvidiaCommand}</CodeBlock>
            ) : (
              <span className={styles.emptyText}>
                No Nvidia variant for this tag.
              </span>
            )
          ) : (
            <CodeBlock language="bash">{entry.command}</CodeBlock>
          )}
        </li>
      ))}
    </ul>
  );
}

function tabValue(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-");
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

interface ImagesCatalogProps {
  initialCatalog?: ImagesCatalog;
}

export default function ImagesCatalogComponent({
  initialCatalog,
}: ImagesCatalogProps = {}): React.JSX.Element {
  const [catalog, setCatalog] = React.useState<ImagesCatalog>(
    initialCatalog ?? { products: [] },
  );

  React.useEffect(() => {
    let mounted = true;
    fetch("/data/images.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!mounted) return;
        if (!data || !Array.isArray(data.products)) {
          setCatalog({
            products: [],
            unavailable: true,
            stateReason: "Image catalog response was invalid.",
          });
          return;
        }
        setCatalog(data as ImagesCatalog);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        const reason =
          error instanceof Error
            ? `Image catalog request failed: ${error.message}`
            : "Image catalog request failed.";
        setCatalog({
          products: [],
          unavailable: true,
          stateReason: reason,
        });
      });
    return () => {
      mounted = false;
    };
  }, []);

  const products = Array.isArray(catalog?.products) ? catalog.products : [];
  const [nvidiaModeByProduct, setNvidiaModeByProduct] = React.useState<
    Record<string, boolean>
  >({});

  if (catalog.unavailable) {
    return (
      <div className={styles.imagesPage}>
        <div className="alert alert--warning" role="status">
          <Heading as="h2">Image catalog unavailable</Heading>
          <p>
            {catalog.stateReason ||
              "Image catalog data is currently unavailable."}
          </p>
        </div>
      </div>
    );
  }

  const bluefinProducts = products.filter(
    (product) =>
      product.id === "projectbluefin-bluefin" || product.name === "Bluefin",
  );
  const ltsProducts = products.filter(
    (product) =>
      product.id === "projectbluefin-bluefin-lts" ||
      product.name.includes("LTS"),
  );
  const dakotaProducts = products.filter(
    (product) =>
      product.id === "projectbluefin-dakota" || product.name.includes("Dakota"),
  );
  const utahProducts = products.filter(
    (product) =>
      product.id === "projectbluefin-utah" || product.name.includes("Utah"),
  );

  const renderCards = (items: Product[]) =>
    [...items]
      .sort((a, b) => {
        if (a.name === "Bluefin") return -1;
        if (b.name === "Bluefin") return 1;
        if (a.name === "Bluefin LTS") return -1;
        if (b.name === "Bluefin LTS") return 1;
        return a.name.localeCompare(b.name);
      })
      .map((product) => {
        const tone =
          product.artwork === "dakotaraptor"
            ? styles.cardDakota
            : product.artwork === "achillobator"
              ? styles.cardLts
              : product.id === "projectbluefin-utah" ||
                  product.name.includes("Utah")
                ? styles.cardUtah
                : styles.cardBluefin;
        const digestShort = product.metadata?.digestShort || "Unavailable";
        const digestFull = product.metadata?.digest || null;
        const digestLink = product.metadata?.digestLink;
        const ostreeShort = product.metadata?.labels?.ostreeCommit?.slice(
          0,
          12,
        );
        const releaseUrl = assetsLink(product.versions?.release?.url);
        const lastValidated = formatDate(catalog.generatedAt || null);
        const lastPublished = formatDate(product.lastPublishedAt || null);
        const hasNvidiaVariant =
          product.streams.some((entry) => Boolean(entry.nvidiaCommand)) ||
          product.testingStreams.some((entry) => Boolean(entry.nvidiaCommand));
        const nvidiaEnabled = Boolean(nvidiaModeByProduct[product.id]);

        return (
          <article key={product.id} className={`${styles.card} ${tone}`}>
            <header className={styles.cardHeader}>
              <Heading as="h2" className={styles.cardTitle}>
                {product.name}
              </Heading>
              {product.supportedArches &&
                product.supportedArches.length > 0 && (
                  <ArchBadges arches={product.supportedArches} />
                )}
            </header>

            <section className={styles.linkRow}>
              <Link
                to={product.packagePageUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Package Page
              </Link>
              {product.isoSectionLink && (
                <>
                  <span>·</span>
                  <Link to={product.isoSectionLink}>Download ISO</Link>
                </>
              )}
              {releaseUrl && (
                <>
                  <span>·</span>
                  <Link
                    to={releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Release Assets
                  </Link>
                </>
              )}
              {digestLink ? (
                <>
                  <span>·</span>
                  <Link
                    to={digestLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={digestFull || digestShort}
                  >
                    Digest {digestShort}
                  </Link>
                </>
              ) : (
                <>
                  <span>·</span>
                  <span>Digest {digestShort}</span>
                </>
              )}
              {ostreeShort && (
                <>
                  <span>·</span>
                  <span>OSTree {ostreeShort}</span>
                </>
              )}
            </section>

            <p className={styles.summary}>{product.summary}</p>

            <div className={styles.statsRow}>
              {product.downloads && (
                <>
                  <span className={styles.statChip}>
                    <strong>Pulls:</strong> {product.downloads.display}
                  </span>
                  <span className={sourceClass(product.downloads.source)}>
                    {sourceText(product.downloads.source, "Downloads")}
                  </span>
                </>
              )}
              {product.metadataSource !== "live" && (
                <span className={sourceClass(product.metadataSource)}>
                  {sourceText(product.metadataSource, "Metadata")}
                </span>
              )}
            </div>

            <p className={styles.validationMeta}>
              Last validated: <strong>{lastValidated}</strong> · Last published:{" "}
              <strong>{lastPublished}</strong>
            </p>

            <section
              className={`${styles.section} ${styles.focusSection} ${styles.streamsSection}`}
            >
              <div className={styles.sectionHeader}>
                <Heading as="h3" className={styles.sectionTitle}>
                  Streams
                </Heading>
                {hasNvidiaVariant && (
                  <div className={styles.nvidiaControl}>
                    <p className={styles.nvidiaToggleLabel}>Graphics Drivers</p>
                    <p className={styles.nvidiaToggleQuestion}>
                      Add Nvidia driver?
                    </p>
                    <div
                      className={styles.nvidiaToggleGroup}
                      role="group"
                      aria-label="Nvidia driver toggle"
                    >
                      <button
                        type="button"
                        className={`button button--sm ${!nvidiaEnabled ? "button--primary" : "button--secondary"}`}
                        aria-pressed={!nvidiaEnabled}
                        onClick={() =>
                          setNvidiaModeByProduct((current) => ({
                            ...current,
                            [product.id]: false,
                          }))
                        }
                      >
                        No
                      </button>
                      <button
                        type="button"
                        className={`button button--sm ${nvidiaEnabled ? "button--primary" : "button--secondary"}`}
                        aria-pressed={nvidiaEnabled}
                        onClick={() =>
                          setNvidiaModeByProduct((current) => ({
                            ...current,
                            [product.id]: true,
                          }))
                        }
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {product.streams.length > 0 ? (
                <Tabs
                  groupId={`streams-${product.id}`}
                  values={product.streams.map((entry) => ({
                    label: entry.label,
                    value: tabValue(entry.tag),
                  }))}
                >
                  {product.streams.map((entry) => (
                    <TabItem key={entry.tag} value={tabValue(entry.tag)}>
                      <p className={styles.tabCopy}>
                        Use this command to switch to the{" "}
                        <strong>{entry.label.toLowerCase()}</strong> channel for
                        this image. It is the quickest way to stay on that
                        release stream.
                      </p>
                      {nvidiaEnabled ? (
                        entry.nvidiaCommand ? (
                          <>
                            <StreamVersionPills
                              versions={entry.versions}
                              showNvidia
                            />
                            <CodeBlock language="bash">
                              {entry.nvidiaCommand}
                            </CodeBlock>
                          </>
                        ) : (
                          <p className={styles.emptyText}>
                            No Nvidia variant published for this stream tag.
                          </p>
                        )
                      ) : (
                        <>
                          <StreamVersionPills
                            versions={entry.versions}
                            showNvidia={false}
                          />
                          <CodeBlock language="bash">{entry.command}</CodeBlock>
                        </>
                      )}
                    </TabItem>
                  ))}
                </Tabs>
              ) : (
                <p className={styles.emptyText}>No active tags.</p>
              )}

              <details className={styles.testingDetails}>
                <summary>
                  Testing Branches ({product.testingStreams.length})
                </summary>
                <StreamList
                  streams={product.testingStreams}
                  preferNvidia={nvidiaEnabled}
                />
              </details>
            </section>

            <section
              className={`${styles.section} ${styles.focusSection} ${styles.securitySection}`}
            >
              <Heading as="h3" className={styles.sectionTitle}>
                Signing and SBOM
              </Heading>
              {product.security?.cosignKeyUrl ? (
                <p className={styles.securityText}>
                  Key: <code>{product.security.cosignKeyUrl}</code>
                </p>
              ) : (
                <p className={styles.securityText}>
                  No published cosign key URL in this catalog.
                </p>
              )}

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
                    expected maintainers and helps detect tampering before
                    deployment.{" "}
                    <Link
                      to="https://docs.sigstore.dev/cosign/verifying/verify/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Learn more
                    </Link>
                    .
                  </p>
                  {product.security?.verifyCommand && (
                    <CodeBlock language="bash">
                      {product.security.verifyCommand}
                    </CodeBlock>
                  )}
                </TabItem>
                <TabItem value="verify-provenance">
                  <p className={styles.tabCopy}>
                    Provenance attestation lets you validate how the image was
                    built in CI so you can make trust decisions from evidence.{" "}
                    <Link
                      to="https://slsa.dev/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Learn more
                    </Link>
                    .
                  </p>
                  {product.security?.attestCommand && (
                    <CodeBlock language="bash">
                      {product.security.attestCommand}
                    </CodeBlock>
                  )}
                  {product.security?.attestCommand &&
                    product.security.hasAttestation === false && (
                      <p className={styles.tabCopy}>
                        Note: attestations are not yet published for this image.
                        The command is provided for when they are.
                      </p>
                    )}
                </TabItem>
                <TabItem value="generate-sbom">
                  <p className={styles.tabCopy}>
                    SBOMs are published alongside each image as OCI referrers.
                    Use oras to inspect attached artifacts and pull the SBOM for
                    audits, policy checks, and vulnerability triage.{" "}
                    <Link
                      to="https://oras.land/docs/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Learn more
                    </Link>
                    .
                  </p>
                  {product.security?.sbomCommand && (
                    <CodeBlock language="bash">
                      {product.security.sbomCommand}
                    </CodeBlock>
                  )}
                </TabItem>
              </Tabs>
            </section>
          </article>
        );
      });

  return (
    <div className={styles.imagesPage}>
      <section id="bluefin-stable" className={styles.sectionGroup}>
        <Heading as="h2" className={styles.groupTitle}>
          Bluefin
        </Heading>
        <p className={styles.groupHint}>
          Recommended for most users who want current Bluefin releases and fast
          feature delivery.
        </p>
        <div className="alert alert--info" role="note">
          Rebasing between Bluefin and Bluefin LTS image families is not
          supported. Choose the family you intend to stay on.
        </div>
        <div className={styles.cards}>{renderCards(bluefinProducts)}</div>
      </section>

      <section id="bluefin-lts" className={styles.sectionGroup}>
        <Heading as="h2" className={styles.groupTitle}>
          Bluefin LTS
        </Heading>
        <p className={styles.groupHint}>
          Recommended for longer support windows, conservative upgrades, and
          production-focused workstations.
        </p>
        <div className="alert alert--info" role="note">
          Rebasing between Bluefin and Bluefin LTS image families is not
          supported. Plan migrations as fresh installs or supported upgrade
          paths.
        </div>
        <div className={styles.cards}>{renderCards(ltsProducts)}</div>
      </section>

      <section className={styles.sectionGroup}>
        <Heading as="h2" className={styles.groupTitle}>
          Dakota
        </Heading>
        <p className={styles.groupHint}>
          Recommended for users evaluating the next-generation Dakota track and
          related experiments.
        </p>
        <div className="alert alert--info" role="note">
          Dakota is a separate image track. Rebasing between Bluefin and Bluefin
          LTS families and Dakota is not supported.
        </div>
        <div className={styles.cards}>{renderCards(dakotaProducts)}</div>
      </section>

      <section className={styles.sectionGroup}>
        <Heading as="h2" className={styles.groupTitle}>
          Utah
        </Heading>
        <p className={styles.groupHint}>
          Project Bluefin built with Fedora Hummingbird technology.
        </p>
        <div className={styles.cards}>{renderCards(utahProducts)}</div>
      </section>
    </div>
  );
}
