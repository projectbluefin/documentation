import React from "react";
import DownloadCard from "./DownloadCard";

const BASE = "https://download.projectbluefin.io";

const LtsDownloadCard: React.FC = () => (
  <DownloadCard
    variant="bluefin-lts"
    title="Bluefin LTS"
    description={
      <>
        HWE images include an updated kernel — recommended for newer devices
        such as Framework Computers.{" "}
        <code>ujust rebase-helper</code> lets you switch between variants at any
        time.
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
  />
);

export default LtsDownloadCard;
