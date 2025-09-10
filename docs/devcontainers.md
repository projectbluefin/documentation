---
title: Devcontainers Quickstart
slug: /devcontainers
---

# Devcontainers Quickstart Guide

Dev Containers provide a consistent, reproducible development environment using containerization. This guide helps you get started with Dev Containers in Visual Studio Code on Bluefin.

## What are Devcontainers?

Dev Containers allow you to use a Docker container as a full-featured development environment. Your entire development environment - including tools, runtime, dependencies, extensions, and settings - is defined in configuration files that can be versioned and shared with your team.

## Why Use Dev Containers?

- **Consistency**: Same environment across different machines and team members
- **Isolation**: Keep project dependencies separate from your host system
- **Reproducibility**: Version-controlled development environment
- **Onboarding**: New team members can start coding immediately

## Prerequisites

Before you begin, ensure you [enabled developer mode](/bluefin-dx#step-1-turn-it-on) on Bluefin.

## Installation and Setup

### Verify Container Runtime

Ensure Docker or Podman is running:

```bash
# For Podman (default on Bluefin)
podman --version

# For Docker
docker --version
```

## Getting Started

### Option 1: Start with an Existing Project

1. **Open your project** in VS Code
2. **Add Dev Container configuration**:
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run: `Dev Containers: Add Dev Container Configuration Files...`
   - Choose a template that matches your technology stack
3. **Reopen in container**:
   - VS Code will show a notification to "Reopen in Container"
   - Or use Command Palette: `Dev Containers: Reopen in Container`

### Option 2: Clone and Open in Container

1. **Clone a repository with Dev Container support**:
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run: `Dev Containers: Clone Repository in Container Volume...`
   - Enter the repository URL
   - VS Code will clone and open the project in a container

### Option 3: Create New Project from Template

1. **Start from a template**:
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run: `Dev Containers: New Dev Container...`
   - Choose a template or "Show All Definitions"
   - Select your preferred technology stack

## Understanding Dev Container Files

When you add Dev Container configuration, VS Code creates a `.devcontainer` folder with:

- **`devcontainer.json`**: Main configuration file
- **`Dockerfile`** (optional): Custom container definition
- **`docker-compose.yml`** (optional): Multi-container setup

### Basic devcontainer.json Example

```json
{
  "name": "Node.js",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:18",
  "features": {
    "ghcr.io/devcontainers/features/git:1": {}
  },
  "extensions": ["ms-vscode.vscode-typescript-next"],
  "forwardPorts": [3000],
  "postCreateCommand": "npm install"
}
```

## Working with Dev Containers

### Common Commands

Access these through Command Palette (`Ctrl+Shift+P`):

- `Dev Containers: Reopen in Container` - Open current folder in container
- `Dev Containers: Reopen Locally` - Return to local development
- `Dev Containers: Rebuild Container` - Rebuild after config changes
- `Dev Containers: Show Container Log` - View container build/run logs
- `Dev Containers: Open Container Configuration File` - Edit devcontainer.json

### Port Forwarding

Dev Containers automatically forward ports specified in your configuration. You can also:

- **Forward additional ports**: `Ports` panel in VS Code
- **Configure in devcontainer.json**: Add ports to `forwardPorts` array
- **Access via localhost**: Forwarded ports work like local development

### Extensions and Settings

- **Automatic installation**: Extensions listed in `devcontainer.json` install automatically
- **Container-specific settings**: Configure VS Code settings per container
- **Persistent data**: Use volumes for data that should persist between rebuilds

## Advanced Features

### Dev Container Features

Add pre-built tools and configurations using [Dev Container Features](https://github.com/devcontainers/features):

```json
{
  "features": {
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers/features/node:1": {
      "version": "18"
    }
  }
}
```

### Multi-Container Development

Use docker-compose for complex setups with databases, services, etc.:

```json
{
  "name": "App with Database",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace"
}
```

### Lifecycle Scripts

Automate setup with lifecycle hooks:

```json
{
  "postCreateCommand": "npm install && npm run setup",
  "postStartCommand": "npm run dev",
  "postAttachCommand": "echo 'Container ready!'"
}
```

## Command Line Interface

The Dev Container CLI provides command-line access to dev container functionality, allowing you to build, run, and manage dev containers without VS Code.

### Installation

Install the Dev Container CLI using homebrew:

```bash
brew install devcontainer
```

You can also install it via npm:

```bash
npm install -g @devcontainers/cli
```

### Basic Usage

**Build a dev container**:

```bash
devcontainer build .
```

**Run a dev container**:

```bash
devcontainer up .
```

**Execute commands in a dev container**:

```bash
devcontainer exec . bash
```

**Build and run in one command**:

```bash
devcontainer up --build .
```

### Useful Commands

- `devcontainer --help` - Show all available commands
- `devcontainer read-configuration .` - Parse and validate devcontainer.json
- `devcontainer features install` - Install dev container features
- `devcontainer templates apply` - Apply a dev container template

### Integration with CI/CD

The CLI is particularly useful for CI/CD pipelines where you want to build and test your application in the same environment as your development container:

```bash
# In your CI pipeline
devcontainer build .
devcontainer exec . npm test
```

For more detailed information, check the [official Dev Container CLI documentation](https://containers.dev/implementors/reference/).

## Tips for Bluefin Users

- **Podman compatibility**: Dev Containers work seamlessly with Podman on Bluefin
- **Performance**: Use volume mounts for better I/O performance
- **Updates**: Container images update automatically when rebuilding
- **Integration**: Works with Bluefin's container-focused workflow

## Troubleshooting

### Common Issues

**Container won't start**:

- Check container runtime is running (`podman ps` or `docker ps`)
- Verify devcontainer.json syntax
- Review container logs in Output panel

**Extensions not loading**:

- Ensure extensions are listed in devcontainer.json
- Check if extensions support remote development
- Try rebuilding the container

**Port access issues**:

- Verify ports are forwarded in configuration
- Check firewall settings
- Ensure application binds to `0.0.0.0` not `localhost`

### Getting Help

- Check VS Code's **Output** panel for detailed logs
- Use **Dev Containers: Show Container Log** command
- Review error messages in the notification area

## Learn More

### Official Documentation

- **[Dev Containers Overview](https://code.visualstudio.com/docs/devcontainers/containers)** - Complete VS Code guide
- **[Dev Container Specification](https://containers.dev/)** - Official specification and reference
- **[devcontainer.json Reference](https://code.visualstudio.com/docs/devcontainers/devcontainer-cli)** - Configuration options
- **[Dev Containers Tutorial](https://code.visualstudio.com/docs/devcontainers/tutorial)** - Step-by-step tutorial

### Templates and Examples

- **[Dev Container Templates](https://github.com/devcontainers/templates)** - Pre-built templates for popular frameworks
- **[Dev Container Features](https://github.com/devcontainers/features)** - Reusable components and tools
- **[Sample Dev Containers](https://github.com/microsoft/vscode-dev-containers)** - Example configurations

### VS Code Remote Development

- **[Remote Development Extension Pack](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack)** - Complete remote development toolkit
- **[Remote Development Tips](https://code.visualstudio.com/docs/remote/troubleshooting)** - Troubleshooting guide
- **[Working with Containers](https://code.visualstudio.com/docs/remote/containers-advanced)** - Advanced container scenarios
