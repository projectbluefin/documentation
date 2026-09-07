export const QUICKSTARTS = {
  "first-pr": {
    title: "Making your first pull request in Project Bluefin",
    steps: [
      "Pure upstream development: work directly on projectbluefin/<repo>, never personal forks.",
      "Run tests before pushing: 'just check' (typecheck + lint + test).",
      "Format touched files only: 'npx prettier --write <paths>'.",
      "Use Conventional Commits: 'feat:', 'fix:', 'docs:', etc.",
      "Include AI attribution trailers in commits:",
      "  Assisted-by: <Model> via GitHub Copilot",
      "  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>",
      "(Exception: projectbluefin/dakota strictly forbids Co-authored-by; Assisted-by only).",
      "Self-improvement: update the relevant skill file in docs/skills/ in the same PR if new pattern discovered.",
    ],
  },
  "run-tests": {
    title: "Running verification and tests",
    steps: [
      "npm install --legacy-peer-deps",
      "npm run typecheck",
      "npm run lint",
      "npm test",
      "npm run build:ci",
    ],
  },
  "factory-gates": {
    title: "Factory Safety and Decision Gates",
    rules: [
      "Never create secrets, PATs, tokens, or app credentials.",
      "Sensitive paths require human review before merge: .github/workflows/ and Justfile.",
      "Doc-only push exception: changes touching only docs/**, blog/**, reports/**, adr/**, or AGENTS.md may push straight to main without a PR.",
      "Everything else takes a branch and a PR targeting main (or testing for image repos).",
    ],
  },
  "branch-rules": {
    title: "Branch Targets & Rulesets",
    targets: {
      documentation:
        "PRs target 'main'; merge queue enabled; doc-only push exception applies.",
      common: "PRs target 'main'; squash merge queue.",
      bluefin:
        "PRs target 'testing'; automated daily promotion to 'main' upon passing E2E.",
      "bluefin-lts":
        "PRs target 'testing'; automated daily squash promotion to 'main'.",
      dakota:
        "PRs target 'testing' (or 'next'); forbids Co-authored-by trailer.",
    },
  },
};

export const REPOSITORY_MAPS = {
  documentation: {
    role: "Documentation site, public MCP Worker, factory dashboard, central onboarding hub",
    target_branch: "main",
    check_command: "npm run typecheck && npm run lint && npm test",
    paths: {
      docs: "docs/ (mounted at /; every file publishes)",
      blog: "blog/ (authors in blog/authors.yaml)",
      skills: "docs/skills/ (agent skill instructions)",
      mcp_worker: "workers/knowledge-mcp/ (public MCP endpoint)",
    },
  },
  common: {
    role: "Shared OCI layer, cross-repository agentic policy sidecar",
    target_branch: "main",
    paths: {
      agentic_model: "docs/factory/agentic-model.md",
      skills: "docs/skills/",
    },
  },
  bluefin: {
    role: "Flagship Fedora-based desktop workstation image",
    target_branch: "testing",
    paths: {
      containerfile: "Containerfile",
      justfile: "Justfile",
      build_scripts: "build_files/",
    },
  },
  "bluefin-lts": {
    role: "Enterprise CentOS Stream 10 bootc image",
    target_branch: "testing",
    paths: {
      containerfile: "Containerfile",
      image_toml: "image.toml",
      build_scripts: "build_scripts/",
    },
  },
  dakota: {
    role: "Distroless GNOME OS / BuildStream workstation",
    target_branch: "testing",
    paths: {
      project_conf: "project.conf",
      elements: "elements/",
      justfile: "Justfile",
    },
  },
};
