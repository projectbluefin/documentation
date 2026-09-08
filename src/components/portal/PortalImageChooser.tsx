import React, { useState } from "react";
import { FaDownload, FaCheckCircle, FaGithub } from "react-icons/fa";
import styles from "./PortalSectionPicker.module.css";
import {
  INITIAL_CHOOSER_STATE,
  REGISTRY_URL,
  selectRelease,
  selectArchitecture,
  selectGpu,
  selectKernel,
  navigateBack,
  resetChooser,
  formatIsoFilename,
  formatIsoUrl,
  formatChecksumUrl,
  type ChooserState,
} from "./portalChooserModel";
import type { ChooserCatalog } from "./portalStreamAdapter";

export interface PortalImageChooserProps {
  catalog: ChooserCatalog;
  initialState?: ChooserState;
}

export default function PortalImageChooser({
  catalog,
  initialState = INITIAL_CHOOSER_STATE,
}: PortalImageChooserProps): React.JSX.Element {
  const [state, setState] = useState<ChooserState>(initialState);
  const { step, selection } = state;

  const currentStream = selection.stream
    ? catalog.streams[selection.stream]
    : undefined;

  const renderReleaseStep = () => (
    <div className={styles.releaseSelection}>
      <div className={styles.releaseGrid}>
        {(["stable", "lts"] as const).map((id) => {
          const stream = catalog.streams[id];
          if (!stream) return null;
          const isRecommended = stream.recommended;
          const isDisabled = !stream.available;

          return (
            <div
              key={id}
              className={`${styles.releaseBox} ${
                isRecommended ? styles.recommended : ""
              } ${isDisabled ? styles.disabled : ""}`}
              aria-disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) {
                  setState(selectRelease(state, id, true));
                }
              }}
              role="button"
              tabIndex={isDisabled ? -1 : 0}
              onKeyDown={(e) => {
                if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setState(selectRelease(state, id, true));
                }
              }}
            >
              <div
                className={styles.releaseImage}
                style={{ backgroundImage: `url(${stream.image})` }}
              >
                {isRecommended && (
                  <span className={styles.recommendedBadge}>RECOMMENDED</span>
                )}
                {isDisabled && (
                  <span className={styles.unavailableBadge}>
                    {stream.unavailableReason ?? "Will return"}
                  </span>
                )}
                <div className={styles.releaseOverlay}>
                  <div className={styles.releaseContent}>
                    <div className={styles.releaseHeader}>
                      <h3 className={styles.releaseTitle}>{stream.title}</h3>
                      <span className={styles.releaseSubtitle}>
                        {stream.subtitle}
                      </span>
                    </div>
                    <p className={styles.releaseDescription}>
                      {stream.description}
                    </p>

                    {stream.versions && (
                      <div className={styles.versionGrid}>
                        {stream.versions.base && (
                          <div className={styles.versionItem}>
                            <span className={styles.versionItemLabel}>
                              Base:
                            </span>
                            <span className={styles.versionItemValue}>
                              {stream.versions.base}
                            </span>
                          </div>
                        )}
                        {stream.versions.gnome && (
                          <div className={styles.versionItem}>
                            <span className={styles.versionItemLabel}>
                              GNOME:
                            </span>
                            <span className={styles.versionItemValue}>
                              {stream.versions.gnome}
                            </span>
                          </div>
                        )}
                        {stream.versions.kernel && (
                          <div className={styles.versionItem}>
                            <span className={styles.versionItemLabel}>
                              Kernel:
                            </span>
                            <span className={styles.versionItemValue}>
                              {stream.versions.kernel}
                            </span>
                          </div>
                        )}
                        {id === "lts" && stream.versions.hweKernel && (
                          <div className={styles.versionItem}>
                            <span className={styles.versionItemLabel}>
                              HWE Kernel:
                            </span>
                            <span className={styles.versionItemValue}>
                              {stream.versions.hweKernel}
                            </span>
                          </div>
                        )}
                        {stream.versions.mesa && (
                          <div className={styles.versionItem}>
                            <span className={styles.versionItemLabel}>
                              MESA:
                            </span>
                            <span className={styles.versionItemValue}>
                              {stream.versions.mesa}
                            </span>
                          </div>
                        )}
                        {stream.versions.nvidia && (
                          <div className={styles.versionItem}>
                            <span className={styles.versionItemLabel}>
                              Nvidia:
                            </span>
                            <span className={styles.versionItemValue}>
                              {stream.versions.nvidia}
                            </span>
                          </div>
                        )}
                        {stream.versions.flatpak && (
                          <div className={styles.versionItem}>
                            <span className={styles.versionItemLabel}>
                              Flatpak:
                            </span>
                            <span className={styles.versionItemValue}>
                              {stream.versions.flatpak}
                            </span>
                          </div>
                        )}
                        {stream.versions.podman && (
                          <div className={styles.versionItem}>
                            <span className={styles.versionItemLabel}>
                              Podman:
                            </span>
                            <span className={styles.versionItemValue}>
                              {stream.versions.podman}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderArchitectureStep = () => {
    const supported = currentStream?.supportedArch ?? ["x86"];

    return (
      <div className={styles.stepSelection}>
        <div className={styles.stepHeader}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => setState(navigateBack(state))}
          >
            Back to releases
          </button>
          <h3>
            Which architecture will you install Bluefin on? Older BIOS-based
            systems are unsupported
          </h3>
        </div>
        <div className={styles.optionsGrid}>
          <button
            type="button"
            className={styles.optionButton}
            disabled={!supported.includes("x86")}
            onClick={() => setState(selectArchitecture(state, "x86"))}
          >
            x86_64 (Standard for most computers)
          </button>
          <button
            type="button"
            className={styles.optionButton}
            disabled={!supported.includes("arm")}
            onClick={() => setState(selectArchitecture(state, "arm"))}
          >
            ARM64
          </button>
        </div>
      </div>
    );
  };

  const renderGpuStep = () => (
    <div className={styles.stepSelection}>
      <div className={styles.stepHeader}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => setState(navigateBack(state))}
        >
          Back
        </button>
        <h3>
          Who is the vendor of your primary graphics card (GPU)? Older Nvidia
          cards are unsupported
        </h3>
      </div>
      <div className={styles.optionsGrid}>
        <button
          type="button"
          className={styles.optionButton}
          onClick={() => setState(selectGpu(state, "amd"))}
        >
          AMD or Intel
        </button>
        <button
          type="button"
          className={styles.optionButton}
          onClick={() => setState(selectGpu(state, "nvidia"))}
        >
          Nvidia RTX or GTX 16xx+ Series
        </button>
      </div>
    </div>
  );

  const renderKernelStep = () => (
    <div className={styles.stepSelection}>
      <div className={styles.stepHeader}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => setState(navigateBack(state))}
        >
          Back
        </button>
        <h3>
          What is your priority? This choice balances system stability with
          support for the newest hardware. You can change this later:
        </h3>
      </div>
      <div className={styles.optionsGrid}>
        <button
          type="button"
          className={styles.optionButton}
          onClick={() => setState(selectKernel(state, "regular"))}
        >
          LTS Linux kernel: The most reliable option, perfect for most
          computers.
        </button>
        <button
          type="button"
          className={styles.optionButton}
          onClick={() => setState(selectKernel(state, "hwe"))}
        >
          Latest Linux kernel: Best for brand-new devices and getting the newest
          features.
        </button>
      </div>
    </div>
  );

  const renderDownloadStep = () => {
    const filename = formatIsoFilename(selection);
    const isoUrl = formatIsoUrl(selection);
    const checksumUrl = formatChecksumUrl(selection);

    const displayReleaseTitle =
      selection.gpu === "nvidia" && selection.stream === "lts"
        ? "Bluefin GDX"
        : currentStream?.title;

    return (
      <div className={styles.downloadSection}>
        <div className={styles.stepHeader}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => setState(navigateBack(state))}
          >
            Back
          </button>
          <h3>Ready to Download!</h3>
        </div>

        <div className={styles.downloadSummary}>
          <div className={styles.decisionSummary}>
            <h4>Your Selection ...</h4>
            <div className={styles.decisionItems}>
              <div className={styles.decisionItem}>
                <span className={styles.decisionLabel}>Release:</span>
                <span className={styles.decisionValue}>
                  {displayReleaseTitle}
                </span>
                <span className={styles.decisionSubtitle}>
                  {currentStream?.subtitle}
                </span>
              </div>
              <div className={styles.decisionItem}>
                <span className={styles.decisionLabel}>Architecture:</span>
                <span className={styles.decisionValue}>
                  {selection.arch === "x86" ? "x86_64" : "ARM64"}
                </span>
                <span className={styles.decisionSubtitle}>
                  {selection.arch === "x86"
                    ? "Standard for most computers (AMD and Intel)"
                    : "For ARM-based systems (Apple Silicon, Raspberry Pi, etc)"}
                </span>
              </div>
              {selection.stream === "lts" && (
                <div className={styles.decisionItem}>
                  <span className={styles.decisionLabel}>Kernel:</span>
                  <span className={styles.decisionValue}>
                    {selection.kernel === "hwe"
                      ? "Hardware Enablement (HWE)"
                      : "Regular LTS"}
                  </span>
                  <span className={styles.decisionSubtitle}>
                    {selection.kernel === "hwe"
                      ? "Regularly updated kernels for better hardware support"
                      : "Stable kernel updates, locked to 6.12.0 with backports"}
                  </span>
                </div>
              )}
              {selection.gpu && (
                <div className={styles.decisionItem}>
                  <span className={styles.decisionLabel}>
                    Graphics Card (GPU):
                  </span>
                  <span className={styles.decisionValue}>
                    {selection.gpu === "amd" ? "AMD/Intel" : "Nvidia"}
                  </span>
                  <span className={styles.decisionSubtitle}>
                    {selection.gpu === "amd"
                      ? "Integrated AMD or Intel graphics"
                      : "Nvidia RTX/GTX 16xx+ Series, GTX 10xx Series and below are unsupported"}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.generatedFilename}>
              <span className={styles.filenameLabel}>Installation ISO:</span>
              <span className={styles.filenameValue}>{filename}</span>
            </div>
          </div>

          <div className={styles.downloadActions}>
            <a className={styles.downloadButton} href={isoUrl}>
              Download the ISO
              <FaDownload className={styles.downloadIcon} />
            </a>

            <div className={styles.secondaryActions}>
              <a
                className={styles.btnSecondary}
                title="Verify (SHA256)"
                href={checksumUrl}
              >
                <FaCheckCircle />
                Verify (SHA256)
              </a>
              <a
                className={styles.btnSecondary}
                title="View Registry"
                href={REGISTRY_URL}
                target="_blank"
                rel="noreferrer"
              >
                <FaGithub />
                View Registry
              </a>
            </div>
          </div>
        </div>

        <div className={styles.documentationNote}>
          <p>
            Check out the{" "}
            <a href="https://docs.projectbluefin.io/">Bluefin Documentation</a>,
            it takes about 15 minutes and includes an installation runbook - set
            yourself up for success, you are headed into a new world.
          </p>
          <p>
            Can&apos;t find what you&apos;re looking for? Check{" "}
            <a href="https://docs.projectbluefin.io/downloads/">
              the full list of downloads
            </a>
            .
          </p>
          <p>
            If you choose{" "}
            <a href="https://docs.projectbluefin.io/installation#secure-boot">
              secure boot
            </a>{" "}
            during installation, the password is &quot;universalblue&quot;.
          </p>
        </div>

        <button
          type="button"
          className={styles.startOverButton}
          onClick={() => setState(resetChooser())}
        >
          Choose a different release
        </button>
      </div>
    );
  };

  return (
    <div className={styles.imageChooser}>
      {step === "release" && renderReleaseStep()}
      {step === "architecture" && renderArchitectureStep()}
      {step === "gpu" && renderGpuStep()}
      {step === "kernel" && renderKernelStep()}
      {step === "download" && renderDownloadStep()}
    </div>
  );
}
