import React from "react";
import DownloadCard from "./DownloadCard";

/** Stable production ISOs from download.projectbluefin.io */
const BASE = "https://download.projectbluefin.io";

const DownloadSection: React.FC = () => (
    <DownloadCard
      variant="bluefin"
      title="Bluefin"
      description={
        <>
          The default experience for users.{" "}
          <a href="/">📖 Read the documentation</a> to learn about features and
          differences.
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
);

export default DownloadSection;
