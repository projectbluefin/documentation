import React from "react";
import type { FirehoseApp, FirehoseFilterState } from "../types/firehose";
import styles from "./FirehoseFilters.module.css";

interface FirehoseFiltersProps {
  apps: FirehoseApp[];
  filters: FirehoseFilterState;
  onFiltersChange: (next: FirehoseFilterState) => void;
  matchCount: number;
}

/** Collect unique categories from all apps */
function getCategories(apps: FirehoseApp[]): string[] {
  const set = new Set<string>();
  for (const app of apps) {
    if (app.categories) {
      for (const cat of app.categories) set.add(cat);
    }
  }
  return Array.from(set).sort();
}

/** Collect unique appSets from all apps */
function getAppSets(apps: FirehoseApp[]): string[] {
  const set = new Set<string>();
  for (const app of apps) {
    if (app.appSet) set.add(app.appSet);
  }
  return Array.from(set).sort();
}

const UPDATED_OPTIONS = [
  { value: "all", label: "Any time" },
  { value: "1d", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
] as const;

const PACKAGE_TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "flatpak", label: "Flathub" },
  { value: "homebrew", label: "Homebrew" },
  { value: "os", label: "OS Release" },
] as const;

const FirehoseFilters: React.FC<FirehoseFiltersProps> = ({
  apps,
  filters,
  onFiltersChange,
  matchCount,
}) => {
  const categories = getCategories(apps);
  const appSets = getAppSets(apps);

  const hasActiveFilters =
    filters.packageType !== "all" ||
    filters.category !== "all" ||
    filters.appSet !== "all" ||
    filters.updatedWithin !== "all";

  function clearAll() {
    onFiltersChange({
      packageType: "all",
      category: "all",
      appSet: "all",
      updatedWithin: "all",
      verifiedOnly: false,
      unverifiedOnly: false,
      showEverything: false,
    });
  }

  return (
    <aside className={styles.sidebar}>
      {/* Result count */}
      <div className={styles.resultCount}>
        <strong>{matchCount}</strong> app{matchCount !== 1 ? "s" : ""}
        {hasActiveFilters && (
          <>
            {" "}
            <button className={styles.clearAll} onClick={clearAll}>
              Clear all
            </button>
          </>
        )}
      </div>

      {/* Package Type */}
      <section className={styles.filterSection}>
        <h3 className={styles.filterHeading}>Package Type</h3>
        <select
          className={styles.select}
          value={filters.packageType}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              packageType: e.target.value as FirehoseFilterState["packageType"],
            })
          }
        >
          {PACKAGE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </section>

      {/* Category — only if any app has categories */}
      {categories.length > 0 && (
        <section className={styles.filterSection}>
          <h3 className={styles.filterHeading}>Category</h3>
          <select
            className={styles.select}
            value={filters.category}
            onChange={(e) =>
              onFiltersChange({ ...filters, category: e.target.value })
            }
          >
            <option value="all">All</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </section>
      )}

      {/* App Set */}
      {appSets.length > 0 && (
        <section className={styles.filterSection}>
          <h3 className={styles.filterHeading}>App Set</h3>
          <select
            className={styles.select}
            value={filters.appSet}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                appSet: e.target.value as FirehoseFilterState["appSet"],
              })
            }
          >
            <option value="all">All</option>
            {appSets.map((s) => (
              <option key={s} value={s}>
                {s === "core" ? "Core" : s === "dx" ? "DX" : s}
              </option>
            ))}
          </select>
        </section>
      )}

      {/* Updated within */}
      <section className={styles.filterSection}>
        <h3 className={styles.filterHeading}>Updated</h3>
        <select
          className={styles.select}
          value={filters.updatedWithin}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              updatedWithin: e.target.value as FirehoseFilterState["updatedWithin"],
            })
          }
        >
          {UPDATED_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </section>

      {/* Show Everything toggle */}
      <section className={styles.filterSection}>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={filters.showEverything}
            onChange={(e) =>
              onFiltersChange({ ...filters, showEverything: e.target.checked })
            }
          />
          <span>Show Everything</span>
        </label>
      </section>
    </aside>
  );
};

export default FirehoseFilters;
