# GitHub Copilot Coding Agent Environment

This file (`.github/copilot-codespace.yml`) customizes the GitHub Copilot coding agent environment for the bluefin-docs repository.

## Features

- **Pre-installed Bun package manager**: The project uses Bun instead of npm for faster builds
- **Optimized dependencies**: All project dependencies are pre-installed during environment setup
- **Development tools**: Includes TypeScript, Prettier, and VS Code extensions for documentation editing
- **Performance optimized**: Allocated 4GB memory and 2 CPUs for efficient builds
- **Ready-to-use**: Environment is fully configured with build validation on startup

## Build Process

The environment automatically:
1. Installs Bun package manager
2. Installs project dependencies from `bun.lockb`
3. Tests the build process to ensure everything works
4. Configures Git for commits
5. Provides helpful command information

## Key Tools Preinstalled

- **Node.js 22.x**: Base runtime environment
- **Bun 1.2.21+**: Package manager used by this project
- **Docusaurus 3.8.1**: Static site generator
- **TypeScript 5.9.2**: Type checking and compilation
- **React 19.x**: Frontend framework
- **Prettier 3.6.2**: Code formatting

## Available Commands

Once the environment is ready, you can use:

```bash
bun run start         # Start development server (http://localhost:3000)
bun run build         # Build production site
bun run serve         # Serve built site locally
bun run typecheck     # Validate TypeScript
bun run prettier-lint # Check code formatting
bun run prettier      # Fix code formatting
```

This configuration ensures the GitHub Copilot coding agent has all necessary tools preinstalled, significantly reducing setup time and improving development efficiency.