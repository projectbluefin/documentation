import { readFileSync } from "node:fs";

const DEFAULT_SEED_PATH = new URL(
  "../data/report-history-seed.json",
  import.meta.url,
);
const DEFAULT_HISTORY_PATH = new URL(
  "../data/report-history.json",
  import.meta.url,
);

function isValidSnapshot(item) {
  if (
    !item ||
    typeof item !== "object" ||
    typeof item.period?.month !== "string" ||
    !item.period.month
  ) {
    return false;
  }
  if (item.schemaVersion !== undefined && item.schemaVersion !== 2) {
    return false;
  }
  return true;
}

function isValidHistory(payload) {
  return (
    payload !== null &&
    typeof payload === "object" &&
    payload.schemaVersion === 2 &&
    Array.isArray(payload.snapshots) &&
    payload.snapshots.every(isValidSnapshot)
  );
}

export function mergeReportHistory(history, snapshot) {
  if (
    !history ||
    typeof history !== "object" ||
    history.schemaVersion !== 2 ||
    !Array.isArray(history.snapshots)
  ) {
    throw new TypeError(
      `Invalid history payload: schemaVersion must be 2, got ${history?.schemaVersion}`,
    );
  }

  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    snapshot.schemaVersion !== 2
  ) {
    throw new TypeError(
      `Invalid snapshot payload: schemaVersion must be 2, got ${snapshot?.schemaVersion}`,
    );
  }

  const targetMonth = snapshot.period?.month;
  if (typeof targetMonth !== "string" || !targetMonth) {
    throw new TypeError(
      "Invalid snapshot payload: period.month must be a non-empty string",
    );
  }

  for (const item of history.snapshots) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.period?.month !== "string" ||
      !item.period.month
    ) {
      throw new TypeError("Invalid history snapshot: missing period.month");
    }
    if (item.schemaVersion !== undefined && item.schemaVersion !== 2) {
      throw new TypeError(
        `Incompatible schemaVersion in existing snapshot: expected 2, got ${item.schemaVersion}`,
      );
    }
  }

  const filtered = history.snapshots.filter(
    (item) => item.period.month !== targetMonth,
  );
  const nextSnapshots = [...filtered, snapshot].sort((a, b) =>
    a.period.month.localeCompare(b.period.month),
  );

  return {
    schemaVersion: 2,
    snapshots: nextSnapshots,
  };
}

export function readReportHistory(seedPath, historyPath, read = readFileSync) {
  const effectiveSeed = seedPath ?? DEFAULT_SEED_PATH;
  const effectiveHistory =
    historyPath !== undefined
      ? historyPath
      : seedPath === undefined
        ? DEFAULT_HISTORY_PATH
        : undefined;

  if (effectiveHistory) {
    try {
      const raw = read(effectiveHistory, "utf8");
      const parsed = JSON.parse(raw);
      if (isValidHistory(parsed)) {
        return parsed;
      }
    } catch {
      // Fall through to seed
    }
  }

  const rawSeed = read(effectiveSeed, "utf8");
  return JSON.parse(rawSeed);
}
