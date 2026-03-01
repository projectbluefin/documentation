---
title: Building Locally
slug: /local
---

# Using the devcontainer

Follow the [ublue-os/devcontainer](https://github.com/ublue-os/devcontainer) documentation.

# Building Bluefin

Bluefin is cloud native, so all the tooling can be run locally or on any server. Check out the [Universal Blue Forge](https://github.com/ublue-os/forge) if you're interested in self-hosting. [Just](https://just.systems) is used to manage build tasks. It is designed to facilitate local development. It is also useful for building Bluefin on a wider variety of CI/CD systems.

First clone the repo:

`git clone https://github.com/ublue-os/bluefin.git`

The `Justfile` at the root of the repo is used to build the images and ISOs, here's some examples:

| Command                             | Description                                          |
| ----------------------------------- | ---------------------------------------------------- |
| `just build bluefin`                | Defaults to `latest` main                            |
| `just build bluefin-dx stable`      | Builds `stable` only Bluefin DX                      |
| `just build bluefin-dx beta nvidia` | Builds `beta` `nvidia` version of Bluefin DX         |
| `just build bluefin stable nvidia`  | Builds `nvidia` version of the Bluefin stable branch |

The general pattern is `just build/run image tag flavor`

- Images: `bluefin`,`bluefin-dx`
- Tags: `stable`,`latest`,`beta`
- Flavors: `main`,`nvidia`,`hwe`,`hwe-nvidia`

### Run the image and open a shell:

```
just run bluefin stable
```

### Build an ISO:

```
just build-iso bluefin stable
```

### Run an ISO

This command fires up a virtual machine and runs the image:

```
just run-iso bluefin stable
```

## Tasks

### clean

Cleans the repository by removing build directories and the `previous.manifest.json` file.

- Uses `find *_build* -exec rm -rf {}` to remove directories and `rm -f previous.manifest.json` to delete the manifest file.

### sudo-clean

Performs the same cleaning operations as `clean` but with elevated privileges using the `sudoif` function.

### validate

Validates the combination of image, tag, and flavor provided as arguments.

- Checks if the provided image, tag, and flavor exist in the predefined associative arrays.
- Ensures that certain combinations (e.g., `gts` tag with `aurora` image) are not allowed.

### sudoif

A helper function to execute commands with elevated privileges if necessary.

- Uses `sudo` with `--askpass` if available, or directly if the user has root privileges.

### build

Builds an image with specified parameters (image, tag, flavor, and rechunk).

- Validates the input parameters, determines the image name, base image, target, Fedora version, and kernel release.
- Uses `podman build` to create the container image with appropriate build arguments and labels.
- Optionally calls the `rechunk` task if the `rechunk` parameter is set to 1.

### build-rechunk

A convenience task that calls the `build` task with the `rechunk` parameter set to 1.

### rechunk

Rechunks an image to optimize its storage.

- Ensures the image is already built and available in the local Podman store.
- Uses a series of `podman` commands to prune, create, and chunk the image.
- Updates permissions and cleans up temporary files and volumes.

### run

Runs a container from the built image.

- Validates the input parameters and ensures the image is built if not already available.
- Uses `podman run` to start the container interactively.

### build-iso

Builds an ISO image from the container image.

- Validates the input parameters and determines the appropriate image name.
- Can pull the image from GHCR or use a locally built image.
- Generates a list of flatpaks to be included and creates the ISO using `podman run` with appropriate arguments.

### build-iso-ghcr

A convenience task that calls the `build-iso` task with the `ghcr` parameter set to 1.

### run-iso

Runs an ISO image in a virtualized environment.

- Validates the input parameters and ensures the ISO is built if not already available.
- Determines an available port and uses `podman run` to start the virtualized environment with the ISO.

### changelogs

Tests changelogs for a specified branch.

- Uses a Python script to generate changelogs and outputs the results to specified files.
