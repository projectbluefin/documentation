# Contributing to Bluefin Documentation

Thank you for contributing to the Bluefin documentation! This guide covers how to contribute to **this documentation repository** specifically.

## Good First Contributions

New to contributing? Here are some great ways to get started:

- **Fix a broken or outdated link** — If you find a link that no longer works or points to old information, submit a fix.
- **Add a missing step to an existing guide** — If a guide assumes prior knowledge or skips a step, fill in the gap.
- **Improve code block language tags** — Ensure every code block has a language tag (e.g., `bash`, `yaml`, `json`) for proper syntax highlighting.
- **Check issues labeled ["good first issue"](https://github.com/projectbluefin/documentation/labels/good%20first%20issue)** — We tag beginner-friendly issues to help you find a place to start.

If something confused you, it probably confuses others too. Don't hesitate to open an issue or PR for anything unclear.

## Content Scope

### What Belongs Here

- Bluefin-specific features, workflows, and customizations
- Integration guides (Homebrew, Flatpak, distrobox usage on Bluefin)
- Getting started guides and installation instructions
- Community-specific information (values, mission, FAQ)

### What Belongs Upstream

**Prefer linking to upstream documentation** with a brief summary rather than duplicating content.

Link to upstream docs for:

- General Linux/GNOME usage
- Flatpak, Podman, or distrobox documentation
- Upstream Fedora or Universal Blue features
- Third-party application documentation

**Example**: Instead of documenting how to use VSCode, link to VSCode's official docs and note any Bluefin-specific setup (like using it in a dev container).

## Style Guide

### Tone

- **Conversational and welcoming**: Think "helpful friend" not "technical manual"
- **Concise**: Bluefin docs are intentionally sparse—keep it scannable
- **Assume competence**: Our audience includes developers and power users

### Document Structure

- Use **frontmatter** with `title` and optional `slug`:
  ```md
  ---
  title: Your Page Title
  slug: /your-slug
  ---
  ```
- **One H1 (`#`) per page** (typically the title)
- **Start sections with H2 (`##`)**, subsections with H3 (`###`)
- Use **tip/info/warning admonitions** for callouts:
  ```md
  :::tip
  This is a helpful tip!
  :::
  ```

### Code Blocks

- Always specify the language for syntax highlighting:
  ````md
  ```bash
  rpm-ostree status
  ```
  ````
- Use `bash` for shell commands, `yaml` for configs, `json` for JSON, etc.
- For multi-line commands, use `\` for line continuation

### Links

- **Prefer absolute paths** for internal docs: `/introduction` not `./introduction.md`
- Use descriptive link text: `[install Homebrew](/command-line)` not `[click here](link)`

## Local Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies (required due to peer dependency conflicts)
npm install --legacy-peer-deps

# Start development server
npm run start
```

The site will be available at `http://localhost:3000`.

### Using Just (Optional)

```bash
just serve  # Build and serve locally
just build  # Build only
```

### Using Docker (Alternative)

```bash
docker compose up
```

## Before Submitting

### Format Your Changes

**REQUIRED**: Run Prettier before submitting your PR:

```bash
npm run prettier
```

This formats all files according to the project's style (80-char width, 2-space indent, LF line endings).

### Check Your Changes

- Preview locally to ensure formatting looks correct
- Verify links work (internal and external)
- Check that code blocks render with proper syntax highlighting

## Pull Request Process

1. **Create a descriptive PR title**: `docs: add installation guide for Nvidia drivers`
2. **Reference related issues**: `Fixes #123` or `Related to #456`
3. **Keep PRs focused**: One topic per PR when possible
4. **Expect feedback**: Reviewers may suggest content placement or style changes

### What Reviewers Look For

- **Content placement**: Does this belong here or upstream?
- **Tone consistency**: Does it match the conversational Bluefin style?
- **Prettier compliance**: Are files formatted correctly?
- **Link validity**: Do all links work?
- **Clarity**: Is it scannable and easy to understand?

## Adding a New Doc Page

1. Create your `.md` or `.mdx` file in the `docs/` directory
2. Add frontmatter with `title` and optional `slug`
3. Update `sidebars.ts` if you want it in the navigation
4. Follow the style guide above
5. Run `npm run prettier` before committing

## Questions?

- Open a [discussion](https://github.com/projectbluefin/documentation/discussions) for questions
- Check existing [issues](https://github.com/projectbluefin/documentation/issues) for known topics
- See the main [Contributor's Guide](/contributing) for broader project contribution info

---

**Remember**: There's likely a reason why something is undocumented. When in doubt, link to upstream docs!
