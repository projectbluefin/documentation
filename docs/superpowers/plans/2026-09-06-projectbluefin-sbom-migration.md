# Project Bluefin SBOM & Image Catalog Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the documentation Images and Driver Versions pages and fetch pipelines to source all versions strictly from `projectbluefin` SBOMs, sever all legacy `ublue-os` connections, remove retired DX/GDX products, and incorporate Utah alongside Bluefin, Bluefin LTS, and Dakota.

**Architecture:**
SBOM attestations and package metadata are fetched from GHCR under `ghcr.io/projectbluefin/*` via `scripts/fetch-github-sbom.js` into `static/data/sbom-attestations.json`. `scripts/fetch-github-driver-versions.js` and `scripts/fetch-github-images.js` consume this cache to generate `driver-versions.json` and `images.json`. The frontend components `ImagesCatalog.tsx` and `DriverVersionsCatalog.tsx` display the four active Project Bluefin image families: Bluefin, Bluefin LTS, Dakota, and Utah.

**Tech Stack:** Node.js (v24), TypeScript, React 19, Docusaurus 3.10, ORAS, Cosign.

## Global Constraints

- Never fail the build: data pipelines must degrade gracefully and output `{ unavailable: true, stateReason }` or fallback state on missing inputs.
- All version data for displayed images and drivers must be sourced from SBOMs (`packageVersions`), never inferred from release HTML/markdown descriptions or container labels.
- Sourced organizations must be `projectbluefin`, removing all connections to `ublue-os/bluefin` and `ublue-os/bluefin-lts`.
- Format modified files with `npx prettier --write <paths>`.
- Commit trailers must include `Assisted-by` and `Co-authored-by`.

---

### Task 1: Update SBOM Pipeline for Utah and Clean Legacy Streams

**Files:**
- Modify: `scripts/fetch-github-sbom.js`
- Test: `scripts/fetch-github-sbom.test.js`

**Interfaces:**
- Consumes: GHCR tags and OCI manifests for `projectbluefin/utah` and `projectbluefin/utah-nvidia`.
- Produces: `STREAM_SPECS` containing `utah-testing` and `utah-nvidia-testing` entries in `static/data/sbom-attestations.json`.

- [ ] **Step 1: Write unit tests for Utah stream specifications**

Add tests to `scripts/fetch-github-sbom.test.js` verifying that `STREAM_SPECS` includes `utah-testing` and `utah-nvidia-testing`, and that `findRecentTagsForStream` recognizes testing stream tags for Utah.

```javascript
test("STREAM_SPECS contains utah-testing and utah-nvidia-testing", () => {
  const { STREAM_SPECS } = require("./fetch-github-sbom.js");
  const utahSpec = STREAM_SPECS.find((s) => s.id === "utah-testing");
  const utahNvidiaSpec = STREAM_SPECS.find((s) => s.id === "utah-nvidia-testing");

  assert.ok(utahSpec, "utah-testing spec must exist");
  assert.equal(utahSpec.org, "projectbluefin");
  assert.equal(utahSpec.package, "utah");
  assert.equal(utahSpec.streamPrefix, "testing");

  assert.ok(utahNvidiaSpec, "utah-nvidia-testing spec must exist");
  assert.equal(utahNvidiaSpec.org, "projectbluefin");
  assert.equal(utahNvidiaSpec.package, "utah-nvidia");
  assert.equal(utahNvidiaSpec.streamPrefix, "testing");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/fetch-github-sbom.test.js`
Expected: FAIL with "utah-testing spec must exist"

- [ ] **Step 3: Update `scripts/fetch-github-sbom.js`**

Add `utah-testing` and `utah-nvidia-testing` specs to `STREAM_SPECS` in `scripts/fetch-github-sbom.js`, exporting `STREAM_SPECS` for testability:

