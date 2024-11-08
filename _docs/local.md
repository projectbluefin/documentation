---
layout: page
title: Building Locally
permalink: /local
---

Bluefin is cloud native, so all all the tooling can be run locally or on any server. 

## Building Locally (Bluefin Example)

1. Clone this repository and `cd` into the working directory

    ```bash
    git clone https://github.com/ublue-os/bluefin.git
    cd bluefin
    ```

2. Make modifications if desired

3. Build the image (Note that this will download the entire image)

    ```bash
    podman build . -t bluefin
    ```

4. [Podman push](https://docs.podman.io/en/latest/markdown/podman-push.1.html) to a registry of your choice.

5. Rebase to your image to wherever you pushed it:

    ```bash
    sudo rpm-ostree rebase ostree-image-signed:docker://whatever/bluefin:latest
    ```
# Justfile Documentation

The `Justfile` in the `ublue-os/bluefin` repository defines various tasks for managing the build process, cleaning, validation, and ISO building. Here is a detailed breakdown of the tasks and their purposes:

## Variables and Initial Setup
- `repo_organization`: Defines the organization name.
- `images`, `flavors`, `tags`: Associative arrays mapping different image, flavor, and tag names to their respective values.

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
