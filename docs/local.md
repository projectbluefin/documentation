---
title: Building Locally
slug: /local
---

# Using the devcontainer

Follow the [projectbluefin/bluefin](https://github.com/projectbluefin/bluefin) documentation.

# Building Bluefin

Bluefin is cloud native, so all the tooling can be run locally or on any server. Check out the [Universal Blue Forge](https://github.com/ublue-os/forge) if you're interested in self-hosting. [Just](https://just.systems) is used to manage build tasks. It is designed to facilitate local development. It is also useful for building Bluefin on a wider variety of CI/CD systems.

First clone the repo:

`git clone https://github.com/projectbluefin/bluefin.git`

The `Justfile` at the root of the repo is used to build the images. The general pattern is:

```
just build <image> <tag> <flavor>
```

| Command                                    | Description                                   |
| ------------------------------------------ | --------------------------------------------- |
| `just build bluefin testing main`          | Build the testing stream image                |
| `just build bluefin testing nvidia-open`   | Build the testing stream NVIDIA image         |

- **Images:** `bluefin`
- **Tags:** `testing`, `stable`
- **Flavors:** `main`, `nvidia-open`

### Validate a combination:

```
just validate bluefin testing main
```

### List available recipes:

```
just
```

## Tasks

### clean

Cleans the repository by removing build directories and the `previous.manifest.json` file.

### validate

Validates the combination of image, tag, and flavor provided as arguments.

- Checks if the provided image, tag, and flavor exist in the predefined associative arrays.

### build

Builds an image with specified parameters (image, tag, flavor).

- Validates the input parameters, determines the image name, base image, target, Fedora version, and kernel release.
- Uses `podman build` to create the container image with appropriate build arguments and labels.
- Optionally calls the `rechunk` task via `build-rechunk`.

### build-rechunk

A convenience task that calls `build` followed by the rechunk step to optimize image storage.

### rechunk

Rechunks an image to optimize its storage for faster OTA updates.

- Ensures the image is already built and available in the local Podman store.
- Uses `rpm-ostree compose build-chunked-oci` to chunk the layers.
