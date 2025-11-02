## Project Overview

This is the documentation website for Bluefin, a custom image of Fedora Silverblue. The website is built using Docusaurus, a static site generator based on React.

The main technologies used are:

- Docusaurus
- React
- TypeScript
- Node.js

## Building and Running

### Prerequisites

- Node.js version 18 or higher
- `npm` or `bun` package manager

### Development

To start the development server, run the following commands:

```bash
npm install --legacy-peer-deps
npm run start
```

This will start a local development server and open up a browser window. Most changes are reflected live without having to restart the server.

Alternatively, you can use Docker:

```bash
docker compose up
```

### Build

To build the static site for production, run the following command:

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Development Conventions

### Code Style

This project uses Prettier for code formatting. Before committing any changes, please run the following command to format the code:

```bash
npm run prettier
```

### Contribution Guidelines

The `README.md` file states that docs linking to upstream documentation directly with a short summary is preferred. It also mentions that there's likely a reason why something is undocumented.

### Scripts

The `package.json` file contains the following scripts:

- `start`: Starts the development server.
- `build`: Builds the static site.
- `prettier`: Formats the code.
- `fetch-feeds`: Fetches feeds from external sources.
