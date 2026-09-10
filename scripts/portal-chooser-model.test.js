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
  const next = selectRelease(INITIAL_CHOOSER_STATE, "lts", false);
  assert.deepEqual(next, INITIAL_CHOOSER_STATE);
});

test("flow: Stable -> x86 -> AMD yields regular kernel and correct URLs", () => {
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
  assert.equal(state.selection.kernel, "regular");

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
    "sudo bootc switch ghcr.io/projectbluefin/bluefin:stable --enforce-container-sigpolicy",
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
    "sudo bootc switch ghcr.io/projectbluefin/bluefin-nvidia:stable --enforce-container-sigpolicy",
  );
});

test("flow: LTS -> x86 -> AMD requires kernel selection", () => {
  const {
    INITIAL_CHOOSER_STATE,
    selectRelease,
    selectArchitecture,
    selectGpu,
    selectKernel,
    formatIsoFilename,
    formatIsoUrl,
    formatChecksumUrl,
    formatBootcCommand,
  } = loadTsModule(modelPath);

  let state = selectRelease(INITIAL_CHOOSER_STATE, "lts", true);
  state = selectArchitecture(state, "x86");
  state = selectGpu(state, "amd");
  assert.equal(state.step, "kernel");
  assert.equal(state.selection.kernel, undefined);

  const regularState = selectKernel(state, "regular");
  assert.equal(regularState.step, "download");
  assert.equal(
    formatIsoFilename(regularState.selection),
    "bluefin-lts-x86_64.iso",
  );
  assert.equal(
    formatIsoUrl(regularState.selection),
    "https://download.projectbluefin.io/bluefin-lts-x86_64.iso",
  );
  assert.equal(
    formatChecksumUrl(regularState.selection),
    "https://download.projectbluefin.io/bluefin-lts-x86_64.iso-CHECKSUM",
  );
  assert.equal(
    formatBootcCommand(regularState.selection),
    "sudo bootc switch ghcr.io/projectbluefin/bluefin-lts:stable --enforce-container-sigpolicy",
  );

  const hweState = selectKernel(state, "hwe");
  assert.equal(hweState.step, "download");
  assert.equal(
    formatIsoFilename(hweState.selection),
    "bluefin-lts-hwe-x86_64.iso",
  );
  assert.equal(
    formatIsoUrl(hweState.selection),
    "https://download.projectbluefin.io/bluefin-lts-hwe-x86_64.iso",
  );
  assert.equal(
    formatChecksumUrl(hweState.selection),
    "https://download.projectbluefin.io/bluefin-lts-hwe-x86_64.iso-CHECKSUM",
  );
  assert.equal(
    formatBootcCommand(hweState.selection),
    "sudo bootc switch ghcr.io/projectbluefin/bluefin-lts:lts-hwe --enforce-container-sigpolicy",
  );
});

test("flow: LTS -> x86 -> Nvidia creates GDX and skips kernel step", () => {
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

  let state = selectRelease(INITIAL_CHOOSER_STATE, "lts", true);
  state = selectArchitecture(state, "x86");
  state = selectGpu(state, "nvidia");
  assert.equal(state.step, "download");
  assert.equal(state.selection.kernel, "regular");
  assert.equal(
    formatIsoFilename(state.selection),
    "bluefin-gdx-lts-x86_64.iso",
  );
  assert.equal(
    formatIsoUrl(state.selection),
    "https://download.projectbluefin.io/bluefin-gdx-lts-x86_64.iso",
  );
  assert.equal(
    formatChecksumUrl(state.selection),
    "https://download.projectbluefin.io/bluefin-gdx-lts-x86_64.iso-CHECKSUM",
  );
  assert.equal(
    formatBootcCommand(state.selection),
    "sudo bootc switch ghcr.io/projectbluefin/bluefin-lts-nvidia:stable --enforce-container-sigpolicy",
  );
});

test("flow: ARM architecture switches to LTS and jumps directly to download", () => {
  const {
    INITIAL_CHOOSER_STATE,
    selectRelease,
    selectArchitecture,
    formatIsoFilename,
    formatIsoUrl,
    formatChecksumUrl,
    formatBootcCommand,
  } = loadTsModule(modelPath);

  let state = selectRelease(INITIAL_CHOOSER_STATE, "stable", true);
  state = selectArchitecture(state, "arm");
  assert.equal(state.step, "download");
  assert.equal(state.selection.stream, "lts");
  assert.equal(state.selection.arch, "arm");
  assert.equal(state.selection.gpu, undefined);
  assert.equal(state.selection.kernel, "regular");
  assert.equal(formatIsoFilename(state.selection), "bluefin-lts-aarch64.iso");
  assert.equal(
    formatIsoUrl(state.selection),
    "https://download.projectbluefin.io/bluefin-lts-aarch64.iso",
  );
  assert.equal(
    formatChecksumUrl(state.selection),
    "https://download.projectbluefin.io/bluefin-lts-aarch64.iso-CHECKSUM",
  );
  assert.equal(
    formatBootcCommand(state.selection),
    "sudo bootc switch ghcr.io/projectbluefin/bluefin-lts:stable --enforce-container-sigpolicy",
  );

  let ltsArmState = selectArchitecture(
    selectRelease(INITIAL_CHOOSER_STATE, "lts", true),
    "arm",
  );
  assert.equal(ltsArmState.step, "download");
  assert.equal(ltsArmState.selection.stream, "lts");
  assert.equal(
    formatIsoFilename(ltsArmState.selection),
    "bluefin-lts-aarch64.iso",
  );
  assert.equal(
    formatBootcCommand(ltsArmState.selection),
    "sudo bootc switch ghcr.io/projectbluefin/bluefin-lts:stable --enforce-container-sigpolicy",
  );
});

