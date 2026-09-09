import React from "react";
import PortalParallax from "./PortalParallax";
import PortalVideo from "./PortalVideo";
import PortalBazaar from "./PortalBazaar";
import PortalSectionPicker from "./PortalSectionPicker";
import PortalCommunity from "./PortalCommunity";
import PortalFooter from "./PortalFooter";
import PortalNavigation from "./PortalNavigation";
import styles from "./PortalPrototype.module.css";
import { TRANSITION_SRC } from "./portalModel";

const userBenefits = [
  "Applications by Flathub",
  "Near-zero maintenance",
  "Included GPU drivers",
];

const developerBenefits = [
  "Visual Studio Code with devcontainers",
  "Work with your favorite Linux distributions with a container-focused terminal",
  "Designed for cloud native development with the CNCF's best tools, including Kubernetes",
  "Homebrew on-tap by default, same tools as your Mac",
  "Podman Desktop for graphical container management",
  "JetBrains IDEs one command away",
];

export default function PortalPrototype(): React.JSX.Element {
  const handleDiscoverClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
  ): void => {
    event.preventDefault();
    const target = document.getElementById("scene-users");
    if (!target) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    target.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });
    target.focus({ preventScroll: true });
    window.history.pushState(null, "", "#scene-users");
  };

  return (
    <main className={styles.portal}>
      <div id="portal-scenes" className={styles.sceneStack}>
        <section id="scene-landing" className={styles.landingScene}>
          <div className={styles.landingGrid}>
            <div className={styles.landingCopy}>
              <h1 className={styles.wordmarkTitle}>
                <img
                  className={styles.wordmark}
                  src="/img/bluefin-wordmark-light.svg"
                  alt="Bluefin"
                  fetchPriority="high"
                />
              </h1>
              <p>
                The next generation Linux workstation, designed for reliability,
                performance, and sustainability.
              </p>
              <a
                className={styles.primaryAction}
                href="#scene-users"
                onClick={handleDiscoverClick}
              >
                Discover
              </a>
            </div>
            <img
              className={styles.heroCharacter}
              src="/img/characters/bluefin-small.webp"
              alt="Bluefin"
              fetchPriority="high"
            />
          </div>
        </section>

        <section id="scene-users" className={styles.contentScene} tabIndex={-1}>
          <div className={styles.twoColumn}>
            <img
              className={styles.userCharacter}
              src="/img/portal/characters/bluefin.webp"
              alt="Bluefin looking at the future of Linux - it's to the left apparently"
            />
            <div className={styles.sceneContent}>
              <strong>For</strong>
              <h2>You</h2>
              <p>
                Bluefin is an operating system for your computer. The best of
                both worlds: the reliability and ease of use of a Chromebook,
                with the power of a GNOME desktop.
              </p>
              <div className={styles.benefitGrid}>
                {userBenefits.map((benefit) => (
                  <p key={benefit}>{benefit}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="scene-developers" className={styles.contentScene}>
          <div className={styles.developerLayout}>
            <div className={styles.sceneContent}>
              <strong>For</strong>
              <h2>Developers</h2>
              <p>
                Bluefin comes with an optional &quot;developer mode&quot; that
                transforms your device into a powerful workstation. It features
                container-focused workflows to get you started depending on
                where you&apos;re coming from, or bring your own.
              </p>
              <div className={styles.developerGrid}>
                {developerBenefits.map((benefit) => (
                  <p key={benefit}>{benefit}</p>
                ))}
              </div>
            </div>
            <img
              className={styles.developerCharacter}
              src="/img/portal/characters/karl.webp"
              alt="Karl towering over the Backlog"
            />
          </div>
        </section>
      </div>

      <PortalParallax />

      <section id="scene-mission" className={styles.missionScene}>
        <img className={styles.transition} src={TRANSITION_SRC} alt="" />
        <div className={styles.missionGrid}>
          <img
            className={styles.missionCharacter}
            src="/img/portal/characters/nest.webp"
            alt="Bluefin laying down and chilling"
          />
          <div className={styles.sceneContent}>
            <strong>Our</strong>
            <h2>Mission</h2>
            <p>
              Bluefin is not just software, she is a new breed of animal,
              adapted to survive the rigors of an ecosystem dominated by giants
              while protecting her family.
            </p>
            <p>
              Technology begins with the local computer, the device that you
              touch, and it should be as essential as the rest of the Linux
              ecosystem.
            </p>
            <p>
              Bluefin is about sustainability, encompassing the software, the
              hardware, and the people.
            </p>
          </div>
        </div>
      </section>

      <PortalVideo />

      <PortalBazaar />

      <PortalSectionPicker />

      <PortalCommunity />

      {/* Downstream insertion seam: Subproject 3 (PortalFlock, PortalContributors, PortalNews) mounts here between Community and Footer */}
      <PortalFooter />

      <PortalNavigation />
    </main>
  );
}
