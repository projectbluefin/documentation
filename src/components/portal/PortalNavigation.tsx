import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MdFaceRetouchingNatural,
  MdCode,
  MdDownload,
  MdArrowUpward,
} from "react-icons/md";
import {
  useScrollSpy,
  DEFAULT_TRACKED_SECTIONS,
  type UseScrollSpyOptions,
} from "./useScrollSpy";
import styles from "./PortalNavigation.module.css";

export interface PortalNavLink {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly ariaLabel?: string;
  readonly icon?: React.ComponentType<{
    readonly className?: string;
    readonly "aria-hidden"?: boolean | "true" | "false";
  }>;
}

export const DEFAULT_PORTAL_NAV_LINKS: readonly PortalNavLink[] = [
  {
    id: "#scene-users",
    name: "Navbar.ForYou",
    label: "For You",
    icon: MdFaceRetouchingNatural,
  },
  {
    id: "#scene-developers",
    name: "Navbar.ForDevs",
    label: "For Devs",
    icon: MdCode,
  },
  {
    id: "#scene-mission",
    name: "Navbar.OurMission",
    label: "Our Mission",
  },
  {
    id: "#scene-picker",
    name: "Navbar.TryOut",
    label: "Try Out",
    icon: MdDownload,
  },
  {
    id: "#scene-community",
    name: "Navbar.Community",
    label: "Community",
  },
];

export interface PortalNavigationProps {
  readonly links?: readonly PortalNavLink[];
  readonly trackedSections?: readonly string[];
  readonly activeSection?: string;
  readonly defaultSection?: string;
  readonly onSectionChange?: (sectionId: string) => void;
  readonly showScrollTop?: boolean;
}

export { useScrollSpy, DEFAULT_TRACKED_SECTIONS, type UseScrollSpyOptions };

export default function PortalNavigation({
  links = DEFAULT_PORTAL_NAV_LINKS,
  trackedSections = DEFAULT_TRACKED_SECTIONS,
  activeSection: propActiveSection,
  defaultSection,
  onSectionChange,
  showScrollTop: propShowScrollTop,
}: PortalNavigationProps): React.JSX.Element {
  const { activeSection: spyActiveSection, scrollTo } = useScrollSpy({
    sectionIds: trackedSections,
    defaultValue: defaultSection,
  });

  const effectiveActiveSection = propActiveSection ?? spyActiveSection;

  useEffect(() => {
    if (onSectionChange) {
      onSectionChange(effectiveActiveSection);
    }
  }, [effectiveActiveSection, onSectionChange]);

  const activeIndex = links.findIndex(
    (link) => link.id === effectiveActiveSection,
  );
  const isVisible = activeIndex !== -1;

  const lastIndexRef = useRef(0);
  if (activeIndex !== -1) {
    lastIndexRef.current = activeIndex;
  }

  const offsetIndex = activeIndex !== -1 ? activeIndex : lastIndexRef.current;
  const linksCount = links.length;
  const widthPercent = linksCount > 0 ? 100 / linksCount : 20;
  const leftPercent = offsetIndex * widthPercent;

  const [internalShowButtonUp, setInternalShowButtonUp] =
    useState<boolean>(false);
  const showButtonUp = propShowScrollTop ?? internalShowButtonUp;

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const checkScrollUp = () => {
      const scrollY = window.scrollY ?? document.documentElement.scrollTop ?? 0;
      const scrollHeight = document.documentElement.scrollHeight;
      const innerHeight = window.innerHeight;

      if (scrollY >= scrollHeight - innerHeight - 256) {
        setInternalShowButtonUp(true);
      } else {
        setInternalShowButtonUp(false);
      }
    };

    window.addEventListener("scroll", checkScrollUp, { passive: true });
    window.addEventListener("resize", checkScrollUp, { passive: true });

    return () => {
      window.removeEventListener("scroll", checkScrollUp);
      window.removeEventListener("resize", checkScrollUp);
    };
  }, []);

  const handleScrollUp = useCallback(() => {
    if (typeof window === "undefined") return;

    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReduced ? "auto" : "smooth",
    });
  }, []);

  const handleLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      event.preventDefault();
      scrollTo(id);
    },
    [scrollTo],
  );

  return (
    <header
      id="navigation"
      className={`${styles.navigation} ${styles.appNavigation ?? ""} app-navigation`}
      role="navigation"
    >
      <nav aria-label="Navigation" className={styles.nav}>
        <ul
          className={`${styles.navList} nav-list`}
          style={{ gridTemplateColumns: `repeat(${linksCount}, 1fr)` }}
        >
          {links.map((link) => {
            const isActive = link.id === effectiveActiveSection;
            const Icon = link.icon;
            return (
              <li
                key={link.id}
                data-section={link.id}
                className={`${styles.navItem} nav-item`}
              >
                {/* eslint-disable-next-line @docusaurus/no-html-links */}
                <a
                  href={link.id}
                  className={`${styles.navLink} nav-link${
                    isActive ? ` ${styles.active} active` : ""
                  }`}
                  aria-label={
                    link.ariaLabel ?? `Section ${link.name ?? link.label}`
                  }
                  onClick={(e) => handleLinkClick(e, link.id)}
                >
                  {Icon && (
                    <Icon
                      className={`${styles.icon} nav-icon`}
                      aria-hidden="true"
                    />
                  )}
                  {link.label}
                </a>
              </li>
            );
          })}

          <div
            className={`${styles.bg} bg`}
            style={{
              left: `${leftPercent}%`,
              width: `${Math.round(widthPercent)}%`,
              opacity: isVisible ? 1 : 0,
            }}
          />
        </ul>
      </nav>

      {showButtonUp && (
        <button
          type="button"
          className={`${styles.btnUp} btn-up`}
          aria-label="Scroll up button"
          onClick={handleScrollUp}
        >
          <MdArrowUpward className={styles.btnUpIcon} aria-hidden="true" />
        </button>
      )}
    </header>
  );
}
