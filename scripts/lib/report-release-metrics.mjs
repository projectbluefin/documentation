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

function aggregateSource(entries, period) {
  const sourceUrls = entries.map((entry) => entry.url).filter(Boolean);
  const sourceUrl =
    sourceUrls.length === 1 ? sourceUrls[0] : `${GITHUB_API}/repos`;
  const failures = entries
    .map((entry) => entry.unavailableReason)
    .filter((reason) => typeof reason === "string" && reason.length > 0);

  if (entries.length === 0) {
    return unavailableSource(
      null,
      period,
      sourceUrl,
      "No configured public GitHub release source",
    );
  }
  if (failures.length > 0) {
    return unavailableSource(null, period, sourceUrl, failures.join("; "));
  }
  return availableSource(null, period, sourceUrl);
}

function nextReleasePage(response) {
  const raw =
    typeof response?.headers?.get === "function"
      ? response.headers.get("link")
      : response?.headers?.link;
  const next = String(raw ?? "")
    .split(",")
    .map((part) => part.trim())
    .find((part) => /;\s*rel="?next"?/.test(part));
  return next?.match(/<([^>]+)>/)?.[1] ?? null;
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
 * @returns {{events: Array, source: object, sources: Array}}
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

  return { events, source: aggregateSource(entries, period), sources };
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
        let nextUrl = url;
        const releases = [];
        while (nextUrl) {
          const response = await fetchImpl(nextUrl);
          if (!response?.ok) {
            return {
              repository,
              url,
              releases,
              unavailableReason: `HTTP ${response?.status ?? "unknown"}`,
            };
          }

          const page = await response.json();
          if (!Array.isArray(page)) {
            return {
              repository,
              url,
              releases,
              unavailableReason: "GitHub releases response was not an array",
            };
          }
          releases.push(...page);
          nextUrl = nextReleasePage(response);
        }
        return { repository, url, releases };
      } catch (error) {
        return {
          repository,
          url,
          releases: [],
          unavailableReason:
            error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );

  return normalizeReleaseEvents(responses, period);
}
