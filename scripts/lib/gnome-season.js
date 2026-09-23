const WEEK = 7 * 86400;

// 1970-01-01 was Thursday (weekday 4); align unix days to Sunday starts.
function sundayStart(ms) {
  const day = Math.floor(ms / 86400000);
  return (day - ((day + 4) % 7)) * 86400;
}

function releaseFromFeed(feed, now = Date.now()) {
  const entries = [...feed.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/g)];
  const released = entries
    .map(([, entry]) => {
      const version = Number(
        entry.match(/<title>Introducing GNOME (\d+)<\/title>/)?.[1],
      );
      const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
      return { version, timestamp: Date.parse(published) };
    })
    .filter(
      ({ version, timestamp }) =>
        version > 0 && Number.isFinite(timestamp) && timestamp <= now,
    )
    .sort((a, b) => b.version - a.version)[0];
  if (!released)
    throw new Error("No published GNOME release in the official feed");
  return {
    version: released.version,
    start: new Date(released.timestamp).toISOString(),
    source: `https://release.gnome.org/${released.version}/`,
  };
}

function parseSeason(feed, notes, now = Date.now()) {
  const released = releaseFromFeed(feed, now);
  const heading = notes
    .match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1]
    ?.replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;|\u00a0/g, " ");
  const nickname = heading?.match(
    new RegExp(`GNOME\\s*${released.version}\\s*,\\s*[“\"]([^”\"]+)[”\"]`),
  )?.[1];
  if (!nickname)
    throw new Error(
      `GNOME ${released.version} nickname missing from its release notes`,
    );
  return { ...released, name: nickname };
}

function collectSeason(
  season,
  commitsByRepo,
  now = Date.now(),
  isBot = () => false,
) {
  const start = Date.parse(season.start);
  const first = sundayStart(start);
  const last = sundayStart(now);
  const weekStarts = [];
  const weeklyCommits = [];
  for (let week = first; week <= last; week += WEEK) {
    weekStarts.push(week);
    weeklyCommits.push(0);
  }
  const byLogin = {};
  let totalCommits = 0;
  for (const [repo, commits] of Object.entries(commitsByRepo)) {
    for (const item of commits) {
      const login = item?.author?.login;
      if (item?.parents?.length > 1) continue;
      const landed = Date.parse(item?.commit?.committer?.date);
      if (
        !login ||
        isBot(login) ||
        !Number.isFinite(landed) ||
        landed < start ||
        landed > now
      )
        continue;
      const week = sundayStart(landed);
      const index = (week - first) / WEEK;
      if (!byLogin[login]) byLogin[login] = { commits: 0, repos: {} };
      byLogin[login].commits++;
      byLogin[login].repos[repo] = (byLogin[login].repos[repo] || 0) + 1;
      weeklyCommits[index]++;
      totalCommits++;
    }
  }
  return { byLogin, weekStarts, weeklyCommits, totalCommits };
}

async function fetchSeasonCommits(repos, start, end, request) {
  const byRepo = {};
  await Promise.all(
    repos.map(async (repo) => {
      const commits = [];
      let url = `https://api.github.com/repos/projectbluefin/${repo}/commits?since=${encodeURIComponent(start)}&until=${encodeURIComponent(end)}&per_page=100`;
      while (url) {
        const response = await request(url);
        if ([204, 404, 409].includes(response.status)) break;
        if (!response.ok) throw new Error(`${repo}: HTTP ${response.status}`);
        const page = await response.json();
        if (!Array.isArray(page))
          throw new Error(`${repo}: invalid commit response`);
        for (const { author, commit, parents } of page) {
          commits.push({
            author: author ? { login: author.login } : null,
            commit: { committer: { date: commit?.committer?.date } },
            parents,
          });
        }
        const next = response.headers
          .get("Link")
          ?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
        if (next && new URL(next).origin !== "https://api.github.com")
          throw new Error(`${repo}: unsafe pagination URL`);
        url = next || null;
      }
      byRepo[repo] = commits;
    }),
  );
  return byRepo;
}

module.exports = {
  releaseFromFeed,
  parseSeason,
  collectSeason,
  fetchSeasonCommits,
};
