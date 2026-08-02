const test = require("node:test");
const assert = require("node:assert/strict");
const {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("fs");
const { join } = require("path");
const { execFileSync } = require("child_process");

const SHA =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const bluefinContext = {
  product: "bluefin",
  project_name: "Bluefin",
  tag: "stable-20260802",
  published_at: "2026-08-02T00:00:00Z",
  primary_image: "ghcr.io/projectbluefin/bluefin",
  primary_digest: SHA,
  badge_label: "Stable",
  components: [
    { label: "Kernel", version: "6.17.1", previous_version: "6.17.0" },
    { label: "Mesa", version: "25.1.2", previous_version: "25.1.1" },
  ],
  change_counts: { updated: 12, added: 3, removed: 1 },
  variants: [{ name: "bluefin", digest: SHA }],
};

const dakotaContext = {
  ...bluefinContext,
  product: "dakota",
  project_name: "Dakota",
  tag: "dakota-20260802",
  primary_image: "ghcr.io/projectbluefin/dakota",
  badge_label: "Dakota",
  components: [
    { label: "Kernel", version: "6.18.0", previous_version: "6.17.1" },
    { label: "BuildStream", version: "2.4.1", previous_version: null },
  ],
  change_counts: { updated: 4, added: 1, removed: 0 },
  variants: [{ name: "dakota", digest: SHA }],
};

function testDirectory() {
  return mkdtempSync(join(process.cwd(), "scripts", ".release-card-test-"));
}

async function renderFixture(context) {
  const { renderReleaseCards } = await import("./render-release-card.mjs");
  const directory = testDirectory();
  try {
    const result = await renderReleaseCards(context, join(directory, "cards"));
    return {
      directory,
      result,
      light: readFileSync(result.lightPath),
      dark: readFileSync(result.darkPath),
    };
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

for (const [name, context] of [
  ["Bluefin", bluefinContext],
  ["Dakota", dakotaContext],
]) {
  test(`${name} release context renders distinct, non-blank light and dark cards`, async () => {
    const { validatePngBuffer, releaseCardText } =
      await import("./render-release-card.mjs");
    const fixture = await renderFixture(context);
    try {
      const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      assert.deepEqual(fixture.light.subarray(0, 8), signature);
      assert.deepEqual(fixture.dark.subarray(0, 8), signature);
      assert.ok(fixture.light.length > 68);
      assert.ok(fixture.dark.length > 68);
      const lightInfo = validatePngBuffer(fixture.light);
      const darkInfo = validatePngBuffer(fixture.dark);
      assert.equal(lightInfo.width, 1600);
      assert.equal(lightInfo.height, 600);
      assert.ok(lightInfo.nonTransparentPixels > 0);
      assert.equal(darkInfo.width, 1600);
      assert.equal(darkInfo.height, 600);
      assert.ok(darkInfo.nonTransparentPixels > 0);
      assert.notDeepEqual(fixture.light, fixture.dark);

      const text = releaseCardText(context);
      assert.match(text, new RegExp(context.tag));
      for (const component of context.components) {
        assert.match(text, new RegExp(component.version));
      }
    } finally {
      rmSync(fixture.directory, { recursive: true, force: true });
    }
  });
}

test("invalid release context fails before image creation", async () => {
  const { renderReleaseCards } = await import("./render-release-card.mjs");
  const directory = testDirectory();
  try {
    await assert.rejects(
      () =>
        renderReleaseCards(
          { ...bluefinContext, components: [] },
          join(directory, "cards"),
        ),
      /components must contain between one and twelve components/,
    );
    assert.throws(() =>
      readFileSync(join(directory, "cards", "release-card.png")),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("command-line renderer writes the documented output names", () => {
  const directory = testDirectory();
  try {
    const contextPath = join(directory, "context.json");
    const outputDir = join(directory, "cards");
    writeFileSync(contextPath, JSON.stringify(bluefinContext));
    execFileSync(
      process.execPath,
      [
        "scripts/render-release-card.mjs",
        "--context",
        contextPath,
        "--output-dir",
        outputDir,
      ],
      { cwd: process.cwd(), stdio: "pipe" },
    );
    assert.ok(existsSync(join(outputDir, "release-card.png")));
    assert.ok(existsSync(join(outputDir, "release-card-dark.png")));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
