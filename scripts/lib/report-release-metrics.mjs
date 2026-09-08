const GITHUB_API = "https://api.github.com";

function reportWindow(period) {
  return { start: period.start, end: period.end };
}

function releaseApiUrl(repository) {
  return `${GITHUB_API}/repos/${repository}/releases`;
}

function boundary(value, endOfDay = false) {
  if (typeof value !== "string") return NaN;
  const input =
    /^\d{4}-\d{2}-\d{2}$/.test(value) && endOfDay
      ? `${value}T23:59:59.999Z`
      : /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? `${value}T00:00:00.000Z`
        : value;
  return Date.parse(input);
}

function inReportWindow(publishedAt, period) {
  const timestamp = Date.parse(publishedAt ?? "");
  const start = boundary(period.start);
  const end = boundary(period.end, true);
  return (
    Number.isFinite(timestamp) &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    timestamp >= start &&
    timestamp <= end
  );
}

function unavailableSource(repository, period, url, stateReason) {
  return {
    id: "github-releases",
    ...(repository ? { repository } : {}),
    status: "unavailable",
    stateReason,
    url,
    window: reportWindow(period),
  };
}

function availableSource(repository, period, url) {
  return {
    id: "github-releases",
    ...(repository ? { repository } : {}),
    status: "available",
    stateReason: null,
    url,
    window: reportWindow(period),
  };
}

function normalizeRelease(repository, release, period) {
  const publishedAt = release?.published_at;
  if (!repository || !inReportWindow(publishedAt, period)) {
    return null;
  }

  return {
    id: release.id ?? `${repository}:${publishedAt}:${release.tag_name ?? ""}`,
    repository,
    name: release.name ?? null,
    tagName: release.tag_name ?? null,
    publishedAt,
    url: release.html_url ?? null,
  };
}

/**
 * Normalize public release responses into report events and provenance.
 *
 * @param {Array<{repository: string, url: string, releases?: Array, unavailableReason?: string}>} responses
 * @param {{start: string, end: string}} period
 * @returns {{events: Array, sources: Array}}
 */
export function normalizeReleaseEvents(responses, period) {
  const entries = responses ?? [];
  const successful = entries.filter(
    (entry) => !entry.unavailableReason && Array.isArray(entry.releases),
  );

  const events = successful.flatMap((entry) =>
    entry.releases
      .map((release) => normalizeRelease(entry.repository, release, period))
      .filter(Boolean),
  );

  let sources;
  if (entries.length === 0) {
    sources = [
      unavailableSource(
        null,
        period,
        `${GITHUB_API}/repos`,
        "No configured public GitHub release source",
      ),
    ];
  } else {
    sources = entries.map((entry) =>
      entry.unavailableReason
        ? unavailableSource(
            entry.repository,
            period,
            entry.url,
            entry.unavailableReason,
          )
        : availableSource(entry.repository, period, entry.url),
    );
  }

  return { events, sources };
}

export async function fetchReleaseEvents(
  entries,
  period,
  fetchImpl = globalThis.fetch,
) {
  const eligible = (entries ?? []).filter(
    (entry) =>
      typeof entry?.repository === "string" &&
      entry.signals?.includes("releases"),
  );

  const responses = await Promise.all(
    eligible.map(async ({ repository }) => {
      const url = releaseApiUrl(repository);
      try {
        const response = await fetchImpl(url);
        if (!response?.ok) {
          return {
            repository,
            url,
            unavailableReason: `HTTP ${response?.status ?? "unknown"}`,
          };
        }

        const releases = await response.json();
        if (!Array.isArray(releases)) {
          return {
            repository,
            url,
            unavailableReason: "GitHub releases response was not an array",
          };
        }
        return { repository, url, releases };
      } catch (error) {
        return {
          repository,
          url,
          unavailableReason:
            error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );

  return normalizeReleaseEvents(responses, period);
}
