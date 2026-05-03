import React from "react";

interface DownloadLinksProps {
  includeDakota?: boolean;
  includeDiscussionUrl?: string;
}

const DownloadLinks: React.FC<DownloadLinksProps> = ({
  includeDakota = false,
  includeDiscussionUrl,
}) => {
  return (
    <div>
      <h3>Bluefin</h3>
      <p>
        <a href="https://projectbluefin.io">
          <strong>→ projectbluefin.io</strong>
        </a>
      </p>

      {includeDakota && (
        <>
          <h3>Dakota Alpha 2</h3>
          <ul>
            <li>
              <a href="https://projectbluefin.dev/dakota-live-latest.iso">
                dakota-live-latest.iso
              </a>
            </li>
          </ul>
        </>
      )}

      <h3>Filing Issues</h3>
      <ul>
        <li>
          <a href="https://github.com/ublue-os/bluefin/issues">
            Bluefin issues
          </a>
        </li>
        {includeDakota && (
          <>
            <li>
              <a href="https://github.com/projectbluefin/dakota/issues">
                Dakota issues
              </a>
            </li>
            <li>
              <a href="https://github.com/projectbluefin/dakota-iso/issues">
                Dakota ISO issues
              </a>
            </li>
          </>
        )}
      </ul>

      {includeDiscussionUrl && (
        <h3>
          <a href={includeDiscussionUrl}>Discussions</a>
        </h3>
      )}
    </div>
  );
};

export default DownloadLinks;
