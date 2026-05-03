import React from "react";
import CodeBlock from "@theme/CodeBlock";

type Variant = "stable" | "lts" | "dx" | "gdx";

const TAG_MAP: Record<Variant, string> = {
  stable: "stable",
  lts: "lts",
  dx: "stable",
  gdx: "stable",
};

interface UpdateInstructionsProps {
  variant?: Variant;
}

const UpdateInstructions: React.FC<UpdateInstructionsProps> = ({
  variant = "stable",
}) => {
  const tag = TAG_MAP[variant];
  const code =
    `IMAGE_NAME=$(jq -r '."image-name"' < /usr/share/ublue-os/image-info.json)\n` +
    `sudo bootc switch --enforce-container-sigpolicy ghcr.io/ublue-os/$IMAGE_NAME:${tag}`;

  return (
    <div>
      <p>
        Current users will receive this update automatically. To rebase now:
      </p>
      <CodeBlock language="bash">{code}</CodeBlock>
      <p>
        <code>IMAGE_NAME</code> is read from{" "}
        <code>/usr/share/ublue-os/image-info.json</code> so the correct variant
        (dx, gdx, etc.) is preserved automatically.
      </p>
    </div>
  );
};

export default UpdateInstructions;
