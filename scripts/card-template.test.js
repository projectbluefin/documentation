const test = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("./lib/card-template.mjs");

/** Collect every node in a Satori element tree, depth-first. */
function walk(node, out = []) {
  if (node === null || node === undefined) return out;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, out);
    return out;
  }
  if (typeof node !== "object") {
    out.push(node);
    return out;
  }
  out.push(node);
  walk(node.props?.children, out);
  return out;
}

/** Every string leaf in the tree, in document order. */
function texts(tree) {
  return walk(tree).filter((n) => typeof n === "string");
}

/** Every element node of a given type. */
function nodesOfType(tree, type) {
  return walk(tree).filter(
    (n) => n && typeof n === "object" && n.type === type,
  );
}

function baseRelease(overrides = {}) {
  return {
    tag: "stable-20260401",
    fedoraVersion: null,
    centosVersion: null,
    majorPackages: [],
    dxPackages: [],
    gdxPackages: [],
    diffStats: null,
    commitCount: 0,
    ...overrides,
  };
}

function render(opts = {}) {
  const {
    release = baseRelease(),
    stream = "stable",
    dateMs = 0,
    theme = "light",
    mascot = null,
    titleOverride = undefined,
    headerPackageNames = undefined,
  } = opts;
  return load().then(({ renderCard }) =>
    renderCard(
      release,
      stream,
      dateMs,
      theme,
      mascot,
      titleOverride,
      headerPackageNames,
    ),
  );
}

test("W and H are the fixed card dimensions used by the root element", async () => {
  const { W, H } = await load();
  assert.equal(W, 800);
  assert.equal(H, 300);

  const tree = await render();
  assert.equal(tree.props.style.width, `${W}px`);
  assert.equal(tree.props.style.height, `${H}px`);
});

test("stream selects the accent colour on the title and left border", async () => {
  const cases = [
    ["stable", "#2f74b5"],
    ["lts", "#d97706"],
    ["dakota", "#7c3aed"],
    ["unknown-stream", "#2f74b5"],
  ];

  for (const [stream, accent] of cases) {
    const tree = await render({ stream });
    assert.equal(
      tree.props.style.borderLeft,
      `3px solid ${accent}`,
      `left border for ${stream}`,
    );
  }
});

test("default title is derived from the stream", async () => {
  assert.ok(texts(await render({ stream: "stable" })).includes("Bluefin"));
  assert.ok(texts(await render({ stream: "lts" })).includes("Bluefin LTS"));
  assert.ok(
    texts(await render({ stream: "dakota" })).includes("Bluefin Dakota"),
  );
});

test("titleOverride wins over the stream-derived title", async () => {
  const strings = texts(
    await render({ stream: "lts", titleOverride: "Bluefin LTS 10.1" }),
  );
  assert.ok(strings.includes("Bluefin LTS 10.1"));
  assert.ok(!strings.includes("Bluefin LTS"));
});

test("dark theme swaps the palette on the card background", async () => {
  const light = await render({ theme: "light" });
  const dark = await render({ theme: "dark" });
  assert.equal(light.props.style.background, "#ffffff");
  assert.equal(dark.props.style.background, "#1e2235");
  assert.equal(light.props.style.border, "1px solid #e5e7eb");
  assert.equal(dark.props.style.border, "1px solid #374151");
});

test("a positive dateMs renders a UTC long-form date, and 0 renders none", async () => {
  // 2026-04-01T00:30:00Z — a UTC-midnight-adjacent instant that would fall on
  // the previous day in negative-offset local timezones if UTC were not forced.
  const dateMs = Date.UTC(2026, 3, 1, 0, 30, 0);
  assert.ok(texts(await render({ dateMs })).includes("April 1, 2026"));

  const undated = texts(
    await render({ dateMs: 0, release: baseRelease({ tag: "stable" }) }),
  );
  assert.ok(!undated.some((s) => /\d{4}$/.test(s)));
});

