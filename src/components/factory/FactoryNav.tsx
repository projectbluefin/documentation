import React from "react";
import Link from "@docusaurus/Link";
import { FACTORY_ROUTES, routeFor } from "./routes";
import styles from "./FactoryNav.module.css";

/**
 * The factory tab bar.
 *
 * One unified row, rendered as a secondary bar directly beneath the site
 * navbar, so it reads as part of the documentation chrome rather than as a
 * widget floating inside the page. The hive is not split out: every view is a
 * peer of every other.
 *
 * Tabs are links, not buttons: each view is a real route, so a tab must work
 * without JavaScript, be openable in a new window, and be shareable. WAI-ARIA
 * calls this the tabs-with-manual-activation pattern, which is why role="tab"
 * on an anchor is correct here rather than a conflict.
 *
 * A roving tabindex keeps a single stop in the tab order, so reaching content
 * past the nav costs one Tab press rather than eight.
 *
 * `pathname` is a prop rather than a hook so the component stays pure and can
 * be server-rendered and unit-tested without a router.
 */
export default function FactoryNav({
  pathname,
}: {
  pathname: string;
}): React.JSX.Element {
  // An unknown path must still produce a selected tab, or the bar renders with
  // nothing highlighted and nothing focusable.
  const active = routeFor(pathname) ?? FACTORY_ROUTES[0];

  return (
    <nav className={styles.bar} aria-label="Factory views">
      <div className={styles.inner} role="tablist">
        {FACTORY_ROUTES.map((r) => {
          const selected = r.path === active.path;
          return (
            <Link
              key={r.path}
              to={r.path}
              role="tab"
              id={`fx-tab-${r.id}`}
              aria-selected={selected}
              aria-controls="fx-panel"
              tabIndex={selected ? 0 : -1}
              title={r.hint}
              className={`${styles.tab} ${selected ? styles.tabActive : ""}`}
            >
              {r.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