```javascript
  {
    id: "utah-testing",
    label: "Utah Testing",
    org: "projectbluefin",
    package: "utah",
    releasesRepo: "projectbluefin/utah",
    streamPrefix: "testing",
    keyRepo: "projectbluefin/utah",
    keyless: true,
  },
  {
    id: "utah-nvidia-testing",
    label: "Utah Nvidia Testing",
    org: "projectbluefin",
    package: "utah-nvidia",
    releasesRepo: "projectbluefin/utah",
    streamPrefix: "testing",
    keyRepo: "projectbluefin/utah",
    keyless: true,
  },
```

Export `STREAM_SPECS` in `module.exports`:
```javascript
module.exports = {
  STREAM_SPECS,
  selectAmd64DigestFromManifest,
  stripEpoch,
  compareRpmVersions,
  findRecentTagsForStream,
  extractBstPackageVersions,
  isSemverLike,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/fetch-github-sbom.test.js`
Expected: PASS

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write scripts/fetch-github-sbom.js scripts/fetch-github-sbom.test.js
git add scripts/fetch-github-sbom.js scripts/fetch-github-sbom.test.js
git commit -m "feat(sbom): add utah testing streams to SBOM pipeline

Assisted-by: Gemini 3.8 Flash via GitHub Copilot
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Update Driver Versions Pipeline for Utah

**Files:**
- Modify: `scripts/fetch-github-driver-versions.js`
- Test: `scripts/fetch-github-driver-versions.test.js`

**Interfaces:**
- Consumes: `static/data/sbom-attestations.json` with `utah-testing` and `utah-nvidia-testing` stream entries.
- Produces: `static/data/driver-versions.json` containing `utah-testing` stream object.

- [ ] **Step 1: Write unit tests for Utah driver versions stream**

Add tests to `scripts/fetch-github-driver-versions.test.js`:

```javascript
test("buildStreamFromSbom builds Utah testing stream", () => {
  const cache = {
    streams: {
      "utah-testing": {
        releases: {
          "testing-20260906": {
            tag: "testing-20260906",
            packageVersions: {
              kernel: "6.18.13-200.fc43",
              mesa: "25.3.6",
              gnome: "50.0",
            },
          },
        },
      },
    },
  };

  const stream = buildStreamFromSbom(
    "utah-testing",
    "Utah",
    "Project Hummingbird-based image from projectbluefin/utah.",
    "sudo bootc switch --enforce-container-sigpolicy ghcr.io/projectbluefin/utah:testing",
    cache,
    { "testing-20260906": "595.71.05" },
    9999,
  );

  assert.equal(stream.id, "utah-testing");
  assert.equal(stream.name, "Utah");
  assert.equal(stream.latest?.versions.kernel, "6.18.13-200.fc43");
  assert.equal(stream.latest?.versions.nvidia, "595.71.05");
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test scripts/fetch-github-driver-versions.test.js`
Expected: PASS (verifies buildStreamFromSbom functions generically for Utah).

- [ ] **Step 3: Update `scripts/fetch-github-driver-versions.js` to assemble Utah stream**

In `scripts/fetch-github-driver-versions.js`:
Add `RELEASE_URL_BY_STREAM` and `RELEASE_REPO_BY_STREAM` entries:
```javascript
const RELEASE_URL_BY_STREAM = {
  "bluefin-stable": "https://github.com/projectbluefin/bluefin/releases",
  "bluefin-lts": "https://github.com/projectbluefin/bluefin-lts/releases",
  "dakota-latest": "https://github.com/projectbluefin/dakota/releases",
  "utah-testing": "https://github.com/projectbluefin/utah/releases",
};

const RELEASE_REPO_BY_STREAM = {
  "bluefin-stable": "projectbluefin/bluefin",
  "bluefin-lts": "projectbluefin/bluefin-lts",
  "dakota-latest": "projectbluefin/dakota",
  "utah-testing": "projectbluefin/utah",
};
```

