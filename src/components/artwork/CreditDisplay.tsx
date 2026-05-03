import React from "react";
import type { Wallpaper } from "./types";

export default function CreditDisplay({ wallpaper }: { wallpaper: Wallpaper }): React.JSX.Element {
  if (!wallpaper.author) {
    return <span>Author unknown</span>;
  }

  let authorNode: React.ReactNode;
  if (wallpaper.authorLicense?.startsWith("http")) {
    authorNode = (
      <a href={wallpaper.authorLicense} target="_blank" rel="noopener noreferrer">
        {wallpaper.author}
      </a>
    );
  } else if (wallpaper.authorLicense) {
    authorNode = <span>{wallpaper.author} · {wallpaper.authorLicense}</span>;
  } else {
    authorNode = <span>{wallpaper.author}</span>;
  }

  if (wallpaper.coAuthor && wallpaper.coAuthorLink) {
    return (
      <span>
        {authorNode} and{" "}
        <a href={wallpaper.coAuthorLink} target="_blank" rel="noopener noreferrer">
          {wallpaper.coAuthor}
        </a>
      </span>
    );
  }

  return <>{authorNode}</>;
}
