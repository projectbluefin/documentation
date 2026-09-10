import React from "react";
import PortalParallax from "./PortalParallax";
import PortalVideo from "./PortalVideo";
import PortalBazaar from "./PortalBazaar";
import PortalSectionPicker from "./PortalSectionPicker";
import PortalCommunity from "./PortalCommunity";
import PortalFlock from "./PortalFlock";
import PortalContributors from "./PortalContributors";
import PortalNews from "./PortalNews";
import PortalFooter from "./PortalFooter";
import PortalNavigation from "./PortalNavigation";
import PortalPageLoading from "./PortalPageLoading";
import styles from "./PortalPrototype.module.css";
import {
  CHARACTER_IMAGES,
  DEVELOPER_BENEFITS,
  PORTAL_CHARACTER_IMAGES,
  TRANSITION_SRC,
  useHeroRaptor,
} from "./portalModel";
export { CHARACTER_IMAGES, PORTAL_CHARACTER_IMAGES };

export function useImagePreloader(images: readonly string[]): boolean {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    if (typeof Image === "undefined" || images.length === 0) {
      setIsLoading(false);
      return;
    }

    Promise.all(
      images.map((src) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.src = src;
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        });
      }),
    ).finally(() => {
      setTimeout(() => {
        if (mounted) {
          setIsLoading(false);
        }
      }, 100);
    });

    return () => {
      mounted = false;
    };
  }, [images]);

  return isLoading;
}

const userBenefits = [
  "Applications by Flathub",
  "Near-zero maintenance",
  "Included GPU drivers",
];

const developerBenefits = DEVELOPER_BENEFITS;

export default function PortalPrototype(): React.JSX.Element {
  const heroRaptorSrc = useHeroRaptor();
  const isLoading = useImagePreloader(CHARACTER_IMAGES);

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

  const handleTryOutClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
  ): void => {
    event.preventDefault();
    const target = document.getElementById("scene-picker");
    if (!target) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    target.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });
    target.focus({ preventScroll: true });
    window.history.pushState(null, "", "#scene-picker");
  };

  return (
    <div className={styles.portal} aria-busy={isLoading}>
      {isLoading && <PortalPageLoading />}
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
              <div className={styles.landingActions}>
                <a
                  className={styles.primaryAction}
                  href="#scene-users"
                  onClick={handleDiscoverClick}
                >
                  Discover
                </a>
                <a
                  className={styles.secondaryAction}
                  href="#scene-picker"
                  onClick={handleTryOutClick}
                >
                  Try Out
                </a>
              </div>
            </div>
            <img
              className={styles.heroCharacter}
              src={heroRaptorSrc}
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
              <blockquote className={styles.sceneQuote}>
                <p>
                  Evolution is a process of constant branching and expansion.
                  <cite>
                    <a
                      href="https://en.wikipedia.org/wiki/Stephen_Jay_Gould"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Stephen Jay Gould
                    </a>
                  </cite>
                </p>
              </blockquote>
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
                where you&apos;re coming from, or bring your own. There are{" "}
                <a
                  href="https://www.cncf.io/announcements/2025/11/11/cncf-and-slashdata-survey-finds-cloud-native-ecosystem-surges-to-15-6m-developers/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  15.6 million cloud native developers
                </a>{" "}
                in the world, wield these{" "}
                <a
                  href="https://landscape.cncf.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  industry-leading tools
                </a>{" "}
                with ease...
              </p>
              <div className={styles.developerGrid}>
                {developerBenefits.map((benefit) => (
                  <div key={benefit.text} className={styles.developerBrandItem}>
                    <div className={styles.iconWrap}>
                      <img
                        src={benefit.icon}
                        alt=""
                        aria-hidden="true"
                        className={styles.iconBlur}
                        loading="lazy"
                      />
                      <img
                        src={benefit.icon}
                        alt={benefit.alt}
                        className={styles.iconMain}
                        loading="lazy"
                      />
                    </div>
                    <p>{benefit.text}</p>
                  </div>
                ))}
              </div>
              <blockquote className={styles.sceneQuote}>
                <p>
                  Be the one who moves, not the one who is moved.
                  <cite>
                    <a
                      href="https://en.wikipedia.org/wiki/Lance_Reddick"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Commander Zavala (Destiny)
                    </a>
                  </cite>
                </p>
              </blockquote>
            </div>
            <div className={styles.developerArtworkWrapper}>
              <div className={styles.sceneArrow}>
                <img src="/icons/arrow.svg" alt="" aria-hidden="true" />
                <p>
                  <b>Tower</b> over your Backlog!
                </p>
              </div>
              <img
                className={styles.developerCharacter}
                src="/img/portal/characters/karl.webp"
                alt="Karl towering over the Backlog"
              />
            </div>
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
              By introducing cloud-native patterns to the desktop we hope to
              ignite interest in desktop computing while catering to the next
              generation of open-source contributors. Bluefin is designed to be
              the tool you depend on to do what you do best. The answer for us
              is simple, use what the experts in infrastructure use. The current
              Linux desktop didn&apos;t get us there, but we believe that what
              was made, can be unmade. Let&apos;s make it better.
            </p>
            <p>
              Bluefin is about sustainability, encompassing the software, the
              hardware, and the people.
            </p>
            <blockquote className={styles.missionQuote}>
              <p>
                There are two ways of spreading light: to be the candle or the
                mirror that reflects it.
                <cite>
                  <a
                    href="https://en.wikipedia.org/wiki/Edith_Wharton"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Edith Wharton
                  </a>
                </cite>
              </p>
            </blockquote>
            <p>Or she may disembowel us on the way. Clever Girl.</p>
          </div>
        </div>
      </section>

      <PortalVideo />

      <PortalBazaar />

      <PortalSectionPicker />

      <PortalCommunity />

      {/* Downstream insertion seam: Subproject 3 (PortalFlock, PortalContributors, PortalNews) mounts here between Community and Footer */}
      <PortalFlock />
      <PortalContributors />
      <PortalNews />

      <PortalFooter />
      <PortalNavigation />
    </div>
  );
}