In `main()`:
Build `utahStream` from `utah-testing` and `utah-nvidia-testing`:
```javascript
  const hasSbomUtah =
    Object.keys(sbomCache.streams?.["utah-testing"]?.releases || {}).length > 0;
  const utahNvidiaByTag = buildNvidiaMapFromSbomStream(sbomCache, "utah-nvidia-testing");
  const utahStream = hasSbomUtah
    ? buildStreamFromSbom(
        "utah-testing",
        "Utah",
        "Project Hummingbird-based image from projectbluefin/utah.",
        "sudo bootc switch --enforce-container-sigpolicy ghcr.io/projectbluefin/utah:testing",
        sbomCache,
        utahNvidiaByTag,
      )
    : null;
```
Append `...(utahStream ? [utahStream] : [])` to `streams` output array.

- [ ] **Step 4: Run tests**

Run: `node --test scripts/fetch-github-driver-versions.test.js`
Expected: PASS

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write scripts/fetch-github-driver-versions.js scripts/fetch-github-driver-versions.test.js
git add scripts/fetch-github-driver-versions.js scripts/fetch-github-driver-versions.test.js
git commit -m "feat(drivers): add utah stream to driver versions generator

Assisted-by: Gemini 3.8 Flash via GitHub Copilot
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Modernize Image Catalog Pipeline (Pure SBOM, 4 Products, No Legacy ublue-os)

**Files:**
- Modify: `scripts/fetch-github-images.js`
- Test: `scripts/fetch-github-images.test.js`

**Interfaces:**
- Consumes: `static/data/sbom-attestations.json`.
- Produces: `static/data/images.json` containing `projectbluefin-bluefin`, `projectbluefin-bluefin-lts`, `projectbluefin-dakota`, `projectbluefin-utah`.

- [ ] **Step 1: Write unit tests for modern PRODUCT_SPECS**

In `scripts/fetch-github-images.test.js`:
Add tests validating the updated `PRODUCT_SPECS`:
```javascript
test("PRODUCT_SPECS defines only the 4 projectbluefin image products", () => {
  const { PRODUCT_SPECS } = require("./fetch-github-images.js");
  const productIds = PRODUCT_SPECS.map((p) => p.id);

  assert.deepEqual(productIds, [
    "projectbluefin-bluefin",
    "projectbluefin-bluefin-lts",
    "projectbluefin-dakota",
    "projectbluefin-utah",
  ]);

  for (const spec of PRODUCT_SPECS) {
    assert.equal(spec.org, "projectbluefin");
    assert.ok(!spec.id.startsWith("ublue-"), `Product ID ${spec.id} must not start with ublue-`);
  }
});

test("buildStreamVersionInfo extracts nvidia and packages strictly from SBOM", async () => {
  const { buildStreamVersionInfo } = require("./fetch-github-images.js");
  const spec = {
    id: "projectbluefin-bluefin",
    org: "projectbluefin",
    package: "bluefin",
    sbomStreamId: "bluefin-stable",
  };
  const sbomCache = {
    streams: {
      "bluefin-stable": {
        releases: {
          "stable-20260906": {
            packageVersions: {
              gnome: "49.5",
              kernel: "6.18.13-200.fc43",
              nvidia: "595.71.05",
              mesa: "25.3.6",
            },
          },
        },
      },
    },
  };

  const versions = await buildStreamVersionInfo(spec, "ghcr.io/projectbluefin/bluefin", "stable", null, sbomCache);
  assert.equal(versions.gnome, "49.5");
  assert.equal(versions.kernel, "6.18.13-200.fc43");
  assert.equal(versions.nvidia, "595.71.05");
  assert.equal(versions.mesa, "25.3.6");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/fetch-github-images.test.js`
Expected: FAIL with "PRODUCT_SPECS is not defined" or mismatch in product IDs.

- [ ] **Step 3: Implement changes in `scripts/fetch-github-images.js`**

