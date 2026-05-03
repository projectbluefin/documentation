import React from "react";
import DownloadCard from "./DownloadCard";

/** Testing ISOs from projectbluefin.dev */
const BASE = "https://projectbluefin.dev";

const DownloadSectionTesting: React.FC = () => (
  <>
    <DownloadCard
      variant="bluefin"
      title="Bluefin"
      recommended
      description={
        <>
          The most current testing build, based on the latest Fedora.{" "}
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
          newer devices.
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
      ]}
      sections={[
        {
          label: "HWE Testing (Weekly)",
          entries: [
            {
              label: "AMD / Intel",
              isoUrl: `${BASE}/bluefin-lts-hwe-testing-x86_64.iso`,
              isoFilename: "bluefin-lts-hwe-testing-x86_64.iso",
              torrentUrl: `${BASE}/bluefin-lts-hwe-testing-x86_64.iso.torrent`,
              checksumUrl: `${BASE}/bluefin-lts-hwe-testing-x86_64.iso-CHECKSUM`,
            },
            {
              label: "ARM (aarch64)",
              isoUrl: `${BASE}/bluefin-lts-hwe-testing-aarch64.iso`,
              isoFilename: "bluefin-lts-hwe-testing-aarch64.iso",
              torrentUrl: `${BASE}/bluefin-lts-hwe-testing-aarch64.iso.torrent`,
              checksumUrl: `${BASE}/bluefin-lts-hwe-testing-aarch64.iso-CHECKSUM`,
            },
          ],
        },
        {
          label: "Bluefin GDX",
          entries: [
            {
              label: "Nvidia",
              isoUrl: `${BASE}/bluefin-gdx-lts-x86_64.iso`,
              isoFilename: "bluefin-gdx-lts-x86_64.iso",
              checksumUrl: `${BASE}/bluefin-gdx-lts-x86_64.iso-CHECKSUM`,
            },
            {
              label: "ARM (aarch64)",
              isoUrl: `${BASE}/bluefin-gdx-lts-aarch64.iso`,
              isoFilename: "bluefin-gdx-lts-aarch64.iso",
              checksumUrl: `${BASE}/bluefin-gdx-lts-aarch64.iso-CHECKSUM`,
            },
          ],
        },
      ]}
    />

    <DownloadCard
      variant="dakotaraptor"
      title="Bluefin Dakotaraptor"
      description="Dakota is in Alpha — take appropriate precautions."
      entries={[
        {
          label: "AMD / Intel",
          isoUrl: `${BASE}/dakota-live-latest.iso`,
          isoFilename: "dakota-live-latest.iso",
          checksumUrl: `${BASE}/dakota-live-latest.iso-CHECKSUM`,
        },
        {
          label: "Nvidia",
          isoUrl: `${BASE}/dakota-nvidia-live-latest.iso`,
          isoFilename: "dakota-nvidia-live-latest.iso",
          checksumUrl: `${BASE}/dakota-nvidia-live-latest.iso-CHECKSUM`,
        },
      ]}
    />
  </>
);

export default DownloadSectionTesting;
