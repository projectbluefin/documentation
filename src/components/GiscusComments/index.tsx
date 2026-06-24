import React from "react";
import Giscus from "@giscus/react";
import { useColorMode } from "@docusaurus/theme-common";

export default function GiscusComments(): React.ReactElement {
  const { colorMode } = useColorMode();

  return (
    <div
      style={{ marginTop: "2rem", marginBottom: "4rem", minHeight: "400px" }}
    >
      <Giscus
        id="comments"
        repo="projectbluefin/bluefin"
        repoId="R_kgDOJHEu4g"
        category="Discussions"
        categoryId="DIC_kwDOJHEu4s4CtFFL"
        mapping="og:title"
        strict="1"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme={colorMode === "dark" ? "dark" : "light"}
        lang="en"
        loading="lazy"
      />
    </div>
  );
}