1. Replace `PRODUCT_SPECS` with the four active products:
```javascript
const PRODUCT_SPECS = [
  {
    id: "projectbluefin-bluefin",
    name: "Bluefin",
    org: "projectbluefin",
    package: "bluefin",
    artwork: "bluefin",
    summary: "Primary Bluefin desktop image for most systems.",
    streamOrder: ["stable", "stable-daily", "latest", "beta"],
    versionSource: null,
    sbomStreamId: "bluefin-stable",
    keyRepo: "projectbluefin/bluefin",
    nvidiaPackage: "bluefin-nvidia",
    allowTestingStreams: false,
    isoSectionLink: "/downloads#bluefin",
    supportedArches: ["amd", "intel"],
  },
  {
    id: "projectbluefin-bluefin-lts",
    name: "Bluefin LTS",
    org: "projectbluefin",
    package: "bluefin-lts",
    artwork: "achillobator",
    summary: "Long-term support Bluefin stream.",
    streamOrder: ["lts"],
    versionSource: null,
    sbomStreamId: "bluefin-lts",
    keyRepo: "projectbluefin/bluefin-lts",
    nvidiaPackage: "bluefin-lts-nvidia",
    allowTestingStreams: true,
    keepEvenIfStale: true,
    isoSectionLink: "/downloads#bluefin-lts",
    supportedArches: ["amd", "intel"],
  },
  {
    id: "projectbluefin-dakota",
    name: "Project Bluefin Dakota",
    org: "projectbluefin",
    package: "dakota",
    artwork: "dakotaraptor",
    summary: "Project Bluefin Dakota image stream built with BuildStream.",
    streamOrder: ["latest"],
    versionSource: null,
    sbomStreamId: "dakota-latest",
    keyRepo: "projectbluefin/dakota",
    nvidiaPackage: "dakota-nvidia",
    allowTestingStreams: false,
    supportedArches: ["amd", "intel"],
    isoSectionLink: "/downloads-testing#dakotaraptor",
  },
  {
    id: "projectbluefin-utah",
    name: "Project Bluefin Utah",
    org: "projectbluefin",
    package: "utah",
    artwork: "bluefin",
    summary: "Project Bluefin Utah image stream built with Fedora Hummingbird technology.",
    streamOrder: ["testing"],
    versionSource: null,
    sbomStreamId: "utah-testing",
    keyRepo: "projectbluefin/utah",
    nvidiaPackage: "utah-nvidia",
    allowTestingStreams: false,
    supportedArches: ["amd", "intel"],
    isoSectionLink: null,
  },
];
```

2. Update `buildStreamVersionInfo`:
```javascript
async function buildStreamVersionInfo(
  spec,
  imageRef,
  streamTag,
  feeds,
  sbomCache,
) {
  const sbomVersions = sbomVersionsForStream(sbomCache, spec, streamTag);

  return {
    gnome: sbomVersions?.gnome || null,
    kernel: sbomVersions?.kernel || null,
    nvidia: sbomVersions?.nvidia || null,
    fedora: sbomVersions?.fedora || null,
    flatpak: sbomVersions?.flatpak || null,
    mesa: sbomVersions?.mesa || null,
    podman: sbomVersions?.podman || null,
  };
}
```

3. Export `PRODUCT_SPECS` and `buildStreamVersionInfo` in `module.exports`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/fetch-github-images.test.js`
Expected: PASS

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write scripts/fetch-github-images.js scripts/fetch-github-images.test.js
git add scripts/fetch-github-images.js scripts/fetch-github-images.test.js
git commit -m "refactor(images): modernize product specs and enforce pure SBOM version extraction

Assisted-by: Gemini 3.8 Flash via GitHub Copilot
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Update React Catalogs (`ImagesCatalog.tsx`, `DriverVersionsCatalog.tsx`)

**Files:**
- Modify: `src/components/ImagesCatalog.tsx`
- Modify: `src/components/ImagesCatalog.module.css`
- Modify: `src/components/DriverVersionsCatalog.tsx`

**Interfaces:**
- Consumes: `static/data/images.json` with `projectbluefin-*` products; `static/data/driver-versions.json`.
- Produces: UI rendered on `docs/images.md` and `docs/driver-versions.mdx`.

- [ ] **Step 1: Update `src/components/ImagesCatalog.tsx`**

1. Group products into the four families:
```typescript
  const bluefinProducts = products.filter(
    (product) => product.id === "projectbluefin-bluefin" || product.name === "Bluefin",
  );
  const ltsProducts = products.filter(
    (product) => product.id === "projectbluefin-bluefin-lts" || product.name.includes("LTS"),
  );
  const dakotaProducts = products.filter(
    (product) => product.id === "projectbluefin-dakota" || product.name.includes("Dakota"),
  );
  const utahProducts = products.filter(
    (product) => product.id === "projectbluefin-utah" || product.name.includes("Utah"),
  );