test("back navigation retreats step-by-step and clears downstream choices", () => {
  const {
    INITIAL_CHOOSER_STATE,
    selectRelease,
    selectArchitecture,
    selectGpu,
    selectKernel,
    navigateBack,
    resetChooser,
  } = loadTsModule(modelPath);

  let state = selectRelease(INITIAL_CHOOSER_STATE, "lts", true);
  state = selectArchitecture(state, "x86");
  state = selectGpu(state, "amd");
  state = selectKernel(state, "hwe");
  assert.equal(state.step, "download");

  state = navigateBack(state);
  assert.equal(state.step, "kernel");
  assert.equal(state.selection.kernel, undefined);

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

  // ARM back navigation jumps back to architecture step
  let armState = selectArchitecture(
    selectRelease(INITIAL_CHOOSER_STATE, "lts", true),
    "arm",
  );
  assert.equal(armState.step, "download");
  armState = navigateBack(armState);
  assert.equal(armState.step, "architecture");
  assert.equal(armState.selection.arch, undefined);

  // LTS Nvidia back navigation returns to GPU step (skipping kernel)
  let ltsNvidiaState = selectGpu(
    selectArchitecture(
      selectRelease(INITIAL_CHOOSER_STATE, "lts", true),
      "x86",
    ),
    "nvidia",
  );
  assert.equal(ltsNvidiaState.step, "download");
  ltsNvidiaState = navigateBack(ltsNvidiaState);
  assert.equal(ltsNvidiaState.step, "gpu");
  assert.equal(ltsNvidiaState.selection.gpu, undefined);

  assert.deepEqual(resetChooser(), INITIAL_CHOOSER_STATE);
});

test("formatBootcCommand generates expected commands across all hardware and stream selections", () => {
  const { formatBootcCommand } = loadTsModule(modelPath);

  // Defaults and fallbacks
  assert.equal(
    formatBootcCommand({}),
    "sudo bootc switch ghcr.io/projectbluefin/bluefin:stable --enforce-container-sigpolicy",
  );
  assert.equal(
    formatBootcCommand({ stream: "stable" }),
    "sudo bootc switch ghcr.io/projectbluefin/bluefin:stable --enforce-container-sigpolicy",
  );

  // Stable permutations
  assert.equal(
    formatBootcCommand({
      stream: "stable",
      arch: "x86",
      gpu: "amd",
      kernel: "regular",
    }),
    "sudo bootc switch ghcr.io/projectbluefin/bluefin:stable --enforce-container-sigpolicy",
  );
  assert.equal(
    formatBootcCommand({
      stream: "stable",
      arch: "x86",
      gpu: "nvidia",
      kernel: "regular",
    }),
    "sudo bootc switch ghcr.io/projectbluefin/bluefin-nvidia:stable --enforce-container-sigpolicy",
  );

  // LTS permutations
  assert.equal(
    formatBootcCommand({
      stream: "lts",
      arch: "x86",
      gpu: "amd",
      kernel: "regular",
    }),
    "sudo bootc switch ghcr.io/projectbluefin/bluefin-lts:stable --enforce-container-sigpolicy",
  );
  assert.equal(
    formatBootcCommand({
      stream: "lts",
      arch: "x86",
      gpu: "amd",
      kernel: "hwe",
    }),
    "sudo bootc switch ghcr.io/projectbluefin/bluefin-lts:lts-hwe --enforce-container-sigpolicy",
  );
  assert.equal(
    formatBootcCommand({
      stream: "lts",
      arch: "x86",
      gpu: "nvidia",
      kernel: "regular",
    }),
    "sudo bootc switch ghcr.io/projectbluefin/bluefin-lts-nvidia:stable --enforce-container-sigpolicy",
  );
  assert.equal(
    formatBootcCommand({
      stream: "lts",
      arch: "arm",
      kernel: "regular",
    }),
    "sudo bootc switch ghcr.io/projectbluefin/bluefin-lts:stable --enforce-container-sigpolicy",
  );
});
