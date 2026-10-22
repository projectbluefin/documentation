---
mdx:
  format: md
title: "Homelab Profile"
slug: /server/homelab-profile
description: "Deploy Kubernetes homelab clusters on Bluefin Server using Ignition templates for kubeadm and k0s."
---

# Homelab Profile

The Bluefin Server homelab profile provides pre-configured Ignition templates to deploy single-node or multi-node Kubernetes clusters (`kubeadm` or `k0s`) with optional services: Argo Workflows, a Kubernetes MCP server, and KubeStellar Console.

Apply a template during network boot, flash it to disk, provide it as a VM credential, or choose a Homelab option in the [USB installer](/server/usb-installer).

For developer element definitions, see the [upstream homelab templates](https://github.com/projectbluefin/server/tree/main/files/homelab/templates).

---

## Templates

Templates configure the target role and runtime without conditionals:

| Template | Runtime | Role | sysupdate Features | Starts |
| --- | --- | --- | --- | --- |
| `homelab-control-plane` | kubeadm | Control Plane | `kubeadm`, `homelab`, add-ons | `kubeadm-init.service` |
| `homelab-node` | kubeadm | Worker | `kubeadm`, `homelab` | `bluefin-cluster-join.service` |
| `homelab-k0s-control-plane` | k0s | Control Plane | `homelab`, add-ons (+ k0s) | `k0s-first-boot.service` |
| `homelab-k0s-node` | k0s | Worker | `homelab` (+ k0s) | `k0s-first-boot-fetch.service` |

Every template enables `bluefin-sysext-fetch.service` and `sshd.service` (key-only root login), writes `/etc/bluefin/homelab.conf.template`, and copies it to `/etc/bluefin/homelab.conf` if absent.

Release builds publish compiled Ignition (`.ign`) and Butane (`.bu`) templates as unversioned release assets (e.g. `releases/latest/download/homelab-control-plane.bu`).

### Editing Before Boot

1. **SSH Key**: Replace the placeholder `authorized_keys` line with your public key.
2. **Network Pool**: On a control plane, configure `HOMELAB_METALLB_ADDRESSES` in `homelab.conf.template`. Without an IP pool, MetalLB cannot assign addresses and LoadBalancer services (including Envoy Gateway) remain pending.

Ignition accepts Butane YAML directly; compiling to `.ign` with Butane is optional.

---

## Add-ons

Control-plane templates enable three optional sysexts (`argo-workflows`, `mcp`, `kubestellar`). Worker templates leave them disabled. Manifests live under `/usr/share/bluefin/homelab/addons.d/<NN-id>/`.

Services expose HTTPS via HTTPRoutes on Envoy Gateway (MetalLB IP, port 443) using subdomains under `HOMELAB_DOMAIN` (default: `home.arpa`). Point DNS records for `argo.`, `mcp.`, and `kubestellar.<domain>` to that IP.

| Add-on | sysext | Default | Description & Authentication |
| --- | --- | --- | --- |
| `10-argo-workflows` | `argo-workflows` | Enabled | Argo Workflows v4.1.4 in `argo` namespace. Requires a Kubernetes bearer token: `kubectl -n argo create token argo-server`. |
| `20-mcp` | `mcp` | Enabled | Read-only [Kubernetes MCP server](https://github.com/containers/kubernetes-mcp-server) at `https://mcp.<domain>/mcp`. Requires bearer token: `kubectl -n mcp get secret mcp-client-token -o jsonpath='{.data.token}' \| base64 -d`. Set `HOMELAB_MCP_READ_WRITE=yes` in `homelab.conf` to enable write tools. |
| `30-kubestellar-console` | `kubestellar` | Enabled | KubeStellar Console. Gated behind HTTP basic auth (`admin` user). Initial password in console issue banner or retrieved via `kubectl -n kubestellar-console get secret kubestellar-console-login -o jsonpath='{.data.password}' \| base64 -d`. |
| `31-kubestellar-full` | `kubestellar` | Disabled | KubeStellar core controllers and KubeFlex. Set `HOMELAB_KUBESTELLAR_FULL=yes` to enable. |

### TLS & CA Certificates

Add-on routes enforce HTTPS and return HTTP 301 redirects on port 80. The gateway uses a self-signed root CA created by cert-manager (`homelab-ca`).

Download and trust the root certificate on client devices to prevent browser and CLI connection errors:

```bash
kubectl -n cert-manager get secret homelab-ca -o jsonpath='{.data.ca\.crt}' | base64 -d > homelab-ca.crt
```

- **Go tools / CLI**: Set `SSL_CERT_FILE=homelab-ca.crt`
- **Node.js**: Set `NODE_EXTRA_CA_CERTS=homelab-ca.crt`

---

## Provisioning and Operation

1. **Delivery**: Pass the template as an `ignition.config` credential (SMBIOS type 11, QEMU fw_cfg, or encrypted `/loader/credentials/ignition.config.cred`), or serve it as `bluefin-node.ign` via HTTP netboot.
2. **First Boot**: `bluefin-sysext-fetch.service` downloads and merges required sysexts matching the running OS image version.
3. **Storage Warning**: A diskless node keeps `/var` in tmpfs. Running a full homelab cluster diskless causes kubelet `DiskPressure` evictions. Mount a physical disk to `/var` via Ignition (`var.mount`) or provision sufficient host RAM.
4. **Cluster Join**:
   - The control plane displays a cluster passphrase on the console: `bluefin-cluster passphrase`.
   - On worker nodes, specify `HOMELAB_JOIN_PASSPHRASE` in `homelab.conf.template`, pass the `bluefin-cluster.passphrase` credential, or enter it at the USB installer prompt.
   - The worker clears the passphrase from `homelab.conf` once joined.
5. **Cluster Access**:
   - `ssh root@<node>` using your provisioned SSH key.
   - `kubectl` as root uses `/etc/kubernetes/admin.conf` (kubeadm) or `/var/lib/k0s/pki/admin.conf` (k0s).
   - Argo CD initial password: read Secret `argocd-initial-admin-secret`.
