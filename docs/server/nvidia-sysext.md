---
mdx:
  format: md
title: "NVIDIA sysexts"
slug: /server/nvidia-sysext
description: "Enable NVIDIA drivers and CDI container support on Bluefin Server."
---

# NVIDIA sysexts

GPU nodes need two opt-in extensions: an NVIDIA driver and the NVIDIA
Container Toolkit. Neither is included or enabled in the base OS. General
[extension loading and kernel-module rules](/server/systemd-sysext-extensions)
still apply.

## What ships

| Extension | Release asset | Version matching |
| --- | --- | --- |
| Driver | `nvidia-open-<branch>_<image-version>.raw.zst` | Exact OS image and kernel; signed open modules, headless userspace, and GSP firmware |
| Container Toolkit | `nvidia-container-toolkit-<ctk-ver>.raw.zst` | Independent version, `ID=_any`; CDI tools, refresh units, and the `nvidia` containerd handler |

### Open kernel modules only (Turing and newer)

Only Turing and newer GPUs are supported. Modules are `nvidia`, `nvidia-uvm`,
`nvidia-modeset`, and `nvidia-drm`; `nvidia-peermem`/GPUDirect RDMA is not
provided because the kernel lacks InfiniBand support.

The userspace is headless: no 32-bit libraries, X driver, `nvidia-settings`,
`libglvnd`, OpenCL ICD loader, NGX, OptiX, VDPAU, NvFBC, VulkanSC, or
`nvidia-powerd`. The toolkit is CDI-only: no OCI hook or `libnvidia-container`.

## Flavours

