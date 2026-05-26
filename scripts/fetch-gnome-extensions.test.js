const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  buildExtensionRecord,
  isStale,
} = require("./fetch-gnome-extensions.js");

test("buildExtensionRecord normalizes remote GNOME extension fields", () => {
  assert.deepEqual(
    buildExtensionRecord(5724, {
      uuid: "battery-health@example.com",
      name: "Battery Health",
      creator: "Bluefin",
      creator_url: "/accounts/profile/bluefin",
      description: "Keeps your battery healthy",
      screenshot: "/static/screenshots/battery.png",
      icon: "/static/icons/battery.png",
      donate_url: "https://example.com/donate",
    }, "/img/extensions/5724.png"),
    {
      id: 5724,
      uuid: "battery-health@example.com",
      name: "Battery Health",
      creator: "Bluefin",
      creatorUrl: "https://extensions.gnome.org/accounts/profile/bluefin",
      description: "Keeps your battery healthy",
      url: "https://extensions.gnome.org/extension/5724/",
      screenshot: "/img/extensions/5724.png",
      remoteScreenshot: "https://extensions.gnome.org/static/screenshots/battery.png",
      icon: "https://extensions.gnome.org/static/icons/battery.png",
      donateUrl: "https://example.com/donate",
    },
  );
});

test("isStale returns true when the cache file does not exist", () => {
  assert.equal(
    isStale(path.join(__dirname, "..", "static", "data", "missing-gnome-extensions.json")),
    true,
  );
});
