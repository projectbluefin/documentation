import { useEffect, useRef, useState, type RefObject } from "react";
import { FX_FALLBACK_THEME, resolveFxTheme, type FxTheme } from "./chartTheme";

/**
 * The resolved `--fx-*` chart palette, for the values a component needs in
 * JavaScript rather than in CSS.
 *
 * Most colour belongs in a stylesheet as `var(--fx-cat-1)`. This exists for the
 * cases that cannot: a series colour inside an ECharts option, an SVG stroke
 * passed to `Sparkline`, a per-cell label ink. Those used to be hex literals
 * copied out of `tokens.css`, which is how the two palettes drifted apart.
 *
 * Attach the returned ref to an element inside `.fxRoot`. Before mount — and so
 * during static generation — the fallback ramp applies, which matters only for
 * the `<details>` table, since charts do not paint server-side.
 */
export function useFactoryTheme(): [RefObject<HTMLDivElement | null>, FxTheme] {
  const ref = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<FxTheme>(FX_FALLBACK_THEME);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      if (ref.current) setTheme(resolveFxTheme(ref.current));
    };
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return [ref, theme];
}
