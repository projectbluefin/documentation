const test = require("node:test");
const assert = require("node:assert/strict");

test("cleanMarkdown strips frontmatter and custom JSX components", async () => {
  const { cleanMarkdown } = await import("./generate-llms-txt.mjs");
  const input = `---
title: Sample Page
---
import Tabs from '@theme/Tabs';

# Welcome

<Tabs>
Hello world
</Tabs>
`;

  const output = cleanMarkdown(input);
  assert.ok(!output.includes("---"));
  assert.ok(!output.includes("import Tabs"));
  assert.ok(!output.includes("<Tabs>"));
  assert.ok(output.includes("Hello world"));
  assert.ok(output.includes("# Welcome"));
});

test("cleanMarkdown preserves code fences", async () => {
  const { cleanMarkdown } = await import("./generate-llms-txt.mjs");
  const input = `
\`\`\`jsx
import React from 'react';
<MyComponent />
\`\`\`
`;

  const output = cleanMarkdown(input);
  assert.ok(output.includes("import React from 'react';"));
  assert.ok(output.includes("<MyComponent />"));
});
