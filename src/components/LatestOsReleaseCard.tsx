import React from "react";
import { PINNED_OS_EVENTS } from "./FirehoseFeed";
import OsReleaseCard from "./OsReleaseCard";

interface LatestOsReleaseCardProps {
  /** "stable" | "lts" | "dakota" */
  stream: string;
}

/**
 * Renders the latest pinned OsReleaseCard for the requested stream.
 * Data comes from PINNED_OS_EVENTS (same source as the Changelogs page).
 */
const LatestOsReleaseCard: React.FC<LatestOsReleaseCardProps> = ({ stream }) => {
  const event = PINNED_OS_EVENTS.find((e) => e.stream === stream);
  if (!event) return null;
  return <OsReleaseCard event={event} />;
};

export default LatestOsReleaseCard;