Choose a branch from upstream
[`include/nvidia.yml`](https://github.com/projectbluefin/server/blob/main/include/nvidia.yml).
**Merge only one `nvidia-open-*` flavour per node.** They install the same
paths; `nvidia-flavour-guard.service` fails and prevents loading if two merge.
Booty rejects a second flavour per host. NVIDIA and ZFS extensions can merge
together when both match the booted image.

## GPU nodes

### Choosing the sysexts

- **Installed nodes:** enable the `nvidia-open-<branch>`
  [sysupdate feature](/server/systemd-sysupdate-verification). It follows OS
  updates and must match the booted image. For the running version, see
  [extension fetching](/server/systemd-sysext-extensions#fetch-extensions-for-the-running-image).
  Enable the toolkit separately:

  ```bash
  systemctl enable nvidia-container-toolkit-activate.service
  ```

- **Booty:** list `nvidia-open-<branch>` and `nvidia-container-toolkit` in the
  host's [extensions](/server/booty-integration).

The toolkit activation fetches through its sysupdate component if no image
is staged. Images are staged in `/var/lib/nvidia-container-toolkit/`, behind
`nvidia-container-toolkit.raw`, outside the sysext scan paths so two versions
do not merge. Once per boot, activation copies the image to `/run/extensions/`,
refreshes sysexts, and starts `nvidia-cdi-refresh.path` and
`nvidia-cdi-refresh.service`.

<a id="bumping"></a>

### Updates

The driver follows its OS-image feature, including A/B rollback. Keep exactly
one matching flavour selected on a node. The toolkit updates independently:

```bash
systemd-sysupdate --component=nvidia-container-toolkit update
```

Its staged image is activated by the once-per-boot process above. Driver and
toolkit releases are in the signed release set; see
[sysupdate verification](/server/systemd-sysupdate-verification).

### nouveau and mixed-generation hosts

The base kernel does not build nouveau. On kernels that do, the load service
first releases any GPU held by nouveau (`modprobe -r nouveau`, falling back
to per-device unbinding), then loads the signed modules through
`bluefin-sysext-modules`. A post-merge blacklist alone cannot release a GPU
nouveau already holds.

Loading succeeds if at least one supported GPU comes up and warns for NVIDIA
GPUs left unused. In a mixed-generation host, an older Pascal card stays
unused while a supported card works. Loading fails if the loader fails or no
GPU comes up.

On nodes without an NVIDIA display controller (PCI class `0x03`, vendor
`0x10de`), the load, device-node, persistence, and CDI refresh services skip.
The flavour guard and `nvidia-ldconfig.service` still run.

### Containers (CDI)

After the driver's library-cache and device-node services,
`nvidia-cdi-refresh.service` runs `nvidia-ctk cdi generate` to write
`/var/run/cdi/nvidia.yaml`. containerd 2.x enables CDI by default and reads
that directory. Workloads requesting CDI devices use the default `runc`
runtime; no OCI hook is involved.

### The `nvidia` runtime handler

The toolkit also supplies `/usr/bin/nvidia-container-runtime`, the upstream
CDI-only wrapper. It reads `NVIDIA_VISIBLE_DEVICES`, fully qualified
`nvidia.com/gpu=...` requests, or CDI annotations; injects devices from
`/etc/cdi` and `/var/run/cdi`; then executes `runc` from `PATH`.

No `/etc/nvidia-container-runtime/config.toml` is required. One can configure
logging there, but `mode` is ignored: this wrapper is fixed to CDI. The legacy
`auto` runtime and its hook/library stack are not shipped.

For [kubeadm](/server/kubeadm-sysext), the toolkit supplies
`/usr/share/bluefin/containerd/conf.d/nvidia-container-runtime.toml`, imported
by the containerd config. It registers `runtimes.nvidia` with
`io.containerd.runc.v2`, `BinaryName = "/usr/bin/nvidia-container-runtime"`,
and `SystemdCgroup = true`. It does **not** change the default `runc` runtime.
k0s reads `/etc/k0s/containerd.d/` instead and is **not wired up here**.

containerd reads imports only at startup. Activation runs
`systemctl try-restart containerd.service` after merging, ordered after
containerd has finished starting; existing containers survive
(`KillMode=process`). No containerd dependency is added on non-kubeadm nodes.
If you rewrite `/etc/containerd/config.toml` afterwards, restart containerd
yourself. Older configs need the
[kubeadm imports migration](/server/kubeadm-sysext#migration).

**GPU access policy:** the wrapper honours `NVIDIA_VISIBLE_DEVICES` for
unprivileged containers by default. Any pod allowed to use `RuntimeClass
nvidia` with `NVIDIA_VISIBLE_DEVICES=all` can claim all GPUs, bypassing
device-plugin accounting. Restrict RuntimeClass access and, if appropriate,
set `accept-nvidia-visible-devices-envvar-when-unprivileged` in
`/etc/nvidia-container-runtime/config.toml`. Tightening this breaks operands
that request devices through that environment variable.

### GPU Operator

The sysexts supply the driver and CDI spec. Disable the chart's driver and
toolkit installers:

```yaml
driver:
  enabled: false
toolkit:
  enabled: false
cdi:
  enabled: true
```

Equivalent flags: `--set driver.enabled=false --set toolkit.enabled=false
--set cdi.enabled=true`. Time-slicing and MIG remain Operator settings
(`devicePlugin.config`, `mig.strategy`).

The Operator creates a cluster-wide RuntimeClass and runs its device plugin,
GPU discovery, DCGM exporter, and validator with `runtimeClassName: nvidia`
and `NVIDIA_VISIBLE_DEVICES=all`. These need the `nvidia` handler above;
workloads receive devices through the device plugin's CDI requests under
`runc`.

## Troubleshooting

- **Module not found:** use the driver's load unit and
  [combined module index](/server/systemd-sysext-extensions#kernel-module-sysexts),
  not bare `modprobe nvidia`. Check image/kernel matching and the flavour guard.
- **No supported GPU:** inspect the load service outcome. Non-GPU nodes skip;
  pre-Turing cards cannot use the open modules.
- **`FailedCreatePodSandBox ... unable to get OCI runtime for sandbox`:**
  check the `nvidia` handler, imports migration, and containerd restart. Without
  it, Operator operands stay ContainerCreating, the device plugin supplies no
  `nvidia.com/gpu` resource, and workloads may report
  `CUDA driver version is insufficient`.
- QEMU driver checks have no NVIDIA GPU and cover only the skip path. The
  GPU-present path needs real-hardware verification.

<a id="adding-a-flavour"></a>
<a id="driver"></a>
<a id="container-toolkit"></a>
<a id="build-and-test"></a>
<a id="repository-layout"></a>

## See also

- [Upstream technical reference](https://github.com/projectbluefin/server/blob/main/docs/skills/nvidia-sysext.md)
  for adding flavours, version bumps, build commands, source layout, and tests.
- [Extension management](/server/systemd-sysext-extensions),
  [sysupdate verification](/server/systemd-sysupdate-verification), and
  [Booty provisioning](/server/booty-integration).
- `systemd-sysext(8)`, `systemd-sysupdate(8)`, `nvidia-ctk cdi generate --help`.
