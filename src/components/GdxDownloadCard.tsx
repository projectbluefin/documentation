import React from "react";
import DownloadCard from "./DownloadCard";

const BASE = "https://download.projectbluefin.io";

const GdxDownloadCard: React.FC = () => (
  <DownloadCard
    variant="bluefin-gdx"
    title="Bluefin GDX"
    description={
      <>
        AI workstation image combining Bluefin LTS with Nvidia drivers and CUDA.
        For AMD systems, use <a href="/lts">Bluefin LTS</a> with developer mode
        enabled instead.
      </>
    }
    entries={[
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
    ]}
  />
);

export default GdxDownloadCard;
