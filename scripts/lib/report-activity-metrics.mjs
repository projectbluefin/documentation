function parseUtcDate(value) {
  if (typeof value !== "string") return null;
  const input = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00.000Z`
    : value;
  const time = Date.parse(input);
  return Number.isFinite(time) ? new Date(time) : null;
}

function datesInclusive(start, end) {
  const first = parseUtcDate(start);
  const last = parseUtcDate(end);
  if (!first || !last || first > last) return [];

  const dates = [];
  for (
    const current = new Date(first);
    current <= last;
    current.setUTCDate(current.getUTCDate() + 1)
  ) {
    dates.push(current.toISOString().slice(0, 10));
  }
  return dates;
}

function increment(values, key) {
  if (typeof key !== "string" || key.trim() === "") return;
  values.set(key, (values.get(key) ?? 0) + 1);
}

function sortedEntries(values) {
  return [...values.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => ({ name, value }));
}

export function buildActivityMetrics(items = [], { start, end }) {
  const days = datesInclusive(start, end);
  const totals = new Map(days.map((date) => [date, 0]));
  const repositories = new Map();
  const categories = new Map();

  for (const item of items ?? []) {
    const day = item?.mergedAt?.slice?.(0, 10);
    if (totals.has(day)) totals.set(day, totals.get(day) + 1);

    increment(repositories, item?.repository);
    for (const label of item?.labels ?? []) {
      increment(categories, label?.name);
    }
  }

  return {
    dailyMerges: days.map((date) => ({ date, value: totals.get(date) })),
    repositoryCounts: sortedEntries(repositories),
    categoryCounts: sortedEntries(categories),
  };
}
