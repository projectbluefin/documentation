export const REPORT_PORTFOLIO = [
  {
    repository: "projectbluefin/bluefin",
    tier: "stable",
    signals: ["activity", "lanes", "releases"],
  },
  {
    repository: "projectbluefin/bluefin-lts",
    tier: "stable",
    signals: ["activity", "lanes", "releases"],
  },
  {
    repository: "projectbluefin/dakota",
    tier: "stable",
    signals: ["activity", "lanes", "releases"],
  },
  {
    repository: "projectbluefin/testsuite",
    tier: "stable",
    signals: ["activity", "tests"],
  },
  {
    repository: "projectbluefin/server",
    tier: "stable",
    signals: ["activity", "releases"],
  },
  {
    repository: "projectbluefin/actions",
    tier: "stable",
    signals: ["activity"],
  },
  {
    repository: "projectbluefin/bonedigger",
    tier: "stable",
    signals: ["activity"],
  },
  {
    repository: "projectbluefin/aurorafin-shared",
    tier: "stable",
    signals: ["activity"],
  },
  {
    repository: "projectbluefin/utah",
    tier: "experimental",
    signals: ["activity"],
  },
  {
    repository: "projectbluefin/utah-packages",
    tier: "experimental",
    signals: ["activity"],
  },
  { repository: "ublue-os/artwork", tier: "ecosystem", signals: ["activity"] },
  {
    repository: "ublue-os/homebrew-tap",
    tier: "ecosystem",
    signals: ["tap-promotions"],
  },
  {
    repository: "ublue-os/homebrew-experimental-tap",
    tier: "ecosystem",
    signals: ["tap-promotions"],
  },
];

export function findPortfolioEntry(repository) {
  return (
    REPORT_PORTFOLIO.find((entry) => entry.repository === repository) ?? null
  );
}
