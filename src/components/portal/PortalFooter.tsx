import React from "react";
import { FaGithub } from "react-icons/fa";
import styles from "./PortalFooter.module.css";
import {
  ALUMNI_COMPANIES,
  SPONSORS,
  POWERED_BY_BRANDS,
  UNIVERSAL_BLUE_BRAND,
  getCopyrightText,
} from "./portalStaticData";

export default function PortalFooter(): React.JSX.Element {
  return (
    <footer id="footer" className={styles.portalFooter}>
      <section
        id="alumni"
        className={`${styles.sectionWrap} ${styles.alumniSection}`}
      >
        <div className={styles.centeredContainer}>
          <h3 className={styles.subHeading}>
            Featuring alumni from companies like
          </h3>
          <div className={styles.logoRow}>
            {ALUMNI_COMPANIES.map((brand) =>
              brand.projectUrl ? (
                <a
                  key={brand.imageUrl}
                  href={brand.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    className={styles.alumniLogo}
                    src={brand.imageUrl}
                    alt={brand.altText}
                    title={brand.altText}
                    loading="lazy"
                  />
                </a>
              ) : (
                <img
                  key={brand.imageUrl}
                  className={styles.alumniLogo}
                  src={brand.imageUrl}
                  alt={brand.altText}
                  title={brand.altText}
                  loading="lazy"
                />
              ),
            )}
          </div>
        </div>
      </section>

      <section
        id="sponsors"
        className={`${styles.sectionWrap} ${styles.sponsorsSection}`}
      >
        <div className={styles.centeredContainer}>
          <h3 className={styles.subHeading}>Our sponsors</h3>
          <div className={styles.logoRow}>
            {SPONSORS.map((brand) =>
              brand.projectUrl ? (
                <a
                  key={brand.imageUrl}
                  href={brand.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    className={styles.sponsorLogo}
                    src={brand.imageUrl}
                    alt={brand.altText}
                    title={brand.altText}
                    loading="lazy"
                  />
                </a>
              ) : (
                <img
                  key={brand.imageUrl}
                  className={styles.sponsorLogo}
                  src={brand.imageUrl}
                  alt={brand.altText}
                  title={brand.altText}
                  loading="lazy"
                />
              ),
            )}
          </div>
        </div>
      </section>

      <div className={styles.gridContainer}>
        <div className={styles.leftCol}>
          <strong className={styles.footerTitle}>Powered By</strong>
          <div className={styles.poweredByList}>
            {POWERED_BY_BRANDS.map((brand) =>
              brand.projectUrl ? (
                <a
                  key={brand.imageUrl}
                  className={styles.poweredByItem}
                  href={brand.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={brand.imageUrl}
                    alt={brand.altText}
                    title={brand.altText}
                    loading="lazy"
                  />
                </a>
              ) : (
                <div key={brand.imageUrl} className={styles.poweredByItem}>
                  <img
                    src={brand.imageUrl}
                    alt={brand.altText}
                    title={brand.altText}
                    loading="lazy"
                  />
                </div>
              ),
            )}
          </div>
        </div>

        <div className={styles.rightCol}>
          <strong className={styles.footerTitle}>
            Project Bluefin is Built With
          </strong>
          <p className={styles.ublue}>
            <a
              href={UNIVERSAL_BLUE_BRAND.projectUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={UNIVERSAL_BLUE_BRAND.imageUrl}
                alt={UNIVERSAL_BLUE_BRAND.altText}
              />
              <span>Universal Blue</span>
            </a>
          </p>
          <p>
            A community toolkit designed to reboot the Linux desktop. Built for
            the love of the game. Welcome to indie Cloud Native.
          </p>

          <ul className={styles.socialLinks}>
            <li>
              <a
                href="https://github.com/ublue-os/bluefin"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaGithub aria-hidden="true" />
                <span>GitHub</span>
              </a>
            </li>
          </ul>

          <hr className={styles.divider} />

          <p>All artwork built by humans.</p>
          <ul className={styles.creditsList}>
            <li>
              Website -{" "}
              <a
                href="https://dolansky.dev/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Jan Dolanský
              </a>{" "}
              &amp;{" "}
              <a
                href="https://kylegospodneti.ch/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Kyle Gospodnetich
              </a>
            </li>
            <li>
              Logos and Wallpapers -{" "}
              <a
                href="https://www.etsy.com/shop/JSchnurrCommissions?listing_id=1425657775"
                target="_blank"
                rel="noopener noreferrer"
              >
                Jacob Schnurr
              </a>
            </li>
            <li>
              Image Editing -{" "}
              <a
                href="https://github.com/delphicmelody/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Delphic Melody
              </a>
            </li>
            <li>
              Bluefin Illustrative Wallpaper - Andy Frazer,{" "}
              <a
                href="https://www.etsy.com/fi-en/shop/DragonsofWales?ref=profile_header"
                target="_blank"
                rel="noopener noreferrer"
              >
                DragonsofWales
              </a>
            </li>
            <li>
              Translations -{" "}
              <a
                href="https://github.com/tulilirockz"
                target="_blank"
                rel="noopener noreferrer"
              >
                Tulip Blossom
              </a>
              ,{" "}
              <a
                href="https://github.com/karhima"
                target="_blank"
                rel="noopener noreferrer"
              >
                karhima
              </a>
              ,{" "}
              <a
                href="https://niklas.tech"
                target="_blank"
                rel="noopener noreferrer"
              >
                Niklas
              </a>
              ,{" "}
              <a
                href="https://github.com/EPOCHvoyager"
                target="_blank"
                rel="noopener noreferrer"
              >
                Crono
              </a>
              ,{" "}
              <a
                href="https://github.com/Tsu-gu"
                target="_blank"
                rel="noopener noreferrer"
              >
                Tsu-gu
              </a>{" "}
              &amp;{" "}
              <a
                href="https://github.com/theMimolet"
                target="_blank"
                rel="noopener noreferrer"
              >
                Mimolet
              </a>
            </li>
            <li>
              Special Thanks -{" "}
              <a
                href="https://www.linkedin.com/in/aaron-lake/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Aaron Lake
              </a>
              ,{" "}
              <a
                href="https://brian.dev/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Brian Ketelsen
              </a>
              ,{" "}
              <a
                href="https://www.kotterva.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Dustin Kirkland
              </a>
              ,{" "}
              <a
                href="https://github.com/wwitzel3"
                target="_blank"
                rel="noopener noreferrer"
              >
                Wayne Witzel
              </a>
              , &amp;{" "}
              <a
                href="https://github.com/marcoceppi"
                target="_blank"
                rel="noopener noreferrer"
              >
                Marco Ceppi
              </a>
            </li>
          </ul>

          <p className={styles.copyright}>{getCopyrightText()}</p>
        </div>
      </div>
    </footer>
  );
}
