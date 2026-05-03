import React from "react";
import DownloadCard from "./DownloadCard";

/** Stable production ISOs from download.projectbluefin.io */
const BASE = "https://download.projectbluefin.io";

const DownloadSection: React.FC = () => (
  <>
    <DownloadCard
      variant="bluefin"
      title="Bluefin"
      recommended
      description={
        <>
          The default experience for users.{" "}
          <a href="/introduction">📖 Read the documentation</a> to learn about
          features and differences.
        </>
      }
      entries={[
        {
          label: "AMD / Intel",
          isoUrl: `${BASE}/bluefin-stable-x86_64.iso`,
          isoFilename: "bluefin-stable-x86_64.iso",
          torrentUrl: `${BASE}/bluefin-stable-x86_64.iso.torrent`,
          checksumUrl: `${BASE}/bluefin-stable-x86_64.iso-CHECKSUM`,
        },
        {
          label: "Nvidia",
          isoUrl: `${BASE}/bluefin-nvidia-open-stable-x86_64.iso`,
          isoFilename: "bluefin-nvidia-open-stable-x86_64.iso",
          torrentUrl: `${BASE}/bluefin-nvidia-open-stable-x86_64.iso.torrent`,
          checksumUrl: `${BASE}/bluefin-nvidia-open-stable-x86_64.iso-CHECKSUM`,
        },
      ]}
    />

    <DownloadCard
      variant="bluefin-lts"
      title="Bluefin LTS"
      description={
        <>
          The long-term support experience.{" "}
          <a href="/lts">📖 Read the documentation</a> to learn about features
          and differences. HWE images include updated kernels — recommended for
          newer devices such as Framework Computers.{" "}
          <code>ujust rebase-helper</code> lets you switch between variants at
          any time.
        </>
      }
      entries={[
        {
          label: "AMD / Intel",
          isoUrl: `${BASE}/bluefin-lts-x86_64.iso`,
          isoFilename: "bluefin-lts-x86_64.iso",
          checksumUrl: `${BASE}/bluefin-lts-x86_64.iso-CHECKSUM`,
        },
        {
          label: "ARM (aarch64)",
          isoUrl: `${BASE}/bluefin-lts-aarch64.iso`,
          isoFilename: "bluefin-lts-aarch64.iso",
          checksumUrl: `${BASE}/bluefin-lts-aarch64.iso-CHECKSUM`,
        },
        {
          label: "AMD / Intel (HWE)",
          isoUrl: `${BASE}/bluefin-lts-hwe-x86_64.iso`,
          isoFilename: "bluefin-lts-hwe-x86_64.iso",
          torrentUrl: `${BASE}/bluefin-lts-hwe-x86_64.iso.torrent`,
          checksumUrl: `${BASE}/bluefin-lts-hwe-x86_64.iso-CHECKSUM`,
        },
        {
          label: "ARM (HWE)",
          isoUrl: `${BASE}/bluefin-lts-hwe-aarch64.iso`,
          isoFilename: "bluefin-lts-hwe-aarch64.iso",
          torrentUrl: `${BASE}/bluefin-lts-hwe-aarch64.iso.torrent`,
          checksumUrl: `${BASE}/bluefin-lts-hwe-aarch64.iso-CHECKSUM`,
        },
        {
          label: "GDX — Nvidia",
          isoUrl: `${BASE}/bluefin-gdx-lts-x86_64.iso`,
          isoFilename: "bluefin-gdx-lts-x86_64.iso",
          checksumUrl: `${BASE}/bluefin-gdx-lts-x86_64.iso-CHECKSUM`,
        },
        {
          label: "GDX — ARM",
          isoUrl: `${BASE}/bluefin-gdx-lts-aarch64.iso`,
          isoFilename: "bluefin-gdx-lts-aarch64.iso",
          checksumUrl: `${BASE}/bluefin-gdx-lts-aarch64.iso-CHECKSUM`,
        },
      ]}
    />
  </>
);

export default DownloadSection;
