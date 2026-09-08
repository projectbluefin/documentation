import React from "react";
import styles from "./PortalSectionPicker.module.css";
import PortalImageChooser from "./PortalImageChooser";
import PortalProductCard from "./PortalProductCard";
import { adaptStreams, type ChooserCatalog } from "./portalStreamAdapter";
import defaultImagesData from "@site/static/data/images.json";
import defaultDriverVersionsData from "@site/static/data/driver-versions.json";

export interface PortalSectionPickerProps {
  catalog?: ChooserCatalog;
  imagesData?: unknown;
  driverVersionsData?: unknown;
}

export default function PortalSectionPicker({
  catalog: propCatalog,
  imagesData: propImagesData,
  driverVersionsData: propDriverVersionsData,
}: PortalSectionPickerProps = {}): React.JSX.Element {
  const catalog =
    propCatalog ??
    adaptStreams(
      propImagesData ?? defaultImagesData,
      propDriverVersionsData ?? defaultDriverVersionsData,
    );

  return (
    <section id="scene-picker" className={styles.sectionWrap}>
      <div className={styles.container}>
        <div className={styles.pickerHeader}>
          <div className={styles.pickerTag}>
            <strong>Try</strong>
          </div>
          <h2 className={styles.pickerTitle}>Bluefin</h2>
        </div>

        <div className={styles.pickerCard}>
          <div className={styles.cardContent}>
            <p>
              Choose your raptor for your hardware and use case. The team
              recommends{" "}
              <a
                href="https://flathub.org/apps/org.fedoraproject.MediaWriter"
                target="_blank"
                rel="noreferrer"
              >
                Fedora Media Writer
              </a>{" "}
              to create installation media, Ventoy is unsupported. Check{" "}
              <a href="https://docs.projectbluefin.io">the documentation</a> for
              more information.
            </p>
            <p>
              Bluefin receives timely security updates and is available in two
              different streams that reflect how aggressively it receives
              feature updates:
            </p>
          </div>
        </div>

        <PortalImageChooser catalog={catalog} />

        <section
          className={styles.wolvesDownloads}
          aria-labelledby="wolves-downloads-title"
        >
          <div className={styles.wolvesDownloadHeader}>
            <h3 id="wolves-downloads-title">For the Wolves</h3>
            <div className={styles.wolvesDownloadDescription}>
              <p>
                No compromises. This agentic factory uses{" "}
                <a
                  href="https://hive.kubestellar.io"
                  target="_blank"
                  rel="noreferrer"
                >
                  Hive
                </a>{" "}
                to coordinate agent actions across the organization. It is
                designed to be a sovereign, local first, and fully automated
                platform for the user.
              </p>
              <p>
                Three components. A server, built with Buildstream and FSDK as a
                vendor neutral platform. A desktop, Dakota, designed to be a
                natural &quot;client&quot;. And Utah is built on Fedora
                Hummingbird and is the Openshift to our Kubernetes. Every
                component is 100% open source and free to use.
              </p>
            </div>
          </div>

          <div className={styles.productEcosystemGrid}>
            {catalog.ecosystem.map((card) => (
              <div
                key={card.id}
                className={
                  card.isCenter
                    ? styles.productEcosystemCardServer
                    : styles.productEcosystemCard
                }
              >
                <PortalProductCard
                  title={card.title}
                  description={card.description}
                  image={card.image}
                  href={card.href}
                  versionRows={card.versionRows}
                  isCenter={card.isCenter}
                />
              </div>
            ))}
            <div
              className={styles.productEcosystemConnector}
              aria-hidden="true"
            />
          </div>

          <div className={styles.wolvesCampaignGrid}>
            <PortalProductCard
              title={catalog.wolvesCampaign.title}
              description={catalog.wolvesCampaign.description}
              image={catalog.wolvesCampaign.image}
              href={catalog.wolvesCampaign.href}
            />
          </div>
        </section>
      </div>
    </section>
  );
}
