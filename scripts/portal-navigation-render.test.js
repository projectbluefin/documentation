const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function loadModule(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (id) => {
      if (id.endsWith(".css")) return {};
      if (id.startsWith(".")) {
        const base = path.resolve(path.dirname(file), id);
        for (const suffix of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          if (fs.existsSync(base + suffix)) return loadModule(base + suffix);
        }
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

const portalDir = path.join(__dirname, "..", "src", "components", "portal");
const componentPath = path.join(portalDir, "PortalNavigation.tsx");
const hookPath = path.join(portalDir, "useScrollSpy.ts");
const cssPath = path.join(portalDir, "PortalNavigation.module.css");

test("PortalNavigation statically renders floating dock header and five semantic links", () => {
  assert.ok(fs.existsSync(componentPath), "PortalNavigation.tsx must exist");
  assert.ok(fs.existsSync(cssPath), "PortalNavigation.module.css must exist");

  const { default: PortalNavigation, DEFAULT_PORTAL_NAV_LINKS } =
    loadModule(componentPath);
  const html = renderToStaticMarkup(React.createElement(PortalNavigation));

  assert.ok(html.includes('id="navigation"'));
  assert.ok(html.includes('role="navigation"'));
  assert.ok(html.includes('aria-label="Navigation"'));
  assert.ok(html.includes('class="'));
  assert.ok(html.includes("app-navigation"));

  assert.equal(DEFAULT_PORTAL_NAV_LINKS.length, 5);
  const hrefs = DEFAULT_PORTAL_NAV_LINKS.map((l) => l.id);
  assert.deepEqual(hrefs, [
    "#scene-users",
    "#scene-developers",
    "#scene-mission",
    "#scene-picker",
    "#scene-community",
  ]);

  const labels = DEFAULT_PORTAL_NAV_LINKS.map((l) => l.label);
  assert.deepEqual(labels, [
    "For You",
    "For Devs",
    "Our Mission",
    "Try Out",
    "Community",
  ]);

  for (const href of hrefs) {
    assert.ok(html.includes(`href="${href}"`));
    assert.ok(html.includes(`data-section="${href}"`));
  }

  assert.ok(html.includes(">For You<"));
  assert.ok(html.includes(">For Devs<"));
  assert.ok(html.includes(">Our Mission<"));
  assert.ok(html.includes(">Try Out<"));
  assert.ok(html.includes(">Community<"));
});

test("PortalNavigation handles activeSection prop and positions sliding indicator", () => {
  const { default: PortalNavigation } = loadModule(componentPath);

  // When on landing scene, pill indicator fades out (opacity: 0) and no link is active
  const landingHtml = renderToStaticMarkup(
    React.createElement(PortalNavigation, { activeSection: "#scene-landing" }),
  );
  assert.ok(!landingHtml.includes("active"));
  assert.ok(landingHtml.includes("opacity:0"));

  // When null or unrecognized, indicator fades out
  const nullHtml = renderToStaticMarkup(
    React.createElement(PortalNavigation, { activeSection: "null" }),
  );
  assert.ok(!nullHtml.includes("active"));
  assert.ok(nullHtml.includes("opacity:0"));

  // When on scene-users (index 0)
  const usersHtml = renderToStaticMarkup(
    React.createElement(PortalNavigation, { activeSection: "#scene-users" }),
  );
  assert.ok(usersHtml.includes("active"));
  assert.ok(usersHtml.includes("left:0%"));
  assert.ok(usersHtml.includes("width:20%"));
  assert.ok(usersHtml.includes("opacity:1"));

  // When on scene-developers (index 1)
  const devsHtml = renderToStaticMarkup(
    React.createElement(PortalNavigation, {
      activeSection: "#scene-developers",
    }),
  );
  assert.ok(devsHtml.includes("left:20%"));
  assert.ok(devsHtml.includes("width:20%"));
  assert.ok(devsHtml.includes("opacity:1"));

  // When on scene-mission (index 2)
  const missionHtml = renderToStaticMarkup(
    React.createElement(PortalNavigation, { activeSection: "#scene-mission" }),
  );
  assert.ok(missionHtml.includes("left:40%"));
  assert.ok(missionHtml.includes("width:20%"));
  assert.ok(missionHtml.includes("opacity:1"));

  // When on scene-picker (index 3)
  const pickerHtml = renderToStaticMarkup(
    React.createElement(PortalNavigation, { activeSection: "#scene-picker" }),
  );
  assert.ok(pickerHtml.includes("left:60%"));
  assert.ok(pickerHtml.includes("width:20%"));
  assert.ok(pickerHtml.includes("opacity:1"));

  // When on scene-community (index 4)
  const communityHtml = renderToStaticMarkup(
    React.createElement(PortalNavigation, {
      activeSection: "#scene-community",
    }),
  );
  assert.ok(communityHtml.includes("left:80%"));
  assert.ok(communityHtml.includes("width:20%"));
  assert.ok(communityHtml.includes("opacity:1"));
});

test("PortalNavigation renders floating scroll-to-top button only when active", () => {
  const { default: PortalNavigation } = loadModule(componentPath);

  const hiddenHtml = renderToStaticMarkup(
    React.createElement(PortalNavigation, { showScrollTop: false }),
  );
  assert.ok(!hiddenHtml.includes("btn-up"));
  assert.ok(!hiddenHtml.includes("Scroll up button"));

  const visibleHtml = renderToStaticMarkup(
    React.createElement(PortalNavigation, { showScrollTop: true }),
  );
  assert.ok(visibleHtml.includes("btn-up"));
  assert.ok(visibleHtml.includes('aria-label="Scroll up button"'));
});

test("useScrollSpy exports defaults and tracks defined sections", () => {
  assert.ok(fs.existsSync(hookPath), "useScrollSpy.ts must exist");
  const { useScrollSpy, DEFAULT_TRACKED_SECTIONS } = loadModule(hookPath);

  assert.equal(typeof useScrollSpy, "function");
  assert.deepEqual(DEFAULT_TRACKED_SECTIONS, [
    "#scene-landing",
    "#scene-users",
    "#scene-developers",
    "#scene-mission",
    "#scene-picker",
    "#scene-community",
  ]);
});

test("PortalNavigation.module.css defines pill dock, blur, and responsive rules", () => {
  const css = fs.readFileSync(cssPath, "utf8");

  assert.match(css, /backdrop-filter:\s*blur\(15px\)/);
  assert.match(css, /border-radius:\s*24px/);
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /bottom:\s*1\.5em/);
  assert.match(css, /@keyframes popup/);
  assert.match(css, /\.btnUp\s*\{/);
  assert.match(css, /@media \(max-width:\s*956px\)/);
  assert.match(css, /@media \(max-width:\s*512px\)/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
});