test("the release tag is always rendered", async () => {
  const tree = await render({
    release: baseRelease({ tag: "lts-20260401.1" }),
  });
  assert.ok(texts(tree).includes("lts-20260401.1"));
});

test("base-OS chips appear only for the version fields that are set", async () => {
  const none = texts(await render());
  assert.ok(!none.some((s) => s.startsWith("Fedora ")));
  assert.ok(!none.some((s) => s.startsWith("CentOS ")));

  const fedora = texts(
    await render({ release: baseRelease({ fedoraVersion: "43" }) }),
  );
  assert.ok(fedora.includes("Fedora 43"));
  assert.ok(!fedora.some((s) => s.startsWith("CentOS ")));

  const centos = texts(
    await render({ release: baseRelease({ centosVersion: "10" }) }),
  );
  assert.ok(centos.includes("CentOS 10"));

  const both = texts(
    await render({
      release: baseRelease({ fedoraVersion: "43", centosVersion: "10" }),
    }),
  );
  assert.ok(both.includes("Fedora 43"));
  assert.ok(both.includes("CentOS 10"));
});

test("header chips are the default HEADER_NAMES intersection, case-insensitively matched", async () => {
  const tree = await render({
    release: baseRelease({
      majorPackages: [
        { name: "kernel", version: "6.15.0" },
        { name: "MESA", version: "25.0" },
        { name: "NotAHeaderPackage", version: "1.0" },
      ],
    }),
  });

  const strings = texts(tree);
  // The chip label keeps the casing from the release data, not from HEADER_NAMES.
  assert.ok(strings.includes("kernel"));
  assert.ok(strings.includes("6.15.0"));
  assert.ok(strings.includes("MESA"));
  assert.ok(strings.includes("25.0"));
  assert.ok(!strings.includes("NotAHeaderPackage"));
});

test("header chips follow the default HEADER_NAMES ordering, not the release ordering", async () => {
  const tree = await render({
    release: baseRelease({
      majorPackages: [
        { name: "Podman", version: "5.0" },
        { name: "Kernel", version: "6.15.0" },
      ],
    }),
  });

  const strings = texts(tree);
  assert.ok(strings.indexOf("Kernel") < strings.indexOf("Podman"));
});

test("headerPackageNames overrides the default header chip allow-list", async () => {
  const tree = await render({
    release: baseRelease({
      majorPackages: [
        { name: "Kernel", version: "6.15.0" },
        { name: "zfs", version: "2.3" },
      ],
    }),
    headerPackageNames: ["zfs"],
  });

  const strings = texts(tree);
  assert.ok(strings.includes("zfs"));
  assert.ok(!strings.includes("Kernel"));
});

test("an empty headerPackageNames list suppresses the header chip row entirely", async () => {
  const tree = await render({
    release: baseRelease({
      majorPackages: [{ name: "Kernel", version: "6.15.0" }],
    }),
    headerPackageNames: [],
  });

  assert.ok(!texts(tree).includes("Kernel"));
});

test("missing package arrays are tolerated", async () => {
  const { renderCard } = await load();
  const tree = renderCard(
    { tag: "stable-20260401", commitCount: 0 },
    "stable",
    0,
    "light",
    null,
  );

  const strings = texts(tree);
  assert.ok(strings.includes("stable-20260401"));
  assert.ok(!strings.includes("DX"));
  assert.ok(!strings.includes("GDX"));
});

test("DX chips are capped at 6 and labelled", async () => {
  const dxPackages = Array.from({ length: 9 }, (_, i) => ({
    name: `dx-${i}`,
    version: `${i}.0`,
  }));
  const strings = texts(await render({ release: baseRelease({ dxPackages }) }));

  assert.ok(strings.includes("DX"));
  assert.ok(strings.includes("dx-0"));
  assert.ok(strings.includes("dx-5"));
  assert.ok(!strings.includes("dx-6"));
});

