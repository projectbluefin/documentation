const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadTsModule(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    require,
    mod,
    mod.exports,
  );
  return mod.exports;
}

const modelPath = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "portal",
  "portalChooserModel.ts",
);

test("chooser model initializes to release step with empty selection", () => {
  const { INITIAL_CHOOSER_STATE, REGISTRY_URL, BASE_DOWNLOAD_URL } =
    loadTsModule(modelPath);
  assert.equal(INITIAL_CHOOSER_STATE.step, "release");
  assert.deepEqual(INITIAL_CHOOSER_STATE.selection, {});
  assert.equal(
    REGISTRY_URL,
    "https://github.com/orgs/ublue-os/packages?repo_name=bluefin",
  );
  assert.equal(BASE_DOWNLOAD_URL, "https://download.projectbluefin.io");
});

test("selecting unavailable release leaves state unchanged", () => {
  const { INITIAL_CHOOSER_STATE, selectRelease } = loadTsModule(modelPath);
  const next = selectRelease(INITIAL_CHOOSER_STATE, "stable", false);
  assert.deepEqual(next, INITIAL_CHOOSER_STATE);
});

test("flow: Stable -> x86 -> AMD yields correct URLs", () => {
  const {
    INITIAL_CHOOSER_STATE,
    selectRelease,
    selectArchitecture,
    selectGpu,
    formatImageName,
    formatIsoFilename,
    formatIsoUrl,
    formatChecksumUrl,
    formatBootcCommand,
  } = loadTsModule(modelPath);

  let state = selectRelease(INITIAL_CHOOSER_STATE, "stable", true);
  assert.equal(state.step, "architecture");
  assert.equal(state.selection.stream, "stable");

  state = selectArchitecture(state, "x86");
  assert.equal(state.step, "gpu");
  assert.equal(state.selection.arch, "x86");

  state = selectGpu(state, "amd");
  assert.equal(state.step, "download");
  assert.equal(state.selection.gpu, "amd");

  assert.equal(formatImageName(state.selection), "bluefin-stable-x86_64");
  assert.equal(formatIsoFilename(state.selection), "bluefin-stable-x86_64.iso");
  assert.equal(
    formatIsoUrl(state.selection),
    "https://download.projectbluefin.io/bluefin-stable-x86_64.iso",
  );
  assert.equal(
    formatChecksumUrl(state.selection),
    "https://download.projectbluefin.io/bluefin-stable-x86_64.iso-CHECKSUM",
  );
  assert.equal(
    formatBootcCommand(state.selection),
    "sudo bootc switch ghcr.io/ublue-os/bluefin:stable --enforce-container-sigpolicy",
  );
});

test("flow: Stable -> x86 -> Nvidia yields nvidia-open suffix", () => {
  const {
    INITIAL_CHOOSER_STATE,
    selectRelease,
    selectArchitecture,
    selectGpu,
    formatIsoFilename,
    formatIsoUrl,
    formatChecksumUrl,
    formatBootcCommand,
  } = loadTsModule(modelPath);

  let state = selectRelease(INITIAL_CHOOSER_STATE, "stable", true);
  state = selectArchitecture(state, "x86");
  state = selectGpu(state, "nvidia");
  assert.equal(state.step, "download");
  assert.equal(
    formatIsoFilename(state.selection),
    "bluefin-nvidia-open-stable-x86_64.iso",
  );
  assert.equal(
    formatIsoUrl(state.selection),
    "https://download.projectbluefin.io/bluefin-nvidia-open-stable-x86_64.iso",
  );
  assert.equal(
    formatChecksumUrl(state.selection),
    "https://download.projectbluefin.io/bluefin-nvidia-open-stable-x86_64.iso-CHECKSUM",
  );
  assert.equal(
    formatBootcCommand(state.selection),
    "sudo bootc switch ghcr.io/ublue-os/bluefin-nvidia-open:stable --enforce-container-sigpolicy",
  );
});

test("back navigation retreats step-by-step and clears downstream choices", () => {
  const {
    INITIAL_CHOOSER_STATE,
    selectRelease,
    selectArchitecture,
    selectGpu,
    navigateBack,
    resetChooser,
  } = loadTsModule(modelPath);

  let state = selectRelease(INITIAL_CHOOSER_STATE, "stable", true);
  state = selectArchitecture(state, "x86");
  state = selectGpu(state, "nvidia");
  assert.equal(state.step, "download");

  state = navigateBack(state);
  assert.equal(state.step, "gpu");
  assert.equal(state.selection.gpu, undefined);

  state = navigateBack(state);
  assert.equal(state.step, "architecture");
  assert.equal(state.selection.arch, undefined);

  state = navigateBack(state);
  assert.equal(state.step, "release");
  assert.deepEqual(state.selection, {});

  // Navigating back at release step is a no-op
  state = navigateBack(state);
  assert.equal(state.step, "release");

  assert.deepEqual(resetChooser(), INITIAL_CHOOSER_STATE);
});

test("formatBootcCommand generates expected commands across all hardware and stream selections", () => {
  const { formatBootcCommand } = loadTsModule(modelPath);

  // Defaults and fallbacks
  assert.equal(
    formatBootcCommand({}),
    "sudo bootc switch ghcr.io/ublue-os/bluefin:stable --enforce-container-sigpolicy",
  );
  assert.equal(
    formatBootcCommand({ stream: "stable" }),
    "sudo bootc switch ghcr.io/ublue-os/bluefin:stable --enforce-container-sigpolicy",
  );

  // Stable permutations
  assert.equal(
    formatBootcCommand({
      stream: "stable",
      arch: "x86",
      gpu: "amd",
    }),
    "sudo bootc switch ghcr.io/ublue-os/bluefin:stable --enforce-container-sigpolicy",
  );
  assert.equal(
    formatBootcCommand({
      stream: "stable",
      arch: "x86",
      gpu: "nvidia",
    }),
    "sudo bootc switch ghcr.io/ublue-os/bluefin-nvidia-open:stable --enforce-container-sigpolicy",
  );
});
