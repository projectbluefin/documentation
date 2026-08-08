import React, { useEffect } from "react";
import { useHistory, useLocation } from "@docusaurus/router";
import Layout from "@theme/Layout";
import FactoryNav from "./FactoryNav";
import { FactoryDataProvider } from "./FactoryDataContext";
import { routeFor, FACTORY_ROUTES } from "./routes";
import {
  useFactoryState,
  FactoryHero,
  FactoryStatusStrip,
  FactoryAbout,
  FactoryFooter,
  type FactoryLive,
} from "../HiveFactoryDashboard";
import "./tokens.css";
import styles from "./FactoryShell.module.css";

/**
 * The persistent frame around every /factory route.
 *
 * Authorized by adr/0003-factory-two-level-navigation.md.
 *
 * ADR 0002's condition that an empty view is never the default survives the
 * move to routes: the hero and the status strip sit above the navigation on
 * every route, so "is anything on fire?" is answerable without clicking.
 *
 * The hive state is fetched once here and handed to the route's children, so
 * eight routes share one set of requests rather than each mounting its own.
 */
export default function FactoryShell({
  pathname,
  children,
}: {
  pathname: string;
  /** Receives the shared hive state; a route that ignores it may take none. */
  children: (s: FactoryLive) => React.ReactNode;
}): React.JSX.Element {
  const route = routeFor(pathname) ?? FACTORY_ROUTES[0];
  const location = useLocation();
  const history = useHistory();
  const s = useFactoryState();

  // ADR 0002 shipped ?tab=live and ?tab=health. Those links are rewritten to
  // their routes rather than left to resolve into the wrong view.
  //
  // Guarded to /factory only. Without the guard, visiting
  // /factory/images?tab=health would hijack the reader to /factory/builds,
  // because the effect keys on the query string and not on where they are.
  useEffect(() => {
    if (location.pathname.replace(/\/$/, "") !== "/factory") return;
    const legacy = new URLSearchParams(location.search).get("tab");
    if (!legacy) return;
    history.replace(legacy === "health" ? "/factory/builds" : "/factory");
  }, [location.pathname, location.search, history]);

  return (
    <Layout
      title="Bluefin Operating System Factory"
      description="Community Driven Agentic OS Development — live dashboard for projectbluefin"
    >
      <div className={`fxRoot ${styles.shell}`}>
        {/* The tab bar is the first thing in the page and sticks under the site
            navbar, so navigation is never below the fold and reads as chrome. */}
        <FactoryNav pathname={route.path} />

        <div className={styles.body}>
          <FactoryHero s={s} />
          <FactoryStatusStrip s={s} />
        </div>

        <div
          id="fx-panel"
          role="tabpanel"
          aria-labelledby={`fx-tab-${route.id}`}
          className={styles.body}
        >
          <FactoryDataProvider datasets={route.datasets}>
            {children(s)}
          </FactoryDataProvider>
        </div>

        <div className={styles.body}>
          <FactoryAbout s={s} />
          <FactoryFooter s={s} />
        </div>
      </div>
    </Layout>
  );
}