test("GDX chips are capped at 4 and labelled", async () => {
  const gdxPackages = Array.from({ length: 7 }, (_, i) => ({
    name: `gdx-${i}`,
    version: `${i}.0`,
  }));
  const strings = texts(
    await render({ release: baseRelease({ gdxPackages }) }),
  );

  assert.ok(strings.includes("GDX"));
  assert.ok(strings.includes("gdx-0"));
  assert.ok(strings.includes("gdx-3"));
  assert.ok(!strings.includes("gdx-4"));
});

test("a chip with prevVersion is highlighted as changed and carries an up arrow", async () => {
  const tree = await render({
    release: baseRelease({
      dxPackages: [
        { name: "devpod", version: "0.6", prevVersion: "0.5" },
        { name: "kubectl", version: "1.34" },
      ],
    }),
  });

  const strings = texts(tree);
  assert.equal(strings.filter((s) => s === "↑").length, 1);

  const changedChip = walk(tree).find(
    (n) =>
      n &&
      typeof n === "object" &&
      typeof n.props?.style?.background === "string" &&
      n.props.style.background.startsWith("rgba(234,179,8"),
  );
  assert.ok(changedChip, "expected a chip with the changed highlight");
  assert.equal(
    changedChip.props.style.border,
    "1px solid rgba(234,179,8,0.40)",
  );
});

test("package-change and commit summaries render only when there is something to report", async () => {
  const none = texts(await render());
  assert.ok(!none.some((s) => s.startsWith("Package changes")));
  assert.ok(!none.some((s) => s.startsWith("Commits")));

  const full = texts(
    await render({
      release: baseRelease({
        diffStats: { changed: 3, added: 2, removed: 1 },
        commitCount: 42,
      }),
    }),
  );
  assert.ok(full.includes("Package changes — 3 updated · 2 added · 1 removed"));
  assert.ok(full.includes("Commits (42)"));
});

test("only the non-zero diff segments are listed", async () => {
  const strings = texts(
    await render({
      release: baseRelease({
        diffStats: { changed: 0, added: 5, removed: 0 },
        commitCount: 0,
      }),
    }),
  );
  assert.ok(strings.includes("Package changes — 5 added"));
  assert.ok(!strings.some((s) => s.startsWith("Commits")));
});

test("an all-zero diffStats with commits renders the commit summary alone", async () => {
  const strings = texts(
    await render({
      release: baseRelease({
        diffStats: { changed: 0, added: 0, removed: 0 },
        commitCount: 7,
      }),
    }),
  );
  assert.ok(!strings.some((s) => s.startsWith("Package changes")));
  assert.ok(strings.includes("Commits (7)"));
});

test("the mascot image is emitted only when a data URI is supplied", async () => {
  assert.equal(nodesOfType(await render(), "img").length, 0);

  const withMascot = await render({ mascot: "data:image/png;base64,AAAA" });
  const imgs = nodesOfType(withMascot, "img");
  assert.equal(imgs.length, 1);
  assert.equal(imgs[0].props.src, "data:image/png;base64,AAAA");
  assert.equal(imgs[0].props.width, 120);
  assert.equal(imgs[0].props.height, 120);
});

test("the footer attribution is always present and last", async () => {
  const strings = texts(
    await render({
      release: baseRelease({ commitCount: 1 }),
      dateMs: Date.UTC(2026, 3, 1),
    }),
  );
  assert.equal(strings.at(-1), "docs.projectbluefin.io/changelogs");
});

test("the element helper collapses children so Satori never sees an empty array", async () => {
  const tree = await render();
  for (const node of walk(tree)) {
    if (!node || typeof node !== "object") continue;
    const { children } = node.props;
    assert.notEqual(
      Array.isArray(children) && children.length === 0,
      true,
      `${node.type} rendered an empty children array`,
    );
    if (Array.isArray(children)) {
      assert.ok(
        children.every((c) => c !== null && c !== undefined),
        `${node.type} rendered a null child`,
      );
    }
  }
});
