const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/**
 * The visible-unavailability rule, enforced as a grep.
 *
 * adr/0002 and adr/0003: "a dashboard that silently renders less is
 * indistinguishable from a healthy one with less to report." A panel that
 * returns null while its data loads disappears, which is exactly the failure
 * that rule forbids — and it is easy to reintroduce, because `return null` is
 * the obvious thing to write.
 *
 * This is deliberately a source check rather than a render test: it catches the
 * hazard in every panel at once, including panels added later.
 */

const panelsDir = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "factory",
  "panels",
);

const panelFiles = fs
  .readdirSync(panelsDir)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => path.join(panelsDir, f));

test("there are panels to check", () => {
  assert.ok(panelFiles.length >= 8, `found ${panelFiles.length}`);
});

test("no panel component returns null from a top-level guard", () => {
  // `return null;` at two-space indentation inside a PascalCase function is a
  // component-level early return, which makes the panel disappear. The same
  // line inside a camelCase helper is an ordinary nullable return and is fine,
  // as is a `null` nested deeper, which is an optional element inside a panel
  // that still renders.
  const offenders = [];
  for (const file of panelFiles) {
    const src = fs.readFileSync(file, "utf8");
    let inComponent = false;
    src.split("\n").forEach((line, i) => {
      const decl = /^(?:export (?:default )?)?function (\w+)\s*[(<]/.exec(line);
      if (decl) inComponent = /^[A-Z]/.test(decl[1]);
      if (inComponent && /^ {2}return null;\s*$/.test(line)) {
        offenders.push(`${path.basename(file)}:${i + 1}`);
      }
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `panels must render <Unavailable> instead of vanishing: ${offenders.join(", ")}`,
  );
});

test("every panel imports the Unavailable component or delegates to a section", () => {
  for (const file of panelFiles) {
    const src = fs.readFileSync(file, "utf8");
    const delegates = /from "\.\.\/\.\.\/HiveFactoryDashboard"/.test(src);
    const hasUnavailable = /Unavailable/.test(src);
    assert.ok(
      hasUnavailable || delegates,
      `${path.basename(file)} can neither report unavailability nor delegate`,
    );
  }
});

test("no panel links a hostname that is not yet served", () => {
  // lab.projectbluefin.io currently 404s: ADR 0002 moves it by a Cloudflare
  // change outside this repository, and shipping is not atomic. Link the
  // repository, which resolves today.
  for (const file of panelFiles) {
    const src = fs.readFileSync(file, "utf8");
    assert.ok(
      !src.includes("lab.projectbluefin.io"),
      `${path.basename(file)} links lab.projectbluefin.io, which returns 404`,
    );
  }
});
