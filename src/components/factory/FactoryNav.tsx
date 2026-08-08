import React from "react";
import Link from "@docusaurus/Link";
import {
  FACTORY_ROUTES,
  PRIMARIES,
  landingFor,
  primaryOf,
  routeFor,
  secondaryFor,
} from "./routes";
import styles from "./FactoryNav.module.css";

/**
 * Two-level navigation for /factory.
 *
 * Authorized by adr/0003-factory-two-level-navigation.md.
 *
 * Tabs are links, not buttons: each view is a real route, so a tab must work
 * without JavaScript, be openable in a new window, and be shareable. WAI-ARIA
 * calls this the tabs-with-manual-activation pattern, which is why role="tab"
 * on an anchor is correct here rather than a conflict.
 *
 * A roving tabindex keeps a single stop per row in the tab order, so reaching
 * the content past the nav costs two Tab presses rather than nine.
 *
 * `pathname` is a prop rather than a hook so the component stays pure and can
 * be server-rendered and unit-tested without a router.
 */
export default function FactoryNav({
  pathname,
}: {
  pathname: string;
}): React.JSX.Element {
  const active = primaryOf(pathname);
  // An unknown path must still produce a selected tab in each row, or the nav
  // renders with nothing highlighted and nothing focusable.
  const activeRoute = routeFor(pathname) ?? FACTORY_ROUTES[0];
  const secondary = secondaryFor(active);
  const activeLabel = PRIMARIES.find((p) => p.id === active)?.label ?? "Live";

  return (
    <nav className={styles.nav} aria-label="Factory navigation">
      <div
        className={styles.primaryRow}
        role="tablist"
        aria-label="Factory sections"
      >
        {PRIMARIES.map((p) => {
          const selected = p.id === active;
          return (
            <Link
              key={p.id}
              to={selected ? activeRoute.path : landingFor(p.id)}
              role="tab"
              id={`fx-primary-${p.id}`}
              aria-selected={selected}
              aria-controls="fx-panel"
              tabIndex={selected ? 0 : -1}
              title={p.hint}
              className={`${styles.primaryTab} ${
                selected ? styles.primaryTabActive : ""
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      <div
        className={styles.secondaryRow}
        role="tablist"
        aria-label={`${activeLabel} views`}
      >
        {secondary.map((r) => {
          const selected = r.path === activeRoute.path;
          return (
            <Link
              key={r.path}
              to={r.path}
              role="tab"
              id={`fx-secondary-${r.id}`}
              aria-selected={selected}
              aria-controls="fx-panel"
              tabIndex={selected ? 0 : -1}
              title={r.hint}
              className={`${styles.secondaryTab} ${
                selected ? styles.secondaryTabActive : ""
              }`}
            >
              {r.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
