import { useState, useEffect, useCallback } from "react";

export interface UseScrollSpyOptions {
  readonly sectionIds?: readonly string[];
  readonly defaultValue?: string;
  readonly offsetRatio?: number;
}

export const DEFAULT_TRACKED_SECTIONS: readonly string[] = [
  "#scene-landing",
  "#scene-users",
  "#scene-developers",
  "#scene-mission",
  "#scene-picker",
  "#scene-community",
];

export function useScrollSpy(
  sectionIdsOrOptions?: readonly string[] | UseScrollSpyOptions,
  maybeOptions?: UseScrollSpyOptions,
): {
  activeSection: string;
  setActiveSection: React.Dispatch<React.SetStateAction<string>>;
  scrollTo: (sectionId: string) => void;
} {
  const options: UseScrollSpyOptions =
    sectionIdsOrOptions && Array.isArray(sectionIdsOrOptions)
      ? {
          sectionIds: sectionIdsOrOptions as readonly string[],
          ...maybeOptions,
        }
      : ((sectionIdsOrOptions as UseScrollSpyOptions | undefined) ?? {});

  const sectionIds = options.sectionIds ?? DEFAULT_TRACKED_SECTIONS;
  const defaultValue = options.defaultValue ?? (sectionIds[0] || "");
  const offsetRatio = options.offsetRatio ?? 0.5;

  const [activeSection, setActiveSection] = useState<string>(defaultValue);

  const calculateActiveSection = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const triggerY = window.innerHeight * offsetRatio;
    let current = sectionIds[0] || "";

    for (const id of sectionIds) {
      const el = document.querySelector(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= triggerY) {
          current = id;
        }
      }
    }

    setActiveSection((prev) => (prev !== current ? current : prev));
  }, [sectionIds, offsetRatio]);

  const scrollTo = useCallback((sectionId: string) => {
    if (typeof document === "undefined") return;
    const target = document.querySelector(sectionId);
    if (!target) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    target.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
    });

    if (target instanceof HTMLElement) {
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus({ preventScroll: true });
    }

    if (typeof window !== "undefined" && window.history?.pushState) {
      window.history.pushState(null, "", sectionId);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    calculateActiveSection();

    const handleScroll = () => {
      calculateActiveSection();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        () => {
          calculateActiveSection();
        },
        {
          threshold: [0, 0.25, 0.5, 0.75, 1],
        },
      );

      for (const id of sectionIds) {
        const el = document.querySelector(id);
        if (el) {
          observer.observe(el);
        }
      }
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      observer?.disconnect();
    };
  }, [sectionIds, calculateActiveSection]);

  return { activeSection, setActiveSection, scrollTo };
}
