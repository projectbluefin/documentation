---
mdx:
  format: md
title: "kubeadm sysext"
slug: /server/kubeadm-sysext
description: "Run Bluefin Server as a kubeadm worker or single-node control plane."
---

# kubeadm sysext

The opt-in kubeadm extension provides kubelet, kubeadm, kubectl, crictl,
containerd, runc, and CNI plugins. Use [k0s](/server/k0s-sysext-ops) instead for a
k0s cluster; the two Kubernetes versions move independently.

<a id="contents"></a>

## Enable the extension

`kubeadm_<image-version>.raw.zst` is image-locked and included in the signed
release checksums. On installed nodes, enable the `kubeadm`
[sysupdate feature](/server/systemd-sysupdate-verification). Enabling the
feature alone does not fetch the running version; see
[extension fetching](/server/systemd-sysext-extensions#fetch-extensions-for-the-running-image).
Diskless provisioning writes `/etc/extensions/kubeadm_<ver>.raw` with a sha256
verification hash.

No services are enabled by default. A worker's Ignition must enable the
extension, `containerd.service`, and `kubelet.service`, then run the cluster's
`kubeadm join` command. For a control plane, use the procedure below.

## Versions

Check the shipped Kubernetes version in the upstream
[`include/kubeadm.yml`](https://github.com/projectbluefin/server/blob/main/include/kubeadm.yml)
before joining or updating:

- `kubeadm join` must use the minor that last ran `kubeadm init` or
  `kubeadm upgrade` on the cluster.
- kubelet may be older than the API server, never newer.
- Patch updates do not change these constraints. Component patches are
  tracked automatically upstream; Kubernetes minor bumps are manual and
  follow the cluster control-plane upgrade.

The extension updates with the OS. Keep its image version matched to the
booted OS, including on rollback. See the
[upstream version-update procedure](https://github.com/projectbluefin/server/blob/main/docs/skills/kubeadm-sysext.md#versions)
for changing Kubernetes and runtime pins.

## Runtime contract

- Before containerd starts, its unit seeds `/etc/containerd/config.toml` and
  `/etc/crictl.yaml` only if absent, migrates the imports line, loads
  `overlay` and `br_netfilter`, and applies forwarding and bridge sysctls.
  These steps run after the sysext merge, before kubeadm preflight.
- containerd stores data in `/var/lib/containerd` and waits for any per-node
  mount there. It uses `SystemdCgroup = true`, sandbox image
  `registry.k8s.io/pause:3.10.1`, and registry config in
  `/etc/containerd/certs.d`.
- The config imports `/usr/share/bluefin/containerd/conf.d/*.toml` from
  extensions and `/etc/containerd/conf.d/*.toml` for local overrides.
  Drop-ins deep-merge plugin sections; empty globs are harmless. The
  [NVIDIA toolkit](/server/nvidia-sysext) adds its runtime this way.
- `/opt/cni/bin` stays writable for the cluster CNI. containerd searches it
  before the shipped `/usr/libexec/cni` plugins.
- kubelet retries every 10 seconds until `kubeadm join` writes
  `/var/lib/kubelet/config.yaml`. Its volume-plugin directory is
  `/var/lib/kubelet/volumeplugins`, not read-only `/usr`.
- kubelet uses systemd-resolved's `/run/systemd/resolve/resolv.conf`; the base
  `/etc/resolv.conf` links there.
- While kubelet runs or restarts, automatic OS and boot-deadline rollback
  reboots stand down. kured owns reboots; the deadline sets
  `/run/reboot-required`. See [Updates](/server/ddi-installer#updates).

## Migration

On containerd start, `/usr/libexec/bluefin-kubeadm-containerd-migrate` adds the
shipped top-level `imports` line to older `/etc/containerd/config.toml` files.
Missing files and configs already containing a top-level `imports` are left
untouched. An `imports` inside a `[table]` is not top-level and does not count.

The helper validates a sibling `config.toml.new.<pid>` as TOML before copying
it over the original, preserving mode, owner, and SELinux label. If validation
or copying fails, the complete candidate remains at the logged path.
**containerd still starts with the old config**, which may lack extension
runtimes. Check this when the NVIDIA handler is missing. Fresh installs and
diskless boots already seed the imports line.

The NVIDIA toolkit's activation restarts containerd after merging, so the
handler is loaded on the same boot. If you change the config later, restart
containerd yourself.

## Single-node control plane

`kubeadm-init.service` creates a one-node cluster that also runs workloads.
It is opt-in and does not seed configuration on workers.

1. **Enable the unit.** On an installed node, after the extension is merged:

   ```bash
   systemctl enable kubeadm-init.service
   ```

   For diskless Ignition, write the extension image and this symlink:

   ```text
   /etc/systemd/system/multi-user.target.wants/kubeadm-init.service -> /usr/lib/systemd/system/kubeadm-init.service
   ```

   Ignition's `enabled: true` is insufficient: it runs in the initrd before
   the sysext unit exists. After the merge,
   `bluefin-sysext-activate.service` starts the linked unit.

2. **Set configuration before first init.** The unit seeds
   `/etc/kubernetes/bluefin/init.yaml` from
   `/usr/share/bluefin/kubeadm/init.yaml` only if absent. Write your own `/etc`
   copy through Ignition or by hand to override it. Defaults are kubeadm
   `v1beta4`, the shipped Kubernetes version, containerd's CRI socket,
   `cgroupDriver: systemd`, cluster `bluefin`, pod CIDR `10.244.0.0/16`, service
   CIDR `10.96.0.0/12`, and `registry.k8s.io`. kubeadm chooses the hostname and
   default-route interface for the node name and advertise address.

3. **Allow first-boot setup.** After networking, containerd, and config seeding,
   the unit runs only if `admin.conf` is absent and the init config exists. It
   enables containerd and kubelet, then runs:

   ```bash
   kubeadm init --config /etc/kubernetes/bluefin/init.yaml --skip-phases=addon/kube-proxy
   ```

   It links `/root/.kube/config` to `/etc/kubernetes/admin.conf`, removes the
   control-plane `NoSchedule` taint, and removes
   `node.kubernetes.io/exclude-from-external-load-balancers` only when this is
   the cluster's sole node, allowing MetalLB to announce from it.

   Failed init runs `kubeadm reset --force` so a leftover `admin.conf` cannot
   block retries. The service retries after 30 seconds.

4. **Install a CNI.** None is included. Cilium needs
   `kubeProxyReplacement=true` and `k8sServiceHost` set to the node address.
   Until then the node stays NotReady and CoreDNS Pending.

Init pulls images from the network. Offline init is not provided; this lists
what would need to be available (including kube-proxy, although it is unused):

```bash
kubeadm config images list --config /etc/kubernetes/bluefin/init.yaml
```

**Persistence:** installed nodes keep `admin.conf` and the enable links, skip
init on later boots, and start containerd and kubelet directly. Diskless nodes
lose `/etc` and `/var` and create a fresh cluster every boot.

For multi-node homelabs, the
[homelab templates](/server/homelab-profile) configure `HOMELAB_ROLE`, a unique
hostname, mDNS control-plane endpoint and certificate SANs, and
passphrase-authenticated node joining. The prepare service respects an
already configured endpoint. See the
[cluster protocol and threat model](https://github.com/projectbluefin/server/blob/main/files/homelab/cluster/README.md).

## Host tools

kubeadm v1.35 preflight needs `losetup`, `mount`, and `cp`, supplied by the base
image. `conntrack`, `iptables`, `ethtool`, and `socat` are not shipped:
conntrack is no longer required, Cilium supplies iptables, kube-proxy is
replaced, and containerd 2 handles port forwarding in-process.

## Kernel options

The base kernel supplies Cilium's VXLAN/GENEVE, BPF traffic-control, socket
diagnostics, and NOTRACK options. These are base-image modules, signed there,
not modules supplied by the kubeadm extension. Exact Kconfig settings and build
checks are in the [upstream technical reference](https://github.com/projectbluefin/server/blob/main/docs/skills/kubeadm-sysext.md#kernel-options).

## iSCSI

The base image supplies `iscsiadm` and socket-activated `iscsid`.
`iscsi-init.service` creates `/etc/iscsi/initiatorname.iscsi` only if absent;
provision it through Ignition for a stable identity on diskless nodes, which
otherwise get a new name each boot. Automatic login via `iscsi.service` is
off. `/etc/iscsi/iscsid.conf` and `/var/lib/iscsi` are supplied for host-side
`iscsiadm`, including democratic-csi's `chroot /host` use.

## NFS

The base image supplies NFS client tools, including `mount.nfs`, `mount.nfs4`,
`umount.nfs`, `rpc.statd`, `nfsidmap`, `nfsstat`, and `showmount`. There is no
NFS server or GSS/Kerberos support (`sec=krb5*` is unsupported).
`nfs-client.target` and `rpcbind.socket` are enabled; NFSv3 starts
`rpc-statd.service` on demand for locking. NFSv4 needs neither service and
uses `nfsidmap` through the kernel's request-key upcall for ID mapping.

For failed PV mounts:

- `fsconfig() failed: NFS: mount program didn't pass remote address` points to
  a missing `mount.nfs` helper.
- `Failed to find 'tcp' protocol` points to missing `/etc/protocols` or
  `/etc/services`. These are factory links refreshed by A/B updates.
- Diskless nodes lose `/var/lib/nfs/statd` on reboot, so NFSv3 servers are not
  notified of locks held before that reboot.

## Known gaps

arm64 binaries are pinned, but no aarch64 image has been built or booted.

## Verify

On a worker, inspect `crictl info` and `kubeadm init phase preflight`.
For a control plane, check that the node and CoreDNS become Ready after CNI
installation. Build and QEMU checks are in the
[upstream guide](https://github.com/projectbluefin/server/blob/main/docs/skills/kubeadm-sysext.md#verify).
