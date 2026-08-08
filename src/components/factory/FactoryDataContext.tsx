import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useBaseUrl from "@docusaurus/useBaseUrl";
import type { DatasetKey } from "./routes";

/**
 * Data loading for /factory.
 *
 * Authorized by adr/0003-factory-two-level-navigation.md.
 *
 * Two problems this exists to solve, both from the design audit:
 *   - The old page fetched 136 KB of static JSON in four separate effects after
 *     hydration, on every tab. Here a route declares what it needs and only
 *     that is fetched, and a module-level cache means navigating between routes
 *     never refetches.
 *   - The old page ran a one-second countdown interval inside the 5,364-line
 *     component, re-rendering the whole tree every second. The countdown is now
 *     its own hook, to be consumed only by a small leaf component.
 *
 * Every URL here is same-origin, so no CSP connect-src entry is required and
 * nothing can reach the lab.
 */

export const DATASET_URLS: Record<DatasetKey, string> = {
  hiveHistory: "/data/hive-history.json",
  registry: "/data/registry-data.json",
  factoryStats: "/data/factory-stats.json",
  hiveLive: "/data/hive-live-data.json",
  countme: "/data/countme-history.json",
  brew: "/data/brew-analytics.json",
  flathub: "/data/flathub-stats.json",
  scorecard: "/data/scorecard-history.json",
  dora: "/data/dora.json",
  testRuns: "/data/test-runs.json",
  ghcrPackages: "/data/ghcr-packages.json",
  firehoseApps: "/data/firehose-apps.json",
  gnomeExtensions: "/data/gnome-extensions.json",
  images: "/data/images.json",
};

interface Entry {
  data: unknown | null;
  loading: boolean;
  reason: string | null;
}

/** Survives route changes within a session; a build-time file cannot change. */
const cache = new Map<DatasetKey, Entry>();

const DataCtx = createContext<Map<DatasetKey, Entry>>(cache);
const VersionCtx = createContext(0);

export function FactoryDataProvider({
  datasets,
  children,
}: {
  datasets: DatasetKey[];
  children: React.ReactNode;
}): React.JSX.Element {
  const [version, setVersion] = useState(0);
  const base = useBaseUrl("/");
  const wanted = useMemo(() => datasets.join(","), [datasets]);

  useEffect(() => {
    const missing = datasets.filter((k) => !cache.has(k));
    if (missing.length === 0) return;

    for (const k of missing) {
      cache.set(k, { data: null, loading: true, reason: null });
    }
    setVersion((v) => v + 1);

    // Each fetch signals on its own completion rather than waiting for the
    // batch. There is deliberately no `cancelled` flag: gating the signal on
    // one would let a superseded effect's fetches land in the shared cache with
    // nobody ever told, so a dataset would sit at loading:true forever after a
    // fast route change. A setState after unmount is a no-op in React 19, which
    // is by far the cheaper failure.
    for (const key of missing) {
      const url = base.replace(/\/$/, "") + DATASET_URLS[key];
      void (async () => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data: unknown = await res.json();
          cache.set(key, { data, loading: false, reason: null });
        } catch (err) {
          cache.set(key, {
            data: null,
            loading: false,
            reason:
              `${DATASET_URLS[key]} could not be read (${(err as Error).message}). ` +
              `It is generated at build time and may not exist in this environment.`,
          });
        }
        setVersion((v) => v + 1);
      })();
    }
    // Keyed on `wanted`, the stable identity of `datasets`; depending on the
    // array itself would re-run this on every render.
  }, [wanted, base, datasets]);

  return (
    <DataCtx.Provider value={cache}>
      <VersionCtx.Provider value={version}>{children}</VersionCtx.Provider>
    </DataCtx.Provider>
  );
}

export function useDataset<T>(key: DatasetKey): {
  data: T | null;
  loading: boolean;
  reason: string | null;
} {
  // The Map is mutated in place, so its identity never changes and cannot
  // drive a re-render on its own. VersionCtx is the subscription.
  useContext(VersionCtx);
  const map = useContext(DataCtx);
  const entry = map.get(key);
  if (!entry) return { data: null, loading: true, reason: null };
  return {
    data: entry.data as T | null,
    loading: entry.loading,
    reason: entry.reason,
  };
}

/**
 * Isolated so the per-second tick cannot re-render a page. Consume it only in a
 * small leaf component.
 */
export function useRefreshCountdown(seconds: number): number {
  const [left, setLeft] = useState(seconds);
  const ref = useRef(seconds);
  useEffect(() => {
    ref.current = seconds;
    const id = setInterval(() => {
      ref.current = ref.current <= 1 ? seconds : ref.current - 1;
      setLeft(ref.current);
    }, 1000);
    return () => clearInterval(id);
  }, [seconds]);
  return left;
}
