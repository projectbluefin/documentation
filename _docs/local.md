---
layout: page
title: Building Locally
permalink: /local
---


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

# Justfile Overview

This `Justfile` defines various tasks for managing and building container images and ISOs for a development environment. Here is an overview and some important points:

### Aliases and Variables:
- `project_root` and `git_branch` variables are used to fetch the project's root directory and the current Git branch respectively.
- `run` is an alias for `run-container`.

### Default Task:
- `_default` task runs `just help`, which displays a help message.

### Container and Image Management:
- `_container_mgr`: Executes a script to manage containers.
- `_base_image image`: Executes a script to set the base image.
- `_tag image target`: Executes a script to tag an image with a target.

### Just Syntax Checking and Fixing:
- `just-check`: Checks the syntax of all `.just` files in the project.
- `just-fix`: Fixes the syntax of all `.just` files in the project.

### Build and Run Tasks:
- `build image="" target="" version=""`: Builds an image with specified parameters.
- `run-container image="" target="" version=""`: Runs a container with specified parameters.
- Commented out tasks (`run-booted-guest` and `run-booted-home`) suggest options for running booted images with different configurations.

### ISO Management:
- `build-iso image="" target="" version=""`: Creates an ISO from a local dev build image.
- `build-iso-installer-main image="" target="" version=""`: Creates an ISO using `build-container-installer:main`.
- `run-iso image="" target="" version=""`: Runs an ISO.
- `build-iso-ghcr image="" target="" version=""`: Creates an ISO from the current GHCR image.

### Cleanup and Listing:
- `clean`: Cleans the directory by removing ISOs and build files.
- `clean-images`: Removes built images.
- `list-images`: Lists built images.

### Private Help Task:
- `help`: Displays a help message explaining the usage of the Justfile.

### Specific Build Tasks:
- `bluefin`: Builds the `bluefin` image with `base` target and `gts` version.
- `bluefin-dx`: Builds the `bluefin` image with `dx` target and `gts` version.
- `bluefin-iso`: Builds an ISO for the `bluefin` image with `base` target and `gts` version.
- `bluefin-dx-iso`: Builds an ISO for the `bluefin` image with `dx` target and `gts` version.
- `aurora`: Builds the `aurora` image with `base` target and `stable` version.
- `aurora-dx`: Builds the `aurora` image with `dx` target and `stable` version.
- `aurora-iso`: Builds an ISO for the `aurora` image with `base` target and `stable` version.
- `aurora-dx-iso`: Builds an ISO for the `aurora` image with `dx` target and `stable` version.

This `Justfile` is designed to streamline the process of building, running, and managing container images and ISOs in a development environment. The scripts in the `scripts` directory are responsible for the actual operations, while the `Justfile` provides an easy-to-use interface for developers.