```

2. Add Utah section rendering:
```tsx
      <section className={styles.sectionGroup}>
        <Heading as="h2" className={styles.groupTitle}>
          Utah
        </Heading>
        <p className={styles.groupHint}>
          Project Bluefin built with Fedora Hummingbird technology.
        </p>
        <div className={styles.cards}>{renderCards(utahProducts)}</div>
      </section>
```

3. Update tone mapping to add Utah:
```typescript
      const tone =
        product.artwork === "dakotaraptor"
          ? styles.cardDakota
          : product.artwork === "achillobator"
            ? styles.cardLts
            : product.id === "projectbluefin-utah" || product.name.includes("Utah")
              ? styles.cardUtah
              : styles.cardBluefin;
```

- [ ] **Step 2: Add `cardUtah` styling to `src/components/ImagesCatalog.module.css`**

Add styling matching Hummingbird/Utah amber/gold accent:
```css
.cardUtah {
  border-left: 4px solid var(--ifm-color-warning);
}
```

- [ ] **Step 3: Update `src/components/DriverVersionsCatalog.tsx`**

Ensure rebase command uses `ghcr.io/projectbluefin/`:
```typescript
function buildRebaseCommand(stream: DriverStream, tag: string): string {
  const safeTag = tag.replace(/[^a-zA-Z0-9_.-]/g, "");
  return `sudo bootc switch --enforce-container-sigpolicy ghcr.io/projectbluefin/${stream.id.replace(/-.*/, "")}:${safeTag}`;
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write src/components/ImagesCatalog.tsx src/components/ImagesCatalog.module.css src/components/DriverVersionsCatalog.tsx
git add src/components/ImagesCatalog.tsx src/components/ImagesCatalog.module.css src/components/DriverVersionsCatalog.tsx
git commit -m "feat(ui): display utah in images and driver versions catalogs

Assisted-by: Gemini 3.8 Flash via GitHub Copilot
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Update Documentation Pages (`docs/driver-versions.mdx`, `docs/images.md`)

**Files:**
- Modify: `docs/driver-versions.mdx`
- Modify: `docs/images.md`

**Interfaces:**
- Consumes: `<DriverVersionsCatalog streamId="utah-testing" />` and `<ImagesCatalog />`.
- Produces: Rendered MDX doc pages.

- [ ] **Step 1: Add Utah to `docs/driver-versions.mdx`**

In `docs/driver-versions.mdx`, add:
```mdx
## Utah

<DriverVersionsCatalog streamId="utah-testing" />
```

- [ ] **Step 2: Verify `docs/images.md`**

Ensure `docs/images.md` accurately describes the 4 Project Bluefin raptors (Bluefin, Bluefin LTS, Dakota, Utah) with no references to legacy ublue-os or retired DX/GDX images.

- [ ] **Step 3: Run full checks**

Run: `just check` or `npm run typecheck && npm run lint && npm test`
Expected: PASS with 0 errors.

- [ ] **Step 4: Format and commit**

```bash
npx prettier --write docs/driver-versions.mdx docs/images.md
git add docs/driver-versions.mdx docs/images.md
git commit -m "docs: add utah to driver-versions page and update images documentation

Assisted-by: Gemini 3.8 Flash via GitHub Copilot
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Full Verification and Build Validation

**Files:**
- Test all altered components and pipelines.

- [ ] **Step 1: Run typecheck**
Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 2: Run linter**
Run: `npm run lint`
Expected: PASS (0 errors)

- [ ] **Step 3: Run test suite**
Run: `npm test`
Expected: PASS

- [ ] **Step 4: Run CI build**
Run: `npm run build:ci`
Expected: PASS (Docusaurus builds successfully without missing links or routes)
