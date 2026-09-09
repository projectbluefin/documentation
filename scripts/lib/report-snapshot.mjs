function normalizeSource(source) {
  if (source.status === "available") {
    return { ...source, stateReason: null };
  }
  if (
    source.status === "unavailable" &&
    typeof source.stateReason === "string"
  ) {
    return source;
  }
  throw new TypeError(`Invalid report source: ${source.id}`);
}

export function buildReportSnapshot({
  period,
  sources,
  activity,
  delivery,
  participation,
  ecosystem,
  history,
}) {
  return {
    schemaVersion: 2,
    period,
    sources: sources.map(normalizeSource),
    activity,
    delivery,
    participation,
    ecosystem,
    history,
  };
}
