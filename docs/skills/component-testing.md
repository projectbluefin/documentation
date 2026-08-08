---
name: component-testing
description: >-
  Unit-test React presentational components in this repository using the
  existing node --test runner, with no new test tooling. Use when adding or
  changing a component under src/components/, when a component encodes a
  correctness or honesty rule that must not regress, or when tempted to install
  Jest, Vitest, or Testing Library.
metadata:
  context7-sources:
    - /microsoft/typescript-website
    - /reactjs/react.dev
---

# Component testing

This repository has no React test harness and does not need one. `npm test`
runs `node --test scripts/*.test.js`, and both `typescript` and `react-dom` are
already dependencies. A presentational component can therefore be transpiled in
memory and rendered to a string inside that same runner.

## When to Use

- A component under `src/components/` encodes a rule that must not silently
  regress — how missing data renders, whether a scale is shared, what a screen
  reader is told.
- A component is pure and presentational: props in, markup out.
- You are about to reach for Jest, Vitest, or Testing Library. Don't; use this.

## When NOT to Use

- **The component fetches data or relies on effects.** `renderToStaticMarkup`
  produces non-interactive HTML and does not run effects, so a data-fetching
  dashboard renders as its loading state and the test proves nothing. Extract
  the presentational part and test that.
- **You want to assert on user interaction.** There is no DOM and no event
  simulation here. Test the pure logic instead, or verify through a build.
- **The behaviour is already covered by `tsc`.** Do not write a test that only
  re-checks a type.

## Core Process

1. Put the test in `scripts/<name>.test.js` so the existing glob picks it up.
   It is CommonJS, like every other file there.
2. Transpile and evaluate the component, stubbing CSS module imports:

   ```js
   const fs = require("node:fs");
   const ts = require("typescript");
   const React = require("react");
   const { renderToStaticMarkup } = require("react-dom/server");

   function loadComponent(tsxPath) {
     const { outputText } = ts.transpileModule(
       fs.readFileSync(tsxPath, "utf8"),
       {
         compilerOptions: {
           jsx: ts.JsxEmit.React,
           target: ts.ScriptTarget.ES2020,
           module: ts.ModuleKind.CommonJS,
         },
       },
     );
     const mod = { exports: {} };
     new Function("require", "module", "exports", outputText)(
       // `*.module.css` resolves to an object of class names at build time;
       // in the test runner it must be stubbed or the require throws.
       (id) => (id.endsWith(".css") ? {} : require(id)),
       mod,
       mod.exports,
     );
     return mod.exports.default;
   }
   ```

3. Render with props and assert on the markup string:

   ```js
   const render = (props) =>
     renderToStaticMarkup(React.createElement(Component, props));
   ```

4. Assert the rules that matter, not the pixels. Markup assertions are brittle
   if they pin exact coordinates; count elements, check for the presence of a
   marker, and assert that forbidden output is absent.

5. Prefer asserting a **hazard cannot recur**. A test that documents why a
   default is dangerous is worth more than one that restates the happy path.

## Worked assertions

These are the classes of rule this harness is good at:

```js
// A gap must not be drawn as a value.
assert.equal(countOf(render({ data: [1, 2, null, 8] }), "<polyline"), 2);

// Autoscaling pins both extremes, which is why grids need a shared domain.
assert.equal(pointsOf(low)[0], pointsOf(high)[0]);

// Missing data must not be silently indistinguishable from zero.
assert.ok(
  render({ data: [], emptyLabel: "accumulating data" }).includes(
    "accumulating data",
  ),
);

// An information-bearing graphic must be announceable.
assert.ok(
  render({ data: [1, 2], label: "Queue: 2 now" }).includes('role="img"'),
);

// Output must be deterministic, or SSG diffs churn between builds.
assert.equal(render(props), render(props));
```

## Common Rationalizations

| Rationalization                          | Reality                                                                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Components need a real test framework." | Two existing dependencies and 30 lines of harness cover pure components. Adding a framework adds config, CI time, and a second way to write tests. |
| "`tsc` passing means it renders."        | Type-checking cannot tell you that a missing sample was coerced to zero, or that every cell of a grid autoscaled to look identical.                |
| "The build passing means it works."      | A build proves it compiles and mounts. It does not exercise the empty, missing, or single-point branches.                                          |
| "I'll assert the exact SVG string."      | It breaks on any cosmetic change and gets deleted. Assert counts and invariants.                                                                   |
| "It renders fine in my browser."         | The branch that matters is the one with no data, which is exactly the one you did not open.                                                        |

## Red Flags

- A component that renders `null` on insufficient data, with no test covering it —
  silent disappearance is indistinguishable from healthy on a dashboard.
- A grid of small multiples with no test proving the series use a shared domain.
- An `aria-hidden` graphic that is the sole carrier of a claim.
- Tests that only exercise well-formed input, when the component's whole job is
  degrading honestly.
- Reaching for a browser or a framework to test a function that takes props and
  returns SVG.

## Verification

- [ ] Test lives in `scripts/*.test.js` and is picked up by `npm test`.
- [ ] No new dependency was added to `package.json`.
- [ ] The empty, missing, single-point, and all-zero branches are each asserted.
- [ ] Output is asserted deterministic where the component is used in SSG.
- [ ] `npm test` passes in full, not just the new file.
- [ ] `npm run typecheck` and `npm run lint` are clean.

## Caveats worth knowing

- `ts.transpileModule` has no access to a full program, so it can emit wrong
  output for code that would error under `isolatedModules`. Keep tested
  components free of cross-file type re-exports, and treat a strange transpile
  result as a signal to simplify the component's imports rather than to fight
  the harness.
- `renderToStaticMarkup` returns non-interactive HTML by design. It is the right
  tool here precisely because it has no hydration, no effects, and no DOM.

## Sources

- `ts.transpileModule` and its `isolatedModules` caveat —
  `/microsoft/typescript-website`
- `renderToStaticMarkup(reactNode, options?)` returning non-interactive HTML —
  `/reactjs/react.dev`
