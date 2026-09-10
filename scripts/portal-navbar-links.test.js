const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const configPath = path.join(root, "docusaurus.config.ts");
const configContent = fs.readFileSync(configPath, "utf8");

test("docusaurus.config.ts contains complete reconciled navbar navigation links", () => {
  // Left links: Documentation, Ask Bluefin (https://ask.projectbluefin.io)
  assert.match(
    configContent,
    /type:\s*"docSidebar"[\s\S]*position:\s*"left"[\s\S]*label:\s*"Documentation"/,
    "navbar must include Documentation on the left",
  );
  assert.match(
    configContent,
    /href:\s*"https:\/\/ask\.projectbluefin\.io"[\s\S]*label:\s*"Ask Bluefin"[\s\S]*position:\s*"left"/,
    "navbar must include Ask Bluefin on the left",
  );

  // Right links: Blog, Changelogs, Reports, Leaderboards, Hive, Discussions, Analytics, Store
  assert.match(
    configContent,
    /to:\s*"blog"[\s\S]*label:\s*"Blog"[\s\S]*position:\s*"right"/,
    "navbar must include Blog on the right",
  );
  assert.match(
    configContent,
    /to:\s*"changelogs"[\s\S]*label:\s*"Changelogs"[\s\S]*position:\s*"right"/,
    "navbar must include Changelogs on the right",
  );
  assert.match(
    configContent,
    /href:\s*"https:\/\/docs\.projectbluefin\.io\/reports"[\s\S]*label:\s*"Reports"[\s\S]*position:\s*"right"/,
    "navbar must include Reports on the right",
  );
  assert.match(
    configContent,
    /href:\s*"https:\/\/github\.com\/ublue-os\/bluefin\/discussions"[\s\S]*label:\s*"Discussions"[\s\S]*position:\s*"right"/,
    "navbar must include Discussions on the right",
  );
  assert.match(
    configContent,
    /to:\s*"\/analytics"[\s\S]*label:\s*"Analytics"[\s\S]*position:\s*"right"/,
    "navbar must include Analytics on the right",
  );
  assert.match(
    configContent,
    /href:\s*"https:\/\/store\.projectbluefin\.io"[\s\S]*label:\s*"Store"[\s\S]*position:\s*"right"/,
    "navbar must include Store on the right",
  );
});
