import React from "react";
import CommunityFeeds from "../components/CommunityFeeds";

export default function CommunityFeedsPage(): React.JSX.Element {
  return (
    <>
      <div
        style={{ maxWidth: "800px", margin: "0 auto 2rem", padding: "0 1rem" }}
      >
        <p>
          Looking for project activity and development progress? Check out our{" "}
          <a href="/reports">Biweekly Reports</a> for summaries of completed
          work, contributor highlights, and project board updates.
        </p>
      </div>
      <CommunityFeeds />
    </>
  );
}
